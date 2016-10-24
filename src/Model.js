var EventEmitter = require("./common/EventEmitter");
var Class = require("k-oop").Class;

var Model = Class.inherits(EventEmitter, {
  attributes: null,
  constructor: function() {
    this.attributes = {};
    for (var defaultProperty in this.defaults || {}) {
      this.attributes[defaultProperty] = this.defaults[defaultProperty];
    }
  },
  load: ["$eventFire: 'load'", "$GET: 'url'", "$jsonParse: 0", function(raw) {
    for (var attribute in raw) {
      this.attributes[attribute] = raw[attribute];
    }
  }],
  display: function() {
    return JSON.stringify(this.attributes);
  },
  set: ["$eventFire: 'change'", function(key, value) {
    this.attributes[key] = value;
  }],
  get: function(key) {
    return this.attributes[key];
  }
});

module.exports = Model;
