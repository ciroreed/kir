var EventEmitter = require("./common/EventEmitter");
var Class = require("kaop").Class;

var Model = Class.inherits(EventEmitter, {

    attributes: null,

    constructor: function() {
        this.attributes = {};
        for (var defaultProperty in this.defaults || {}) {
            this.attributes[defaultProperty] = this.defaults[defaultProperty];
        }
    },

    read: ["$check: 'uri'", "$GET: 'uri'", "$jsonParse", function(parsed) {
        for (var attribute in parsed) {
            this.attributes[attribute] = parsed[attribute];
        }
    }, "$fireEvent"],

    display: function() {
        return JSON.stringify(this.attributes);
    },

    set: [function(key, value) {
        this.attributes[key] = value;
    }, "$fireEvent"],

    get: function(key) {
        return this.attributes[key];
    }
});

module.exports = Model;
