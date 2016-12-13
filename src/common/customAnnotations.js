var annotations = require("kaop").annotations;

annotations.locals.ResourceAdapter = require("./ResourceAdapter");
annotations.locals.ejs = require("ejs");
annotations.locals.ejs.delimiter = "?";

var customAnnotations = [
  function $jsonParse(index) {
    this.before(function(opts, next) {
      var parsedArgument = JSON.parse(opts.args[index]);
      this.args.unshift(parsedArgument);
      next();
    });
  },
  function $eventFire(event) {
    this.after(function(opts, next) {
      opts.scope.fire(event);
      next();
    });
  },
  function $GET(key, cached) {
    this.before(function(opts, next) {
      var cbk = function(raw) {
        opts.args.unshift(raw);
        next();
      };
      if (cached) {
        ResourceAdapter.getCached(opts.scope[key], cbk);
      } else {
        ResourceAdapter.get(opts.scope[key]).then(cbk);
      }
    });
  },
  function $timeOut(milisec) {
    this.after(function(opts, next) {
      setTimeout(next, milisec);
    });
  },
  function $compileTpl(index) {
    this.before(function(opts, next) {
      if (!opts.scope.compileFn) {
        opts.scope.compileFn = ejs.compile(opts.args[index], {
          context: opts.scope
        });
      }
      opts.args[index] = opts.scope.compileFn();
      next();
    });
  }
];

module.exports = customAnnotations;
