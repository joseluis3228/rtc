﻿'use strict';

(function (exports) {
	var xrtc = exports.xRtc;
	
	xrtc.Class2(xrtc, 'CommonError', function CommonError(method, message, error) {
		this.method = method;
		this.message = message;
		this.error = error;
	});
})(window);