var Class = require("kaop").Class;

var Utils = Class.static({
  staticId: 1,
  forIn: function(obj, fn, ctx) {
    if (obj) {
      Object.keys(obj).forEach(function(o) {
        if (ctx) {
          fn.call(ctx, obj[o], o);
        } else {
          fn(obj[o], o);
        }
      });
    }
  },
  forNi: function(obj, fn, ctx) {
    if (obj) {
      Object.keys(obj).forEach(function(o) {
        if (ctx) {
          fn.call(ctx, o, obj[o]);
        } else {
          fn(o, obj[o]);
        }
      });
    }
  },
  arrayMerge: function(arr1, arr2) {
    var result = arr1;
    arr2.forEach(function(m) {
      if (!result.some(function(o) {
          return o === m;
        })) {
        result.push(m);
      }
    });
    return result;
  },
  checkRequired: function(obj, required) {
    var keys = Object.keys(obj);
    return required.every(function(k) {
      return keys.indexOf(k) > -1;
    });
  },
  unique: function() {
    return this.staticId++;
  }
});

module.exports = Utils;
