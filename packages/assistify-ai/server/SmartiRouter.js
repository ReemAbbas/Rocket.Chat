/* globals SystemLogger, RocketChat */

import {SmartiAdapter} from './lib/SmartiAdapter';

/**
 * The SmartiRouter handles all incoming HTTP requests from Smarti.
 * This is the only place, where adding routes to the Rocket.Chat API, related to Smarti
 * All HTTP inbound traffic (from Rocket.Chat to Smarti) should pass the this router.
 */

/**
 * Add an incoming webhook '/newConversationResult' to receive answers from Smarti.
 * This allows asynchronous callback from Smarti, when analyzing the conversation has finished.
 */
RocketChat.API.v1.addRoute('smarti.result/:_token', {authRequired: false}, {

	post() {

		check(this.bodyParams.data, Match.ObjectIncluding({
			conversation: String
		}));

		const rcWebhookToken = RocketChat.settings.get('Assistify_AI_RocketChat_Webhook_Token');

		//verify token
		if (this.urlParams._token && this.urlParams._token === rcWebhookToken) {
			const conversationId = this.bodyParams.data.conversation;
			const roomId = SmartiAdapter.getRoomId(conversationId);
			SmartiAdapter.analysisCompleted(roomId, conversationId, this.bodyParams.data);
			return RocketChat.API.v1.success();
		} else {
			return RocketChat.API.v1.unauthorized({msg: 'token not valid'});
		}
	}
});
