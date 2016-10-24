var Class = require("k-oop").Class;
var HttpRequest = require("./HttpRequest");

var ResourceAdapter = Class.static({
  pendingResources: [],
  awaitResources: {},
  localCache: {},
  defaultHeaders: {},
  saveLocalCache: function(resource, response) {
    this.localCache[resource] = response;
    for (var i = 0; i < this.awaitResources[resource].length; i++) {
      this.awaitResources[resource][i](response);
    }
    delete this.awaitResources[resource];
  },
  getCached: function(resource, callback) {
    if (this.localCache[resource]) {
      callback(this.localCache[resource]);
      return;
    }
    if (this.pendingResources.indexOf(resource) === -1) {
      this.get(resource).then(function(response) {
        this.saveLocalCache(resource, response);
        this.pendingResources.splice(this.pendingResources.indexOf(resource), 1);
      }.bind(this));
      this.pendingResources.push(resource);
    }
    if (!this.awaitResources[resource]) {
      this.awaitResources[resource] = [];
    }
    this.awaitResources[resource].push(callback);
  },
  get: function(resource) {
    return new HttpRequest("GET", resource, this.defaultHeaders);
  },
  post: function(resource, body) {
    var request = new HttpRequest("POST", resource, this.defaultHeaders);
    request.setBody(body);
    return request;
  },
  put: function(resource, body) {
    var request = new HttpRequest("PUT", resource, this.defaultHeaders);
    request.setBody(body);
    return request;
  },
  del: function(resource) {
    return new HttpRequest("DELETE", resource, this.defaultHeaders);
  }
});

module.exports = ResourceAdapter;
