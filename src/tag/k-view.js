var Class = require("kaop").Class;
var Utils = require("../common/Utils");
var KInclude = require("./k-include");

var KView = Class.inherits(KInclude, {
  attachedCallback: ["$override", function(parent) {
    parent();
  }],
  declare: function(controllerDeclaration){
    this.ctrlClass = Class.static(controllerDeclaration);
    if("init" in this.ctrlClass){
      this.initHook = this.ctrlClass.init;
      delete this.ctrlClass.init;
    }
  },
  loadTemplate: ["$GET: 'path', true", function(raw) {
    this.raw = raw;
    this.invalidate(true);
  }],
  invalidate: ["$compileTpl: 'raw'", function(compiled, fromAttached){
    this.html(compiled);
    Utils.forNi(this.ctrlClass, this.on, this);
    if(!fromAttached){ return; }
    if("initHook" in this){ this.initHook(); }
  }]
});

module.exports = KView;
