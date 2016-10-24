module.exports = [
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
  function $compileTpl(key) {
    this.before(function(opts, next) {
      if (!opts.scope.compileFn) {
        opts.scope.compileFn = EJS.compile(opts.scope[key], {
          context: opts.scope
        });
      }
      opts.args[0] = opts.scope.compileFn();
      next();
    });
  }
];
