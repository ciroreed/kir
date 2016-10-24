var kaop = require("k-oop");
var EJS = require("ejs");
ejs.delimiter = '?';
kaop.annotations.locals.ResourceAdapter = require("./src/common/ResourceAdapter");
kaop.annotations.locals.EJS = EJS;
require("./src/common/customAnnotations").forEach(kaop.annotations.add, annotations);

var types = {
  Component: require("./src/Component"),
  View: require("./src/View"),
  Model: require("./src/Model"),
  Collection: require("./src/Collection"),
  Class: kaop.Class
};

if (window) {
  window.k2 = types;
} else {
  module.exports = types;
}
