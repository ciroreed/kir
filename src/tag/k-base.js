var Class = require("kaop").Class;

var KBase = Class.inherits(HTMLElement, {
  _shadow: null,
  init: function(template, style) {
    this._shadow = this.attachShadow({
      mode: "open"
    });
    this.append(style);
    this.append(template);
  },
  append: function(rawHtml) {
    if (rawHtml) {
      this._shadow.innerHTML += rawHtml;
    }
  },
  attr: function(k, value) {
    if (!value) {
      return this.getAttribute(k);
    } else {
      return this.setAttribute(k, value);
    }
  },
  on: function(evt, handler) {
    var eventSplit = evt.split(" ");
    var targets = this.q(eventSplit[1], true);
    for (var i = 0; i < targets.length; i++) {
      targets[i].addEventListener(eventSplit[0], handler.bind(this));
    }
  },
  off: function(evt, handler) {
    var eventSplit = evt.split(" ");
    this.q(eventSplit[1]).removeEventListener(eventSplit[0], handler);
  },
  trigger: function(eventName) {
    var evt = new Event(eventName);
    evt.target = this;
    this.dispatchEvent(evt);
  },
  q: function(selector) {
    return this._shadow.querySelector(selector);
  },
  qq: function(selector) {
    return this.querySelector(selector);
  }
});

module.exports = KBase;
