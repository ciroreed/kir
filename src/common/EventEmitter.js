var Class = require("kaop").Class;

var EventEmitter = Class({
    actions: [],
    when: function(idEvent, handler) {
        var actionStore = {
            id: idEvent,
            fn: handler
        };
        this.actions.push(actionStore);
    },
    fire: function(idEvent, subject) {
        for (var i = 0; i < this.actions.length; i++) {
            if (this.actions[i].id === idEvent) {
                if (subject) {
                    this.actions[i].fn.call(subject);
                } else {
                    this.actions[i].fn();
                }
            }
        }
    },
    ignore: function(idEvent) {
        var tmpActions = [];
        for (var i = 0; i < this.actions.length; i++) {
            if (this.actions[i].id !== idEvent) {
                tmpActions.push(this.actions[i]);
            }
        }
        this.actions = tmpActions;
    }
});

module.exports = EventEmitter;
