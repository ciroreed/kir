var kaop = require("kaop");
var TagPool = require("./src/common/TagPool");
require("./src/common/customAnnotations").forEach(kaop.annotations.add, annotations);

var k2 = {
  types: {
    Model: require("./src/Model"),
    Collection: require("./src/Collection")
  },
  tags: {
    Kinclude: require("./src/tag/k-include"),
    Kview: require("./src/tag/k-view")
  }
};

if (typeof window === "object") {
  window.k2 = k2;
  window.Class = kaop.Class;

  TagPool.add("k-include", k2.tags.Kinclude);
  TagPool.add("k-view", k2.tags.Kview);
} else {
  module.exports = types;
}
