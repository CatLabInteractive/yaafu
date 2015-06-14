
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

			populate: [],                               // Default files already added as default
			showPreview: true,                          // Show a base64 preview while uploading the image.
			sync: null,                                 // Sync functionality through callback
			uploadBtn: false,                           // Allow submit actions to be handled by yaafu
			multipleFiles: true,                        // Allow multiple file upload
			allowedFileTypes: ['image.*', 'audio.*'],   // Allowed file types
			maxNumFiles: 0,                             // Maximum number of all files -> 0 == unlimited
			multipleFilesType: false,                   // Multiple files per filetype
			renderRemoveBtn: true,                      // Add remove button
			showError: true,
			showDone: false,

			uploadTemplate: "<button class=\"btn btn-default\">Upload</button>",
			previewTemplate: "<div class=\"yf-preview yf-file-preview yf-processing\">\n <div class=\"yf-details\">\n    <div class=\"yf-bg\"></div>\n  <div class=\"yf-progress\"><span class=\"yf-upload\" data-yf-uploadprogress></span></div>\n  <div class=\"yf-success-mark\"></div>\n  <div class=\"yf-error-mark\"></div>\n  <div class=\"yf-error-message\"><span data-yf-errormessage></span></div></div>",
			removeButton: "<div class='yf-remove'></div>",
			audioThumb: null,
			singleUpload: "<input type='file' id='yf-select' name='files[]'/>",
			multipleUpload: "<input type='file' id='yf-select' multiple name='files[]'/>",

		},

		init: function() {

			var self = this;
			var dropZone = this.element;

			this.uploaded = [];
			this.forUpload = [];

			// Add pre-styling and required DOM manipulation functions here
			// Add save & cancel button/actions, or leave this to backbone?

			// Take care of already existing items
			for (n in this.options.populate) {
				this.renderExistingFile(this.options.populate[n]);
			}

			if (this.options.uploadBtn)
				this.activateUploadBtn();

			$(this.element).append('<div class="yf-clicker"></div>')

			$(this.element).append(this.options.multipleFiles? this.options.multipleUpload: this.options.singleUpload);
			$(this.element).find('.yf-clicker').click(function(){ $(self.element).find('input[type=file]').trigger('click')});

			// Setup the drang&drop + file upload listeners.
			dropZone.addEventListener('dragover', self.handleDragOver.bind(self), false);
			dropZone.addEventListener('dragleave', self.handleDragLeave.bind(self), false);
			dropZone.addEventListener('drop', self.handleFileSelect.bind(self), false);
			$(this.element).find('#yf-select').change(self.handleFileSelect.bind(self));
		},

		activateUploadBtn: function() {


		},

		handleFileSelect: function(evt) {

			var files;

			if (evt.type == "drop") {

				evt.stopPropagation();
				evt.preventDefault();
				files = evt.dataTransfer.files;
			}

			else    files = evt.target.files;

			var self = this;

			if (this.options.maxNumFiles >= 0 && this.uploaded.length >= this.options.maxNumFiles)
				return;

			for (var i = 0, f; f = files[i]; i++) {

				if (this.options.maxNumFiles > 0 && i >= this.options.maxNumFiles)
					break;

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
			var el, fileAdded;

			// Remove multiple file support (temporary?)
			// Add parse progress functionality to browser (necessary?)

			// Closure to capture the file information.
			reader.onload = (function(f) {
				return function(e) {

					el = self.createElement(self.options.previewTemplate);
					fileAdded = new FileAdded(el, f);

					$(self.element).append(fileAdded.element);

					self.renderType(e, fileAdded);

					// If there is no upload button, the upload should be automatic
					if (!self.options.uploadBtn)
						self.sendFile(fileAdded);

					else {
						fileAdded.$element.removeClass('yf-processing');
						self.forUpload.push(fileAdded);
					}
				}
			})(file);

			// Read in the image file as a data URL. <-- base64
			if (this.options.showPreview)
				reader.readAsDataURL(file);
		},

		renderExistingFile: function(existingFile) {

			// To distinguish between existing and generated files. Wont use URL cause users might want to change that behavior
			existingFile.existing = true;

			var el = this.createElement(this.options.previewTemplate);
			var file = new FileAdded(el, existingFile);

			$(this.element).append(file.element);

			this.renderType(null, file);

			if (this.options.renderRemoveBtn)
				file.$element.append(this.options.removeButton)

			file.$element.removeClass('yf-processing');

			this.addTriggers(file);
			this.uploaded.push(file);

			this.sync();
		},

		renderType: function(e, fileAdded) {

			var url = e? e.target.result: fileAdded.file.url;

			if (fileAdded.file.type.match('image.*')) {
				fileAdded.$element.addClass('yf-image');
				fileAdded.$element.find('.yf-bg').attr('style',"background-image: url("+url+")")
			}

			if (fileAdded.file.type.match('audio.*')) {
				fileAdded.$element.addClass('yf-audio');
				fileAdded.$element.find('.yf-bg').attr('style',"background-image: url("+this.options.audioThumb+")");
				fileAdded.$element.find('.yf-details').append('<audio class="yf-audioFile" src="'+e.target.result+'"></audio>')
			}

			// Make for video
		},

		addTriggers: function(fileAdded) {

			var self = this;

			// Remove button
			fileAdded.$element.find('.yf-remove').click(function(){
				//if (fileAdded.response) {   // successfull upload
				for (f in self.uploaded){
					if (self.uploaded[f].fid == fileAdded.fid)
						self.uploaded.splice(f,1);
				}
				//}

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

			$(this.element).addClass('dragover');
		},

		handleDragLeave: function(evt) {

			$(this.element).removeClass('dragover');
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

			// Show error UI
			if (this.options.showError){
				fileAdded.$element.addClass('yf-error');
				this.addTriggers(fileAdded);
			}

		},

		uploadCanceled: function(evt) {

			// Add code for canceled uploads
		},

		uploadComplete: function(serverResponse, fileAdded) {

			var response = serverResponse? serverResponse.response: null;
			// var url = response? response.file.url: null;

			// Do stuff after the upload has been completed
			// Check for errors? Update status?

			// Show success UI
			if (this.options.showDone)
				fileAdded.$element.addClass('yf-done');

			fileAdded.$element.removeClass('yf-processing');
			fileAdded.response = response;
			fileAdded.fid = this.uploaded.length? this.uploaded[this.uploaded.length-1].fid + 1: 0;

			// Add remove button
			if (this.options.renderRemoveBtn)
				fileAdded.$element.append(this.options.removeButton)

			this.addTriggers(fileAdded);

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