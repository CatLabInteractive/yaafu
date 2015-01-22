
;(function ($) {
    
    var pluginName = 'yaafu';

    // The actual plugin constructor
    var Plugin = function (element, options) {
        
        this.element = element;
        this.options = $.extend({}, this.defaults, options);

        this.init();
    }

    var FileAdded = function(element, file, options) {

        this.fid;
        this.element = element;
        this.file = file;
        this.$element = $(element);
        this.options = $.extend({}, this.defaults, options);
    }

    FileAdded.prototype = {

        defaults: {},
        response: null
    }

    Plugin.prototype = {

        defaults: {
            method: 'POST',
            endpoint: '/',
            headers: {},

            sync: null,                                 // sync functionality through callback
            submitBtn: false,                           // allow submit buttons to be handled by yaafu
            maxNumFiles: 100,                           // Maximum number of all files
            allowedFileTypes: ['image.*', 'audio.*'],   // Allowed file types
            multipleFilesType: false,                   // Multiple files per filetype
            renderRemoveBtn: true,                      // Add remove button

            previewTemplate: "<div class=\"yf-preview yf-file-preview yf-processing\">\n <div class=\"yf-details\">\n    <div class=\"yf-filename\"><span data-yf-name></span></div>\n    <div class=\"yf-size\" data-yf-size></div>\n    <img data-yf-thumbnail />\n  </div>\n  <div class=\"yf-progress\"><span class=\"yf-upload\" data-yf-uploadprogress></span></div>\n  <div class=\"yf-success-mark\"></div>\n  <div class=\"yf-error-mark\"></div>\n  <div class=\"yf-error-message\"><span data-yf-errormessage></span></div></div>",
            removeButton: "<button class='yf-remove btn btn-default'>remove</button>",
            audioThumb: "https://cdn2.iconfinder.com/data/icons/windows-8-metro-style/512/audio_file.png"
        },

        uploaded: [],

        init: function() {
            
            var self = this;
            var dropZone = this.element;
            
            // Setup the drang&drop listeners.
            dropZone.addEventListener('dragover', self.handleDragOver.bind(self), false);
            dropZone.addEventListener('drop', self.handleFileSelect.bind(self), false);           

            // Add pre-styling and required DOM manipulation functions here
                // Add save & cancel button/actions, or leave this to backbone?
            
        },

        handleFileSelect: function(evt) {
            
            evt.stopPropagation();
            evt.preventDefault();

            var self = this;
            var files = evt.dataTransfer.files;
            
            for (var i = 0, f; f = files[i]; i++) {
                
                // Only process image files for now
                if (!this.fileIsAllowed(f)) {
                    continue;
                }

                this.renderFile(f);
            }
        },

        renderFile: function(file) {

            var self = this;
            var reader = new FileReader();           

            // Remove multiple file support (temporary?)
            // Add parse progress functionality to browser (necessary?)

            // Closure to capture the file information.
            reader.onload = (function(f) {
                return function(e) {
                    
                    var el = self.createElement(self.options.previewTemplate);
                    var fileAdded = new FileAdded(el, f);

                    $(self.element).append(fileAdded.element);

                    self.renderType(e, fileAdded);

                    if (self.options.renderRemoveBtn)
                        fileAdded.$element.append(self.options.removeButton)

                    self.addTriggers(fileAdded);
                    self.sendFile(fileAdded);
                }
            })(file);

            // Read in the image file as a data URL. <-- base64 = temporarily? make this an option?
            reader.readAsDataURL(file);
            
        },

        renderType: function(e, fileAdded) {
            
            if (fileAdded.file.type.match('image.*'))
                fileAdded.$element.find('img[data-yf-thumbnail]').attr('src', e.target.result);

            if (fileAdded.file.type.match('audio.*')){
                fileAdded.$element.find('img[data-yf-thumbnail]').attr('src', this.options.audioThumb);
                fileAdded.$element.find('.yf-filename').html(fileAdded.file.name);
                fileAdded.$element.find('.yf-details').append('<audio class="yf-audioFile" src="'+e.target.result+'"></audio>')
            }

            // Make for video
        },

        addTriggers: function(fileAdded) {

            var self = this;

            // Remove button
            fileAdded.$element.find('.yf-remove').click(function(){
                if (fileAdded.response) {   // successfull upload
                    for (f in self.uploaded){
                        if (self.uploaded[f].fid == fileAdded.fid)
                            self.uploaded.splice(f,1);
                    }
                }
                
                fileAdded.$element.remove();

                self.sync();
            });

            // Play audio button
            if (fileAdded.file.type.match('audio.*')){

                fileAdded.$element.find('.yf-details').click(function(){
                    if (!fileAdded.$element.hasClass('yf-play')){
                        fileAdded.$element.find('.yf-audioFile')[0].play();
                        fileAdded.$element.addClass('yf-play');
                    }

                    else {
                        fileAdded.$element.find('.yf-audioFile')[0].pause();
                        fileAdded.$element.removeClass('yf-play');
                    }
                });
            }
        },

        handleDragOver: function(evt) {
            
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        },

        fileIsAllowed: function(file) {
        
            for (t in this.options.allowedFileTypes){
                if (file.type.match(this.options.allowedFileTypes[t]))
                    return true;
            }
            console.log("File not allowed", file.type)
            return false
        },

        parseAddedFiles: function(files) {

            // Parse each added file
            // 
        },

        attachHeaders: function(xhr) {

            var headers = this.options.headers;

            if (headers)
                for (h in headers) {
                    if (headers.hasOwnProperty(h))
                        xhr.setRequestHeader(h, headers[h]);
                }
        },

        sendFile: function(fileAdded) {

            var self = this;
            var formData = new FormData();
            var xhr = new XMLHttpRequest();

            formData.append('file', fileAdded.file);

            // Add request URL & Method
            xhr.open(this.options.method, this.options.endpoint, true);
            xhr.responseType = "json";

            xhr.onreadystatechange = function (aEvt) {
                if (xhr.readyState == 4) {
                    if(xhr.status == 200)
                        self.uploadComplete(xhr, fileAdded);
                    else
                        self.uploadError(xhr, fileAdded);
                } 
            };

            // Attach custom headers, if any (add more options?)
            this.attachHeaders(xhr);

            xhr.send(formData);
        },

        uploadProgress: function(evt) {

            // Add code for progress bar
        },

        uploadError: function(serverResponse, fileAdded) {
            
            // Add code for upload errors
            fileAdded.$element.addClass('yf-error');
            
        },

        uploadCanceled: function(evt) {

            // Add code for canceled uploads
        },

        uploadComplete: function(serverResponse, fileAdded) {
            
            var response = serverResponse? serverResponse.response: null;
            // var url = response? response.file.url: null;

            // Do stuff after the upload has been completed
            // Check for errors? Update status?
            fileAdded.$element.removeClass('yf-processing').addClass('yf-done');
            fileAdded.response = response;
            fileAdded.fid = this.uploaded.length? this.uploaded[this.uploaded.length-1].fid + 1: 0;
            
            this.uploaded.push(fileAdded);

            this.sync();
        },

        sync: function() {

            if (this.options.sync)
                this.options.sync(this.uploaded)
        },

        createElement: function(string) {
            var div;
            div = document.createElement("div");
            div.innerHTML = string;
            return div.childNodes[0];
        }


    }

    // Plugin wrapper around the constructor, 
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, 
                new Plugin( this, options));
            }
        });
    }

})(jQuery);