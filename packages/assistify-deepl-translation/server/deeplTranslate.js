/**
 * @author Vigneshwaran Odayappan <vickyokrm@gmail.com>
 */

import { TranslationProviderRegistry, AutoTranslate } from 'meteor/rocketchat:autotranslate';
import { RocketChat } from 'meteor/rocketchat:lib';
import _ from 'underscore';

/**
 * Represents DEEPL translate class
 * @class
 * @augments AutoTranslate
 */
class DeeplAutoTranslate extends AutoTranslate {
	/**
	 * setup api reference to deepl translate to be used as message translation provider.
	 * @constructor
	 */
	constructor() {
		super();
		this.name = 'deepl-translate';
		this.apiEndPointUrl = 'https://api.deepl.com/v1/translate';
		// self register & de-register callback - afterSaveMessage based on the activeProvider
		RocketChat.settings.get('AutoTranslate_ServiceProvider', (key, value) => {
			if (this.name === value) {
				this._registerAfterSaveMsgCallBack(this.name);
			} else {
				this._unRegisterAfterSaveMsgCallBack(this.name);
			}
		});
	}

	/**
	 * Returns metadata information about the service provide
	 * @private implements super abstract method.
	 * @return {object}
	 */
	_getProviderMetadata() {
		return {
			name: this.name,
			displayName: TAPi18n.__('AutoTranslate_DeepL'),
			settings: this._getSettings()
		};
	}

	/**
	 * Returns necessary settings information about the translation service provider.
	 * @private implements super abstract method.
	 * @return {object}
	 */
	_getSettings() {
		return {
			apiKey: this.apiKey,
			apiEndPointUrl: this.apiEndPointUrl
		};
	}

	/**
	 * Returns supported languages for translation by the active service provider.
	 * @private implements super abstract method.
	 * @param {string} target
	 * @returns {object} code : value pair
	 */
	_getSupportedLanguages(target) {
		if (this.autoTranslateEnabled && this.apiKey) {
			if (this.supportedLanguages[target]) {
				return this.supportedLanguages[target];
			}
			return this.supportedLanguages[target] = [
				{
					'language': 'EN',
					'name': TAPi18n.__('English')
				},
				{
					'language': 'DE',
					'name': TAPi18n.__('German')
				},
				{
					'language': 'FR',
					'name': TAPi18n.__('French')
				},
				{
					'language': 'ES',
					'name': TAPi18n.__('Spanish')
				},
				{
					'language': 'IT',
					'name': TAPi18n.__('Italian')
				},
				{
					'language': 'NL',
					'name': TAPi18n.__('Dutch')
				},
				{
					'language': 'PL',
					'name': TAPi18n.__('Polish')
				}
			];
		}
	}

	/**
	 * Send Request REST API call to the service provider.
	 * Returns translated message for each target language in target languages.
	 * @private
	 * @param {object} targetMessage
	 * @param {object} targetLanguages
	 * @returns {object} translations: Translated messages for each language
	 */
	_sendRequestTranslateMessage(targetMessage, targetLanguages) {
		const translations = {};
		let msgs = targetMessage.msg.split('\n');
		msgs = msgs.map(msg => encodeURIComponent(msg));
		const query = `text=${ msgs.join('&text=') }`;
		const supportedLanguages = this._getSupportedLanguages('en');
		targetLanguages.forEach(language => {
			if (language.indexOf('-') !== -1 && !_.findWhere(supportedLanguages, {language})) {
				language = language.substr(0, 2);
			}
			let result;
			try {
				result = HTTP.get(this.apiEndPointUrl, {
					params: {
						auth_key: this.apiKey,
						target_lang: language
					}, query
				});
			} catch (e) {
				console.log('Error translating message', e);
			}
			if (result.statusCode === 200 && result.data && result.data.translations && Array.isArray(result.data.translations) && result.data.translations.length > 0) {
				// store translation only when the source and target language are different.
				if (result.data.translations.map(translation => translation.detected_source_language).join() !== language) {
					const txt = result.data.translations.map(translation => translation.text).join('\n');
					translations[language] = this.deTokenize(Object.assign({}, targetMessage, {msg: txt}));
				}
			}
		});
		return translations;
	}

	/**
	 * Returns translated message attachment description in target languages.
	 * @private
	 * @param {object} attachment
	 * @param {object} targetLanguages
	 * @returns {object} translated messages for each target language
	 */
	_sendRequestTranslateMessageAttachments(attachment, targetLanguages) {
		const translations = {};
		const query = `text=${ encodeURIComponent(attachment.description || attachment.text) }`;
		const supportedLanguages = this._getSupportedLanguages('en');
		targetLanguages.forEach(language => {
			if (language.indexOf('-') !== -1 && !_.findWhere(supportedLanguages, {language})) {
				language = language.substr(0, 2);
			}
			let result;
			try {
				result = HTTP.get(this.apiEndPointUrl, {
					params: {
						auth_key: this.apiKey,
						target_lang: language
					}, query
				});
			} catch (e) {
				console.log('Error translating message attachment', e);
			}
			if (result.statusCode === 200 && result.data && result.data.translations && Array.isArray(result.data.translations) && result.data.translations.length > 0) {
				if (result.data.translations.map(translation => translation.detected_source_language).join() !== language) {
					translations[language]= result.data.translations.map(translation => translation.text).join('\n');
				}
			}
		});
		return translations;
	}
}


Meteor.startup(() => {
	TranslationProviderRegistry.registerProvider(new DeeplAutoTranslate());
	RocketChat.AutoTranslate = TranslationProviderRegistry.getActiveServiceProvider();
});
