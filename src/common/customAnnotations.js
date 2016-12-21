var Annotations = require("kaop").Annotations;

Annotations.locals.$ResourceAdapter = require("./ResourceAdapter");
Annotations.locals.$EJS = require("ejs");
Annotations.locals.$EJS.delimiter = "?";

var customAnnotations = [
    function $jsonParse(index) {
        this.before(function(opts, next) {
            var parsedArgument = JSON.parse(opts.args[index || 0]);
            opts.args[index || 0] = parsedArgument;
            next();
        });
    },
    function $fireEvent(event) {
        this.after(function(opts, next) {
            opts.scope.fire(event || opts.methodName, opts.scope);
            next();
        });
    },
    function $check(attr) {
        this.before(function(opts, next) {
            if (!opts.scope[attr]) {
                console.error(attr + " is not defined in " + opts.methodName, opts.scope);
            }
            next();
        });
    },
    function $GET(key, cached) {
        this.before(function(opts, next) {
            var cbk = function(raw) {
                opts.args[0] = raw;
                next();
            };
            if (cached) {
                $ResourceAdapter.getCached(opts.scope[key], cbk);
            } else {
                $ResourceAdapter.get(opts.scope[key]).then(cbk);
            }
        });
    },
    function $compileTpl(key) {
        this.before(function(opts, next) {
            if (!opts.scope.compileFn) {
                opts.scope.compileFn = $EJS.compile(opts.scope[key], {
                    context: opts.scope
                });
            }
            opts.args.unshift(opts.scope.compileFn());
            next();
        });
    }
];

module.exports = customAnnotations;
exports = customAnnotations;
