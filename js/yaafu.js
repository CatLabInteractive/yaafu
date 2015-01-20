
;(function ($) {
    
    var pluginName = 'yaafu';

    // The actual plugin constructor
    var Plugin = function ( element, options ) {
        
        this.element = element;
        this.options = $.extend( {}, this.defaults, options) ;

        this.init();
    }

    Plugin.prototype = {

        defaults: {
            method: 'POST',
            url: '/',
            headers: {},

            maxNumFiles: 1,                 // Maximum number of all files
            allowedFileTypes: ['image'],    // Allowed file types
            multipleFilesType: false        // Multiple files per filetype
        },

        init: function () {
            
            var self = this;
            var dropZone = this.element;
            
            // Setup the drang&drop listeners.
            dropZone.addEventListener('dragover', self.handleDragOver.bind(self), false);
            dropZone.addEventListener('drop', self.handleFileSelect.bind(self), false);           

            // Add pre-styling and required DOM manipulation functions here
                // Add save & cancel button/actions, or leave this to backbone?
            
        },

        handleFileSelect: function (evt) {
            
            evt.stopPropagation();
            evt.preventDefault();

            var self = this;
            var files = evt.dataTransfer.files;

            for (var i = 0, f; f = files[i]; i++) {
                
                // Only process image files for now
                if (!f.type.match('image.*')) {
                    continue;
                }

                var reader = new FileReader();

                // Remove multiple file support (temporary?)
                // Add parse progress functionality to browser (necessary?)

                // Closure to capture the file information.
                reader.onload = (function(file) {
                    self.sendAttachment(file)
                })(f);

                // Read in the image file as a data URL. <-- base64 = only for preview
                reader.readAsDataURL(f);
            }
        },

        parseAddedFiles : function (files) {

            // Parse each added file
            // 
        },

        handleDragOver: function (evt) {
        
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        },

        attachHeaders : function (xhr) {

            var headers = this.options.headers;

            if (headers)
                for (h in headers) {
                    if (headers.hasOwnProperty(h))
                        xhr.setRequestHeader(h, headers[h]);
                }
        },

        sendAttachment : function (file) {

            var formData = new FormData();
            var xhr = new XMLHttpRequest();

            formData.append('file', file);

            xhr.addEventListener("progress", this.uploadProgress.bind(this), false);
            xhr.addEventListener("error", this.uploadError.bind(this), false);
            xhr.addEventListener("cancel", this.uploadCanceled.bind(this), false);
            xhr.addEventListener("load", this.uploadComplete.bind(this), false);

            // Add request URL & Method
            xhr.open(this.options.method, this.options.url, true);
            xhr.responseType = "json";

            // Attach custom headers, if any (add more options?)
            this.attachHeaders(xhr);

            xhr.send(formData);
        },

        uploadProgress : function (evt) {

            // Add code for progress bar
        },

        uploadError : function (evt) {

            // Add code for upload errors
        },

        uploadCanceled : function (evt) {

            // Add code for canceled uploads
        },

        uploadComplete : function (evt) {

            var response = evt.target? evt.target.response: null;
            var url = response? response.file.url: null;

            $(this.element).find('img').attr('src', url);
        }
    }

    // Plugin wrapper around the constructor, 
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, 
                new Plugin( this, options ));
            }
        });
    }

})(jQuery);