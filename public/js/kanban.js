var Kanban = new Ractive({
	el: 'content',
	template: '#template',
	data: {
		editing: null,
		cards: [],
		sort: function(array) {
			// array = array.slice();
			return array.sort( function ( a, b ) {
				return a['priority'] < b['priority'] ? -1 : 1;
			});
		},
		formatText: function(text) {
			return marked(text);
		}
	}
});

function getIndex(card_id) {
	var cards = Kanban.get('cards');
	for (var i = 0; i< cards.length; i++) {
		if (cards[i]._id == card_id) return i;
	}
}

Kanban.on({
	addCard: function(evt) {
		$.post('/new-card', {}, function(cards) {
			Kanban.set('cards', cards);
			// Kanban.push('cards', card);
			// Kanban.fire('openCard', null, getIndex(card._id));
		});
		evt.original.preventDefault();
	},
	openCard: function(evt, i) {
		Kanban.set('editing', i);
		Kanban.find('#description').focus();
	},
	setStatus: function(evt, status) {
		Kanban.set('cards[' + Kanban.get('editing') + '].status', status);
		Kanban.fire('saveCard');
		evt.original.preventDefault();
	},
	setPriority: function(evt, priority) {
		Kanban.set('cards[' + Kanban.get('editing') + '].priority', priority);
		Kanban.fire('saveCard');
		evt.original.preventDefault();
	},
	deleteCard: function(evt) {
		var card = Kanban.get('cards[' + Kanban.get('editing') + ']');
		Kanban.splice('cards', Kanban.get('editing'), 1);
		Kanban.set('editing', null);
		$.post('/delete-card/' + card._id , {}, function(cards) {
			Kanban.set('cards', cards);
		});
		evt.original.preventDefault();
	},
	closeCard: function(evt) {
		Kanban.fire('saveCard');
	},
	selectFile: function(evt) {
		Kanban.find('#file-upload').click();
		evt.original.preventDefault();
	},
	uploadFile: function(evt) {
		Kanban.find('#file-form').submit();
		evt.original.preventDefault();
	},
	stopPropagation: function(evt) {
		evt.original.stopPropagation();
	},
	saveCard: function() {
		var card = Kanban.get('cards[' + Kanban.get('editing') + ']');
		Kanban.set('editing', null);
		setTimeout(function() {
			$.post('/edit-card/' + card._id , card, function(cards) {
				Kanban.set('cards', cards);
			});
		}, 500);
	},
	clearBoard: function(evt) {
		if (confirm('Het bord leegmaken en alle kaartjes verwijderen?')) {
			$.post('/clear' , {}, function(cards) {
				Kanban.set('cards', []);
			});
		}
		evt.original.preventDefault();
	}
});

$.getJSON('/cards', function(cards) {
	Kanban.set('cards', cards);
});