/* globals TAPi18n, AutoComplete */
import {RocketChat} from 'meteor/rocketchat:lib';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {ReactiveVar} from 'meteor/reactive-var';

const WordCloud = require('meteor/overture8:wordcloud2');

const acEvents = {
	'click .rc-popup-list__item'(e, t) {
		t.ac.onItemClick(this, e);
		t.debounceValidateExpertise(this.item.name);
	},
	'click #more-topics'(e, t) {
		e.preventDefault();
		t.topicSearch.set(true);
	},
	'keydown [name="expertise"]'(e, t) {
		t.ac.onKeyDown(e);
	},
	'keyup [name="expertise"]'(e, t) {
		t.ac.onKeyUp(e);
	},
	'focus [name="expertise"]'(e, t) {
		t.ac.onFocus(e);
	},
	'blur [name="expertise"]'(e, t) {
		t.ac.onBlur(e);
		t.debounceValidateExpertise(e.target.value);
	}
};


Template.AssistifyCreateRequest.helpers({
	autocomplete(key) {
		const instance = Template.instance();
		const param = instance.ac[key];
		return typeof param === 'function' ? param.apply(instance.ac) : param;
	},
	items() {
		return Template.instance().ac.filteredList();
	},
	config() {
		const filter = Template.instance().expertise;
		return {
			filter: filter.get(),
			template_item: 'AssistifyCreateRequestAutocomplete',
			noMatchTemplate: 'AssistifytopicSearchEmpty',
			modifier(text) {
				const f = filter.get();
				return `#${ f.length === 0 ? text : text.replace(new RegExp(filter.get()), function(part) {
					return `<strong>${ part }</strong>`;
				}) }`;
			}
		};
	},
	createIsDisabled() {
		const instance = Template.instance();

		if (instance.validExpertise.get() && !instance.titleError.get()) {
			return '';
		} else {
			return 'disabled';
		}
	},
	expertiseError() {
		const instance = Template.instance();
		return instance.expertiseError.get();
	},
	expertise() {
		const instance = Template.instance();
		return instance.expertise.get();
	},
	titleError() {
		const instance = Template.instance();
		return instance.titleError.get();
	},
	topicSearch() {
		const instance = Template.instance();
		if (window.WordCloud.isSupported !== true) {
			instance.topicSearch.set('');
		}
		return instance.topicSearch.get();
	},
	topics() {
		return function(topics) {
			RocketChat.models.Rooms.find({t: 'e'},
				{
					sort: { ts: 1 }
				}).fetch().forEach(function(room) {
				topics.push(room.fname);
			});
		};
	},
	setExpertise() {
		const instance = Template.instance();
		return function(selectedExpertise) {
			instance.expertise.set(selectedExpertise);
			if (selectedExpertise) {
				instance.debounceValidateExpertise(selectedExpertise);
				instance.topicSearch.set(''); //Search completed.
			}
		};
	}

});


Template.AssistifyCreateRequest.events({
	...acEvents,
	'input #expertise-search'(e, t) {
		const input = e.target;
		const position = input.selectionEnd || input.selectionStart;
		const length = input.value.length;
		document.activeElement === input && e && /input/i.test(e.type) && (input.selectionEnd = position + input.value.length - length);t.expertise.set(input.value);
		t.validExpertise.set(false);
		t.expertiseError.set('');
	},
	'input #request_title'(e, t) {
		const input = e.target;
		t.requestTitle.set(input.value);
		if (!input.value) {
			t.titleError.set('');
		} else {
			t.debounceValidateRequestName(input.value);
		}
	},
	'input #first_question'(e, t) {
		const input = e.target;
		if (input.value) {
			t.openingQuestion.set(input.value);
		} else {
			t.openingQuestion.set('');
		}
	},
	'submit create-channel__content, click .js-save-request'(event, instance) {
		event.preventDefault();
		const expertise = instance.expertise.get();
		const requestTitle = instance.requestTitle.get();
		const openingQuestion = instance.openingQuestion.get();
		if (expertise) {
			instance.titleError.set(null);
			Meteor.call('createRequest', requestTitle, expertise, openingQuestion, (err, result) => {
				if (err) {
					console.log(err);
					switch (err.error) {
						case 'error-invalid-name':
							instance.titleError.set(TAPi18n.__('Invalid_room_name', `${ expertise }...`));
							return;
						case 'error-duplicate-channel-name':
							instance.titleError.set(TAPi18n.__('Request_already_exists'));
							return;
						case 'error-archived-duplicate-name':
							instance.titleError.set(TAPi18n.__('Duplicate_archived_channel_name', name));
							return;
						case 'error-invalid-room-name':
							console.log('room name slug error');
							// 	toastr.error(TAPi18n.__('Duplicate_archived_channel_name', name));
							instance.titleError.set(TAPi18n.__('Invalid_room_name', err.details.channel_name));
							return;
						default:
							return handleError(err);
					}
				}
				console.log('Room Created');
				// toastr.success(TAPi18n.__('New_request_created'));
				const roomCreated = RocketChat.models.Rooms.findOne({_id: result.rid});
				FlowRouter.go('request', {name: roomCreated.name}, FlowRouter.current().queryParams);
			});
		}
	}
});

Template.AssistifyCreateRequest.onRendered(function() {
	const instance = this;
	this.find('input[name="expertise"]').focus();
	this.ac.element = this.find('input[name="expertise"]');
	this.ac.$element = $(this.ac.element);
	this.ac.$element.on('autocompleteselect', function(e, {item}) {
		instance.expertise.set(item.name);
		$('input[name="expertise"]').val(item.name);
		instance.debounceValidateExpertise(item.name);

		return instance.find('.js-save-request').focus();
	});
});

Template.AssistifyCreateRequest.onCreated(function() {
	const instance = this;
	instance.expertise = new ReactiveVar(''); //the value of the text field
	instance.validExpertise = new ReactiveVar(false);
	instance.expertiseError = new ReactiveVar(null);
	instance.titleError = new ReactiveVar(null);
	instance.requestTitle = new ReactiveVar('');
	instance.openingQuestion = new ReactiveVar('');
	instance.topicSearch = new ReactiveVar('');

	instance.debounceValidateExpertise = _.debounce((expertise) => {
		if (!expertise) {
			return false; //expertise is mandatory
		}
		return Meteor.call('assistify:isValidExpertise', expertise, (error, result) => {
			if (error) {
				instance.validExpertise.set(false);
			} else {
				instance.validExpertise.set(result);
				if (!result) {
					instance.expertiseError.set('Expertise_does_not_exist');
				} else {
					instance.expertiseError.set('');
				}
			}
		});
	}, 500);

	instance.debounceValidateRequestName = _.debounce((name) => {
		instance.titleError.set('');
		if (!name) {
			return; //"none" is a valid name
		}
		if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
			Meteor.call('roomDisplayNameExists', name, (error, result) => {
				if (error) {
					return;
				}
				if (result) {
					instance.titleError.set('Request_already_exists');
				}
			});
		} else {
			const reg = new RegExp(`^${ RocketChat.settings.get('UTF8_Names_Validation') }$`);
			const passesRegex = name.length === 0 || reg.test(name);
			if (!passesRegex) {
				instance.titleError.set('Request_no_special_char');
			} else {
				Meteor.call('roomNameExists', name, (error, result) => {
					if (error) {
						return;
					}
					if (result) {
						instance.titleError.set('Request_already_exists');
					}
				});
			}
		}
	}, 500);

	// instance.clearForm = function() {
	// 	instance.requestRoomName.set('');
	// 	instance.expertise.set('');
	// 	instance.find('#expertise-search').value = '';
	// };

	this.ac = new AutoComplete({
		selector: {
			item: '.rc-popup-list__item',
			container: '.rc-popup-list__list'
		},
		limit: 10,
		inputDelay: 300,
		rules: [
			{
				// @TODO maybe change this 'collection' and/or template
				collection: 'expertiseSearch',
				subscription: 'autocompleteExpertise',
				field: 'name',
				matchAll: true,
				doNotChangeWidth: false,
				selector(match) {
					return {term: match};
				},
				sort: 'name'
			}
		]

	});
	this.ac.tmplInst = this;
});
