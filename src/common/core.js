var Utils = require("./Utils");

module.exports = CORE = {
  controllers: [],
  router: function($$routeMappings){
    Utils.forIn($$routeMappings, CORE.prepareRoutes);
    window.addEventListener("hashchange", CORE.executeController);
    window.location.hash = "/";
    CORE.executeController({ newURL: window.location.href });
  },
  executeController: function (e) {
    var _newHash;
    location.hashParams = {};
    if (e) {
      _newHash = e.newURL.split("#").pop();
    } else {
      _newHash = "/";
    }
    CORE.controllers.forEach(function (contMatch) {
      if (contMatch.__regex.test(_newHash)) {
        var _matches = contMatch.__regex.exec(_newHash);
        _matches.shift();
        _matches.forEach(function (mat, i) {
          location.hashParams[contMatch.__paramList[i]] = mat;
        });
        contMatch.__func();
      }
    });
  },
  prepareRoutes: function (controller, hash) {
    var parts;
    var params;
    var result;
    var cont;
    if (hash === "/") {
      params = {};
      result = new RegExp(/^\/$/);
    } else {
      parts = hash.split("/");
      params = parts.filter(function (x) {
        return x.search(":") === 0
      });
      params = params.map(function (x) {
        return x.replace(":", "")
      });
      var _tmp = "^" + parts.join("\/") + "$";
      result = new RegExp(_tmp.replace(/:[a-z]+/g, "(.+)"));
    }
    cont = {
      __regex: result,
      __paramList: params,
      __func: controller
    };
    CORE.controllers.push(cont);
  }
}
