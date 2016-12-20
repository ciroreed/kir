var Class = require("kaop").Class;
var Utils = require("../common/Utils");
var KInclude = require("./k-include");

var KView = Class.inherits(KInclude, {
  attachedCallback: ["$override", function(parent) {
    parent();
  }],
  declare: function(controllerDeclaration){
    if(this.filled) { return; }
    Utils.forIn(Class.static(controllerDeclaration), function(prop, key){
      this[key] = prop;
    }, this);
    this.filled = true;
  },
  loadTemplate: ["$GET: 'path', true", function(raw) {
    this.raw = raw;
    this.invalidate(true);
  }],
  invalidate: ["$compileTpl: 'raw'", function(compiled, fromAttached){
    this.html(compiled);
    Utils.forNi(this, this.on, this);
    if(!fromAttached){ return; }
    if("constructor" in this){ this.constructor(); }
  }]
});

module.exports = KView;
