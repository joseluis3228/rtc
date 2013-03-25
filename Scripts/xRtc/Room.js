﻿'use strict';

(function (exports) {
	var xrtc = exports.xRtc;

	xrtc.Class(xrtc, 'Room', function Room(serverConnector) {
		var proxy = xrtc.Class.proxy(this),
			logger = new xrtc.Logger(this.className),
			name = null,
			participants = [],
			handshakeController = null,
			isHandshakeSubscribed = false,
			isServerConnectorSubscribed = false;

		xrtc.Class.extend(this, xrtc.EventDispatcher, {
			_logger: logger,

			join: function (token) {
				subscribeOnServerConnectorEvents.call(this);
				subscribeOnHandshakeControllerEvents.call(this);

				serverConnector.connect(token);
			},

			leave: function () {
				name = null;
				participants = [];

				unsubscribeFromServerConnectorEvents.call(this);
				unsubscribeFromHandshakeControllerEvents.call(this);
			},

			addHandshake: function (hc) {
				handshakeController = hc;

				subscribeOnHandshakeControllerEvents.call(this);
			},

			getName: function () {
				return name;
			},

			getParticipants: function () {
				//return the copy of array
				return participants.map(function (participant) {
					return participant;
				});
			}
		});

		function subscribeOnServerConnectorEvents() {
			//todo: catch serverConnector open/close events and generate own
			if (!isServerConnectorSubscribed) {
				serverConnector
					.on(xrtc.ServerConnector.serverEvents.participantsUpdated, proxy(onParticipantsUpdated))
					.on(xrtc.ServerConnector.serverEvents.participantConnected, proxy(onParticipantConnected))
					.on(xrtc.ServerConnector.serverEvents.participantDisconnected, proxy(onParticipantDisconnected));

				isServerConnectorSubscribed = true;
			}
		}

		function unsubscribeFromServerConnectorEvents() {
			if (isServerConnectorSubscribed) {
				serverConnector
					.off(xrtc.ServerConnector.serverEvents.participantsUpdated)
					.off(xrtc.ServerConnector.serverEvents.participantConnected)
					.off(xrtc.ServerConnector.serverEvents.participantDisconnected);

				isServerConnectorSubscribed = false;
			}
		}


		function onParticipantsUpdated(data) {
			name = data.room;
			participants = data.connections;
			orderParticipants();

			this.trigger(xrtc.Room.events.participantsUpdated, { paticipants: this.getParticipants() });
		}

		function onParticipantConnected(data) {
			name = data.room;
			participants.push(data.paticipantId);
			orderParticipants();

			this.trigger(xrtc.Room.events.participantConnected, { paticipantId: data.paticipantId });
		}

		function onParticipantDisconnected(data) {
			name = data.room;
			participants.pop(data.paticipantId);
			orderParticipants();

			this.trigger(xrtc.Room.events.participantDisconnected, { paticipantId: data.paticipantId });
		}

		function orderParticipants() {
			participants.sort();
		}

		function subscribeOnHandshakeControllerEvents() {
			if (handshakeController && !isHandshakeSubscribed) {
				var hcEvents = xrtc.HandshakeController.events;
				handshakeController
					.on(hcEvents.sendIce, proxy(onHandshakeSendMessage))
					.on(hcEvents.sendOffer, proxy(onHandshakeSendMessage))
					.on(hcEvents.sendAnswer, proxy(onHandshakeSendMessage))
					.on(hcEvents.sendBye, proxy(onHandshakeSendMessage));

				serverConnector
					.on(hcEvents.receiveIce, proxy(onHandshakeReceiveMessage, hcEvents.receiveIce))
					.on(hcEvents.receiveOffer, proxy(onHandshakeReceiveMessage, hcEvents.receiveOffer))
					.on(hcEvents.receiveAnswer, proxy(onHandshakeReceiveMessage, hcEvents.receiveAnswer))
					.on(hcEvents.receiveBye, proxy(onHandshakeReceiveMessage, hcEvents.receiveBye));

				isHandshakeSubscribed = true;
			}
		}

		function unsubscribeFromHandshakeControllerEvents() {
			if (handshakeController && isHandshakeSubscribed) {
				var hcEvents = xrtc.HandshakeController.events;
				handshakeController
					.off(hcEvents.sendIce)
					.off(hcEvents.sendOffer)
					.off(hcEvents.sendAnswer)
					.off(hcEvents.sendBye);

				serverConnector
					.off(hcEvents.receiveIce)
					.off(hcEvents.receiveOffer)
					.off(hcEvents.receiveAnswer)
					.off(hcEvents.receiveBye);

				isHandshakeSubscribed = false;
			}
		}

		function onHandshakeSendMessage(data) {
			serverConnector.send(data);
		}

		function onHandshakeReceiveMessage(data, event) {
			handshakeController.trigger(event, data);
		}
	});

	xrtc.Room.extend({
		events: {
			participantsUpdated: 'participantsupdated',
			participantConnected: 'participantconnected',
			participantDisconnected: 'participantdisconnected',
		}
	});
})(window);