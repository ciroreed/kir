var kaop = require("kaop");

require("./src/common/customAnnotations")
    .forEach(kaop.Annotations.add, kaop.Annotations);

var k2 = {
    types: {
        Model: require("./src/Model"),
        Collection: require("./src/Collection")
    },
    tags: {
        Kinclude: require("./src/tag/k-include"),
        Kview: require("./src/tag/k-view"),
        Kbase: require("./src/tag/k-base")
    },
    TagPool: require("./src/common/TagPool"),
    Class: kaop.Class,
    Annotations: kaop.Annotations
};

if (typeof window === "object") {
    k2.TagPool.add("k-include", k2.tags.Kinclude);
    k2.TagPool.add("k-view", k2.tags.Kview);
    window.k2 = k2;
} else {
    module.exports = k2;
}
