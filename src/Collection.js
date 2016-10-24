var EventEmitter = require("./common/EventEmitter");
var Model = require("./Model");
var Class = require("k-oop").Class

var Collection = Class.inherits(EventEmitter, {
  config: null,
  defaultModel: null,
  nativeArray: null,
  nativeArrayBack: null,
  constructor: function(config) {
    this.config = config || {};
    this.defaultModel = config.model || Model;
    this.nativeArray = [];
    this.nativeArrayBack = [];
  },
  backup: function() {
    this.nativeArrayBack = this.nativeArray.splice(0, this.nativeArray.length);
  },
  applyFilter: ["$eventFire: 'change'", function(predicate) {
    var filterResult = this.filter(predicate);
    this.backup();
    this.empty();
    this.append(filterResult);
  }],
  filter: function(predicate) {
    return this.nativeArray.filter(predicate);
  },
  append: function(tmpArr) {
    for (var i = 0; i < tmpArr.length; i++) {
      this.nativeArray.push(tmpArr[i]);
    }
  },
  all: ["$eventFire: 'change'", function() {
    this.empty();
    this.append(nativeArrayBack);
  }],
  empty: ["$eventFire: 'change'", function() {
    this.nativeArray = [];
  }],
  push: ["$eventFire: 'add'", function(model) {
    if (model instanceof this.defaultModel) {
      this.nativeArray.push(model);
    }
  }],
  find: function(predicate) {
    return this.nativeArray.find(predicate);
  },
  get: function(id) {
    return this.find(function(m) {
      return m.get("id") === id;
    });
  },
  like: function(properties) {
    var keys = Object.keys(properties);
    return this.filter(function(m) {
      for (var i = 0; i < keys.length; i++) {
        if (m.get(keys[i]) !== properties[keys[i]]) return false;
      }
      return true;
    });
  },
  load: function(raw) {
    for (var i = 0; i < raw.length; i++) {
      var tmpModel = new this.defaultModel();
      tmpModel.load(raw[i]);
      this.push(tmpModel);
    }
  },
  map: function(predicate) {
    return this.nativeArray.map(predicate);
  },
  remove: ["$eventFire: 'remove'", function(model) {
    var index = this.nativeArray.indexOf(model);
    this.nativeArray.splice(index, 0);
  }]
});

module.exports = Collection;
