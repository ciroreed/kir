var Utils = require("./common/Utils");
var Class = require("k-oop").Class;

var View = Class({
  path: null,
  anchor: null,
  elid: null,
  html: "",
  template: "",
  constructor: function(path, anchor) {
    this.path = path;
    this.anchor = anchor;
    this.root();
    this.getTemplate();
  },
  root: function() {
    var tmpNode = document.createElement("k2-view");
    this.uid = Utils.unique();
    tmpNode.setAttribute("id", this.uid);
    tmpNode.setAttribute("class", this.path || "");
    var htmlRoot = tmpNode.outerHTML;
    this.html = htmlRoot;
    if (this.anchor) {
      this.q(this.anchor).innerHTML = htmlRoot;
    }
    return htmlRoot;
  },
  getTemplate: ["$GET: 'path', true", function(templateStr) {
    this.template = templateStr;
    this.invalidate();
  }],
  invalidate: ["$compileTpl: 'template'", function(template) {
    if (!this.elid) {
      this.elid = document.getElementById(this.uid);
    }
    this.elid.innerHTML = template;
  }],
  q: function(selector, all) {
    if (all) {
      return (this.elid || document).querySelectorAll(selector);
    }
    return (this.elid || document).querySelector(selector);
  }
});

module.exports = View;
