Meteor.startup(() => {
	const addAISettings = function() {

		this.section('Knowledge_Base', function() {

			this.add('Assistify_AI_Enabled', false, {
				type: 'boolean',
				public: true,
				i18nLabel: 'Enabled'
			});

			this.add('Assistify_AI_Source', '', {
				type: 'select',
				values: [
					{key: '0', i18nLabel: 'Assistify_AI_Source_APIAI'},
					{key: '1', i18nLabel: 'Assistify_AI_Source_Smarti'}
				],
				public: true,
				i18nLabel: 'Assistify_AI_Source'
			});

			this.add('Assistify_AI_Smarti_Base_URL', '', {
				type: 'string',
				public: true,
				i18nLabel: 'Assistify_AI_Smarti_Base_URL'
			});

			this.add('Assistify_AI_Smarti_Hook_Token', '', {
				type: 'string',
				public: true,
				i18nLabel: 'Assistify_AI_Smarti_Hook_Token'
			});

			this.add('Assistify_AI_Smarti_Auth_Token', '', {
				type: 'string',
				public: true,
				i18nLabel: 'Assistify_AI_Smarti_Auth_Token'
			});

			let domain = RocketChat.settings.get('Site_Url');
			if (domain) {
				domain = domain
					.replace('https://', '')
					.replace('http://', '');
				while (domain.charAt(domain.length - 1) === '/') {
					domain = domain.substr(0, domain.length - 1);
				}
			}
			this.add('Assistify_AI_Smarti_Domain', domain, {
				type: 'string',
				public: true,
				i18nLabel: 'Assistify_AI_Smarti_Domain'
			});

			this.add('Assistify_AI_Widget_Posting_Type', '', {
				type: 'select',
				values: [
					{key: 'suggestText', i18nLabel: 'Assistify_AI_Widget_Posting_Type_SuggestText'},
					{key: 'postText', i18nLabel: 'Assistify_AI_Widget_Posting_Type_PostText'},
					{key: 'postRichText', i18nLabel: 'Assistify_AI_Widget_Posting_Type_PostRichText'}
				],
				public: true,
				i18nLabel: 'Assistify_AI_Widget_Posting_Type'
			});

			this.add('reload_Assistify', 'reloadSmarti', {
				type: 'action',
				actionText: 'Reload_Settings'
			});
		});
	};

	// add the setting group if needed or reuse the existing one
	RocketChat.settings.get('Assistify') ?
		RocketChat.settings.get('Assistify', addAISettings) :
		RocketChat.settings.addGroup('Assistify', addAISettings);
});
