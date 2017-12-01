/* globals RocketChat */

import {SmartiAdapterFactory} from './Smarti';
import {ApiAiAdapter} from './AiApiAdapter';

export function getKnowledgeAdapter() {
	let knowledgeSource = '';

	const KNOWLEDGE_SRC_APIAI = '0';
	const KNOWLEDGE_SRC_SMARTI = '1';

	RocketChat.settings.get('Assistify_AI_Source', function(key, value) {
		knowledgeSource = value;
	});

	const adapterProps = {
		url: '',
		token: '',
		language: ''
	};

	switch (knowledgeSource) {
		case KNOWLEDGE_SRC_APIAI:
			adapterProps.url = 'https://api.api.ai/api/query?v=20150910';

			RocketChat.settings.get('Assistify_AI_Apiai_Key', function(key, value) {
				adapterProps.token = value;
			});
			RocketChat.settings.get('Assistify_AI_Apiai_Language', function(key, value) {
				adapterProps.language = value;
			});

			return new ApiAiAdapter(adapterProps);
		case KNOWLEDGE_SRC_SMARTI:
			return SmartiAdapterFactory.getInstance(); // buffering done inside the factory method
	}
}
