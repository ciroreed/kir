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
  loadTemplate: ["$GET: 'path', true", "$compileTpl: 0", function(templateStr) {
    this.append(templateStr);
    Utils.forNi(this.ctrlClass, this.on, this);
    if("initHook" in this){ this.initHook(); }
  }]
});

module.exports = KView;
