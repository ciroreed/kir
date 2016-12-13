var Class = require("kaop").Class;
var KBase = require("./k-base");

var KInclude = Class.inherits(KBase, {
  attachedCallback: function() {
    this.init();
    this.path = this.attr("path");
    this.loadTemplate();
  },
  loadTemplate: ["$GET: 'path', true", function(raw) {
    this.append(raw);
  }]
});

module.exports = KInclude;
