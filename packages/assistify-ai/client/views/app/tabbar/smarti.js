/* globals TAPi18n */

Template.AssistifySmarti.onCreated(function() {
	this.helpRequest = new ReactiveVar(null);
	this.smartiLoaded = new ReactiveVar(false);
	this.maxTriesLoading = 10;
	this.timeoutMs = 2000;
	this.currentTryLoading = new ReactiveVar(0);

	const instance = this;

	Meteor.subscribe('assistify:helpRequests', instance.data.rid); //not reactively needed, as roomId doesn't change

	this.autorun(() => {
		if (instance.data.rid) {
			const helpRequest = RocketChat.models.HelpRequests.findOneByRoomId(instance.data.rid);
			instance.helpRequest.set(helpRequest);
		}
	});

});

Template.AssistifySmarti.onDestroyed(function() {
	clearTimeout(this.loading);
});

/**
 * Create Smarti (as soon as the script is loaded)
 */
Template.AssistifySmarti.onRendered(function() {

	const instance = this;

	/* in order to avoid duplicated scrollbars, have the outer one hidden */
	const parentContainer = this.$(':parent').parent();
	parentContainer.css('overflow-y', 'initial');
	this.$('.smarti-widget').css('overflow-y', 'auto');

	function createSmarti() {
		if (window.SmartiWidget === undefined) {
			console.log(`Couldn't load Smarti-Widget - try ${ instance.currentTryLoading.get() }`);
			instance.currentTryLoading.set(instance.currentTryLoading.get() + 1);
			if (instance.currentTryLoading.get() < instance.maxTriesLoading) {
				instance.loading = setTimeout(createSmarti, instance.timeoutMs);
			}
		} else {
			instance.smartiLoaded.set(true);
			const SMARTI_URL = RocketChat.settings.get('Assistify_AI_Smarti_Base_URL').replace(/\/?$/, '/');
			const ROCKET_CHAT_URL = RocketChat.settings.get('Site_Url').replace(/\/?$/, '/');
			// stripping only the protocol ("http") from the site-url either creates a secure or an insecure websocket connection
			const WEBSOCKET_URL = `ws${ ROCKET_CHAT_URL.substring(4) }websocket/`;
			const WIDGET_POSTING_TYPE = RocketChat.settings.get('Assistify_AI_Widget_Posting_Type') || 'postRichText';
			const SMARTI_API_PROXY = `${ ROCKET_CHAT_URL }api/v1/assistify/smarti/`;
			const smartiOptions = {
				socketEndpoint: WEBSOCKET_URL,
				smartiEndpoint: SMARTI_URL,
				rocketBaseurl: ROCKET_CHAT_URL,
				smartiApiProxy: SMARTI_API_PROXY,
				channel: instance.data.rid,
				postings: {
					type: WIDGET_POSTING_TYPE,
					cssInputSelector: '.rc-message-box .js-input-message'
				},
				lang: 'de'
			};
			console.debug('Initializing Smarti with options: ', JSON.stringify(smartiOptions, null, 2));
			instance.smarti = new window.SmartiWidget(instance.find('.smarti-widget'), smartiOptions);
		}
	}

	createSmarti();

});

Template.AssistifySmarti.helpers({
	isLivechat() {
		const instance = Template.instance();
		return ChatSubscription.findOne({rid: instance.data.rid}).t === 'l';
	},
	/**
	 This helper is needed in order to create an object which matches the actions bar importing parameters
	 */
	liveChatActions() {
		const instance = Template.instance();
		return {roomId: instance.data.rid};
	},
	helpRequestByRoom() {
		const instance = Template.instance();
		return instance.helpRequest.get();
	},
	loadingClass() {
		const instance = Template.instance();
		if (instance.smartiLoaded.get()) {
			return 'ready';
		} else {
			return instance.currentTryLoading.get() < instance.maxTriesLoading ? 'loading' : 'not-available';
		}
	},
	isLoading() {
		const instance = Template.instance();
		return !instance.smartiLoaded.get() && instance.currentTryLoading.get() < instance.maxTriesLoading;
	},
	loadingNotification() {
		const instance = Template.instance();
		if (instance.currentTryLoading.get() < instance.maxTriesLoading && instance.currentTryLoading.get() > 3) {
			return TAPi18n.__('Widget_loading');
		} else if (instance.currentTryLoading.get() === instance.maxTriesLoading) {
			return TAPi18n.__('Widget_could_not_load');
		}
	}
});

/**
 * Load Smarti script
 */
RocketChat.settings.onload('Assistify_AI_Smarti_Base_URL', function() {
	Meteor.call('getSmartiUiScript', function(error, script) {
		if (error) {
			console.error('could not load Smarti:', error.message);
		} else {
			// generate a script tag for smarti JS
			const doc = document;
			const smartiScriptTag = doc.createElement('script');
			smartiScriptTag.type = 'text/javascript';
			smartiScriptTag.async = true;
			smartiScriptTag.defer = true;
			smartiScriptTag.innerHTML = script;
			// insert the smarti script tag as first script tag
			const firstScriptTag = doc.getElementsByTagName('script')[0];
			firstScriptTag.parentNode.insertBefore(smartiScriptTag, firstScriptTag);
			console.debug('loaded Smarti successfully');
		}
	});
});
