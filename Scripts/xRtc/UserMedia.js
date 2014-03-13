﻿// #### Version 1.5.0####

// `xRtc.getUserMedia` is the special functions for accessing media data:

// * audio
// * video
// * screen sharing

// **Dependencies:**

// * common.js;
// * commonError.js;
// * logger.js;
// * stream.js.

(function (exports) {
	'use strict';

	if (typeof exports.xRtc === 'undefined') {
		exports.xRtc = {};
	}

	var xrtc = exports.xRtc,
		webrtc = xrtc.webrtc,
		logger = new xrtc.Logger("UserMedia"),
		getUserMedia = function(options, successCallback, errorCallback) {
			webrtc.getUserMedia(options, onGetUserMediaSuccess, onGetUserMediaError);

			function onGetUserMediaSuccess(stream) {
				if (typeof successCallback === "function") {
					successCallback(new xrtc.Stream(stream));
				}
			}

			function onGetUserMediaError(error) {
				if (typeof errorCallback === "function") {
					var errorMessage =
						"Can't get media stream. " +
						(error.message && error.message !== "" ? error.message : error.name) + ". " +
						"Need to unlock camera/mic access if it was blocked before. For unblocking see special icon in the right corner of the address input of the browser.";
					var xrtcError = new xrtc.CommonError('getUserMedia', errorMessage);
					logger.error('onCreateOfferError', xrtcError);
					errorCallback(xrtcError);
				}
			}
		};

	// **[Public API]:** Asks user to allow use local devices, e.g. **camera**, **microphone**, **screen**.

	// **Note:** Screen sharing available only for *Chrome 25+* <-> *Chrome 25+* with special flag `#enable-usermedia-screen-capture` and only in case
	// when application (app which uses xRtc) was loaded by **HTTPS** protocol.
	// FireFox don't support this feature and even can't receive remote Chrome's screen sharing stream.
	// Opera don't support this feature but can receive Chrome's remote screen sharing stream.
	// This information is actual for FireFox 27, Chrome 33, Opera 20 at least. Maybe in the future the feature will be implemented and for FireFox and Opera.

	// **Simple examples:**

	// * `xRtc.getUserMedia({ audio: true, video: true }, function(stream){}, function(error){});`
	// * `xRtc.getUserMedia({ audio: true }, function(stream){}, function(error){});`
	// * `xRtc.getUserMedia({ video: true }, function(stream){}, function(error){});`
	// * `xRtc.getUserMedia({ video: { mandatory: { mediaSource: "screen" } } }, function(stream){}, function(error){});`
	// * `xRtc.getUserMedia({ video: { mandatory: { mediaSource: "screen" } }, audio: true }, function(stream){}, function(error){});`
	// * `xRtc.getUserMedia({ video: { mandatory: { minWidth: 1280, maxWidth: 1280, minHeight: 720, maxHeight: 720, minFrameRate: 30 }}, function(stream){}, function(error){});`

	//**Note:** No callbacks can be called in case of HTTP, Chrome/Opera browser and if existed local stream was stoped before requesting new local stream (some milliseconds before, maybe seconds).
	// Looks like Chrome browser sharing local stream and this fact influence on mentioned behaviour.

	// **Note:** xRtc.getUserMedia uses the same option as native browser's getUserMedia. Some examples of otions you can find here:
	// <http://webrtc.googlecode.com/svn/trunk/samples/js/demos/html/constraints-and-stats.html>
	xrtc.getUserMedia = function (options, successCallback, errorCallback) {
		if (options && !options.video && !options.audio) {
			var error = new xrtc.CommonError('getUserMedia', "video or audio property of the options parameter should be specified. No sense to create media stream without video and audio components.");
			logger.error('onCreateOfferError', error);
		}

		var mediaOptions = options ? xrtc.utils.clone(options) : { video: true, audio: true };
		if (mediaOptions.video && mediaOptions.video.mandatory && mediaOptions.video.mandatory.mediaSource === 'screen') {
			// Screen sharing feature required no audio.
			var hasAudio = mediaOptions.audio;
			mediaOptions.audio = false;
			delete mediaOptions.video.mandatory.mediaSource;
			mediaOptions.video.mandatory.chromeMediaSource = 'screen';

			// If requested stream is `screen sharing` and with `audio` then `screen sharing stream` will be merged with separate `audio stream`.
			getUserMedia.call(this, mediaOptions, function (screenSharingStream) {
				if (hasAudio) {
					// *FF 20.0.1: (Not shure about other version, FF 21 works fine)*
					// reduces the overall sound of the computer (playing using *Chrome* and maybe another *FF*) after calling this functionality.
					getUserMedia.call(this, { audio: true }, function (audioStream) {
						function addTracks(array, tracks) {
							for (var i = 0; i < tracks.length; i++) {
								array.push(tracks[i]);
							}
						}

						// Combine audio and video components of different streams in one stream.
						var mediaStreamTracks = [];
						addTracks(mediaStreamTracks, audioStream.getAudioTracks());
						addTracks(mediaStreamTracks, screenSharingStream.getVideoTracks());

						successCallback(new webrtc.MediaStream(mediaStreamTracks));
					}, errorCallback);
				} else {
					successCallback(screenSharingStream);
				}
			}, errorCallback);
		} else {
			getUserMedia.call(this, mediaOptions, successCallback, errorCallback);
		}
	};
})(window);