var kaop = require("kaop");
var ejs = require("ejs");
var TagPool = require("./src/common/TagPool");

ejs.delimiter = '?';
kaop.annotations.locals.ResourceAdapter = require("./src/common/ResourceAdapter");
kaop.annotations.locals.ejs = ejs;
require("./src/common/customAnnotations").forEach(kaop.annotations.add, annotations);

var types = {
  Component: require("./src/Component"),
  View: require("./src/View"),
  Model: require("./src/Model"),
  Collection: require("./src/Collection"),
  Class: kaop.Class
};

if (typeof window === "object") {
  window.k2 = types;
  TagPool.add("k-include", require("./src/tag/k-include"));
} else {
  module.exports = types;
}
