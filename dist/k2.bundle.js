(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./src/Collection":8,"./src/Component":9,"./src/Model":10,"./src/View":11,"./src/common/ResourceAdapter":14,"./src/common/TagPool":15,"./src/common/customAnnotations":17,"./src/tag/k-include":19,"ejs":2,"kaop":5}],2:[function(require,module,exports){
/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

'use strict';

/**
 * @file Embedded JavaScript templating engine.
 * @author Matthew Eernisse <mde@fleegix.org>
 * @author Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 * @project EJS
 * @license {@link http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0}
 */

/**
 * EJS internal functions.
 *
 * Technically this "module" lies in the same file as {@link module:ejs}, for
 * the sake of organization all the private functions re grouped into this
 * module.
 *
 * @module ejs-internal
 * @private
 */

/**
 * Embedded JavaScript templating engine.
 *
 * @module ejs
 * @public
 */

var fs = require('fs');
var path = require('path');
var utils = require('./utils');

var scopeOptionWarned = false;
var _VERSION_STRING = require('../package.json').version;
var _DEFAULT_DELIMITER = '%';
var _DEFAULT_LOCALS_NAME = 'locals';
var _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)';
var _OPTS = [ 'cache', 'filename', 'delimiter', 'scope', 'context',
        'debug', 'compileDebug', 'client', '_with', 'root', 'rmWhitespace',
        'strict', 'localsName'];
var _TRAILING_SEMCOL = /;\s*$/;
var _BOM = /^\uFEFF/;

/**
 * EJS template function cache. This can be a LRU object from lru-cache NPM
 * module. By default, it is {@link module:utils.cache}, a simple in-process
 * cache that grows continuously.
 *
 * @type {Cache}
 */

exports.cache = utils.cache;

/**
 * Name of the object containing the locals.
 *
 * This variable is overriden by {@link Options}`.localsName` if it is not
 * `undefined`.
 *
 * @type {String}
 * @public
 */

exports.localsName = _DEFAULT_LOCALS_NAME;

/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * @param {String}  name     specified path
 * @param {String}  filename parent file path
 * @param {Boolean} isDir    parent file path whether is directory
 * @return {String}
 */
exports.resolveInclude = function(name, filename, isDir) {
  var dirname = path.dirname;
  var extname = path.extname;
  var resolve = path.resolve;
  var includePath = resolve(isDir ? filename : dirname(filename), name);
  var ext = extname(name);
  if (!ext) {
    includePath += '.ejs';
  }
  return includePath;
};

/**
 * Get the path to the included file by Options
 * 
 * @param  {String}  path    specified path
 * @param  {Options} options compilation options
 * @return {String}
 */
function getIncludePath(path, options){
  var includePath;
  if (path.charAt(0) == '/') {
    includePath = exports.resolveInclude(path.replace(/^\/*/,''), options.root || '/', true);
  }
  else {
    if (!options.filename) {
      throw new Error('`include` use relative path requires the \'filename\' option.');
    }
    includePath = exports.resolveInclude(path, options.filename);  
  }
  return includePath;
}

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `template` is not set, the file specified in `options.filename` will be
 * read.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @memberof module:ejs-internal
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */

function handleCache(options, template) {
  var func;
  var filename = options.filename;
  var hasTemplate = arguments.length > 1;

  if (options.cache) {
    if (!filename) {
      throw new Error('cache option requires a filename');
    }
    func = exports.cache.get(filename);
    if (func) {
      return func;
    }
    if (!hasTemplate) {
      template = fs.readFileSync(filename).toString().replace(_BOM, '');
    }
  }
  else if (!hasTemplate) {
    // istanbul ignore if: should not happen at all
    if (!filename) {
      throw new Error('Internal EJS error: no file name or template '
                    + 'provided');
    }
    template = fs.readFileSync(filename).toString().replace(_BOM, '');
  }
  func = exports.compile(template, options);
  if (options.cache) {
    exports.cache.set(filename, func);
  }
  return func;
}

/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned
 * @static
 */

function includeFile(path, options) {
  var opts = utils.shallowCopy({}, options);
  opts.filename = getIncludePath(path, opts);
  return handleCache(opts);
}

/**
 * Get the JavaScript source of an included file.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {Object}
 * @static
 */

function includeSource(path, options) {
  var opts = utils.shallowCopy({}, options);
  var includePath;
  var template;
  includePath = getIncludePath(path,opts);
  template = fs.readFileSync(includePath).toString().replace(_BOM, '');
  opts.filename = includePath;
  var templ = new Template(template, opts);
  templ.generateSource();
  return {
    source: templ.source,
    filename: includePath,
    template: template
  };
}

/**
 * Re-throw the given `err` in context to the `str` of ejs, `filename`, and
 * `lineno`.
 *
 * @implements RethrowCallback
 * @memberof module:ejs-internal
 * @param {Error}  err      Error object
 * @param {String} str      EJS source
 * @param {String} filename file name of the EJS file
 * @param {String} lineno   line number of the error
 * @static
 */

function rethrow(err, str, filename, lineno){
  var lines = str.split('\n');
  var start = Math.max(lineno - 3, 0);
  var end = Math.min(lines.length, lineno + 3);
  // Error context
  var context = lines.slice(start, end).map(function (line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}

/**
 * Copy properties in data object that are recognized as options to an
 * options object.
 *
 * This is used for compatibility with earlier versions of EJS and Express.js.
 *
 * @memberof module:ejs-internal
 * @param {Object}  data data object
 * @param {Options} opts options object
 * @static
 */

function cpOptsInData(data, opts) {
  _OPTS.forEach(function (p) {
    if (typeof data[p] != 'undefined') {
      opts[p] = data[p];
    }
  });
}

/**
 * Compile the given `str` of ejs into a template function.
 *
 * @param {String}  template EJS template
 *
 * @param {Options} opts     compilation options
 *
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `opts.client`, either type might be returned.
 * @public
 */

exports.compile = function compile(template, opts) {
  var templ;

  // v1 compat
  // 'scope' is 'context'
  // FIXME: Remove this in a future version
  if (opts && opts.scope) {
    if (!scopeOptionWarned){
      console.warn('`scope` option is deprecated and will be removed in EJS 3');
      scopeOptionWarned = true;
    }
    if (!opts.context) {
      opts.context = opts.scope;
    }
    delete opts.scope;
  }
  templ = new Template(template, opts);
  return templ.compile();
};

/**
 * Render the given `template` of ejs.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}   template EJS template
 * @param {Object}  [data={}] template data
 * @param {Options} [opts={}] compilation and rendering options
 * @return {String}
 * @public
 */

exports.render = function (template, d, o) {
  var data = d || {};
  var opts = o || {};

  // No options object -- if there are optiony names
  // in the data, copy them to options
  if (arguments.length == 2) {
    cpOptsInData(data, opts);
  }

  return handleCache(opts, template)(data);
};

/**
 * Render an EJS file at the given `path` and callback `cb(err, str)`.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}             path     path to the EJS file
 * @param {Object}            [data={}] template data
 * @param {Options}           [opts={}] compilation and rendering options
 * @param {RenderFileCallback} cb callback
 * @public
 */

exports.renderFile = function () {
  var args = Array.prototype.slice.call(arguments);
  var filename = args.shift();
  var cb = args.pop();
  var data = args.shift() || {};
  var opts = args.pop() || {};
  var result;

  // Don't pollute passed in opts obj with new vals
  opts = utils.shallowCopy({}, opts);

  // No options object -- if there are optiony names
  // in the data, copy them to options
  if (arguments.length == 3) {
    // Express 4
    if (data.settings && data.settings['view options']) {
      cpOptsInData(data.settings['view options'], opts);
    }
    // Express 3 and lower
    else {
      cpOptsInData(data, opts);
    }
  }
  opts.filename = filename;

  try {
    result = handleCache(opts)(data);
  }
  catch(err) {
    return cb(err);
  }
  return cb(null, result);
};

/**
 * Clear intermediate JavaScript cache. Calls {@link Cache#reset}.
 * @public
 */

exports.clearCache = function () {
  exports.cache.reset();
};

function Template(text, opts) {
  opts = opts || {};
  var options = {};
  this.templateText = text;
  this.mode = null;
  this.truncate = false;
  this.currentLine = 1;
  this.source = '';
  this.dependencies = [];
  options.client = opts.client || false;
  options.escapeFunction = opts.escape || utils.escapeXML;
  options.compileDebug = opts.compileDebug !== false;
  options.debug = !!opts.debug;
  options.filename = opts.filename;
  options.delimiter = opts.delimiter || exports.delimiter || _DEFAULT_DELIMITER;
  options.strict = opts.strict || false;
  options.context = opts.context;
  options.cache = opts.cache || false;
  options.rmWhitespace = opts.rmWhitespace;
  options.root = opts.root;
  options.localsName = opts.localsName || exports.localsName || _DEFAULT_LOCALS_NAME;

  if (options.strict) {
    options._with = false;
  }
  else {
    options._with = typeof opts._with != 'undefined' ? opts._with : true;
  }

  this.opts = options;

  this.regex = this.createRegex();
}

Template.modes = {
  EVAL: 'eval',
  ESCAPED: 'escaped',
  RAW: 'raw',
  COMMENT: 'comment',
  LITERAL: 'literal'
};

Template.prototype = {
  createRegex: function () {
    var str = _REGEX_STRING;
    var delim = utils.escapeRegExpChars(this.opts.delimiter);
    str = str.replace(/%/g, delim);
    return new RegExp(str);
  },

  compile: function () {
    var src;
    var fn;
    var opts = this.opts;
    var prepended = '';
    var appended = '';
    var escape = opts.escapeFunction;

    if (!this.source) {
      this.generateSource();
      prepended += '  var __output = [], __append = __output.push.bind(__output);' + '\n';
      if (opts._with !== false) {
        prepended +=  '  with (' + opts.localsName + ' || {}) {' + '\n';
        appended += '  }' + '\n';
      }
      appended += '  return __output.join("");' + '\n';
      this.source = prepended + this.source + appended;
    }

    if (opts.compileDebug) {
      src = 'var __line = 1' + '\n'
          + '  , __lines = ' + JSON.stringify(this.templateText) + '\n'
          + '  , __filename = ' + (opts.filename ?
                JSON.stringify(opts.filename) : 'undefined') + ';' + '\n'
          + 'try {' + '\n'
          + this.source
          + '} catch (e) {' + '\n'
          + '  rethrow(e, __lines, __filename, __line);' + '\n'
          + '}' + '\n';
    }
    else {
      src = this.source;
    }

    if (opts.debug) {
      console.log(src);
    }

    if (opts.client) {
      src = 'escape = escape || ' + escape.toString() + ';' + '\n' + src;
      if (opts.compileDebug) {
        src = 'rethrow = rethrow || ' + rethrow.toString() + ';' + '\n' + src;
      }
    }

    if (opts.strict) {
      src = '"use strict";\n' + src;
    }

    try {
      fn = new Function(opts.localsName + ', escape, include, rethrow', src);
    }
    catch(e) {
      // istanbul ignore else
      if (e instanceof SyntaxError) {
        if (opts.filename) {
          e.message += ' in ' + opts.filename;
        }
        e.message += ' while compiling ejs';
      }
      throw e;
    }

    if (opts.client) {
      fn.dependencies = this.dependencies;
      return fn;
    }

    // Return a callable function which will execute the function
    // created by the source-code, with the passed data as locals
    // Adds a local `include` function which allows full recursive include
    var returnedFn = function (data) {
      var include = function (path, includeData) {
        var d = utils.shallowCopy({}, data);
        if (includeData) {
          d = utils.shallowCopy(d, includeData);
        }
        return includeFile(path, opts)(d);
      };
      return fn.apply(opts.context, [data || {}, escape, include, rethrow]);
    };
    returnedFn.dependencies = this.dependencies;
    return returnedFn;
  },

  generateSource: function () {
    var opts = this.opts;

    if (opts.rmWhitespace) {
      // Have to use two separate replace here as `^` and `$` operators don't
      // work well with `\r`.
      this.templateText =
        this.templateText.replace(/\r/g, '').replace(/^\s+|\s+$/gm, '');
    }

    // Slurp spaces and tabs before <%_ and after _%>
    this.templateText =
      this.templateText.replace(/[ \t]*<%_/gm, '<%_').replace(/_%>[ \t]*/gm, '_%>');

    var self = this;
    var matches = this.parseTemplateText();
    var d = this.opts.delimiter;

    if (matches && matches.length) {
      matches.forEach(function (line, index) {
        var opening;
        var closing;
        var include;
        var includeOpts;
        var includeObj;
        var includeSrc;
        // If this is an opening tag, check for closing tags
        // FIXME: May end up with some false positives here
        // Better to store modes as k/v with '<' + delimiter as key
        // Then this can simply check against the map
        if ( line.indexOf('<' + d) === 0        // If it is a tag
          && line.indexOf('<' + d + d) !== 0) { // and is not escaped
          closing = matches[index + 2];
          if (!(closing == d + '>' || closing == '-' + d + '>' || closing == '_' + d + '>')) {
            throw new Error('Could not find matching close tag for "' + line + '".');
          }
        }
        // HACK: backward-compat `include` preprocessor directives
        if ((include = line.match(/^\s*include\s+(\S+)/))) {
          opening = matches[index - 1];
          // Must be in EVAL or RAW mode
          if (opening && (opening == '<' + d || opening == '<' + d + '-' || opening == '<' + d + '_')) {
            includeOpts = utils.shallowCopy({}, self.opts);
            includeObj = includeSource(include[1], includeOpts);
            if (self.opts.compileDebug) {
              includeSrc =
                  '    ; (function(){' + '\n'
                  + '      var __line = 1' + '\n'
                  + '      , __lines = ' + JSON.stringify(includeObj.template) + '\n'
                  + '      , __filename = ' + JSON.stringify(includeObj.filename) + ';' + '\n'
                  + '      try {' + '\n'
                  + includeObj.source
                  + '      } catch (e) {' + '\n'
                  + '        rethrow(e, __lines, __filename, __line);' + '\n'
                  + '      }' + '\n'
                  + '    ; }).call(this)' + '\n';
            }else{
              includeSrc = '    ; (function(){' + '\n' + includeObj.source +
                  '    ; }).call(this)' + '\n';
            }
            self.source += includeSrc;
            self.dependencies.push(exports.resolveInclude(include[1],
                includeOpts.filename));
            return;
          }
        }
        self.scanLine(line);
      });
    }

  },

  parseTemplateText: function () {
    var str = this.templateText;
    var pat = this.regex;
    var result = pat.exec(str);
    var arr = [];
    var firstPos;

    while (result) {
      firstPos = result.index;

      if (firstPos !== 0) {
        arr.push(str.substring(0, firstPos));
        str = str.slice(firstPos);
      }

      arr.push(result[0]);
      str = str.slice(result[0].length);
      result = pat.exec(str);
    }

    if (str) {
      arr.push(str);
    }

    return arr;
  },

  scanLine: function (line) {
    var self = this;
    var d = this.opts.delimiter;
    var newLineCount = 0;

    function _addOutput() {
      if (self.truncate) {
        // Only replace single leading linebreak in the line after
        // -%> tag -- this is the single, trailing linebreak
        // after the tag that the truncation mode replaces
        // Handle Win / Unix / old Mac linebreaks -- do the \r\n
        // combo first in the regex-or
        line = line.replace(/^(?:\r\n|\r|\n)/, '');
        self.truncate = false;
      }
      else if (self.opts.rmWhitespace) {
        // Gotta be more careful here.
        // .replace(/^(\s*)\n/, '$1') might be more appropriate here but as
        // rmWhitespace already removes trailing spaces anyway so meh.
        line = line.replace(/^\n/, '');
      }
      if (!line) {
        return;
      }

      // Preserve literal slashes
      line = line.replace(/\\/g, '\\\\');

      // Convert linebreaks
      line = line.replace(/\n/g, '\\n');
      line = line.replace(/\r/g, '\\r');

      // Escape double-quotes
      // - this will be the delimiter during execution
      line = line.replace(/"/g, '\\"');
      self.source += '    ; __append("' + line + '")' + '\n';
    }

    newLineCount = (line.split('\n').length - 1);

    switch (line) {
      case '<' + d:
      case '<' + d + '_':
        this.mode = Template.modes.EVAL;
        break;
      case '<' + d + '=':
        this.mode = Template.modes.ESCAPED;
        break;
      case '<' + d + '-':
        this.mode = Template.modes.RAW;
        break;
      case '<' + d + '#':
        this.mode = Template.modes.COMMENT;
        break;
      case '<' + d + d:
        this.mode = Template.modes.LITERAL;
        this.source += '    ; __append("' + line.replace('<' + d + d, '<' + d) + '")' + '\n';
        break;
      case d + d + '>':
        this.mode = Template.modes.LITERAL;
        this.source += '    ; __append("' + line.replace(d + d + '>', d + '>') + '")' + '\n';
        break;
      case d + '>':
      case '-' + d + '>':
      case '_' + d + '>':
        if (this.mode == Template.modes.LITERAL) {
          _addOutput();
        }

        this.mode = null;
        this.truncate = line.indexOf('-') === 0 || line.indexOf('_') === 0;
        break;
      default:
        // In script mode, depends on type of tag
        if (this.mode) {
          // If '//' is found without a line break, add a line break.
          switch (this.mode) {
            case Template.modes.EVAL:
            case Template.modes.ESCAPED:
            case Template.modes.RAW:
              if (line.lastIndexOf('//') > line.lastIndexOf('\n')) {
                line += '\n';
              }
          }
          switch (this.mode) {
            // Just executing code
            case Template.modes.EVAL:
              this.source += '    ; ' + line + '\n';
              break;
            // Exec, esc, and output
            case Template.modes.ESCAPED:
              this.source += '    ; __append(escape(' +
                line.replace(_TRAILING_SEMCOL, '').trim() + '))' + '\n';
              break;
            // Exec and output
            case Template.modes.RAW:
              this.source += '    ; __append(' +
                line.replace(_TRAILING_SEMCOL, '').trim() + ')' + '\n';
              break;
            case Template.modes.COMMENT:
              // Do nothing
              break;
            // Literal <%% mode, append as raw output
            case Template.modes.LITERAL:
              _addOutput();
              break;
          }
        }
        // In string mode, just add the output
        else {
          _addOutput();
        }
    }

    if (self.opts.compileDebug && newLineCount) {
      this.currentLine += newLineCount;
      this.source += '    ; __line = ' + this.currentLine + '\n';
    }
  }
};

/**
 * Escape characters reserved in XML.
 *
 * This is simply an export of {@link module:utils.escapeXML}.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @public
 * @func
 * */
exports.escapeXML = utils.escapeXML;

/**
 * Express.js support.
 *
 * This is an alias for {@link module:ejs.renderFile}, in order to support
 * Express.js out-of-the-box.
 *
 * @func
 */

exports.__express = exports.renderFile;

// Add require support
/* istanbul ignore else */
if (require.extensions) {
  require.extensions['.ejs'] = function (module, flnm) {
    var filename = flnm || /* istanbul ignore next */ module.filename;
    var options = {
          filename: filename,
          client: true
        };
    var template = fs.readFileSync(filename).toString();
    var fn = exports.compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
}

/**
 * Version of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */

exports.VERSION = _VERSION_STRING;

/* istanbul ignore if */
if (typeof window != 'undefined') {
  window.ejs = exports;
}

},{"../package.json":4,"./utils":3,"fs":20,"path":21}],3:[function(require,module,exports){
/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

/**
 * Private utility functions
 * @module utils
 * @private
 */

'use strict';

var regExpChars = /[|\\{}()[\]^$+*?.]/g;

/**
 * Escape characters reserved in regular expressions.
 *
 * If `string` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} string Input string
 * @return {String} Escaped string
 * @static
 * @private
 */
exports.escapeRegExpChars = function (string) {
  // istanbul ignore if
  if (!string) {
    return '';
  }
  return String(string).replace(regExpChars, '\\$&');
};

var _ENCODE_HTML_RULES = {
      '&': '&amp;'
    , '<': '&lt;'
    , '>': '&gt;'
    , '"': '&#34;'
    , "'": '&#39;'
    }
  , _MATCH_HTML = /[&<>\'"]/g;

function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};

/**
 * Stringified version of constants used by {@link module:utils.escapeXML}.
 *
 * It is used in the process of generating {@link ClientFunction}s.
 *
 * @readonly
 * @type {String}
 */

var escapeFuncStr =
  'var _ENCODE_HTML_RULES = {\n'
+ '      "&": "&amp;"\n'
+ '    , "<": "&lt;"\n'
+ '    , ">": "&gt;"\n'
+ '    , \'"\': "&#34;"\n'
+ '    , "\'": "&#39;"\n'
+ '    }\n'
+ '  , _MATCH_HTML = /[&<>\'"]/g;\n'
+ 'function encode_char(c) {\n'
+ '  return _ENCODE_HTML_RULES[c] || c;\n'
+ '};\n';

/**
 * Escape characters reserved in XML.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @implements {EscapeCallback}
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @static
 * @private
 */

exports.escapeXML = function (markup) {
  return markup == undefined
    ? ''
    : String(markup)
        .replace(_MATCH_HTML, encode_char);
};
exports.escapeXML.toString = function () {
  return Function.prototype.toString.call(this) + ';\n' + escapeFuncStr
};

/**
 * Copy all properties from one object to another, in a shallow fashion.
 *
 * @param  {Object} to   Destination object
 * @param  {Object} from Source object
 * @return {Object}      Destination object
 * @static
 * @private
 */
exports.shallowCopy = function (to, from) {
  from = from || {};
  for (var p in from) {
    to[p] = from[p];
  }
  return to;
};

/**
 * Simple in-process cache implementation. Does not implement limits of any
 * sort.
 *
 * @implements Cache
 * @static
 * @private
 */
exports.cache = {
  _data: {},
  set: function (key, val) {
    this._data[key] = val;
  },
  get: function (key) {
    return this._data[key];
  },
  reset: function () {
    this._data = {};
  }
};


},{}],4:[function(require,module,exports){
module.exports={
  "name": "ejs",
  "description": "Embedded JavaScript templates",
  "keywords": [
    "template",
    "engine",
    "ejs"
  ],
  "version": "2.5.2",
  "author": {
    "name": "Matthew Eernisse",
    "email": "mde@fleegix.org",
    "url": "http://fleegix.org"
  },
  "contributors": [
    {
      "name": "Timothy Gu",
      "email": "timothygu99@gmail.com",
      "url": "https://timothygu.github.io"
    }
  ],
  "license": "Apache-2.0",
  "main": "./lib/ejs.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/mde/ejs.git"
  },
  "bugs": {
    "url": "https://github.com/mde/ejs/issues"
  },
  "homepage": "https://github.com/mde/ejs",
  "dependencies": {},
  "devDependencies": {
    "browserify": "^13.0.1",
    "eslint": "^3.0.0",
    "istanbul": "~0.4.3",
    "jake": "^8.0.0",
    "jsdoc": "^3.4.0",
    "lru-cache": "^4.0.1",
    "mocha": "^3.0.2",
    "rimraf": "^2.2.8",
    "uglify-js": "^2.6.2"
  },
  "engines": {
    "node": ">=0.10.0"
  },
  "scripts": {
    "test": "mocha",
    "coverage": "istanbul cover node_modules/mocha/bin/_mocha",
    "doc": "rimraf out && jsdoc -c jsdoc.json lib/* docs/jsdoc/*",
    "devdoc": "rimraf out && jsdoc -p -c jsdoc.json lib/* docs/jsdoc/*"
  },
  "_id": "ejs@2.5.2",
  "_shasum": "21444ba09386f0c65b6eafb96a3d51bcb3be80d1",
  "_resolved": "https://registry.npmjs.org/ejs/-/ejs-2.5.2.tgz",
  "_from": "ejs@latest",
  "_npmVersion": "2.14.7",
  "_nodeVersion": "4.2.2",
  "_npmUser": {
    "name": "mde",
    "email": "mde@fleegix.org"
  },
  "dist": {
    "shasum": "21444ba09386f0c65b6eafb96a3d51bcb3be80d1",
    "tarball": "https://registry.npmjs.org/ejs/-/ejs-2.5.2.tgz"
  },
  "maintainers": [
    {
      "name": "tjholowaychuk",
      "email": "tj@vision-media.ca"
    },
    {
      "name": "mde",
      "email": "mde@fleegix.org"
    }
  ],
  "_npmOperationalInternal": {
    "host": "packages-12-west.internal.npmjs.com",
    "tmp": "tmp/ejs-2.5.2.tgz_1473259584869_0.9678213631268591"
  },
  "directories": {},
  "readme": "ERROR: No README data found!"
}

},{}],5:[function(require,module,exports){
var Class = require("./src/Class");
var annotations = require("./src/annotations");

if (typeof module === "object") {
  module.exports = {
    Class: Class,
    annotations: annotations
  };
} else {
  window.Class = Class;
  window.annotations = annotations;
}

},{"./src/Class":6,"./src/annotations":7}],6:[function(require,module,exports){
var annotations = require("./annotations");

var Class = function(sourceClass, extendedProperties, static) {

  var inheritedProperties = Object.create(sourceClass.prototype);

  for (var propertyName in extendedProperties) {
    inheritedProperties[propertyName] = annotations.compile(sourceClass, propertyName, extendedProperties[propertyName]);
  }

  if (!static) {
    var extendedClass = function() {
      try {
        if (typeof this.constructor === "function") this.constructor.apply(this, arguments);

        for (var propertyName in this) {
          if (typeof this[propertyName] === "function") {
            this[propertyName] = this[propertyName].bind(this);
          }
        }

      } finally {
        return this;
      }
    };

    extendedClass.prototype = inheritedProperties;
    return extendedClass;
  } else {
    return inheritedProperties;
  }
};

var exp = function(mainProps) {
  return Class(function() {}, mainProps);
};
exp.inherits = Class;
exp.static = function(mainProps) {
  return Class(function() {}, mainProps, true);
};

module.exports = exp;

},{"./annotations":7}],7:[function(require,module,exports){
module.exports = annotations = {
  arr: [
    function $override() {
      this.before(function(opts, next) {
        opts.args.unshift(opts.parentScope[opts.methodName].bind(opts.scope));
        next();
      });
    }
  ],
  locals: {},
  add: function(ann) {
    this.arr.push(ann);
  },
  names: function() {
    return this.arr.map(function(fn) {
      return fn.name;
    });
  },
  getAnnotation: function(annotationName) {
    for (var i = 0; i < this.arr.length; i++) {
      if (this.arr[i].name === annotationName) {
        return this.arr[i];
      }
    }
  },
  Store: function(opts) {
    var befores = [];
    var afters = [];
    this.before = function(fn) {
      befores.push(fn);
    };
    this.after = function(fn) {
      afters.push(fn);
    };
    this.next = function() {
      var nextBeforeFn = befores.shift();
      if (nextBeforeFn) {
        nextBeforeFn.call(this, opts, arguments.callee);
      }
      if (!nextBeforeFn && opts.pending) {
        opts.result = opts.method.apply(opts.scope, opts.args);
        opts.pending = !opts.pending;
      }
      var nextAfterFn = afters.shift();
      if (nextAfterFn) {
        nextAfterFn.call(this, opts, arguments.callee);
      }
    };
  },
  fireMethodAnnotations: function(annotations, storeInstance, locals) {
    for (var i = 0; i < annotations.length; i++) {

      var preparedAnnotation = annotations[i].split(":");
      var annotationFn = this.getAnnotation(preparedAnnotation[0]);
      var annotationArguments = preparedAnnotation[1];

      with(locals) {
        if (annotationArguments) {
          eval("(" + annotationFn + ".call(storeInstance, " + annotationArguments + "))");
        } else {
          eval("(" + annotationFn + ".call(storeInstance))");
        }
      }
    }
  },
  getMethodAnnotations: function(array) {
    return array.filter(function(e, index, arr) {
      return index !== arr.length - 1;
    });
  },
  isValidAnnotationArray: function(array) {
    return this.getMethodAnnotations(array)
      .map(function(item) {
        return item.split(":").shift();
      })
      .every(this.getAnnotation, this);
  },
  compile: function(superClass, propertyName, propertyValue) {
    if (!(
        propertyValue &&
        typeof propertyValue.length === "number" &&
        typeof propertyValue[propertyValue.length - 1] === "function" &&
        this.isValidAnnotationArray(propertyValue)
      )) {
      return propertyValue;
    }

    var selfAnnotations = this;

    return function() {

      var opts = {
        scope: this,
        parentScope: superClass.prototype,
        method: propertyValue[propertyValue.length - 1],
        methodName: propertyName,
        args: Array.prototype.slice.call(arguments),
        result: undefined,
        pending: true
      };

      var store = new selfAnnotations.Store(opts);

      var methodAnnotations = selfAnnotations.getMethodAnnotations(propertyValue);

      selfAnnotations.fireMethodAnnotations(methodAnnotations, store, selfAnnotations.locals);

      store.next();

      return opts.result;
    };
  }
};

},{}],8:[function(require,module,exports){
var EventEmitter = require("./common/EventEmitter");
var Model = require("./Model");
var Class = require("kaop").Class

var Collection = Class.inherits(EventEmitter, {
  config: null,
  defaultModel: null,
  nativeArray: null,
  nativeArrayBack: null,
  constructor: function(config) {
    this.config = config || {};
    this.defaultModel = config.model || Model;
    this.nativeArray = [];
    this.nativeArrayBack = [];
  },
  backup: function() {
    this.nativeArrayBack = this.nativeArray.splice(0, this.nativeArray.length);
  },
  applyFilter: ["$eventFire: 'change'", function(predicate) {
    var filterResult = this.filter(predicate);
    this.backup();
    this.empty();
    this.append(filterResult);
  }],
  filter: function(predicate) {
    return this.nativeArray.filter(predicate);
  },
  append: function(tmpArr) {
    for (var i = 0; i < tmpArr.length; i++) {
      this.nativeArray.push(tmpArr[i]);
    }
  },
  all: ["$eventFire: 'change'", function() {
    this.empty();
    this.append(nativeArrayBack);
  }],
  empty: ["$eventFire: 'change'", function() {
    this.nativeArray = [];
  }],
  push: ["$eventFire: 'add'", function(model) {
    if (model instanceof this.defaultModel) {
      this.nativeArray.push(model);
    }
  }],
  find: function(predicate) {
    return this.nativeArray.find(predicate);
  },
  get: function(id) {
    return this.find(function(m) {
      return m.get("id") === id;
    });
  },
  like: function(properties) {
    var keys = Object.keys(properties);
    return this.filter(function(m) {
      for (var i = 0; i < keys.length; i++) {
        if (m.get(keys[i]) !== properties[keys[i]]) return false;
      }
      return true;
    });
  },
  load: function(raw) {
    for (var i = 0; i < raw.length; i++) {
      var tmpModel = new this.defaultModel();
      tmpModel.load(raw[i]);
      this.push(tmpModel);
    }
  },
  map: function(predicate) {
    return this.nativeArray.map(predicate);
  },
  remove: ["$eventFire: 'remove'", function(model) {
    var index = this.nativeArray.indexOf(model);
    this.nativeArray.splice(index, 0);
  }]
});

module.exports = Collection;

},{"./Model":10,"./common/EventEmitter":12,"kaop":5}],9:[function(require,module,exports){
var Utils = require("./common/Utils");
var Class = require("kaop").Class;
var View = require("./View");

var Component = Class.inherits(View, {
  model: null,
  collection: null,
  events: null,
  invalidate: ["$override", function(parent) {
    parent();
    Utils.forNi(this.events || {}, this.on, this);
  }],
  on: function(evt, handler) {
    var eventSplit = evt.split(" ");
    var targets = this.q(eventSplit[1], true);
    for (var i = 0; i < targets.length; i++) {
      targets[i].addEventListener(eventSplit[0], handler.bind(this));
    }
  },
  off: function(evt, handler) {
    var eventSplit = idEvent.split(" ");
    this.q(eventSplit[1]).removeEventListener(eventSplit[0], handler);
  },
  root: ["$override", function(parent) {
    if (this.template) {
      setTimeout(this.invalidate);
    } else {
      this.getTemplate();
    }
    return parent();
  }]
});

module.exports = Component;

},{"./View":11,"./common/Utils":16,"kaop":5}],10:[function(require,module,exports){
var EventEmitter = require("./common/EventEmitter");
var Class = require("kaop").Class;

var Model = Class.inherits(EventEmitter, {
  attributes: null,
  constructor: function() {
    this.attributes = {};
    for (var defaultProperty in this.defaults || {}) {
      this.attributes[defaultProperty] = this.defaults[defaultProperty];
    }
  },
  load: ["$eventFire: 'load'", "$GET: 'url'", "$jsonParse: 0", function(raw) {
    for (var attribute in raw) {
      this.attributes[attribute] = raw[attribute];
    }
  }],
  display: function() {
    return JSON.stringify(this.attributes);
  },
  set: ["$eventFire: 'change'", function(key, value) {
    this.attributes[key] = value;
  }],
  get: function(key) {
    return this.attributes[key];
  }
});

module.exports = Model;

},{"./common/EventEmitter":12,"kaop":5}],11:[function(require,module,exports){
var Utils = require("./common/Utils");
var Class = require("kaop").Class;

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

},{"./common/Utils":16,"kaop":5}],12:[function(require,module,exports){
var Class = require("kaop").Class;

var EventEmitter = Class({
  actions: [],
  when: function(idEvent, handler) {
    var actionStore = {
      id: idEvent,
      fn: handler
    };
    this.actions.push(actionStore);
  },
  fire: function(idEvent, model) {
    for (var i = 0; i < this.actions.length; i++) {
      if (this.actions[i].id === idEvent) {
        if (model) {
          this.actions[i].fn.call(model);
        } else {
          this.actions[i].fn();
        }
      }
    }
  },
  ignore: function(idEvent) {
    var tmpActions = [];
    for (var i = 0; i < this.actions.length; i++) {
      if (this.actions[i].id !== idEvent) {
        tmpActions.push(this.actions[i]);
      }
    }
    this.actions = tmpActions;
  }
});

module.exports = EventEmitter;

},{"kaop":5}],13:[function(require,module,exports){
var Class = require("kaop").Class;

var HttpRequest = Class({
  xhttp: null,
  callbacks: null,
  errorCallback: null,
  verb: null,
  url: null,
  data: null,
  constructor: function(verb, url, headers) {
    this.xhttp = new XMLHttpRequest();
    this.callbacks = [];
    this.errorCallback = function() {};
    this.verb = verb;
    this.url = url;
    for (var headerKey in headers) {
      this.xhttp.setRequestHeader(headerKey, headers[headerKey]);
    }
    return this;
  },
  then: function(callback) {
    if (!this.callbacks.length) {
      this.start();
    }
    this.callbacks.push(callback);
  },
  start: function() {
    this.xhttp.onreadystatechange = this.requestStatusChange.bind(this);
    this.xhttp.open(this.verb, this.url, true);
    this.xhttp.send(this.data);
  },
  requestStatusChange: function() {
    if (this.xhttp.readyState === 4) {
      if (this.xhttp.status === 200) {
        for (var i = 0; i < this.callbacks.length; i++) {
          this.callbacks[i](this.xhttp.responseText);
        }
      } else {
        this.errorCallback({
          status: this.xhttp.status,
          message: this.xhttp.responseText
        });
      }
    }
  }
});

module.exports = HttpRequest;

},{"kaop":5}],14:[function(require,module,exports){
var Class = require("kaop").Class;
var HttpRequest = require("./HttpRequest");

var ResourceAdapter = Class.static({
  pendingResources: [],
  awaitResources: {},
  localCache: {},
  defaultHeaders: {},
  saveLocalCache: function(resource, response) {
    this.localCache[resource] = response;
    for (var i = 0; i < this.awaitResources[resource].length; i++) {
      this.awaitResources[resource][i](response);
    }
    delete this.awaitResources[resource];
  },
  getCached: function(resource, callback) {
    if (this.localCache[resource]) {
      callback(this.localCache[resource]);
      return;
    }
    if (this.pendingResources.indexOf(resource) === -1) {
      this.get(resource).then(function(response) {
        this.saveLocalCache(resource, response);
        this.pendingResources.splice(this.pendingResources.indexOf(resource), 1);
      }.bind(this));
      this.pendingResources.push(resource);
    }
    if (!this.awaitResources[resource]) {
      this.awaitResources[resource] = [];
    }
    this.awaitResources[resource].push(callback);
  },
  get: function(resource) {
    return new HttpRequest("GET", resource, this.defaultHeaders);
  },
  post: function(resource, body) {
    var request = new HttpRequest("POST", resource, this.defaultHeaders);
    request.setBody(body);
    return request;
  },
  put: function(resource, body) {
    var request = new HttpRequest("PUT", resource, this.defaultHeaders);
    request.setBody(body);
    return request;
  },
  del: function(resource) {
    return new HttpRequest("DELETE", resource, this.defaultHeaders);
  }
});

module.exports = ResourceAdapter;

},{"./HttpRequest":13,"kaop":5}],15:[function(require,module,exports){
var Class = require("kaop").Class;

var TagPool = Class.static({
  add: function(tag, constructor) {
    document.registerElement(tag, {
      prototype: new constructor()
    });
  }
});

module.exports = TagPool;

},{"kaop":5}],16:[function(require,module,exports){
var Class = require("kaop").Class;

var Utils = Class.static({
  staticId: 1,
  forIn: function(obj, fn, ctx) {
    if (obj) {
      Object.keys(obj).forEach(function(o) {
        if (ctx) {
          fn.call(ctx, obj[o], o);
        } else {
          fn(obj[o], o);
        }
      });
    }
  },
  forNi: function(obj, fn, ctx) {
    if (obj) {
      Object.keys(obj).forEach(function(o) {
        if (ctx) {
          fn.call(ctx, o, obj[o]);
        } else {
          fn(o, obj[o]);
        }
      });
    }
  },
  arrayMerge: function(arr1, arr2) {
    var result = arr1;
    arr2.forEach(function(m) {
      if (!result.some(function(o) {
          return o === m;
        })) {
        result.push(m);
      }
    });
    return result;
  },
  checkRequired: function(obj, required) {
    var keys = Object.keys(obj);
    return required.every(function(k) {
      return keys.indexOf(k) > -1;
    });
  },
  unique: function() {
    return this.staticId++;
  }
});

module.exports = Utils;

},{"kaop":5}],17:[function(require,module,exports){
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
        opts.scope.compileFn = ejs.compile(opts.scope[key], {
          context: opts.scope
        });
      }
      opts.args[0] = opts.scope.compileFn();
      next();
    });
  }
];

},{}],18:[function(require,module,exports){
var Class = require("kaop").Class;

var KBase = Class.inherits(HTMLElement, {
  _shadow: null,
  init: function(template, style) {
    this._shadow = this.attachShadow({
      mode: "open"
    });
    this.append(style);
    this.append(template);
  },
  append: function(rawHtml) {
    if (rawHtml) {
      this._shadow.innerHTML += rawHtml;
    }
  },
  attr: function(k, value) {
    if (!value) {
      return this.getAttribute(k);
    } else {
      return this.setAttribute(k, value);
    }
  },
  on: function(evt, handler) {
    var eventSplit = evt.split(" ");
    var targets = this.q(eventSplit[1], true);
    for (var i = 0; i < targets.length; i++) {
      targets[i].addEventListener(eventSplit[0], handler.bind(this));
    }
  },
  off: function(evt, handler) {
    var eventSplit = evt.split(" ");
    this.q(eventSplit[1]).removeEventListener(eventSplit[0], handler);
  },
  trigger: function(eventName) {
    var evt = new Event(eventName);
    evt.target = this;
    this.dispatchEvent(evt);
  },
  q: function(selector) {
    return this._shadow.querySelector(selector);
  },
  qq: function(selector) {
    return this.querySelector(selector);
  }
});

module.exports = KBase;

},{"kaop":5}],19:[function(require,module,exports){
var Class = require("kaop").Class;
var KBase = require("./k-base");

var KInclude = Class.inherits(KBase, {
  attachedCallback: function() {
    this.init();
    this.path = this.attr("path");
    this.loadTemplate();
  },
  loadTemplate: ["$GET: 'path', true", function(templateStr) {
    this.append(templateStr);
  }]
});

module.exports = KInclude;

},{"./k-base":18,"kaop":5}],20:[function(require,module,exports){

},{}],21:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":22}],22:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it don't break things.
var cachedSetTimeout = setTimeout;
var cachedClearTimeout = clearTimeout;

var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
