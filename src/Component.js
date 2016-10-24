var Utils = require("./common/Utils");
var Class = require("kaop").Class;
var View = require("./View");

var Component = Class.inherits(View, {
  model: null,
  collection: null,
  events: null,
  invalidate: ["$override", function(parent) {
    parent();
    Utils.forNi(this.events || {}, this.on, this);
  }],
  on: function(evt, handler) {
    var eventSplit = evt.split(" ");
    var targets = this.q(eventSplit[1], true);
    for (var i = 0; i < targets.length; i++) {
      targets[i].addEventListener(eventSplit[0], handler.bind(this));
    }
  },
  off: function(evt, handler) {
    var eventSplit = idEvent.split(" ");
    this.q(eventSplit[1]).removeEventListener(eventSplit[0], handler);
  },
  root: ["$override", function(parent) {
    if (this.template) {
      setTimeout(this.invalidate);
    } else {
      this.getTemplate();
    }
    return parent();
  }]
});

module.exports = Component;
