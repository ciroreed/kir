var Class = require("k-oop").Class;

var HttpRequest = Class({
  xhttp: null,
  callbacks: null,
  errorCallback: null,
  verb: null,
  url: null,
  data: null,
  constructor: function(verb, url, headers) {
    this.xhttp = new XMLHttpRequest();
    this.callbacks = [];
    this.errorCallback = function() {};
    this.verb = verb;
    this.url = url;
    for (var headerKey in headers) {
      this.xhttp.setRequestHeader(headerKey, headers[headerKey]);
    }
    return this;
  },
  then: function(callback) {
    if (!this.callbacks.length) {
      this.start();
    }
    this.callbacks.push(callback);
  },
  start: function() {
    this.xhttp.onreadystatechange = this.requestStatusChange.bind(this);
    this.xhttp.open(this.verb, this.url, true);
    this.xhttp.send(this.data);
  },
  requestStatusChange: function() {
    if (this.xhttp.readyState === 4) {
      if (this.xhttp.status === 200) {
        for (var i = 0; i < this.callbacks.length; i++) {
          this.callbacks[i](this.xhttp.responseText);
        }
      } else {
        this.errorCallback({
          status: this.xhttp.status,
          message: this.xhttp.responseText
        });
      }
    }
  }
});

module.exports = HttpRequest;
