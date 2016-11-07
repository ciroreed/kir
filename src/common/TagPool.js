var Class = require("kaop").Class;

var TagPool = Class.static({
  add: function(tag, constructor) {
    document.registerElement(tag, {
      prototype: new constructor()
    });
  }
});

module.exports = TagPool;
