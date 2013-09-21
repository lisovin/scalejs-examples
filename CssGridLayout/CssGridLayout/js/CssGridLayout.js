
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("Scripts/almond", function(){});


/*global define,window,requirejs */
define('scalejs',[],function () {
    
    var extensionNames;

    return {
        load: function (name, req, load, config) {
            if (name === 'extensions') {
                if (config.scalejs && config.scalejs.extensions) {
                    extensionNames = config.scalejs.extensions;
                    req(extensionNames, function () {
                        load(Array.prototype.slice(arguments));
                    });
                } else {
                    req(['scalejs/extensions'], function () {
                        load(Array.prototype.slice(arguments));
                    }, function () {
                        // No extensions defined, which is strange but might be ok.
                        load([]);
                    });
                }
                return;
            }

            if (name === 'application') {
                req(['scalejs!extensions'], function () {
                    req(['scalejs/application'], function (application) {
                        load(application);
                    });
                });
                return;
            }

            if (name.indexOf('sandbox') === 0) {
                req(['scalejs!core', 'scalejs!extensions'], function (core) {
                    if (config.isBuild) {
                        load();
                    } else {
                        var sandbox = core.buildSandbox(name);
                        load(sandbox);
                    }
                });
                return;
            }

            req(['scalejs/' + name], function (loadedModule) {
                load(loadedModule);
            });
        },

        write: function (pluginName, moduleName, write) {
            if (pluginName === 'scalejs' && moduleName === 'application') {
                write('define("scalejs/extensions", ' + JSON.stringify(extensionNames) + ', function () { return Array.prototype.slice(arguments); })');
            }
        }
    };
});

/*global define,console,document*/
define('scalejs/base.type',[],function () {
    
    function typeOf(obj) {
        if (obj === undefined) {
            return 'undefined';
        }

        if (obj === null) {
            return 'null';
        }

        var t = ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase(),
            m;

        if (t !== 'object') {
            return t;
        }

        m = obj.constructor.toString().match(/^function\s*([$A-Z_][0-9A-Z_$]*)/i);
        if (m === null) {
            return 'object';
        }

        return m[1];
    }

    function is(value) {
        // Function: is([...,]value[,type]): boolean
        // Check the type of a value, possibly nested in sub-properties.
        //
        // The method may be called with a single argument to check that the value
        // is neither null nor undefined.
        //
        // If more than two arguments are provided, the value is considered to be
        // nested within a chain of properties starting with the first argument:
        // | is(object,'parent','child','leaf','boolean')
        // will check whether the property object.parent.child.leaf exists and is
        // a boolean.
        //
        // The intent of this method is to replace unsafe guard conditions that
        // rely on type coercion:
        // | if (object && object.parent && object.parent.child) {
        // |   // Issue: all falsy values are treated like null and undefined:
        // |   // '', 0, false...
        // | }
        // with a safer check in a single call:
        // | if ( is(object,'parent','child','number') ) {
        // |   // only null and undefined values are rejected
        // |   // and the type expected (here 'number') is explicit
        // | }
        //
        // Parameters:
        //   ...   - any, optional, a chain of parent properties for a nested value
        //   value - any, the value to check, which may be nested in a chain made
        //           of previous arguments (see above)
        //   type - string, optional, the type expected for the value.
        //          Alternatively, a constructor function may be provided to check
        //          whether the value is an instance of given constructor.
        //
        // Returns:
        //   * false, if no argument is provided
        //   * false, if a single argument is provided which is null or undefined
        //   * true, if a single argument is provided, which is not null/undefined
        //   * if the type argument is a non-empty string, it is compared with the
        //     internal class of the value, put in lower case
        //   * if the type argument is a function, the instanceof operator is used
        //     to check if the value is considered an instance of the function
        //   * otherwise, the value is compared with the provided type using the
        //     strict equality operator ===
        //
        // Type Reference:
        //   'undefined' - undefined
        //   'null'      - null
        //   'boolean'   - false, true
        //   'number'    - -1, 0, 1, 2, 3, Math.sqrt(2), Math.E, Math.PI...
        //   'string'    - '', 'abc', "Text!?"...
        //   'array'     - [], [1,2,3], ['a',{},3]...
        //   'object'    - {}, {question:'?',answer:42}, {a:{b:{c:3}}}...
        //   'regexp'    - /abc/g, /[0-9a-z]+/i...
        //   'function'  - function(){}, Date, setTimeout...
        //
        // Notes:
        // This method retrieves the internal class of the provided value using
        // | Object.prototype.toString.call(value).slice(8, -1)
        // The class is then converted to lower case.
        //
        // See "The Class of an Object" section in the JavaScript Garden for
        // more details on the internal class:
        // http://bonsaiden.github.com/JavaScript-Garden/#types.typeof
        //
        // The internal class is only guaranteed to be the same in all browsers for
        // Core JavaScript classes defined in ECMAScript. It differs for classes
        // part of the Browser Object Model (BOM) and Document Object Model (DOM):
        // window, document, DOM nodes:
        //
        //   window        - 'Object' (IE), 'Window' (Firefox,Opera),
        //                   'global' (Chrome), 'DOMWindow' (Safari)
        //   document      - 'Object' (IE),
        //                   'HTMLDocument' (Firefox,Chrome,Safari,Opera)
        //   document.body - 'Object' (IE),
        //                   'HTMLBodyElement' (Firefox,Chrome,Safari,Opera)
        //   document.createElement('div') - 'Object' (IE)
        //                   'HTMLDivElement' (Firefox,Chrome,Safari,Opera)
        //   document.createComment('') - 'Object' (IE),
        //                   'Comment' (Firefox,Chrome,Safari,Opera)
        //
        var undef, // do not trust global undefined, which may be overridden
            i,
            length = arguments.length,
            last = length - 1,
            type,
            typeOfType,
            internalClass,
            v = value;


        if (length === 0) {
            return false; // no argument
        }

        if (length === 1) {
            return (value !== null && value !== undef);
        }

        if (length > 2) {
            for (i = 0; i < last - 1; i += 1) {
                if (!is(v)) {
                    return false;
                }
                v = v[arguments[i + 1]];
            }
        }

        type = arguments[last];
        if (v === null) {
            return (type === null || type === 'null');
        }
        if (v === undef) {
            return (type === undef || type === 'undefined');
        }
        if (type === '') {
            return v === type;
        }

        typeOfType = typeof type;
        if (typeOfType === 'string') {
            internalClass =
                Object.prototype
                    .toString
                    .call(v)
                    .slice(8, -1)
                    .toLowerCase();
            return internalClass === type;
        }

        if (typeOfType === 'function') {
            return v instanceof type;
        }

        return v === type;
    }

    return {
        is : is,
        typeOf : typeOf
    };
});

/*global define,console,document*/
define('scalejs/base.object',[
    './base.type'
], function (
    type
) {
    

    var is = type.is;

    function has(object) {
        // Function: has(obj,property[,...]): boolean
        // Check whether an obj property is present and not null nor undefined.
        //
        // A chain of nested properties may be checked by providing more than two
        // arguments.
        //
        // The intent of this method is to replace unsafe tests relying on type
        // coercion for optional arguments or obj properties:
        // | function on(event,options){
        // |   options = options || {}; // type coercion
        // |   if (!event || !event.data || !event.data.value){
        // |     // unsafe due to type coercion: all falsy values '', false, 0
        // |     // are discarded, not just null and undefined
        // |     return;
        // |   }
        // |   // ...
        // | }
        // with a safer test without type coercion:
        // | function on(event,options){
        // |   options = has(options)? options : {}; // no type coercion
        // |   if (!has(event,'data','value'){
        // |     // safe check: only null/undefined values are rejected;
        // |     return;
        // |   }
        // |   // ...
        // | }
        //
        // Parameters:
        //   obj - any, an obj or any other value
        //   property - string, the name of the property to look up
        //   ...      - string, additional property names to check in turn
        //
        // Returns:
        //   * false if no argument is provided or if the obj is null or
        //     undefined, whatever the number of arguments
        //   * true if the full chain of nested properties is found in the obj
        //     and the corresponding value is neither null nor undefined
        //   * false otherwise
        var i,
            length,
            o = object,
            property;

        if (!is(o)) {
            return false;
        }

        for (i = 1, length = arguments.length; i < length; i += 1) {
            property = arguments[i];
            o = o[property];
            if (!is(o)) {
                return false;
            }
        }
        return true;
    }

    function mix(receiver, supplier) {
        var p;
        for (p in supplier) {
            if (supplier.hasOwnProperty(p)) {
                if (has(supplier, p) &&
                        supplier[p].constructor === Object &&
                            has(receiver, p)) {
                    receiver[p] = mix(receiver[p], supplier[p]);
                } else {
                    receiver[p] = supplier[p];
                }
            }
        }

        return receiver;
    }

    function merge() {
        var args = arguments,
            i,
            len = args.length,
            result = {};

        for (i = 0; i < len; i += 1) {
            mix(result, args[i]);
        }

        return result;
    }

    function clone(o) {
        return merge({}, o);
    }

    function extend(receiver, extension, path) {
        var props = has(path) ? path.split('.') : [],
            target = receiver,
            i;

        for (i = 0; i < props.length; i += 1) {
            if (!has(target, props[i])) {
                target[props[i]] = {};
            }
            target = target[props[i]];
        }

        mix(target, extension);

        return target;
    }

    function get(o, path, defaultValue) {
        var props = path.split('.'),
            i,
            p,
            success = true;

        for (i = 0; i < props.length; i += 1) {
            p = props[i];
            if (has(o, p)) {
                o = o[p];
            } else {
                success = false;
                break;
            }
        }

        return success ? o : defaultValue;
    }

    function valueOrDefault(value, defaultValue) {
        return has(value) ? value : defaultValue;
    }

    return {
        has: has,
        valueOrDefault: valueOrDefault,
        merge: merge,
        extend: extend,
        clone: clone,
        get: get
    };
});

/*global define,console,document*/
define('scalejs/base.array',[
    './base.object'
], function (
    object
) {
    

    var valueOrDefault = object.valueOrDefault;

    function addOne(array, item) {
        /// <summary>
        /// Add an item to the array if it doesn't exist.
        /// </summary>
        /// <param name="array">Array to add the item to.</param>
        /// <param name="item">Item to add to the array.</param>
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }

    function removeOne(array, item) {
        /// <summary>
        /// Remove the first occurence of an item from the given array.
        /// The identity operator === is used for the comparison.
        /// <param name="array">Array to remove the item from (in place).</param>
        /// <param name="item">The item to remove from the array.</param>
        var found = array.indexOf(item);
        if (found > -1) {
            array.splice(found, 1);
        }
    }

    function removeAll(array) {
        /// <summary>
        /// Remove all items from the array
        /// </summary>
        /// <param name="array">Array to remove items from (in place).</param>
        array.splice(0, array.length);
    }

    function copy(array, first, count) {
        /// <summary>
        /// Return the specified items of the array as a new array.
        /// </summary>
        /// <param name="array">Array to return items from.</param>
        /// <param name="first">Index of the first item to include into 
        /// the result array (0 if not specified).</param>
        /// <param name="count">Number of items to include into the result 
        /// array (length of the array if not specified).</param>
        /// <returns type="">New array containing the specified items.</returns>
        first = valueOrDefault(first, 0);
        count = valueOrDefault(count, array.length);
        return Array.prototype.slice.call(array, first, count);
    }

    function find(array, f, context) {
        var i,
            l;
        for (i = 0, l = array.length; i < l; i += 1) {
            if (array.hasOwnProperty(i) && f.call(context, array[i], i, array)) {
                return array[i];
            }
        }
        return null;
    }

    function toArray(list, start, end) {
        /*ignore jslint start*/
        var array = [],
            i,
            result;

        for (i = list.length; i--; array[i] = list[i]) {}
        
        result = copy(array, start, end);

        return result;
        /*ignore jslint end*/
    }

    return {
        addOne: addOne,
        removeOne: removeOne,
        removeAll: removeAll,
        copy: copy,
        find: find,
        toArray: toArray
    };
});

/*global define,window,document,console*/
define('scalejs/base.log',[
], function (
) {
    

    var logMethods = ['log', 'info', 'warn', 'error'],
        self = {};

    // Workaround for IE8 and IE9 - in these browsers console.log exists but it's not a real JS function.
    // See http://stackoverflow.com/a/5539378/201958 for more details

    if (window.console !== undefined) {
        if (typeof console.log === "object") {
            logMethods.forEach(function (method) {
                self[method] = this.bind(console[method], console);
            }, Function.prototype.call);
        } else {
            logMethods.forEach(function (method) {
                if (console[method]) {
                    self[method] = console[method].bind(console);
                } else {
                    self[method] = console.log.bind(console);
                }
            });
        }

        if (typeof console.debug === 'function') {
            self.debug = console.debug.bind(console);
        } else {
            self.debug = self.info;
        }
    } else {
        logMethods.forEach(function (method) {
            self[method] = function () {};
        });
        logMethods.debug = function () {};
    }

    self.formatException = function (ex) {
        var stack = ex.stack ? String(ex.stack) : '',
            message = ex.message || '';
        return 'Error: ' + message + '\nStack: ' + stack;
    };

    return self;
});

/*
 * Minimal base implementation. 
 */
/*global define,console,document*/
define('scalejs/base',[
    './base.array',
    './base.log',
    './base.object',
    './base.type'
], function (
    array,
    log,
    object,
    type
) {
    

    return {
        type: type,
        object: object,
        array: array,
        log: log
    };
});

/*global define */
/// <reference path="../Scripts/es5-shim.js" />
define('scalejs/core',[
    './base'
], function (
    base
) {
    

    // Imports
    var has = base.object.has,
        is = base.type.is,
        extend = base.object.extend,
        addOne = base.array.addOne,
        error = base.log.error,
        self = {},
        extensions = [],
        applicationEventListeners = [],
        isApplicationRunning = false;

    function registerExtension(extension) {
        try {
            // If extension is a function then give it an instance of the core. 
            if (is(extension, 'function')) {
                var ext = extension(self);
                // Any result is an actual core extension so extend
                if (ext) {
                    extend(self, ext);
                    addOne(extensions, ext);
                }
                return;
            }
            // If extension has buildCore function then give it an instance of the core. 
            if (is(extension, 'buildCore', 'function')) {
                extension.buildCore(self);
                addOne(extensions, extension);
                return;
            }

            // If extension has `core` property then extend core with it.
            if (has(extension, 'core')) {
                extend(self, extension.core);
                addOne(extensions, extension);
                return;
            }

            // Otherwise extension core with the extension itself.
            extend(self, extension);
            addOne(extensions, extension);
        } catch (ex) {
            error('Fatal error during application initialization. ',
                    'Failed to build core with extension "',
                    extension,
                    'See following exception for more details.',
                    ex);
        }
    }


    function buildSandbox(id) {
        if (!has(id)) {
            throw new Error('Sandbox name is required to build a sandbox.');
        }

        // Create module instance specific sandbox 
        var sandbox = {
            type: self.type,
            object: self.object,
            array: self.array,
            log: self.log
        };


        // Add extensions to sandbox
        extensions.forEach(function (extension) {
            try {
                // If extension has buildSandbox method use it to build sandbox
                // Otherwise simply add extension to the sandbox at the specified path
                if (is(extension, 'buildSandbox', 'function')) {
                    extension.buildSandbox(sandbox);
                    return;
                }

                if (has(extension, 'sandbox')) {
                    extend(sandbox, extension.sandbox);
                    return;
                }

                extend(sandbox, extension);
            } catch (ex) {
                error('Fatal error during application initialization. ',
                      'Failed to build sandbox with extension "',
                      extension,
                      'See following exception for more details.',
                      ex);
                throw ex;
            }
        });

        return sandbox;
    }

    function onApplicationEvent(listener) {
        applicationEventListeners.push(listener);
    }

    function notifyApplicationStarted() {
        if (isApplicationRunning) { return; }

        isApplicationRunning = true;
        applicationEventListeners.forEach(function (listener) {
            listener('started');
        });
    }

    function notifyApplicationStopped() {
        if (!isApplicationRunning) { return; }

        isApplicationRunning = false;
        applicationEventListeners.forEach(function (listener) {
            listener('stopped');
        });
    }

    return extend(self, {
        type: base.type,
        object: base.object,
        array: base.array,
        log: base.log,
        buildSandbox: buildSandbox,
        notifyApplicationStarted: notifyApplicationStarted,
        notifyApplicationStopped: notifyApplicationStopped,
        onApplicationEvent: onApplicationEvent,
        isApplicationRunning: function () { return isApplicationRunning; },
        registerExtension: registerExtension
    });
});

/*

 * Core Application
 *
 * The Core Application manages the life cycle of modules.
 */
/*global define,window */
/*jslint nomen:true*/
define('scalejs/application',[
    'scalejs!core'
], function (
    core
) {
    

    var addOne = core.array.addOne,
        toArray = core.array.toArray,
        //has = core.object.has,
        error = core.log.error,
        debug = core.log.debug,
        moduleRegistrations = [],
        moduleInstances = [];

    function registerModules() {
        // Dynamic module loading is no longer supported for simplicity.
        // Module is free to load any of its resources dynamically.
        // Or an extension can provide dynamic module loading capabilities as needed.
        if (core.isApplicationRunning()) {
            throw new Error('Can\'t register module since the application is already running.',
                            'Dynamic module loading is not supported.');
        }

        Array.prototype.push.apply(moduleRegistrations, toArray(arguments).filter(function (m) { return m; }));
    }

    function createModule(module) {
        var moduleInstance,
            moduleId;

        if (typeof module === 'function') {
            try {
                moduleInstance = module();
            } catch (ex) {
                if (module.getId) {
                    moduleId = module.getId();
                } else {
                    moduleId = module.name;
                }

                error('Failed to create an instance of module "' + moduleId + '".',
                      'Application will continue running without the module. ' +
                      'See following exception stack for more details.',
                      ex.stack);
            }
        } else {
            moduleInstance = module;
        }

        addOne(moduleInstances, moduleInstance);

        return moduleInstance;
    }

    function createAll() {
        moduleRegistrations.forEach(createModule);
    }

    function startAll() {
        debug('Application started.');

        core.notifyApplicationStarted();
    }

    function run() {
        createAll();
        startAll();
    }

    function exit() {
        debug('Application exited.');
        core.notifyApplicationStopped();
    }

    return {
        registerModules: registerModules,
        run: run,
        exit: exit
    };
});


/*global define,console,document*/
/*jslint nomen: true*/
/**
 * Based on Oliver Steele "Functional Javascript" (http://osteele.com/sources/javascript/functional/)
 **/
define('scalejs.functional/functional',[],function () {
    

    var _ = {};

    function compose() {
        /// <summary>
        /// Returns a function that applies the last argument of this
        /// function to its input, and the penultimate argument to the
        /// result of the application, and so on.
        /// == compose(f1, f2, f3..., fn)(args) == f1(f2(f3(...(fn(args...)))))
        /// :: (a2 -> a1) (a3 -> a2)... (a... -> a_{n}) -> a... -> a1
        /// >> compose('1+', '2*')(2) -> 5
        /// </summary>
        var fns = Array.prototype.slice.call(arguments, 0).reverse();

        return function () {
            var args = fns.reduce(function (args, fn) {
                return [fn.apply(undefined, args)];
            }, Array.prototype.slice.call(arguments));

            return args[0];
        };
    }

    function sequence() {
        /// <summary>
        /// Same as `compose`, except applies the functions in argument-list order.
        /// == sequence(f1, f2, f3..., fn)(args...) == fn(...(f3(f2(f1(args...)))))
        /// :: (a... -> a1) (a1 -> a2) (a2 -> a3)... (a_{n-1} -> a_{n})  -> a... -> a_{n}
        /// >> sequence('1+', '2*')(2) -> 6
        /// </summary>
        var fns = Array.prototype.slice.call(arguments, 0);

        return function () {
            var args = fns.reduce(function (args, fn) {
                return [fn.apply(undefined, args)];
            }, Array.prototype.slice.call(arguments, 0));

            return args[0];
        };
    }

    function bind(object, fn) {
        /// <summary>
        /// Returns a bound method on `object`, optionally currying `args`.
        /// == f.bind(obj, args...)(args2...) == f.apply(obj, [args..., args2...])
        /// </summary>
        /// <param name="object"></param>
        var args = Array.prototype.slice.call(arguments, 2);
        return function () {
            return fn.apply(object, args.concat(Array.prototype.slice.call(arguments, 0)));
        };
    }

    function aritize(fn, n) {
        /// <summary>
        /// Invoking the function returned by this function only passes `n`
        /// arguments to the underlying function.  If the underlying function
        /// is not saturated, the result is a function that passes all its
        /// arguments to the underlying function.  (That is, `aritize` only
        /// affects its immediate caller, and not subsequent calls.)
        /// >> '[a,b]'.lambda()(1,2) -> [1, 2]
        /// >> '[a,b]'.lambda().aritize(1)(1,2) -> [1, undefined]
        /// >> '+'.lambda()(1,2)(3) -> error
        /// >> '+'.lambda().ncurry(2).aritize(1)(1,2)(3) -> 4
        ///
        /// `aritize` is useful to remove optional arguments from a function that
        /// is passed to a higher-order function that supplies *different* optional
        /// arguments.
        ///
        /// For example, many implementations of `map` and other collection
        /// functions, call the function argument with both the collection element
        /// and its position.  This is convenient when expected, but can wreak
        /// havoc when the function argument is a curried function that expects
        /// a single argument from `map` and the remaining arguments from when
        /// the result of `map` is applied.
        /// </summary>
        /// <param name="fn"></param>
        /// <param name="n"></param>
        return function () {
            return fn.apply(undefined, Array.prototype.slice.call(arguments, 0, n));
        };
    }

    function curry(fn, n) {
        if (arguments.length === 1) {
            return curry(fn, fn.length);
        }

        var largs = Array.prototype.slice.call(arguments, 2);

        if (largs.length >= n) {
            return fn.apply(undefined, largs);
        }

        return function () {
            var args = largs.concat(Array.prototype.slice.call(arguments, 0));
            args.unshift(fn, n);
            return curry.apply(undefined, args);
        };
    }

    // partial itself is partial, e.g. partial(_, a, _)(f) = partial(f, a, _)
    function partial() {
        var args = Array.prototype.slice.call(arguments, 0),
            subpos = args.reduce(function (blanks, arg, i) {
                return arg === _ ? blanks.concat([i]) : blanks;
            }, []);

        if (subpos.length === 0) {
            return args[0].apply(undefined, args.slice(1));
        }

        return function () {
            var //specialized = args.concat(Array.prototype.slice.call(arguments, subpos.length)),
                i;

            for (i = 0; i < Math.min(subpos.length, arguments.length); i += 1) {
                args[subpos[i]] = arguments[i];
            }

            return partial.apply(undefined, args);
        };
    }

    return {
        _: _,
        compose: compose,
        sequence: sequence,
        bind: bind,
        aritize: aritize,
        curry: curry,
        partial: partial
    };
});

/*global define,console,document*/
/*jslint nomen: true*/
/**
 * Based on F# computation expressions http://msdn.microsoft.com/en-us/library/dd233182.aspx
 **/
define('scalejs.functional/builder',[
    'scalejs!core'
], function (
    core
) {
    

    var merge = core.object.merge,
        clone = core.object.clone,
        array = core.array;

    function builder(opts) {
        var build;

        function callExpr(context, expr) {
            if (!expr || expr.kind !== '$') {
                return typeof expr === 'function' ? expr.bind(context) : expr;
            }

            if (typeof expr.expr === 'function') {
                return expr.expr.call(context);
            }

            if (typeof expr.expr === 'string') {
                return context[expr.expr];
            }

            throw new Error('Parameter in $(...) must be either a function or a string referencing a binding.');
        }

        function combine(method, context, expr, cexpr) {
            function isReturnLikeMethod(method) {
                return method === '$return' ||
                        method === '$RETURN' ||
                        method === '$yield' ||
                        method === '$YIELD';
            }

            if (typeof opts[method] !== 'function' &&
                    method !== '$then' &&
                    method !== '$else') {
                throw new Error('This control construct may only be used if the computation expression builder ' +
                                'defines a `' + method + '` method.');
            }

            var e = callExpr(context, expr),
                contextCopy,
                cexprCopy;

            if (cexpr.length > 0 && typeof opts.combine !== 'function') {
                throw new Error('This control construct may only be used if the computation expression builder ' +
                                'defines a `combine` method.');
            }

            // if it's return then simply return
            if (isReturnLikeMethod(method)) {
                if (cexpr.length === 0) {
                    return opts[method](e);
                }

                if (typeof opts.delay !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `delay` method.');
                }

                // combine with delay
                return opts.combine(opts[method](e), opts.delay(function () {
                    return build(context, cexpr);
                }));
            }

            // if it's not a return then simply combine the operations (e.g. no `delay` needed)
            if (method === '$for') {
                return opts.combine(opts.$for(expr.items, function (item) {
                    var cexpr = array.copy(expr.cexpr),
                        ctx = merge(context);
                    ctx[expr.name] = item;
                    return build(ctx, cexpr);
                }), build(context, cexpr));
            }

            if (method === '$while') {
                if (typeof opts.delay !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `delay` method.');
                }

                e = opts.$while(expr.condition.bind(context), opts.delay(function () {
                    var contextCopy = clone(context),
                        cexprCopy = array.copy(expr.cexpr);
                    return build(contextCopy, cexprCopy);
                }));

                if (cexpr.length > 0) {
                    return opts.combine(e, build(context, cexpr));
                }

                return e;
            }

            if (method === '$then' || method === '$else') {
                contextCopy = clone(context);
                cexprCopy = array.copy(expr.cexpr);
                return opts.combine(build(contextCopy, cexprCopy), cexpr);
            }

            return opts.combine(opts[method](e), build(context, cexpr));
        }

        if (!opts.missing) {
            opts.missing = function (expr) {
                if (expr.kind) {
                    throw new Error('Unknown operation "' + expr.kind + '". ' +
                                    'Either define `missing` method on the builder or fix the spelling of the operation.');
                }

                throw new Error('Expression ' + JSON.stringify(expr) + ' cannot be processed. ' +
                                'Either define `missing` method on the builder or convert expression to a function.');
            };
        }

        build = function (context, cexpr) {
            var expr;

            if (cexpr.length === 0) {
                if (opts.zero) {
                    return opts.zero();
                }

                throw new Error('Computation expression builder must define `zero` method.');
            }

            expr = cexpr.shift();

            if (expr.kind === 'let') {
                context[expr.name] = callExpr(context, expr.expr);
                return build(context, cexpr);
            }

            if (expr.kind === 'do') {
                expr.expr.call(context);
                return build(context, cexpr);
            }

            if (expr.kind === 'letBind') {
                return opts.bind(callExpr(context, expr.expr), function (bound) {
                    context[expr.name] = bound;
                    return build(context, cexpr);
                });
            }

            if (expr.kind === 'doBind' || expr.kind === '$') {
                if (cexpr.length > 0) {
                    return opts.bind(callExpr(context, expr.expr), function () {
                        return build(context, cexpr);
                    });
                }

                if (typeof opts.$return !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `$return` method.');
                }

                return opts.bind(callExpr(context, expr.expr), function () {
                    return opts.$return();
                });
            }

            if (expr.kind === '$return' ||
                    expr.kind === '$RETURN' ||
                    expr.kind === '$yield' ||
                    expr.kind === '$YIELD') {
                return combine(expr.kind, context, expr.expr, cexpr);
            }

            if (expr.kind === '$for' ||
                    expr.kind === '$while') {
                return combine(expr.kind, context, expr, cexpr);
            }

            if (expr.kind === '$if') {
                if (expr.condition.call(context)) {
                    return combine('$then', context, expr.thenExpr, cexpr);
                }

                if (expr.elseExpr) {
                    return combine('$else', context, expr.elseExpr, cexpr);
                }

                return combine(build(context, []), cexpr);
            }

            if (typeof expr === 'function' && opts.call) {
                opts.call(context, expr);
                return build(context, cexpr);
            }

            if (typeof expr === 'function') {
                expr.call(context, expr);
                return build(context, cexpr);
            }

            return combine('missing', context, expr, cexpr);
        };

        return function () {
            var args = array.copy(arguments),
                expression = function () {
                    var operations = Array.prototype.slice.call(arguments, 0),
                        context = this || {},
                        result,
                        toRun;

                    if (this.mixins) {
                        this.mixins.forEach(function (mixin) {
                            if (mixin.beforeBuild) {
                                mixin.beforeBuild(context, operations);
                            }
                        });
                    }

                    if (opts.delay) {
                        toRun = opts.delay(function () {
                            return build(context, operations);
                        });
                    } else {
                        toRun = build(context, operations);
                    }

                    if (opts.run) {
                        result = opts.run.apply(null, [toRun].concat(args));
                    } else {
                        result = toRun;
                    }

                    if (this.mixins) {
                        this.mixins.forEach(function (mixin) {
                            if (mixin.afterBuild) {
                                result = mixin.afterBuild(result);
                            }
                        });
                    }

                    return result;
                };

            function mixin() {
                var context = {mixins: Array.prototype.slice.call(arguments, 0)},
                    bound = expression.bind(context);
                bound.mixin = function () {
                    Array.prototype.push.apply(context.mixins, arguments);
                    return bound;
                };

                return bound;
            }

            expression.mixin = mixin;

            return expression;
        };
    }

    builder.$let = function (name, expr) {
        return {
            kind: 'let',
            name: name,
            expr: expr
        };
    };

    builder.$LET = function (name, expr) {
        return {
            kind: 'letBind',
            name: name,
            expr: expr
        };
    };

    builder.$do = function (expr) {
        return {
            kind: 'do',
            expr: expr
        };
    };

    builder.$DO = function (expr) {
        return {
            kind: 'doBind',
            expr: expr
        };
    };

    builder.$return = function (expr) {
        return {
            kind: '$return',
            expr: expr
        };
    };

    builder.$RETURN = function (expr) {
        return {
            kind: '$RETURN',
            expr: expr
        };
    };

    builder.$yield = function (expr) {
        return {
            kind: '$yield',
            expr: expr
        };
    };

    builder.$YIELD = function (expr) {
        return {
            kind: '$YIELD',
            expr: expr
        };
    };

    builder.$for = function (name, items) {
        var cexpr = Array.prototype.slice.call(arguments, 2);

        return {
            kind: '$for',
            name: name,
            items: items,
            cexpr: cexpr
        };
    };

    builder.$while = function (condition) {
        if (arguments.length < 2) {
            throw new Error('Incomplete `while`. Expected "$while(<condition>, <expr>)".');
        }

        var cexpr = Array.prototype.slice.call(arguments, 1);

        return {
            kind: '$while',
            condition: condition,
            cexpr: cexpr
        };
    };

    builder.$if = function (condition, thenExpr, elseExpr) {
        if (arguments.length < 2) {
            throw new Error('Incomplete conditional. Expected "$if(<expr>, $then(expr))" or ' +
                            '"$if(<expr>, $then(<expr>), $else(<expr>)"');
        }

        if (typeof condition !== 'function') {
            throw new Error('First argument must be a function that defines the condition of $if.');
        }

        if (thenExpr.kind !== '$then') {
            throw new Error('Unexpected "' + thenExpr.kind + '" in the place of "$then"');
        }

        if (elseExpr) {
            if (elseExpr.kind !== '$else') {
                throw new Error('Unexpected "' + elseExpr.kind + '" in the place of "$else"');
            }
        }

        return {
            kind: '$if',
            condition: condition,
            thenExpr: thenExpr,
            elseExpr: elseExpr
        };
    };

    builder.$then = function () {
        var cexpr = Array.prototype.slice.call(arguments, 0);

        if (cexpr.length === 0) {
            throw new Error('$then should contain at least one expression.');
        }

        return {
            kind: '$then',
            cexpr: cexpr
        };
    };

    builder.$else = function () {
        var cexpr = Array.prototype.slice.call(arguments, 0);

        if (cexpr.length === 0) {
            throw new Error('$else should contain at least one expression.');
        }

        return {
            kind: '$else',
            cexpr: cexpr
        };
    };

    builder.$ = function (expr) {
        return {
            kind: '$',
            expr: expr
        };
    };

    return builder;
});

/*global define,console,document*/
/*jslint nomen: true*/
define('scalejs.functional/completeBuilder',[
    './builder'
], function (
    builder
) {
    

    var completeBuilder = builder({
        bind: function (x, f) {
            // x: function (completed) {...}
            // f: function (bound) {
            //      ...
            //      return function (completed) {...}
            //    }
            // completed: function (result) {...}
            return function (completed) {
                // Therefore to $let we pass result of x into f which would return "completable" funciton.
                // Then we simply pass completed into that function and we are done.
                return x(function (xResult) {
                    var rest = f(xResult);
                    rest(completed);
                });
            };
        },

        $return: function (x) {
            return function (complete) {
                if (complete) {
                    complete(x);
                }
            };
        }
    });

    return completeBuilder();
});

/*global define*/
define('scalejs.functional',[
    'scalejs!core',
    './scalejs.functional/functional',
    './scalejs.functional/builder',
    './scalejs.functional/completeBuilder'
], function (
    core,
    functional,
    builder,
    complete
) {
    

    var merge = core.object.merge;

    core.registerExtension({
        functional: merge(functional, {
            builder: builder,
            builders: {
                complete: complete
            }
        })
    });
});


/** @license CSS.supports polyfill | @version 0.4 | MIT License | github.com/termi/CSS.supports */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @warning_level VERBOSE
// @jscomp_warning missingProperties
// @output_file_name CSS.supports.js
// @check_types
// ==/ClosureCompiler==

/*
TODO::
1. element.style.webkitProperty == element.style.WebkitProperty in Webkit (Chrome at least), so
CSS.supporst("webkit-animation", "name") is true. Think this is wrong.
*/

;(function() {
	

	var global = window
		, _CSS_supports
		, msie
		, testElement
		, prevResultsCache
		, _CSS = global["CSS"]
	;

	if( !_CSS ) {
		_CSS = global["CSS"] = {};
	}

	// ---=== HAS CSS.supports support ===---
	_CSS_supports = _CSS.supports;

	// ---=== HAS supportsCSS support ===---
	if( !_CSS_supports && global["supportsCSS"] ) {// Opera 12.10 impl
		_CSS_supports = _CSS.supports = global["supportsCSS"].bind(global);
		if( global.__proto__ ) {
			delete global.__proto__["supportsCSS"];
		}
	}


	if(typeof _CSS_supports === "function") {
		if( (function() {
			// Test for support [supports condition](http://www.w3.org/TR/css3-conditional/#supportscondition)
			try {
				_CSS_supports.call(_CSS, "(a:a)");
				// SUCCESS
				return !(global = _CSS_supports = null);//return true
			}
			catch(e) {//FAIL
				//_CSS_supports = _CSS_supports.bind(global);
			}
		})() ) {
			// EXIT
			return;// Do not need anything to do. Exit from polyfill
		}
	}
	else {
		// ---=== NO CSS.supports support ===---

		msie = "runtimeStyle" in document.documentElement;
		testElement = global["document"].createElement("_");
		prevResultsCache = {};

		_CSS_supports = function(ToCamel_replacer, testStyle, testElement, propertyName, propertyValue) {
			var name_and_value = propertyName + "\\/" + propertyValue;
			if( name_and_value in prevResultsCache ) {
				return prevResultsCache[name_and_value];
			}

			/* TODO:: for IE < 9:
			 _ = document.documentElement.appendChild(document.createElement("_"))
			 _.currentStyle[propertyName] == propertyValue
			*/
			var __bind__RE_FIRST_LETTER = this
				, propertyName_CC = (propertyName + "").replace(__bind__RE_FIRST_LETTER, ToCamel_replacer)
			;

			var result = propertyName && propertyValue && (propertyName_CC in testStyle);

			if( result ) {
				/*if( msie ) {

					try {
						testElement.style[propertyName] = propertyValue;// IE throw here, if unsupported this syntax
						testElement.style.cssText = "";
					}
					catch(e) {
						result = false;
					}

					if( result ) {
						testElement.id = uuid;
						_document.body.appendChild(testElement);

						if( (prevPropValue = testElement.currentStyle[propertyName]) != propertyValue ) {
							_document.body.insertAdjacentHTML("beforeend", "<br style='display:none' id='" + uuid + "br'><style id='" + uuid + "style'>" +
								"#" + uuid + "{display:none;height:0;width:0;visibility:hidden;position:absolute;position:fixed;" + propertyName + ":" + propertyValue + "}" +
								"</style>");

							if( !(propertyName in testElement.currentStyle) ) {
								partOfCompoundPropName
							}

							if( /\(|\s/.test(propertyValue) ) {
								currentPropValue = testElement.currentStyle[propertyName];
								result = !!currentPropValue && currentPropValue != prevPropValue;
							}
							else {
								result = testElement.currentStyle[propertyName] == propertyValue;
							}
							//_document.documentElement.removeChild(document.getElementById(uuid + "br"));
							//_document.documentElement.removeChild(document.getElementById(uuid + "style"));
						}

						//_document.documentElement.removeChild(testElement);
					}*/

				if( msie ) {
					if( /\(|\s/.test(propertyValue) ) {
						try {
							testStyle[propertyName_CC] = propertyValue;
							result = !!testStyle[propertyName_CC];
						}
						catch(e) {
							result = false;
						}
					}
					else {
						testStyle.cssText = "display:none;height:0;width:0;visibility:hidden;position:absolute;position:fixed;" + propertyName + ":" + propertyValue;
						document.documentElement.appendChild(testElement);
						result = testElement.currentStyle[propertyName_CC] == propertyValue;
						document.documentElement.removeChild(testElement);
					}
				}
				else {
					testStyle.cssText = propertyName + ":" + propertyValue;
					result = testStyle[propertyName_CC];
					result = result == propertyValue || result && testStyle.length > 0;
				}
			}

			testStyle.cssText = "";

			return prevResultsCache[name_and_value] = result;
		}.bind(
			/(-)([a-z])/g // __bind__RE_FIRST_LETTER
			, function(a, b, c) { // ToCamel_replacer
				return c.toUpperCase()
			}
			, testElement.style // testStyle
			, msie ? testElement : null // testElement
		);
	}

	// _supportsCondition("(a:b) or (display:block) or (display:none) and (display:block1)")
	function _supportsCondition(str) {
		if(!str) {
			_supportsCondition.throwSyntaxError();
		}

		/** @enum {number} @const */
		var RMAP = {
			NOT: 1
			, AND: 2
			, OR: 4
			, PROPERTY: 8
			, VALUE: 16
			, GROUP_START: 32
			, GROUP_END: 64
		};

		var resultsStack = []
			, chr
			, result
			, valid = true
			, isNot
			, start
			, currentPropertyName
			, expectedPropertyValue
			, passThisGroup
			, nextRuleCanBe = 
				RMAP.NOT | RMAP.GROUP_START | RMAP.PROPERTY
			, currentRule
			, i = -1
			, newI
			, len = str.length
		;

		resultsStack.push(void 0);

		function _getResult() {
			var l = resultsStack.length - 1;
			if( l < 0 )valid = false;
			return resultsStack[ l ];
		}

		/**
		 * @param {string=} val
		 * @private
		 */
		function _setResult(val) {
			var l = resultsStack.length - 1;
			if( l < 0 )valid = false;
			result = resultsStack[ l ] = val;
		}

		/**
		 * @param {string?} that
		 * @param {string?} notThat
		 * @param {number=} __i
		 * @param {boolean=} cssValue
		 * @return {(number|undefined)}
		 * @private
		 */
		function _checkNext(that, notThat, __i, cssValue) {
			newI = __i || i;

			var chr
				, isQuited
				, isUrl
				, special
			;

			if(cssValue) {
				newI--;
			}

			do {
				chr = str.charAt(++newI);

				if(cssValue) {
					special = chr && (isQuited || isUrl);
					if(chr == "'" || chr == "\"") {
						special = (isQuited = !isQuited);
					}
					else if(!isQuited) {
						if(!isUrl && chr == "(") {
							// TODO:: in Chrome: $0.style.background = "url('http://asd))')"; $0.style.background == "url(http://asd%29%29/)"
							isUrl = true;
							special = true;
						}
						else if(isUrl && chr == ")") {
							isUrl = false;
							special = true;
						}
					}
				}
			}
			while(special || (chr && (!that || chr != that) && (!notThat || chr == notThat)));

			if(that == null || chr == that) {
				return newI;
			}
		}

		while(++i < len) {
			if(currentRule == RMAP.NOT) {
				nextRuleCanBe = RMAP.GROUP_START | RMAP.PROPERTY;
			}
			else if(currentRule == RMAP.AND || currentRule == RMAP.OR || currentRule == RMAP.GROUP_START) {
				nextRuleCanBe = RMAP.GROUP_START | RMAP.PROPERTY | RMAP.NOT;
			}
			else if(currentRule == RMAP.GROUP_END) {
				nextRuleCanBe = RMAP.GROUP_START | RMAP.NOT | RMAP.OR | RMAP.AND;
			}
			else if(currentRule == RMAP.VALUE) {
				nextRuleCanBe = RMAP.GROUP_END | RMAP.GROUP_START | RMAP.NOT | RMAP.OR | RMAP.AND;
			}
			else if(currentRule == RMAP.PROPERTY) {
				nextRuleCanBe = RMAP.VALUE;
			}

			chr = str.charAt(i);

			if(nextRuleCanBe & RMAP.NOT && chr == "n" && str.substr(i, 3) == "not") {
				currentRule = RMAP.NOT;
				i += 2;
			}
			else if(nextRuleCanBe & RMAP.AND && chr == "a" && str.substr(i, 3) == "and") {
				currentRule = RMAP.AND;
				i += 2;
			}
			else if(nextRuleCanBe & RMAP.OR && chr == "o" && str.substr(i, 2) == "or") {
				currentRule = RMAP.OR;
				i++;
			}
			else if(nextRuleCanBe & RMAP.GROUP_START && chr == "(" && _checkNext("(", " ")) {
				currentRule = RMAP.GROUP_START;
				i = newI - 1;
			}
			else if(nextRuleCanBe & RMAP.GROUP_END && chr == ")" && resultsStack.length > 1) {
				currentRule = RMAP.GROUP_END;
			}
			else if(nextRuleCanBe & RMAP.PROPERTY && chr == "(" && (start = _checkNext(null, " ")) && _checkNext(":", null, start)) {
				currentRule = RMAP.PROPERTY;
				i = newI - 1;
				currentPropertyName = str.substr(start, i - start + 1).trim();
				start = 0;
				expectedPropertyValue = null;
				continue;
			}
			else if(nextRuleCanBe & RMAP.VALUE && (start = _checkNext(null, " ")) && _checkNext(")", null, start, true)) {
				currentRule = RMAP.VALUE;
				i = newI;
				expectedPropertyValue = str.substr(start, i - start).trim();
				start = 0;
				chr = " ";
			}
			else if(chr == " ") {
				continue;
			}
			else {
				currentRule = 0;
			}

			if(!valid || !chr || !(currentRule & nextRuleCanBe)) {
				_supportsCondition.throwSyntaxError();
			}
			valid = true;

			if(currentRule == RMAP.OR) {
				if(result === false) {
					_setResult();
					passThisGroup = false;
				}
				else if(result === true) {
					passThisGroup = true;
				}

				continue;
			}

			if( passThisGroup ) {
				continue;
			}

			result = _getResult();

			if(currentRule == RMAP.NOT) {
				isNot = true;

				continue;
			}

			if(currentRule == RMAP.AND) {
				if(result === false) {
					passThisGroup = true;
				}
				else {
					_setResult();
				}

				continue;
			}

			if(result === false && !(currentRule & (RMAP.GROUP_END | RMAP.GROUP_START))) {
				_setResult(result);
				continue;
			}

			if( currentRule == RMAP.GROUP_START ) { // Group start
				resultsStack.push(void 0);
			}
			else if( currentRule == RMAP.GROUP_END ) { // Group end
				passThisGroup = false;

				resultsStack.pop();
				if( _getResult() !== void 0) {
					result = !!(result & _getResult());
				}

				isNot = false;
			}
			else if( currentRule == RMAP.VALUE ) { // Property value
				_setResult(_CSS_supports(currentPropertyName, expectedPropertyValue));
				if(isNot)result = !result;

				isNot = false;
				expectedPropertyValue = currentPropertyName = null;
			}

			_setResult(result);
		}

		if(!valid || result === void 0 || resultsStack.length > 1) {
			_supportsCondition.throwSyntaxError();
		}

		return result;
	}
	_supportsCondition.throwSyntaxError = function() {
		throw new Error("SYNTAX_ERR");
	};

	/**
	 * @expose
	 */
	_CSS.supports = function(a, b) {
		if(!arguments.length) {
			throw new Error("WRONG_ARGUMENTS_ERR");//TODO:: DOMException ?
		}

		if(arguments.length == 1) {
			return _supportsCondition(a);
		}

		return _CSS_supports(a, b);
	};

	global = testElement = null;// no need this any more
})();

define("CSS.supports", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.CSS;
    };
}(this)));

/* parser generated by jison 0.4.6 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var cssParser = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"stylesheet":3,"charset":4,"space_cdata_list":5,"import_list":6,"namespace_list":7,"general_list":8,"CHARSET_SYM":9,"wempty":10,"STRING":11,";":12,"import_item":13,"import":14,"IMPORT_SYM":15,"string_or_uri":16,"media_query_list":17,"namespace_item":18,"namespace":19,"NAMESPACE_SYM":20,"namespace_prefix":21,"IDENT":22,"URI":23,"general_item":24,"null":25,"ruleset":26,"media":27,"page":28,"font_face":29,"keyframes":30,"MEDIA_SYM":31,"{":32,"}":33,"media_query":34,"media_combinator":35,"(":36,")":37,":":38,",":39,"whitespace":40,"computable_term":41,"string_term":42,"PAGE_SYM":43,"page_ident":44,"pseudo_page":45,"declaration_list":46,"FONT_FACE_SYM":47,"unary_operator":48,"-":49,"+":50,"property":51,"*":52,"selector_list":53,"selector":54,"simple_selector":55,"combinator":56,">":57,"simple_selector_atom_list":58,"element_name":59,"simple_selector_atom":60,"HASH":61,"class":62,"attrib":63,"pseudo":64,".":65,"[":66,"]":67,"attrib_operator":68,"attrib_value":69,"=":70,"INCLUDES":71,"DASHMATCH":72,"PREFIXMATCH":73,"SUFFIXMATCH":74,"SUBSTRINGMATCH":75,"FUNCTION":76,"declaration_parts":77,"declaration":78,"expr":79,"IMPORTANT_SYM":80,"term":81,"operator":82,"NUMBER":83,"PERCENTAGE":84,"LENGTH":85,"EMS":86,"EXS":87,"ANGLE":88,"TIME":89,"FREQ":90,"UNICODERANGE":91,"hexcolor":92,"/":93,"S":94,"space_cdata":95,"CDO":96,"CDC":97,"keyframe_symbol":98,"keyframe_list":99,"keyframe":100,"keyframe_offset_list":101,"keyframe_offset":102,"KEYFRAMES":103,"$accept":0,"$end":1},
terminals_: {2:"error",9:"CHARSET_SYM",11:"STRING",12:";",15:"IMPORT_SYM",20:"NAMESPACE_SYM",22:"IDENT",23:"URI",25:"null",31:"MEDIA_SYM",32:"{",33:"}",36:"(",37:")",38:":",39:",",43:"PAGE_SYM",47:"FONT_FACE_SYM",49:"-",50:"+",52:"*",57:">",61:"HASH",65:".",66:"[",67:"]",70:"=",71:"INCLUDES",72:"DASHMATCH",73:"PREFIXMATCH",74:"SUFFIXMATCH",75:"SUBSTRINGMATCH",76:"FUNCTION",80:"IMPORTANT_SYM",83:"NUMBER",84:"PERCENTAGE",85:"LENGTH",86:"EMS",87:"EXS",88:"ANGLE",89:"TIME",90:"FREQ",91:"UNICODERANGE",93:"/",94:"S",96:"CDO",97:"CDC",103:"KEYFRAMES"},
productions_: [0,[3,5],[4,5],[4,0],[6,1],[6,2],[6,0],[13,1],[13,1],[14,6],[7,1],[7,2],[7,0],[18,1],[18,1],[19,6],[21,2],[21,1],[16,2],[16,2],[8,1],[8,2],[8,1],[24,1],[24,1],[24,1],[24,1],[24,1],[24,1],[27,8],[17,1],[17,2],[17,3],[17,0],[35,2],[35,2],[35,2],[35,2],[35,1],[34,1],[34,1],[34,0],[28,10],[44,1],[44,0],[45,2],[45,0],[29,7],[48,1],[48,1],[51,2],[51,3],[26,6],[53,1],[53,4],[54,1],[54,3],[56,2],[56,2],[56,0],[55,2],[55,3],[58,1],[58,2],[58,0],[60,1],[60,1],[60,1],[60,1],[62,2],[59,1],[59,1],[63,5],[63,9],[68,1],[68,1],[68,1],[68,1],[68,1],[68,1],[69,1],[69,1],[64,2],[64,6],[64,6],[64,3],[46,1],[46,2],[77,1],[77,1],[77,1],[78,5],[78,6],[78,0],[79,1],[79,3],[79,2],[81,1],[81,2],[81,1],[41,2],[41,2],[41,2],[41,2],[41,2],[41,2],[41,2],[41,2],[41,5],[42,2],[42,2],[42,2],[42,2],[42,1],[82,2],[82,2],[82,2],[82,0],[92,2],[40,1],[40,2],[10,1],[10,0],[5,1],[5,2],[5,0],[95,1],[95,1],[95,1],[30,8],[99,1],[99,2],[99,0],[100,6],[101,2],[101,4],[102,1],[102,1],[102,1],[98,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
  		this.$ = {};
  		if ( $$[$0-4] )
  		  	this.$["charset"]	= $$[$0-4];
  		if ( $$[$0-2] )
  			this.$["imports"]	= $$[$0-2];
  		if ( $$[$0-1] )
  			this.$["namespaces"]	= $$[$0-1];
  		if ( $$[$0] )
  			this.$["rulelist"]	= $$[$0];

  		return this.$;
  	
break;
case 2:this.$ = $$[$0-2];
break;
case 3:this.$ = "";
break;
case 4:
  		this.$ = [];
  		if ( $$[$0] !== null )
  			this.$.push ( $$[$0] );
  	
break;
case 5:
  		this.$ = $$[$0-1];
  		if ( $$[$0] !== null )
  			this.$.push ( $$[$0] );
  	
break;
case 6:this.$ = null;
break;
case 7:this.$ = $$[$0];
break;
case 8:this.$ = null;
break;
case 9:
  		this.$ = {
  			"import": $$[$0-3]
  		};

  		if ( $$[$0-2] != null )
	  		this.$[ "mediaqueries" ] = $$[$0-2];
  	
break;
case 10:
  		this.$ = [];
  		if ( $$[$0] !== null )
  			this.$.push ( $$[$0] );
  	
break;
case 11:
  		this.$ = $$[$0-1];
  		if ( $$[$0] !== null )
  			this.$.push ( $$[$0] );
  	
break;
case 12:this.$ = null;
break;
case 13:this.$ = $$[$0];
break;
case 14:this.$ = null;
break;
case 15:
  		this.$ = {
  			"namespace": $$[$0-2]
  		};
  		
  		if ( $$[$0-3] )
	  		this.$["prefix"] = $$[$0-3];
  	
break;
case 16:this.$ = $$[$0-1];
break;
case 17:this.$ = null;
break;
case 18:
		this.$ = $$[$0-1].substring(1, $$[$0-1].length - 1);
	
break;
case 19:this.$ = $$[$0-1];
break;
case 20:
  		this.$ = [];
  		if ( $$[$0] !== null )
  			this.$.push ( $$[$0] );
  	
break;
case 21:
  		this.$ = $$[$0-1];
  		this.$.push( $$[$0] );
  	
break;
case 23:this.$ = $$[$0];
break;
case 24:this.$ = $$[$0];
break;
case 25:this.$ = $$[$0];
break;
case 26:this.$ = $$[$0];
break;
case 27:this.$ = $$[$0];
break;
case 28:this.$ = null;
break;
case 29:this.$ = { "type": "media", "mediaqueries" : $$[$0-5], "children": $$[$0-2] };
break;
case 30:this.$ = $$[$0];
break;
case 31:this.$ = $$[$0-1] + ' ' + $$[$0];
break;
case 32:this.$ = $$[$0-2] + $$[$0-1] + $$[$0];
break;
case 33:this.$ = null;
break;
case 34:this.$ = ' ' + $$[$0-1]				/* cwdoh; for beatify */;
break;
case 35:this.$ = $$[$0-1];
break;
case 36:this.$ = $$[$0-1];
break;
case 37:this.$ = ", ";
break;
case 38:this.$ = ' ';
break;
case 39:this.$ = $$[$0];
break;
case 40:this.$ = $$[$0];
break;
case 41:this.$ = "";
break;
case 42:this.$ =	{ "id": $$[$0-7], "pseudo": $$[$0-6], "declarations": $$[$0-2] };
break;
case 43:this.$ = $$[$0];
break;
case 44:this.$ = "";
break;
case 45:this.$ = $$[$0-1] + $$[$0];
break;
case 46:this.$ = "";
break;
case 47:this.$ = { "type": "fontface", "declarations": $$[$0-2] };
break;
case 48:this.$ = $$[$0];
break;
case 49:this.$ = $$[$0];
break;
case 50:this.$ = $$[$0-1];
break;
case 51:this.$ = $$[$0-2] + $$[$0-1]			/* cwdoh; */;
break;
case 52:this.$ = { "type": "style", "selector": $$[$0-5], "declarations": $$[$0-2] };
break;
case 53:this.$ = $$[$0];
break;
case 54:this.$ = $$[$0-3] + $$[$0-2] + ' ' + $$[$0];
break;
case 55:this.$ = $$[$0];
break;
case 56:this.$ = $$[$0-2] + $$[$0-1] + $$[$0];
break;
case 57:this.$ = $$[$0-1];
break;
case 58:this.$ = $$[$0-1];
break;
case 59:this.$ = "";
break;
case 60:this.$ = $$[$0-1];
break;
case 61:this.$ = $$[$0-2] + $$[$0-1];
break;
case 62:this.$ = $$[$0];
break;
case 63:this.$ = $$[$0-1] + $$[$0];
break;
case 64:this.$ = "";
break;
case 65:this.$ = $$[$0];
break;
case 66:this.$ = $$[$0];
break;
case 67:this.$ = $$[$0];
break;
case 68:this.$ = $$[$0];
break;
case 69:this.$ = $$[$0-1] + $$[$0];
break;
case 70:this.$ = $$[$0];
break;
case 71:this.$ = $$[$0];
break;
case 72:this.$ = $$[$0-4] + $$[$0-2] + $$[$0];
break;
case 73:this.$ = $$[$0-8] + $$[$0-6] + $$[$0-4] + $$[$0-3] + $$[$0-2] + $$[$0];
break;
case 74:this.$ = $$[$0];
break;
case 75:this.$ = $$[$0];
break;
case 76:this.$ = $$[$0];
break;
case 77:this.$ = $$[$0];
break;
case 78:this.$ = $$[$0];
break;
case 79:this.$ = $$[$0];
break;
case 80:this.$ = $$[$0];
break;
case 81:this.$ = $$[$0];
break;
case 82:this.$ = $$[$0-1] + $$[$0];
break;
case 83:this.$ = $$[$0-5] + $$[$0-4] + $$[$0-2] + $$[$0];
break;
case 84:this.$ = $$[$0-5] + $$[$0-4] + $$[$0-2] + $$[$0]		/* cwdoh; modern browsers allow attrib in pseudo function? */;
break;
case 85:this.$ = $$[$0-2] + $$[$0-1] + $$[$0]				/* cwdoh; is "::" moz extension? */;
break;
case 86:
  		this.$ = {};
  		if ( $$[$0] !== null ) {
  			this.$[ $$[$0][0] ] = $$[$0][1];
  		}
  	
break;
case 87:
  		this.$ = $$[$0-1];
  		if ( $$[$0] !== null ) {
	  		this.$[ $$[$0][0] ] = $$[$0][1];
	  	}
  	
break;
case 88:this.$ = $$[$0];
break;
case 89:this.$ = null;
break;
case 90:this.$ = null;
break;
case 91:this.$ = [ $$[$0-4], $$[$0-1] ];
break;
case 92:this.$ = [ $$[$0-5], $$[$0-2] + " !important" ];
break;
case 93:this.$ = null;
break;
case 94:this.$ = $$[$0];
break;
case 95:this.$ = $$[$0-2] + $$[$0-1] + $$[$0];
break;
case 96:this.$ = $$[$0-1] + ' ' + $$[$0];
break;
case 97:this.$ = $$[$0];
break;
case 98:this.$ = $$[$0-1] + $$[$0];
break;
case 99:this.$ = $$[$0];
break;
case 100:this.$ = $$[$0-1];
break;
case 101:this.$ = $$[$0-1];
break;
case 102:this.$ = $$[$0-1];
break;
case 103:this.$ = $$[$0-1];
break;
case 104:this.$ = $$[$0-1];
break;
case 105:this.$ = $$[$0-1];
break;
case 106:this.$ = $$[$0-1];
break;
case 107:this.$ = $$[$0-1];
break;
case 108:this.$ = $$[$0-4] + $$[$0-2] + $$[$0-1];
break;
case 109:this.$ = $$[$0-1];
break;
case 110:this.$ = $$[$0-1];
break;
case 111:this.$ = $$[$0-1];
break;
case 112:this.$ = $$[$0-1];
break;
case 113:this.$ = $$[$0];
break;
case 114:this.$ = $$[$0-1];
break;
case 115:this.$ = $$[$0-1];
break;
case 116:this.$ = $$[$0-1];
break;
case 117:this.$ = "";
break;
case 118:this.$ = $$[$0-1];
break;
case 119:this.$ = ' ';
break;
case 120:this.$ = ' ';
break;
case 121:this.$ = $$[$0];
break;
case 122:this.$ = "";
break;
case 123:this.$ = null;
break;
case 124:this.$ = null;
break;
case 126:this.$ = null;
break;
case 127:this.$ = null;
break;
case 128:this.$ = null;
break;
case 129:this.$ = { "type": "keyframes", "id": $$[$0-6],	"keyframes": $$[$0-2], "prefix": $$[$0-7] };
break;
case 130:this.$ = [ $$[$0] ];
break;
case 131:
  		this.$ = $$[$0-1];
  		this.$.push( $$[$0] );
  	
break;
case 132:this.$ = [];
break;
case 133:this.$ = { "type": "keyframe", "offset": $$[$0-5], "declarations": $$[$0-2] };
break;
case 134:this.$ = $$[$0-1];
break;
case 135:this.$ = $$[$0-3] + ", " + $$[$0-2];
break;
case 136:this.$ = $$[$0];
break;
case 137:this.$ = $$[$0];
break;
case 138:this.$ = $$[$0];
break;
case 139:this.$ = $$[$0-1].split( new RegExp("@([-a-zA-Z0-9]*)keyframes", "g") )[1]		/* only prefix */;
break;
}
},
table: [{1:[2,3],3:1,4:2,9:[1,3],15:[2,3],20:[2,3],22:[2,3],25:[2,3],31:[2,3],32:[2,3],38:[2,3],39:[2,3],43:[2,3],47:[2,3],50:[2,3],52:[2,3],57:[2,3],61:[2,3],65:[2,3],66:[2,3],94:[2,3],96:[2,3],97:[2,3],103:[2,3]},{1:[3]},{1:[2,125],5:4,15:[2,125],20:[2,125],22:[2,125],25:[2,125],31:[2,125],32:[2,125],38:[2,125],39:[2,125],43:[2,125],47:[2,125],50:[2,125],52:[2,125],57:[2,125],61:[2,125],65:[2,125],66:[2,125],94:[1,6],95:5,96:[1,7],97:[1,8],103:[2,125]},{10:9,11:[2,122],40:10,94:[1,11]},{1:[2,6],5:16,6:12,13:14,14:15,15:[1,17],20:[2,6],22:[2,6],25:[2,6],31:[2,6],32:[2,6],38:[2,6],39:[2,6],43:[2,6],47:[2,6],50:[2,6],52:[2,6],57:[2,6],61:[2,6],65:[2,6],66:[2,6],94:[1,6],95:13,96:[1,7],97:[1,8],103:[2,6]},{1:[2,123],15:[2,123],20:[2,123],22:[2,123],25:[2,123],31:[2,123],32:[2,123],33:[2,123],38:[2,123],39:[2,123],43:[2,123],47:[2,123],50:[2,123],52:[2,123],57:[2,123],61:[2,123],65:[2,123],66:[2,123],94:[2,123],96:[2,123],97:[2,123],103:[2,123]},{1:[2,126],15:[2,126],20:[2,126],22:[2,126],25:[2,126],31:[2,126],32:[2,126],33:[2,126],38:[2,126],39:[2,126],43:[2,126],47:[2,126],50:[2,126],52:[2,126],57:[2,126],61:[2,126],65:[2,126],66:[2,126],94:[2,126],96:[2,126],97:[2,126],103:[2,126]},{1:[2,127],15:[2,127],20:[2,127],22:[2,127],25:[2,127],31:[2,127],32:[2,127],33:[2,127],38:[2,127],39:[2,127],43:[2,127],47:[2,127],50:[2,127],52:[2,127],57:[2,127],61:[2,127],65:[2,127],66:[2,127],94:[2,127],96:[2,127],97:[2,127],103:[2,127]},{1:[2,128],15:[2,128],20:[2,128],22:[2,128],25:[2,128],31:[2,128],32:[2,128],33:[2,128],38:[2,128],39:[2,128],43:[2,128],47:[2,128],50:[2,128],52:[2,128],57:[2,128],61:[2,128],65:[2,128],66:[2,128],94:[2,128],96:[2,128],97:[2,128],103:[2,128]},{11:[1,18]},{1:[2,121],11:[2,121],12:[2,121],15:[2,121],20:[2,121],22:[2,121],23:[2,121],25:[2,121],31:[2,121],32:[2,121],33:[2,121],36:[2,121],37:[2,121],38:[2,121],39:[2,121],43:[2,121],47:[2,121],49:[2,121],50:[2,121],52:[2,121],57:[2,121],61:[2,121],65:[2,121],66:[2,121],67:[2,121],70:[2,121],71:[2,121],72:[2,121],73:[2,121],74:[2,121],75:[2,121],76:[2,121],80:[2,121],83:[2,121],84:[2,121],85:[2,121],86:[2,121],87:[2,121],88:[2,121],89:[2,121],90:[2,121],91:[2,121],93:[2,121],94:[1,19],96:[2,121],97:[2,121],103:[2,121]},{1:[2,119],11:[2,119],12:[2,119],15:[2,119],20:[2,119],22:[2,119],23:[2,119],25:[2,119],31:[2,119],32:[2,119],33:[2,119],36:[2,119],37:[2,119],38:[2,119],39:[2,119],43:[2,119],47:[2,119],49:[2,119],50:[2,119],52:[2,119],57:[2,119],61:[2,119],65:[2,119],66:[2,119],67:[2,119],70:[2,119],71:[2,119],72:[2,119],73:[2,119],74:[2,119],75:[2,119],76:[2,119],80:[2,119],83:[2,119],84:[2,119],85:[2,119],86:[2,119],87:[2,119],88:[2,119],89:[2,119],90:[2,119],91:[2,119],93:[2,119],94:[2,119],96:[2,119],97:[2,119],103:[2,119]},{1:[2,12],5:23,7:20,13:21,14:15,15:[1,17],18:22,19:24,20:[1,25],22:[2,12],25:[2,12],31:[2,12],32:[2,12],38:[2,12],39:[2,12],43:[2,12],47:[2,12],50:[2,12],52:[2,12],57:[2,12],61:[2,12],65:[2,12],66:[2,12],94:[1,6],95:5,96:[1,7],97:[1,8],103:[2,12]},{1:[2,124],15:[2,124],20:[2,124],22:[2,124],25:[2,124],31:[2,124],32:[2,124],38:[2,124],39:[2,124],43:[2,124],47:[2,124],50:[2,124],52:[2,124],57:[2,124],61:[2,124],65:[2,124],66:[2,124],94:[2,124],96:[2,124],97:[2,124],103:[2,124]},{1:[2,4],15:[2,4],20:[2,4],22:[2,4],25:[2,4],31:[2,4],32:[2,4],38:[2,4],39:[2,4],43:[2,4],47:[2,4],50:[2,4],52:[2,4],57:[2,4],61:[2,4],65:[2,4],66:[2,4],94:[2,4],96:[2,4],97:[2,4],103:[2,4]},{1:[2,7],15:[2,7],20:[2,7],22:[2,7],25:[2,7],31:[2,7],32:[2,7],38:[2,7],39:[2,7],43:[2,7],47:[2,7],50:[2,7],52:[2,7],57:[2,7],61:[2,7],65:[2,7],66:[2,7],94:[2,7],96:[2,7],97:[2,7],103:[2,7]},{1:[2,8],15:[2,8],20:[2,8],22:[2,8],25:[2,8],31:[2,8],32:[2,8],38:[2,8],39:[2,8],43:[2,8],47:[2,8],50:[2,8],52:[2,8],57:[2,8],61:[2,8],65:[2,8],66:[2,8],94:[1,6],95:26,96:[1,7],97:[1,8],103:[2,8]},{10:27,11:[2,122],23:[2,122],40:10,94:[1,11]},{10:28,12:[2,122],40:10,94:[1,11]},{1:[2,120],11:[2,120],12:[2,120],15:[2,120],20:[2,120],22:[2,120],23:[2,120],25:[2,120],31:[2,120],32:[2,120],33:[2,120],36:[2,120],37:[2,120],38:[2,120],39:[2,120],43:[2,120],47:[2,120],49:[2,120],50:[2,120],52:[2,120],57:[2,120],61:[2,120],65:[2,120],66:[2,120],67:[2,120],70:[2,120],71:[2,120],72:[2,120],73:[2,120],74:[2,120],75:[2,120],76:[2,120],80:[2,120],83:[2,120],84:[2,120],85:[2,120],86:[2,120],87:[2,120],88:[2,120],89:[2,120],90:[2,120],91:[2,120],93:[2,120],94:[2,120],96:[2,120],97:[2,120],103:[2,120]},{1:[2,125],5:33,8:29,18:30,19:24,20:[1,25],22:[1,50],24:31,25:[1,32],26:34,27:35,28:36,29:37,30:38,31:[1,40],32:[2,125],38:[1,58],39:[2,125],43:[1,41],47:[1,42],50:[2,125],52:[1,51],53:39,54:44,55:46,57:[2,125],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,6],95:5,96:[1,7],97:[1,8],98:43,103:[1,45]},{1:[2,5],15:[2,5],20:[2,5],22:[2,5],25:[2,5],31:[2,5],32:[2,5],38:[2,5],39:[2,5],43:[2,5],47:[2,5],50:[2,5],52:[2,5],57:[2,5],61:[2,5],65:[2,5],66:[2,5],94:[2,5],96:[2,5],97:[2,5],103:[2,5]},{1:[2,10],20:[2,10],22:[2,10],25:[2,10],31:[2,10],32:[2,10],38:[2,10],39:[2,10],43:[2,10],47:[2,10],50:[2,10],52:[2,10],57:[2,10],61:[2,10],65:[2,10],66:[2,10],94:[2,10],96:[2,10],97:[2,10],103:[2,10]},{1:[2,8],15:[2,8],20:[2,8],22:[2,8],25:[2,8],31:[2,8],32:[2,8],38:[2,8],39:[2,8],43:[2,8],47:[2,8],50:[2,8],52:[2,8],57:[2,8],61:[2,8],65:[2,8],66:[2,8],94:[1,6],95:26,96:[1,7],97:[1,8],103:[2,8]},{1:[2,13],20:[2,13],22:[2,13],25:[2,13],31:[2,13],32:[2,13],38:[2,13],39:[2,13],43:[2,13],47:[2,13],50:[2,13],52:[2,13],57:[2,13],61:[2,13],65:[2,13],66:[2,13],94:[2,13],96:[2,13],97:[2,13],103:[2,13]},{10:59,11:[2,122],22:[2,122],23:[2,122],40:10,94:[1,11]},{1:[2,124],15:[2,124],20:[2,124],22:[2,124],25:[2,124],31:[2,124],32:[2,124],33:[2,124],38:[2,124],39:[2,124],43:[2,124],47:[2,124],50:[2,124],52:[2,124],57:[2,124],61:[2,124],65:[2,124],66:[2,124],94:[2,124],96:[2,124],97:[2,124],103:[2,124]},{11:[1,61],16:60,23:[1,62]},{12:[1,63]},{1:[2,1],5:65,22:[1,50],24:64,26:34,27:35,28:36,29:37,30:38,31:[1,40],32:[2,125],38:[1,58],39:[2,125],43:[1,41],47:[1,42],50:[2,125],52:[1,51],53:39,54:44,55:46,57:[2,125],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,6],95:5,96:[1,7],97:[1,8],98:43,103:[1,45]},{1:[2,11],20:[2,11],22:[2,11],25:[2,11],31:[2,11],32:[2,11],38:[2,11],39:[2,11],43:[2,11],47:[2,11],50:[2,11],52:[2,11],57:[2,11],61:[2,11],65:[2,11],66:[2,11],94:[2,11],96:[2,11],97:[2,11],103:[2,11]},{1:[2,20],22:[2,20],31:[2,20],32:[2,20],33:[2,20],38:[2,20],39:[2,20],43:[2,20],47:[2,20],50:[2,20],52:[2,20],57:[2,20],61:[2,20],65:[2,20],66:[2,20],94:[2,20],96:[2,20],97:[2,20],103:[2,20]},{1:[2,22],22:[2,22],31:[2,22],32:[2,22],33:[2,22],38:[2,22],39:[2,22],43:[2,22],47:[2,22],50:[2,22],52:[2,22],57:[2,22],61:[2,22],65:[2,22],66:[2,22],94:[2,22],96:[2,22],97:[2,22],103:[2,22]},{1:[2,14],20:[2,14],22:[2,14],25:[2,14],31:[2,14],32:[2,14],38:[2,14],39:[2,14],43:[2,14],47:[2,14],50:[2,14],52:[2,14],57:[2,14],61:[2,14],65:[2,14],66:[2,14],94:[1,6],95:26,96:[1,7],97:[1,8],103:[2,14]},{1:[2,23],22:[2,23],31:[2,23],32:[2,23],33:[2,23],38:[2,23],39:[2,23],43:[2,23],47:[2,23],50:[2,23],52:[2,23],57:[2,23],61:[2,23],65:[2,23],66:[2,23],94:[2,23],96:[2,23],97:[2,23],103:[2,23]},{1:[2,24],22:[2,24],31:[2,24],32:[2,24],33:[2,24],38:[2,24],39:[2,24],43:[2,24],47:[2,24],50:[2,24],52:[2,24],57:[2,24],61:[2,24],65:[2,24],66:[2,24],94:[2,24],96:[2,24],97:[2,24],103:[2,24]},{1:[2,25],22:[2,25],31:[2,25],32:[2,25],33:[2,25],38:[2,25],39:[2,25],43:[2,25],47:[2,25],50:[2,25],52:[2,25],57:[2,25],61:[2,25],65:[2,25],66:[2,25],94:[2,25],96:[2,25],97:[2,25],103:[2,25]},{1:[2,26],22:[2,26],31:[2,26],32:[2,26],33:[2,26],38:[2,26],39:[2,26],43:[2,26],47:[2,26],50:[2,26],52:[2,26],57:[2,26],61:[2,26],65:[2,26],66:[2,26],94:[2,26],96:[2,26],97:[2,26],103:[2,26]},{1:[2,27],22:[2,27],31:[2,27],32:[2,27],33:[2,27],38:[2,27],39:[2,27],43:[2,27],47:[2,27],50:[2,27],52:[2,27],57:[2,27],61:[2,27],65:[2,27],66:[2,27],94:[2,27],96:[2,27],97:[2,27],103:[2,27]},{32:[1,66],39:[1,67]},{10:68,11:[2,122],22:[2,122],23:[2,122],32:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:69,22:[2,122],32:[2,122],38:[2,122],40:10,94:[1,11]},{10:70,32:[2,122],40:10,94:[1,11]},{22:[1,71]},{22:[2,59],32:[2,53],38:[2,59],39:[2,53],50:[1,73],52:[2,59],56:72,57:[1,74],61:[2,59],65:[2,59],66:[2,59],94:[2,59]},{10:75,22:[2,122],40:10,94:[1,11]},{22:[2,55],32:[2,55],38:[2,55],39:[2,55],50:[2,55],52:[2,55],57:[2,55],61:[2,55],65:[2,55],66:[2,55],94:[2,55]},{10:76,22:[2,122],32:[2,122],38:[1,58],39:[2,122],40:10,50:[2,122],52:[2,122],57:[2,122],60:77,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,11]},{22:[2,64],32:[2,64],38:[1,58],39:[2,64],50:[2,64],52:[2,64],57:[2,64],58:78,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[2,64]},{22:[2,62],32:[2,62],38:[2,62],39:[2,62],50:[2,62],52:[2,62],57:[2,62],61:[2,62],65:[2,62],66:[2,62],94:[2,62]},{22:[2,70],32:[2,70],38:[2,70],39:[2,70],50:[2,70],52:[2,70],57:[2,70],61:[2,70],65:[2,70],66:[2,70],94:[2,70]},{22:[2,71],32:[2,71],38:[2,71],39:[2,71],50:[2,71],52:[2,71],57:[2,71],61:[2,71],65:[2,71],66:[2,71],94:[2,71]},{22:[2,65],32:[2,65],38:[2,65],39:[2,65],50:[2,65],52:[2,65],57:[2,65],61:[2,65],65:[2,65],66:[2,65],94:[2,65]},{22:[2,66],32:[2,66],38:[2,66],39:[2,66],50:[2,66],52:[2,66],57:[2,66],61:[2,66],65:[2,66],66:[2,66],94:[2,66]},{22:[2,67],32:[2,67],38:[2,67],39:[2,67],50:[2,67],52:[2,67],57:[2,67],61:[2,67],65:[2,67],66:[2,67],94:[2,67]},{22:[2,68],32:[2,68],38:[2,68],39:[2,68],50:[2,68],52:[2,68],57:[2,68],61:[2,68],65:[2,68],66:[2,68],94:[2,68]},{22:[1,79]},{10:80,22:[2,122],40:10,94:[1,11]},{22:[1,81],38:[1,83],76:[1,82]},{10:86,11:[2,122],21:84,22:[1,85],23:[2,122],40:10,94:[1,11]},{11:[1,100],12:[2,33],17:87,22:[1,101],23:[1,102],34:88,36:[2,33],37:[2,33],38:[2,33],39:[2,33],41:89,42:90,61:[1,105],76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,94:[2,33]},{10:106,11:[2,122],12:[2,122],22:[2,122],23:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:107,11:[2,122],12:[2,122],22:[2,122],23:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{1:[2,2],15:[2,2],20:[2,2],22:[2,2],25:[2,2],31:[2,2],32:[2,2],38:[2,2],39:[2,2],43:[2,2],47:[2,2],50:[2,2],52:[2,2],57:[2,2],61:[2,2],65:[2,2],66:[2,2],94:[2,2],96:[2,2],97:[2,2],103:[2,2]},{1:[2,21],22:[2,21],31:[2,21],32:[2,21],33:[2,21],38:[2,21],39:[2,21],43:[2,21],47:[2,21],50:[2,21],52:[2,21],57:[2,21],61:[2,21],65:[2,21],66:[2,21],94:[2,21],96:[2,21],97:[2,21],103:[2,21]},{1:[2,28],22:[2,28],31:[2,28],32:[2,28],33:[2,28],38:[2,28],39:[2,28],43:[2,28],47:[2,28],50:[2,28],52:[2,28],57:[2,28],61:[2,28],65:[2,28],66:[2,28],94:[1,6],95:26,96:[1,7],97:[1,8],103:[2,28]},{10:108,12:[2,122],22:[2,122],33:[2,122],40:10,52:[2,122],94:[1,11]},{10:109,22:[2,122],32:[2,122],38:[2,122],39:[2,122],40:10,50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11]},{11:[1,100],17:110,22:[1,101],23:[1,102],32:[2,33],34:88,36:[2,33],37:[2,33],38:[2,33],39:[2,33],41:89,42:90,61:[1,105],76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,94:[2,33]},{22:[1,112],32:[2,44],38:[2,44],44:111,94:[2,44]},{32:[1,113]},{10:114,32:[2,122],40:10,94:[1,11]},{22:[1,50],32:[2,64],38:[1,58],39:[2,64],50:[2,64],52:[1,51],55:115,57:[2,64],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[2,64]},{10:116,22:[2,122],32:[2,122],38:[2,122],39:[2,122],40:10,50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11]},{10:117,22:[2,122],32:[2,122],38:[2,122],39:[2,122],40:10,50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11]},{22:[2,139]},{22:[2,60],32:[2,60],38:[2,60],39:[2,60],50:[2,60],52:[2,60],57:[2,60],61:[2,60],65:[2,60],66:[2,60],94:[2,60]},{22:[2,63],32:[2,63],38:[2,63],39:[2,63],50:[2,63],52:[2,63],57:[2,63],61:[2,63],65:[2,63],66:[2,63],94:[2,63]},{10:118,22:[2,122],32:[2,122],38:[1,58],39:[2,122],40:10,50:[2,122],52:[2,122],57:[2,122],60:77,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,11]},{22:[2,69],32:[2,69],38:[2,69],39:[2,69],50:[2,69],52:[2,69],57:[2,69],61:[2,69],65:[2,69],66:[2,69],94:[2,69]},{22:[1,119]},{22:[2,82],32:[2,82],38:[2,82],39:[2,82],50:[2,82],52:[2,82],57:[2,82],61:[2,82],65:[2,82],66:[2,82],94:[2,82]},{10:120,22:[2,122],40:10,66:[2,122],94:[1,11]},{22:[1,121]},{11:[1,61],16:122,23:[1,62]},{10:123,11:[2,122],23:[2,122],40:10,94:[1,11]},{11:[2,17],23:[2,17]},{11:[1,100],12:[1,124],22:[1,101],23:[1,102],34:125,35:126,36:[1,127],37:[1,128],38:[1,129],39:[1,130],40:131,41:89,42:90,61:[1,105],76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,94:[1,11]},{11:[2,30],12:[2,30],22:[2,30],23:[2,30],32:[2,30],36:[2,30],37:[2,30],38:[2,30],39:[2,30],61:[2,30],76:[2,30],83:[2,30],84:[2,30],85:[2,30],86:[2,30],87:[2,30],88:[2,30],89:[2,30],90:[2,30],91:[2,30],94:[2,30]},{11:[2,39],12:[2,39],22:[2,39],23:[2,39],32:[2,39],36:[2,39],37:[2,39],38:[2,39],39:[2,39],61:[2,39],76:[2,39],83:[2,39],84:[2,39],85:[2,39],86:[2,39],87:[2,39],88:[2,39],89:[2,39],90:[2,39],91:[2,39],94:[2,39]},{11:[2,40],12:[2,40],22:[2,40],23:[2,40],32:[2,40],36:[2,40],37:[2,40],38:[2,40],39:[2,40],61:[2,40],76:[2,40],83:[2,40],84:[2,40],85:[2,40],86:[2,40],87:[2,40],88:[2,40],89:[2,40],90:[2,40],91:[2,40],94:[2,40]},{10:132,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:133,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:134,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:135,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:136,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:137,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:138,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:139,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:140,11:[2,122],22:[2,122],23:[2,122],40:10,49:[2,122],50:[2,122],61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:141,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:142,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:143,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{10:144,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{11:[2,113],12:[2,113],22:[2,113],23:[2,113],32:[2,113],33:[2,113],36:[2,113],37:[2,113],38:[2,113],39:[2,113],49:[2,113],50:[2,113],52:[2,113],61:[2,113],70:[2,113],76:[2,113],80:[2,113],83:[2,113],84:[2,113],85:[2,113],86:[2,113],87:[2,113],88:[2,113],89:[2,113],90:[2,113],91:[2,113],93:[2,113],94:[2,113]},{10:145,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{11:[2,18],12:[2,18],22:[2,18],23:[2,18],36:[2,18],37:[2,18],38:[2,18],39:[2,18],61:[2,18],76:[2,18],83:[2,18],84:[2,18],85:[2,18],86:[2,18],87:[2,18],88:[2,18],89:[2,18],90:[2,18],91:[2,18],94:[2,18]},{11:[2,19],12:[2,19],22:[2,19],23:[2,19],36:[2,19],37:[2,19],38:[2,19],39:[2,19],61:[2,19],76:[2,19],83:[2,19],84:[2,19],85:[2,19],86:[2,19],87:[2,19],88:[2,19],89:[2,19],90:[2,19],91:[2,19],94:[2,19]},{10:150,12:[1,149],22:[1,152],33:[2,93],40:10,46:146,51:151,52:[1,153],77:147,78:148,94:[1,11]},{22:[1,50],32:[2,64],38:[1,58],39:[2,64],50:[2,64],52:[1,51],54:154,55:46,57:[2,64],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[2,64]},{11:[1,100],22:[1,101],23:[1,102],32:[1,155],34:125,35:126,36:[1,127],37:[1,128],38:[1,129],39:[1,130],40:131,41:89,42:90,61:[1,105],76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,94:[1,11]},{32:[2,46],38:[1,157],45:156,94:[2,46]},{32:[2,43],38:[2,43],94:[2,43]},{10:158,12:[2,122],22:[2,122],33:[2,122],40:10,52:[2,122],94:[1,11]},{32:[1,159]},{22:[2,56],32:[2,56],38:[2,56],39:[2,56],50:[2,56],52:[2,56],57:[2,56],61:[2,56],65:[2,56],66:[2,56],94:[2,56]},{22:[2,57],32:[2,57],38:[2,57],39:[2,57],50:[2,57],52:[2,57],57:[2,57],61:[2,57],65:[2,57],66:[2,57],94:[2,57]},{22:[2,58],32:[2,58],38:[2,58],39:[2,58],50:[2,58],52:[2,58],57:[2,58],61:[2,58],65:[2,58],66:[2,58],94:[2,58]},{22:[2,61],32:[2,61],38:[2,61],39:[2,61],50:[2,61],52:[2,61],57:[2,61],61:[2,61],65:[2,61],66:[2,61],94:[2,61]},{10:160,40:10,67:[2,122],70:[2,122],71:[2,122],72:[2,122],73:[2,122],74:[2,122],75:[2,122],94:[1,11]},{22:[1,161],63:162,66:[1,57]},{22:[2,85],32:[2,85],38:[2,85],39:[2,85],50:[2,85],52:[2,85],57:[2,85],61:[2,85],65:[2,85],66:[2,85],94:[2,85]},{12:[1,163]},{11:[2,16],23:[2,16]},{1:[2,122],10:164,15:[2,122],20:[2,122],22:[2,122],25:[2,122],31:[2,122],32:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{11:[2,31],12:[2,31],22:[2,31],23:[2,31],32:[2,31],36:[2,31],37:[2,31],38:[2,31],39:[2,31],61:[2,31],76:[2,31],83:[2,31],84:[2,31],85:[2,31],86:[2,31],87:[2,31],88:[2,31],89:[2,31],90:[2,31],91:[2,31],94:[2,31]},{11:[1,100],12:[2,41],22:[1,101],23:[1,102],32:[2,41],34:165,36:[2,41],37:[2,41],38:[2,41],39:[2,41],41:89,42:90,61:[1,105],76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,94:[2,41]},{10:166,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:167,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:168,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:169,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{11:[2,38],12:[2,38],22:[2,38],23:[2,38],32:[2,38],36:[2,38],37:[2,38],38:[2,38],39:[2,38],61:[2,38],76:[2,38],83:[2,38],84:[2,38],85:[2,38],86:[2,38],87:[2,38],88:[2,38],89:[2,38],90:[2,38],91:[2,38],94:[1,19]},{11:[2,100],12:[2,100],22:[2,100],23:[2,100],32:[2,100],33:[2,100],36:[2,100],37:[2,100],38:[2,100],39:[2,100],49:[2,100],50:[2,100],52:[2,100],61:[2,100],70:[2,100],76:[2,100],80:[2,100],83:[2,100],84:[2,100],85:[2,100],86:[2,100],87:[2,100],88:[2,100],89:[2,100],90:[2,100],91:[2,100],93:[2,100],94:[2,100]},{11:[2,101],12:[2,101],22:[2,101],23:[2,101],32:[2,101],33:[2,101],36:[2,101],37:[2,101],38:[2,101],39:[2,101],49:[2,101],50:[2,101],52:[2,101],61:[2,101],70:[2,101],76:[2,101],80:[2,101],83:[2,101],84:[2,101],85:[2,101],86:[2,101],87:[2,101],88:[2,101],89:[2,101],90:[2,101],91:[2,101],93:[2,101],94:[2,101]},{11:[2,102],12:[2,102],22:[2,102],23:[2,102],32:[2,102],33:[2,102],36:[2,102],37:[2,102],38:[2,102],39:[2,102],49:[2,102],50:[2,102],52:[2,102],61:[2,102],70:[2,102],76:[2,102],80:[2,102],83:[2,102],84:[2,102],85:[2,102],86:[2,102],87:[2,102],88:[2,102],89:[2,102],90:[2,102],91:[2,102],93:[2,102],94:[2,102]},{11:[2,103],12:[2,103],22:[2,103],23:[2,103],32:[2,103],33:[2,103],36:[2,103],37:[2,103],38:[2,103],39:[2,103],49:[2,103],50:[2,103],52:[2,103],61:[2,103],70:[2,103],76:[2,103],80:[2,103],83:[2,103],84:[2,103],85:[2,103],86:[2,103],87:[2,103],88:[2,103],89:[2,103],90:[2,103],91:[2,103],93:[2,103],94:[2,103]},{11:[2,104],12:[2,104],22:[2,104],23:[2,104],32:[2,104],33:[2,104],36:[2,104],37:[2,104],38:[2,104],39:[2,104],49:[2,104],50:[2,104],52:[2,104],61:[2,104],70:[2,104],76:[2,104],80:[2,104],83:[2,104],84:[2,104],85:[2,104],86:[2,104],87:[2,104],88:[2,104],89:[2,104],90:[2,104],91:[2,104],93:[2,104],94:[2,104]},{11:[2,105],12:[2,105],22:[2,105],23:[2,105],32:[2,105],33:[2,105],36:[2,105],37:[2,105],38:[2,105],39:[2,105],49:[2,105],50:[2,105],52:[2,105],61:[2,105],70:[2,105],76:[2,105],80:[2,105],83:[2,105],84:[2,105],85:[2,105],86:[2,105],87:[2,105],88:[2,105],89:[2,105],90:[2,105],91:[2,105],93:[2,105],94:[2,105]},{11:[2,106],12:[2,106],22:[2,106],23:[2,106],32:[2,106],33:[2,106],36:[2,106],37:[2,106],38:[2,106],39:[2,106],49:[2,106],50:[2,106],52:[2,106],61:[2,106],70:[2,106],76:[2,106],80:[2,106],83:[2,106],84:[2,106],85:[2,106],86:[2,106],87:[2,106],88:[2,106],89:[2,106],90:[2,106],91:[2,106],93:[2,106],94:[2,106]},{11:[2,107],12:[2,107],22:[2,107],23:[2,107],32:[2,107],33:[2,107],36:[2,107],37:[2,107],38:[2,107],39:[2,107],49:[2,107],50:[2,107],52:[2,107],61:[2,107],70:[2,107],76:[2,107],80:[2,107],83:[2,107],84:[2,107],85:[2,107],86:[2,107],87:[2,107],88:[2,107],89:[2,107],90:[2,107],91:[2,107],93:[2,107],94:[2,107]},{11:[1,100],22:[1,101],23:[1,102],41:172,42:174,48:173,49:[1,175],50:[1,176],61:[1,105],76:[1,99],79:170,81:171,83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104},{11:[2,109],12:[2,109],22:[2,109],23:[2,109],32:[2,109],33:[2,109],36:[2,109],37:[2,109],38:[2,109],39:[2,109],49:[2,109],50:[2,109],52:[2,109],61:[2,109],70:[2,109],76:[2,109],80:[2,109],83:[2,109],84:[2,109],85:[2,109],86:[2,109],87:[2,109],88:[2,109],89:[2,109],90:[2,109],91:[2,109],93:[2,109],94:[2,109]},{11:[2,110],12:[2,110],22:[2,110],23:[2,110],32:[2,110],33:[2,110],36:[2,110],37:[2,110],38:[2,110],39:[2,110],49:[2,110],50:[2,110],52:[2,110],61:[2,110],70:[2,110],76:[2,110],80:[2,110],83:[2,110],84:[2,110],85:[2,110],86:[2,110],87:[2,110],88:[2,110],89:[2,110],90:[2,110],91:[2,110],93:[2,110],94:[2,110]},{11:[2,111],12:[2,111],22:[2,111],23:[2,111],32:[2,111],33:[2,111],36:[2,111],37:[2,111],38:[2,111],39:[2,111],49:[2,111],50:[2,111],52:[2,111],61:[2,111],70:[2,111],76:[2,111],80:[2,111],83:[2,111],84:[2,111],85:[2,111],86:[2,111],87:[2,111],88:[2,111],89:[2,111],90:[2,111],91:[2,111],93:[2,111],94:[2,111]},{11:[2,112],12:[2,112],22:[2,112],23:[2,112],32:[2,112],33:[2,112],36:[2,112],37:[2,112],38:[2,112],39:[2,112],49:[2,112],50:[2,112],52:[2,112],61:[2,112],70:[2,112],76:[2,112],80:[2,112],83:[2,112],84:[2,112],85:[2,112],86:[2,112],87:[2,112],88:[2,112],89:[2,112],90:[2,112],91:[2,112],93:[2,112],94:[2,112]},{11:[2,118],12:[2,118],22:[2,118],23:[2,118],32:[2,118],33:[2,118],36:[2,118],37:[2,118],38:[2,118],39:[2,118],49:[2,118],50:[2,118],52:[2,118],61:[2,118],70:[2,118],76:[2,118],80:[2,118],83:[2,118],84:[2,118],85:[2,118],86:[2,118],87:[2,118],88:[2,118],89:[2,118],90:[2,118],91:[2,118],93:[2,118],94:[2,118]},{10:150,12:[1,149],22:[1,152],33:[1,177],40:10,51:151,52:[1,153],77:178,78:148,94:[1,11]},{12:[2,86],22:[2,86],33:[2,86],52:[2,86],94:[2,86]},{12:[2,88],22:[2,88],33:[2,88],52:[2,88],94:[2,88]},{12:[2,89],22:[2,89],33:[2,89],52:[2,89],94:[2,89]},{12:[2,90],22:[2,90],33:[2,90],52:[2,90],94:[2,90]},{38:[1,179]},{10:180,38:[2,122],40:10,94:[1,11]},{22:[1,181]},{22:[2,59],32:[2,54],38:[2,59],39:[2,54],50:[1,73],52:[2,59],56:72,57:[1,74],61:[2,59],65:[2,59],66:[2,59],94:[2,59]},{10:182,22:[2,122],25:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{10:183,32:[2,122],40:10,94:[1,11]},{22:[1,184]},{10:150,12:[1,149],22:[1,152],33:[2,93],40:10,46:185,51:151,52:[1,153],77:147,78:148,94:[1,11]},{10:186,11:[2,122],22:[2,122],33:[2,122],40:10,84:[2,122],94:[1,11]},{67:[1,187],68:188,70:[1,189],71:[1,190],72:[1,191],73:[1,192],74:[1,193],75:[1,194]},{10:195,37:[2,122],40:10,94:[1,11]},{10:196,37:[2,122],40:10,94:[1,11]},{1:[2,122],10:197,20:[2,122],22:[2,122],25:[2,122],31:[2,122],32:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{1:[2,9],15:[2,9],20:[2,9],22:[2,9],25:[2,9],31:[2,9],32:[2,9],38:[2,9],39:[2,9],43:[2,9],47:[2,9],50:[2,9],52:[2,9],57:[2,9],61:[2,9],65:[2,9],66:[2,9],94:[2,9],96:[2,9],97:[2,9],103:[2,9]},{11:[2,32],12:[2,32],22:[2,32],23:[2,32],32:[2,32],36:[2,32],37:[2,32],38:[2,32],39:[2,32],61:[2,32],76:[2,32],83:[2,32],84:[2,32],85:[2,32],86:[2,32],87:[2,32],88:[2,32],89:[2,32],90:[2,32],91:[2,32],94:[2,32]},{11:[2,34],12:[2,34],22:[2,34],23:[2,34],32:[2,34],36:[2,34],37:[2,34],38:[2,34],39:[2,34],61:[2,34],76:[2,34],83:[2,34],84:[2,34],85:[2,34],86:[2,34],87:[2,34],88:[2,34],89:[2,34],90:[2,34],91:[2,34],94:[2,34]},{11:[2,35],12:[2,35],22:[2,35],23:[2,35],32:[2,35],36:[2,35],37:[2,35],38:[2,35],39:[2,35],61:[2,35],76:[2,35],83:[2,35],84:[2,35],85:[2,35],86:[2,35],87:[2,35],88:[2,35],89:[2,35],90:[2,35],91:[2,35],94:[2,35]},{11:[2,36],12:[2,36],22:[2,36],23:[2,36],32:[2,36],36:[2,36],37:[2,36],38:[2,36],39:[2,36],61:[2,36],76:[2,36],83:[2,36],84:[2,36],85:[2,36],86:[2,36],87:[2,36],88:[2,36],89:[2,36],90:[2,36],91:[2,36],94:[2,36]},{11:[2,37],12:[2,37],22:[2,37],23:[2,37],32:[2,37],36:[2,37],37:[2,37],38:[2,37],39:[2,37],61:[2,37],76:[2,37],83:[2,37],84:[2,37],85:[2,37],86:[2,37],87:[2,37],88:[2,37],89:[2,37],90:[2,37],91:[2,37],94:[2,37]},{11:[1,100],22:[1,101],23:[1,102],37:[1,198],39:[1,202],41:172,42:174,48:173,49:[1,175],50:[1,176],61:[1,105],70:[1,203],76:[1,99],81:200,82:199,83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,93:[1,201]},{11:[2,94],12:[2,94],22:[2,94],23:[2,94],33:[2,94],37:[2,94],39:[2,94],49:[2,94],50:[2,94],52:[2,94],61:[2,94],70:[2,94],76:[2,94],80:[2,94],83:[2,94],84:[2,94],85:[2,94],86:[2,94],87:[2,94],88:[2,94],89:[2,94],90:[2,94],91:[2,94],93:[2,94],94:[2,94]},{11:[2,97],12:[2,97],22:[2,97],23:[2,97],33:[2,97],37:[2,97],39:[2,97],49:[2,97],50:[2,97],52:[2,97],61:[2,97],70:[2,97],76:[2,97],80:[2,97],83:[2,97],84:[2,97],85:[2,97],86:[2,97],87:[2,97],88:[2,97],89:[2,97],90:[2,97],91:[2,97],93:[2,97],94:[2,97]},{41:204,76:[1,99],83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98]},{11:[2,99],12:[2,99],22:[2,99],23:[2,99],33:[2,99],37:[2,99],39:[2,99],49:[2,99],50:[2,99],52:[2,99],61:[2,99],70:[2,99],76:[2,99],80:[2,99],83:[2,99],84:[2,99],85:[2,99],86:[2,99],87:[2,99],88:[2,99],89:[2,99],90:[2,99],91:[2,99],93:[2,99],94:[2,99]},{76:[2,48],83:[2,48],84:[2,48],85:[2,48],86:[2,48],87:[2,48],88:[2,48],89:[2,48],90:[2,48]},{76:[2,49],83:[2,49],84:[2,49],85:[2,49],86:[2,49],87:[2,49],88:[2,49],89:[2,49],90:[2,49]},{1:[2,122],10:205,22:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{12:[2,87],22:[2,87],33:[2,87],52:[2,87],94:[2,87]},{10:206,11:[2,122],22:[2,122],23:[2,122],40:10,49:[2,122],50:[2,122],61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{38:[2,50]},{10:207,38:[2,122],40:10,94:[1,11]},{5:65,8:208,22:[1,50],24:31,25:[1,32],26:34,27:35,28:36,29:37,30:38,31:[1,40],32:[2,125],33:[2,125],38:[1,58],39:[2,125],43:[1,41],47:[1,42],50:[2,125],52:[1,51],53:39,54:44,55:46,57:[2,125],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,6],95:5,96:[1,7],97:[1,8],98:43,103:[1,45]},{32:[1,209]},{32:[2,45],94:[2,45]},{10:150,12:[1,149],22:[1,152],33:[1,210],40:10,51:151,52:[1,153],77:178,78:148,94:[1,11]},{11:[1,216],22:[1,215],33:[2,132],84:[1,217],99:211,100:212,101:213,102:214},{22:[2,72],32:[2,72],37:[2,72],38:[2,72],39:[2,72],50:[2,72],52:[2,72],57:[2,72],61:[2,72],65:[2,72],66:[2,72],94:[2,72]},{10:218,11:[2,122],22:[2,122],40:10,94:[1,11]},{11:[2,74],22:[2,74],94:[2,74]},{11:[2,75],22:[2,75],94:[2,75]},{11:[2,76],22:[2,76],94:[2,76]},{11:[2,77],22:[2,77],94:[2,77]},{11:[2,78],22:[2,78],94:[2,78]},{11:[2,79],22:[2,79],94:[2,79]},{37:[1,219]},{37:[1,220]},{1:[2,15],20:[2,15],22:[2,15],25:[2,15],31:[2,15],32:[2,15],38:[2,15],39:[2,15],43:[2,15],47:[2,15],50:[2,15],52:[2,15],57:[2,15],61:[2,15],65:[2,15],66:[2,15],94:[2,15],96:[2,15],97:[2,15],103:[2,15]},{10:221,11:[2,122],12:[2,122],22:[2,122],23:[2,122],32:[2,122],33:[2,122],36:[2,122],37:[2,122],38:[2,122],39:[2,122],40:10,49:[2,122],50:[2,122],52:[2,122],61:[2,122],70:[2,122],76:[2,122],80:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],93:[2,122],94:[1,11]},{11:[1,100],22:[1,101],23:[1,102],41:172,42:174,48:173,49:[1,175],50:[1,176],61:[1,105],76:[1,99],81:222,83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104},{11:[2,96],12:[2,96],22:[2,96],23:[2,96],33:[2,96],37:[2,96],39:[2,96],49:[2,96],50:[2,96],52:[2,96],61:[2,96],70:[2,96],76:[2,96],80:[2,96],83:[2,96],84:[2,96],85:[2,96],86:[2,96],87:[2,96],88:[2,96],89:[2,96],90:[2,96],91:[2,96],93:[2,96],94:[2,96]},{10:223,11:[2,122],22:[2,122],23:[2,122],40:10,49:[2,122],50:[2,122],61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:224,11:[2,122],22:[2,122],23:[2,122],40:10,49:[2,122],50:[2,122],61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{10:225,11:[2,122],22:[2,122],23:[2,122],40:10,49:[2,122],50:[2,122],61:[2,122],76:[2,122],83:[2,122],84:[2,122],85:[2,122],86:[2,122],87:[2,122],88:[2,122],89:[2,122],90:[2,122],91:[2,122],94:[1,11]},{11:[2,98],12:[2,98],22:[2,98],23:[2,98],33:[2,98],37:[2,98],39:[2,98],49:[2,98],50:[2,98],52:[2,98],61:[2,98],70:[2,98],76:[2,98],80:[2,98],83:[2,98],84:[2,98],85:[2,98],86:[2,98],87:[2,98],88:[2,98],89:[2,98],90:[2,98],91:[2,98],93:[2,98],94:[2,98]},{1:[2,52],22:[2,52],31:[2,52],32:[2,52],33:[2,52],38:[2,52],39:[2,52],43:[2,52],47:[2,52],50:[2,52],52:[2,52],57:[2,52],61:[2,52],65:[2,52],66:[2,52],94:[2,52],96:[2,52],97:[2,52],103:[2,52]},{11:[1,100],22:[1,101],23:[1,102],41:172,42:174,48:173,49:[1,175],50:[1,176],61:[1,105],76:[1,99],79:226,81:171,83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104},{38:[2,51]},{5:65,22:[1,50],24:64,26:34,27:35,28:36,29:37,30:38,31:[1,40],32:[2,125],33:[1,227],38:[1,58],39:[2,125],43:[1,41],47:[1,42],50:[2,125],52:[1,51],53:39,54:44,55:46,57:[2,125],58:47,59:48,60:49,61:[1,52],62:53,63:54,64:55,65:[1,56],66:[1,57],94:[1,6],95:5,96:[1,7],97:[1,8],98:43,103:[1,45]},{10:228,12:[2,122],22:[2,122],33:[2,122],40:10,52:[2,122],94:[1,11]},{1:[2,122],10:229,22:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{11:[1,216],22:[1,215],33:[1,230],84:[1,217],100:231,101:213,102:214},{11:[2,130],22:[2,130],33:[2,130],84:[2,130]},{32:[1,232],39:[1,233]},{10:234,32:[2,122],39:[2,122],40:10,94:[1,11]},{32:[2,136],39:[2,136],94:[2,136]},{32:[2,137],39:[2,137],94:[2,137]},{32:[2,138],39:[2,138],94:[2,138]},{11:[1,237],22:[1,236],69:235},{22:[2,83],32:[2,83],38:[2,83],39:[2,83],50:[2,83],52:[2,83],57:[2,83],61:[2,83],65:[2,83],66:[2,83],94:[2,83]},{22:[2,84],32:[2,84],38:[2,84],39:[2,84],50:[2,84],52:[2,84],57:[2,84],61:[2,84],65:[2,84],66:[2,84],94:[2,84]},{11:[2,108],12:[2,108],22:[2,108],23:[2,108],32:[2,108],33:[2,108],36:[2,108],37:[2,108],38:[2,108],39:[2,108],49:[2,108],50:[2,108],52:[2,108],61:[2,108],70:[2,108],76:[2,108],80:[2,108],83:[2,108],84:[2,108],85:[2,108],86:[2,108],87:[2,108],88:[2,108],89:[2,108],90:[2,108],91:[2,108],93:[2,108],94:[2,108]},{11:[2,95],12:[2,95],22:[2,95],23:[2,95],33:[2,95],37:[2,95],39:[2,95],49:[2,95],50:[2,95],52:[2,95],61:[2,95],70:[2,95],76:[2,95],80:[2,95],83:[2,95],84:[2,95],85:[2,95],86:[2,95],87:[2,95],88:[2,95],89:[2,95],90:[2,95],91:[2,95],93:[2,95],94:[2,95]},{11:[2,114],22:[2,114],23:[2,114],49:[2,114],50:[2,114],61:[2,114],76:[2,114],83:[2,114],84:[2,114],85:[2,114],86:[2,114],87:[2,114],88:[2,114],89:[2,114],90:[2,114],91:[2,114]},{11:[2,115],22:[2,115],23:[2,115],49:[2,115],50:[2,115],61:[2,115],76:[2,115],83:[2,115],84:[2,115],85:[2,115],86:[2,115],87:[2,115],88:[2,115],89:[2,115],90:[2,115],91:[2,115]},{11:[2,116],22:[2,116],23:[2,116],49:[2,116],50:[2,116],61:[2,116],76:[2,116],83:[2,116],84:[2,116],85:[2,116],86:[2,116],87:[2,116],88:[2,116],89:[2,116],90:[2,116],91:[2,116]},{10:238,11:[1,100],12:[2,122],22:[1,101],23:[1,102],33:[2,122],39:[1,202],40:10,41:172,42:174,48:173,49:[1,175],50:[1,176],52:[2,122],61:[1,105],70:[1,203],76:[1,99],80:[1,239],81:200,82:199,83:[1,91],84:[1,92],85:[1,93],86:[1,94],87:[1,95],88:[1,96],89:[1,97],90:[1,98],91:[1,103],92:104,93:[1,201],94:[1,11]},{1:[2,122],10:240,22:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{10:150,12:[1,149],22:[1,152],33:[2,93],40:10,46:241,51:151,52:[1,153],77:147,78:148,94:[1,11]},{1:[2,47],22:[2,47],31:[2,47],32:[2,47],33:[2,47],38:[2,47],39:[2,47],43:[2,47],47:[2,47],50:[2,47],52:[2,47],57:[2,47],61:[2,47],65:[2,47],66:[2,47],94:[2,47],96:[2,47],97:[2,47],103:[2,47]},{1:[2,122],10:242,22:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{11:[2,131],22:[2,131],33:[2,131],84:[2,131]},{10:243,12:[2,122],22:[2,122],33:[2,122],40:10,52:[2,122],94:[1,11]},{11:[1,216],22:[1,215],84:[1,217],102:244},{32:[2,134],39:[2,134]},{10:245,40:10,67:[2,122],94:[1,11]},{67:[2,80],94:[2,80]},{67:[2,81],94:[2,81]},{12:[2,91],22:[2,91],33:[2,91],52:[2,91],94:[2,91]},{10:246,12:[2,122],22:[2,122],33:[2,122],40:10,52:[2,122],94:[1,11]},{1:[2,29],22:[2,29],31:[2,29],32:[2,29],33:[2,29],38:[2,29],39:[2,29],43:[2,29],47:[2,29],50:[2,29],52:[2,29],57:[2,29],61:[2,29],65:[2,29],66:[2,29],94:[2,29],96:[2,29],97:[2,29],103:[2,29]},{10:150,12:[1,149],22:[1,152],33:[1,247],40:10,51:151,52:[1,153],77:178,78:148,94:[1,11]},{1:[2,129],22:[2,129],31:[2,129],32:[2,129],33:[2,129],38:[2,129],39:[2,129],43:[2,129],47:[2,129],50:[2,129],52:[2,129],57:[2,129],61:[2,129],65:[2,129],66:[2,129],94:[2,129],96:[2,129],97:[2,129],103:[2,129]},{10:150,12:[1,149],22:[1,152],33:[2,93],40:10,46:248,51:151,52:[1,153],77:147,78:148,94:[1,11]},{10:249,32:[2,122],39:[2,122],40:10,94:[1,11]},{67:[1,250]},{12:[2,92],22:[2,92],33:[2,92],52:[2,92],94:[2,92]},{1:[2,122],10:251,22:[2,122],31:[2,122],32:[2,122],33:[2,122],38:[2,122],39:[2,122],40:10,43:[2,122],47:[2,122],50:[2,122],52:[2,122],57:[2,122],61:[2,122],65:[2,122],66:[2,122],94:[1,11],96:[2,122],97:[2,122],103:[2,122]},{10:150,12:[1,149],22:[1,152],33:[1,252],40:10,51:151,52:[1,153],77:178,78:148,94:[1,11]},{32:[2,135],39:[2,135]},{22:[2,73],32:[2,73],37:[2,73],38:[2,73],39:[2,73],50:[2,73],52:[2,73],57:[2,73],61:[2,73],65:[2,73],66:[2,73],94:[2,73]},{1:[2,42],22:[2,42],31:[2,42],32:[2,42],33:[2,42],38:[2,42],39:[2,42],43:[2,42],47:[2,42],50:[2,42],52:[2,42],57:[2,42],61:[2,42],65:[2,42],66:[2,42],94:[2,42],96:[2,42],97:[2,42],103:[2,42]},{10:253,11:[2,122],22:[2,122],33:[2,122],40:10,84:[2,122],94:[1,11]},{11:[2,133],22:[2,133],33:[2,133],84:[2,133]}],
defaultActions: {75:[2,139],180:[2,50],207:[2,51]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == 'undefined') {
        this.lexer.yylloc = {};
    }
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === 'function') {
        this.parseError = this.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || EOF;
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + this.lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: this.lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: this.lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.2.1 */
var lexer = (function(){
var lexer = {

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input) {
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 94;
break;
case 1:
break;
case 2:return 96;
break;
case 3:return 97;
break;
case 4:return 71;
break;
case 5:return 72;
break;
case 6:return 73;
break;
case 7:return 74;
break;
case 8:return 75;
break;
case 9:return 80;
break;
case 10:return 23;
break;
case 11:return 23;
break;
case 12:return "FUNCTION";
break;
case 13:return 103;
break;
case 14:return 11;
break;
case 15:return 22;
break;
case 16:return 61;
break;
case 17:return 15;
break;
case 18:return 43;
break;
case 19:return 31;
break;
case 20:return 47;
break;
case 21:return 9;
break;
case 22:return 20;
break;
case 23:return 86;
break;
case 24:return 87;
break;
case 25:return 85;
break;
case 26:return 85;
break;
case 27:return 85;
break;
case 28:return 85;
break;
case 29:return 85;
break;
case 30:return 85;
break;
case 31:return 85;
break;
case 32:return 88;
break;
case 33:return 88;
break;
case 34:return 88;
break;
case 35:return 89;
break;
case 36:return 89;
break;
case 37:return 90;
break;
case 38:return 90;
break;
case 39:return 'DIMEN';
break;
case 40:return 84;
break;
case 41:return 83;
break;
case 42:return 91;
break;
case 43:return 91;
break;
case 44:return yy_.yytext;
break;
}
},
rules: [/^(?:[ \t\r\n\f]+)/,/^(?:\/\*[^*]*\*+([^/][^*]*\*+)*\/)/,/^(?:<!--)/,/^(?:-->)/,/^(?:~=)/,/^(?:\|=)/,/^(?:\^=)/,/^(?:\$=)/,/^(?:\*=)/,/^(?:!([ \t\r\n\f]*)important\b)/,/^(?:url\(([ \t\r\n\f]*)(("([\t !#$%&(-~]|\\(\n|\r\n|\r|\f)|'|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))*")|('([\t !#$%&(-~]|\\(\n|\r\n|\r|\f)|"|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))*'))([ \t\r\n\f]*)\))/,/^(?:url\(([ \t\r\n\f]*)(([!#$%&*-~]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))*)([ \t\r\n\f]*)\))/,/^(?:([-]?([a-zA-Z]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))([_]|([a-zA-Z0-9-]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377])))*)\()/,/^(?:([@](-webkit-|-o-|-moz-|-ms-)?keyframes\b))/,/^(?:(("([\t !#$%&(-~]|\\(\n|\r\n|\r|\f)|'|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))*")|('([\t !#$%&(-~]|\\(\n|\r\n|\r|\f)|"|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))*')))/,/^(?:([-]?([a-zA-Z]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))([_]|([a-zA-Z0-9-]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377])))*))/,/^(?:#(([_]|([a-zA-Z0-9-]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377])))+))/,/^(?:@import\b)/,/^(?:@page\b)/,/^(?:@media\b)/,/^(?:@font-face\b)/,/^(?:@charset\b)/,/^(?:@namespace\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))em\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))ex\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))px\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))cm\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))mm\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))in\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))pt\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))pc\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))fr\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))deg\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))rad\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))grad\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))ms\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))s\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))Hz\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))kHz\b)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))([-]?([a-zA-Z]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377]))([_]|([a-zA-Z0-9-]|([\200-\377])|((\\([0-9a-fA-F]){1,6}[ \t\r\n\f]?)|\\[ -~\200-\377])))*))/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+))%)/,/^(?:(([0-9]+(\.[0-9]+)?)|(\.[0-9]+)))/,/^(?:U\+(\?{1,6}|([0-9a-fA-F])(\?{0,5}|([0-9a-fA-F])(\?{0,4}|([0-9a-fA-F])(\?{0,3}|([0-9a-fA-F])(\?{0,2}|([0-9a-fA-F])(\??|([0-9a-fA-F]))))))))/,/^(?:U\+([0-9a-fA-F]){1,6}([0-9a-fA-F]){1,6})/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],"inclusive":true}}
};
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = cssParser;
exports.Parser = cssParser.Parser;
exports.parse = function () { return cssParser.parse.apply(cssParser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
};
define("cssParser", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.cssParser;
    };
}(this)));

/**
 * @license RequireJS domReady 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/domReady for details
 */
/*jslint */
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */


define('domReady',[],function () {
    

    var isTop, testDiv, scrollIntervalId,
        isBrowser = typeof window !== "undefined" && window.document,
        isPageLoaded = !isBrowser,
        doc = isBrowser ? document : null,
        readyCalls = [];

    function runCallbacks(callbacks) {
        var i;
        for (i = 0; i < callbacks.length; i += 1) {
            callbacks[i](doc);
        }
    }

    function callReady() {
        var callbacks = readyCalls;

        if (isPageLoaded) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }
        }
    }

    /**
     * Sets the page as loaded.
     */
    function pageLoaded() {
        if (!isPageLoaded) {
            isPageLoaded = true;
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
            }

            callReady();
        }
    }

    if (isBrowser) {
        if (document.addEventListener) {
            //Standards. Hooray! Assumption here that if standards based,
            //it knows about DOMContentLoaded.
            document.addEventListener("DOMContentLoaded", pageLoaded, false);
            window.addEventListener("load", pageLoaded, false);
        } else if (window.attachEvent) {
            window.attachEvent("onload", pageLoaded);

            testDiv = document.createElement('div');
            try {
                isTop = window.frameElement === null;
            } catch (e) {}

            //DOMContentLoaded approximation that uses a doScroll, as found by
            //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
            //but modified by other contributors, including jdalton
            if (testDiv.doScroll && isTop && window.external) {
                scrollIntervalId = setInterval(function () {
                    try {
                        testDiv.doScroll();
                        pageLoaded();
                    } catch (e) {}
                }, 30);
            }
        }

        //Check if document already complete, and if so, just trigger page load
        //listeners. Latest webkit browsers also use "interactive", and
        //will fire the onDOMContentLoaded before "interactive" but not after
        //entering "interactive" or "complete". More details:
        //http://dev.w3.org/html5/spec/the-end.html#the-end
        //http://stackoverflow.com/questions/3665561/document-readystate-of-interactive-vs-ondomcontentloaded
        //Hmm, this is more complicated on further use, see "firing too early"
        //bug: https://github.com/requirejs/domReady/issues/1
        //so removing the || document.readyState === "interactive" test.
        //There is still a window.onload binding that should get fired if
        //DOMContentLoaded is missed.
        if (document.readyState === "complete") {
            pageLoaded();
        }
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function domReady(callback) {
        if (isPageLoaded) {
            callback(doc);
        } else {
            readyCalls.push(callback);
        }
        return domReady;
    }

    domReady.version = '2.0.1';

    /**
     * Loader Plugin API method
     */
    domReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            domReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return domReady;
});


/*global define, document, window */
define('scalejs.layout-cssgrid/utils.base',[],function () {
    

    function defined(test) {
        return test !== undefined;
    }

    String.prototype.contains = function (str) {
        return this.indexOf(str) !== -1;
    };

    function is(obj, test) {
        var r = false,
            testType = typeof test,
            objType = typeof obj;

        try {
            r = obj instanceof test;
        } catch (e) {
            r = testType === 'string' &&
                    objType === test;
        }

        return r;
    }

    function createBoundedWrapper(method) {
        return function () {
            return method.apply(null, arguments);
        };
    }

    function toArray(list, start, end) {
        if (list === undefined || list === null) {
            return [];
        }

        /*ignore jslint start*/
        var array = [],
            i,
            result;

        for (i = list.length; i--; array[i] = list[i]) { }

        result = Array.prototype.slice.call(array, start, end);

        return result;
        /*ignore jslint end*/
    }

    return {
        is: is,
        defined: defined,
        toArray: toArray,
        createBoundedWrapper: createBoundedWrapper
    };
});
/*global define, require, document, window */
define('scalejs.layout-cssgrid/utils.sheetLoader',[
    './utils.base',
    'cssParser',
    'domReady'
], function (
    base,
    cssParser
) {
    

    var toArray = base.toArray;

    function loadStyleSheet(url, loadedStyleSheets, onLoaded) {
        if (loadedStyleSheets.hasOwnProperty(url)) {
            return;
        }

        loadedStyleSheets[url] = null;

        require(['text!' + url], function (stylesheet) {
            var parsed = cssParser.parse(stylesheet);

            loadedStyleSheets[url] = parsed;

            (parsed.imports || []).forEach(function (cssImport) {
                loadStyleSheet(cssImport['import'], loadedStyleSheets, onLoaded);
            });

            onLoaded();
        });
    }

    function loadAllStyleSheets(onLoaded) {
        var loadedStyleSheets = {};

        toArray(document.styleSheets)
            .forEach(function (sheet) {
                if (sheet.href) {
                    loadStyleSheet(sheet.href, loadedStyleSheets, function () {
                        //console.log(sheet.href, loadedStyleSheets);
                        var url;
                        for (url in loadedStyleSheets) {
                            if (loadedStyleSheets.hasOwnProperty(url)) {
                                if (loadedStyleSheets[url] === null) {
                                    return;
                                }
                            }
                        }

                        onLoaded(loadedStyleSheets);
                    });
                }
            });
    }

    return {
        loadAllStyleSheets: loadAllStyleSheets
    };
});
/*global define */
define('scalejs.layout-cssgrid/consts',[],function () {
    

    return {
        GRIDLAYOUT  : 'css-grid-layout',
        STRING      : 'string',
        PROPERTY	: 'property',
        MOZ			: '-moz-',
        MS			: '-ms-',
        OPERA		: '-o-',
        WEBKIT		: '-webkit-',
        SPACE		: ' ',
        PERIOD		: '.',
        COLON		: ':',
        SEMICOL		: ';',
        OPEN_CURLY  : '{',
        CLOSE_CURLY : '}',
        HYPHEN		: '-',
        EMPTY		: '',
        AUTO		: 'auto',
        NONE		: 'none',
        DISPLAY		: 'display',
        POSITION	: 'position',
        RELATIVE	: 'relative',
        STATIC		: 'static',
        ABSOLUTE	: 'absolute',
        WIDTH		: 'width',
        HEIGHT		: 'height',
        PADDING		: 'padding',
        MARGIN		: 'margin',
        BORDER		: 'border',
        STYLE		: '-style',
        TOP			: 'top',
        BOTTOM		: 'bottom',
        LEFT		: 'left',
        RIGHT		: 'right',
        MIN			: 'min-',
        MAX			: 'max-',
        PX			: 'px',
        EM			: 'em',
        PERCENT		: '%',
        REM			: 'rem',
        FR			: 'fr',
        CONTENTBOX	: 'content-box',
        PADDINGBOX	: 'padding-box',
        STRETCH		: 'stretch',
        // properties, etc.
        GRID				: 'grid',
        INLINEGRID			: 'inline-grid',
        GRIDCOLUMNS			: 'grid-columns',
        GRIDCOLUMN			: 'grid-column',
        GRIDCOLUMNSPAN		: 'grid-column-span',
        GRIDCOLUMNALIGN		: 'grid-column-align',
        GRIDROWS			: 'grid-rows',
        GRIDROW				: 'grid-row',
        GRIDROWSPAN			: 'grid-row-span',
        GRIDROWALIGN		: 'grid-row-align',
        BOXSIZING			: 'box-sizing',
        BLOCKPROGRESSION	: 'block-progression',
        precision					: 0, // decimal places
        agentTruncatesLayoutLengths: true,
        regexSpaces: /\s+/
    };
});
/*global define */
define('scalejs.layout-cssgrid/enums',['./consts'], function (consts) {
    

    var EMPTY = consts.EMPTY,
        STATIC = consts.STATIC,
        calculatorOperation = {
            minWidth: {},
            maxWidth: {},
            minHeight: {},
            maxHeight: {},
            shrinkToFit: {}
        },
	    gridTrackValue = {
	        auto: { keyword: consts.AUTO },
	        minContent: { keyword: 'min-content' },
	        maxContent: { keyword: 'max-content' },
	        fitContent: { keyword: 'fit-content' },
	        minmax: { keyword: 'minmax' },
            parse: function (trackValueString) {
                switch (trackValueString) {
                case gridTrackValue.auto.keyword:
                    return gridTrackValue.auto;
                case gridTrackValue.minContent.keyword:
                    return gridTrackValue.minContent;
                case gridTrackValue.maxContent.keyword:
                    return gridTrackValue.maxContent;
                case gridTrackValue.fitContent.keyword:
                    return gridTrackValue.fitContent;
                case gridTrackValue.minmax.keyword:
                    return gridTrackValue.minmax;
                default:
                    throw new Error('unknown grid track string: ' + trackValueString);
                }
            }
        },
	    gridAlign = {
	        stretch: { keyword: consts.STRETCH },
	        start: { keyword: 'start' },
	        end: { keyword: 'end' },
	        center: { keyword: 'center' },
            parse: function (alignString) {
                switch (alignString) {
                case gridAlign.start.keyword:
                    return gridAlign.start;
                case gridAlign.end.keyword:
                    return gridAlign.end;
                case gridAlign.center.keyword:
                    return gridAlign.center;
                    // default
                case gridAlign.stretch.keyword:
                case null:
                case EMPTY:
                    return gridAlign.stretch;
                default:
                    throw new Error('unknown grid align string: ' + alignString);
                }
            }
        },
	    position = {
	        "static": { keyword: consts.STATIC },
	        relative: { keyword: consts.RELATIVE },
	        absolute: { keyword: consts.ABSOLUTE },
	        fixed: { keyword: 'fixed' },
            parse : function (positionString) {
                switch (positionString) {
                case position.relative.keyword:
                    return position.relative;
                case position.absolute.keyword:
                    return position.absolute;
                case position.fixed.keyword:
                    return position.fixed;
                    // default
                case position[STATIC].keyword:
                case null:
                case EMPTY:
                    return position[STATIC];
                default:
                    throw new Error('unknown position string: ' + positionString);
                }
            }
	    },

	    blockProgression = {
	        tb: { keyword: 'tb' },
	        bt: { keyword: 'bt' },
	        lr: { keyword: 'lr' },
	        rl: { keyword: 'rl' },
	        parse: function (positionString) {
                switch (positionString) {
            // default
                case blockProgression.tb.keyword:
                case null:
                case EMPTY:
                    return blockProgression.tb;
                case blockProgression.bt.keyword:
                    return blockProgression.bt;
                case blockProgression.lr.keyword:
                    return blockProgression.lr;
                case blockProgression.rl.keyword:
                    return blockProgression.rl;
                default:
                    throw new Error('unknown block-progression string: ' + positionString);
                }
            }
	    },

	    borderWidths = {
	        thin: 0,
	        medium: 0,
	        thick: 0
	    },
	    sizingType = {
	        valueAndUnit: {},
	        keyword: {}
	    };



    return {
        calculatorOperation: calculatorOperation,
        gridTrackValue: gridTrackValue,
        gridAlign: gridAlign,
        position: position,
        blockProgression: blockProgression,
        borderWidths: borderWidths,
        sizingType: sizingType
    };
});
/*global define */
define('scalejs.layout-cssgrid/objects',['./enums'], function (enums) {
    

    function track() {
        return {
            number: null,
            size: null,
            sizingType: null,
            items: [],
            measure: null,
            minMeasure: null,
            maxMeasure: null,
            contentSizedTrack: false,
            implicit: false
        };
    }

    function implicitTrackRange() {
        return {
            firstNumber: null,
            span: null,
            size: enums.gridTrackValue.auto,
            sizingType: enums.sizingType.keyword,
            items: [],
            measure: null
        };
    }

    function widthAndHeight() {
        return {
            width: null,
            height: null
        };
    }

    function cssValueAndUnit() {
        return {
            value: null,
            unit: null
        };
    }

    function item() {
        return {
            itemElement: null,
            styles: null,
            position: null,
            column: 1,
            columnSpan: 1,
            columnAlign: enums.gridAlign.stretch,
            row: 1,
            rowSpan: 1,
            rowAlign: enums.gridAlign.stretch,
            // Used width calculated during column track size resolution.
            usedWidthMeasure: null,
            maxWidthMeasure: null,
            maxHeightMeasure: null,
            shrinkToFitSize: null, // physical dimensions
            verified: {
                columnBreadth: false,
                rowBreadth: false,
                columnPosition: false,
                rowPosition: false
            }
        };
    }

    return {
        track: track,
        implicitTrackRange: implicitTrackRange,
        item: item,
        widthAndHeight: widthAndHeight,
        cssValueAndUnit: cssValueAndUnit
    };
});
/*global define, document, window */
define('scalejs.layout-cssgrid/utils.css',[
    './consts',
    './utils.base'
], function (
    consts,
    utils
) {
    

    var HYPHEN = consts.HYPHEN,
        EMPTY = consts.EMPTY,
        STRING = consts.STRING,
        GRIDLAYOUT = consts.GRIDLAYOUT,
        SPACE = consts.SPACE,
        ALL = 'all',
        MEDIA = 'media',
        TYPE = consts.TYPE,
        defined = utils.defined,
        is = utils.is,
        headEl = document.getElementsByTagName('head')[0],
        styleEl = document.createElement('style'),
        embedded_css = [],
        addRules;

    styleEl.setAttribute(TYPE, 'text/css');

    if (defined(styleEl.styleSheet)) {
        addRules = function (el, styles) {
            el.styleSheet.cssText += styles;
        };
    } else {
        addRules = function (el, styles) {
            el.appendChild(document.createTextNode(styles));
        };
    }

    function low(w) {
        return is(w, STRING) ? w.toLowerCase() : w;
    }

    function camelize(str) {
        var regex = /(-[a-z])/g,
            func = function (bit) {
                return bit.toUpperCase().replace(HYPHEN, EMPTY);
            };

        return is(str, STRING)
            ? low(str).replace(regex, func)
            : str;
    }

    /**
     * eCSStender::makeUniqueClass()
     * creates a unique class for an element
     * 
     * @return str - the unique class
     */
    function makeUniqueClass() {
        var start = new Date().getTime();

        start += Math.floor(Math.random() * start);

        return GRIDLAYOUT + HYPHEN + start;
    }

    function newRegExp(rxp) {
        return new RegExp(rxp);
    }

    function makeClassRegExp(the_class) {
        return newRegExp('(\\s|^)' + the_class + '(\\s|$)');
    }

    /**
     * checks to see if an element has the given class
     *
     * @param obj el - the element to have its class augmented
     * @param str the_class - the class to add
     * @param RegExp re - a regular expression to match the class (optional)
     */
    function hasClass(el, the_class, re) {
        re = re || makeClassRegExp(the_class);
        return el.className.match(re);
    }

    /**
     * adds a class to an element
     *
     * @param obj el - the element to have its class augmented
     * @param str the_class - the class to add
     * @param RegExp re - a regular expression to match the class (optional)
     */
    function addClass(el, the_class, re) {
        re = re || makeClassRegExp(the_class);
        if (!hasClass(el, the_class, re)) {
            el.className += SPACE + the_class;
        }
    }

    function in_object(needle, haystack) {
        var key;
        for (key in haystack) {
            if (haystack[key] === needle) { return true; }
        }
        return false;
    }

    /**
     * adds a new stylesheet to the document
     *
     * @param str media  - the media to apply the stylesheet to
     * @param str id     - the id to give the stylesheet (optional)
     * @param bool delay - whether or not to delay the writing of the stylesheet (default = true)
     * 
     * @return obj - the STYLE element
     */
    function newStyleElement(media, id) {
        // clone the model style element
        var style = styleEl.cloneNode(true);
        // set the media type & id
        media = media || ALL;
        style.setAttribute(MEDIA, media);
        id = id || 'temp-' + Math.round(Math.random() * 2 + 1);
        style.setAttribute('id', id);
        headEl.appendChild(style);
        // return the element reference
        return style;
    }

    function clearEmbeddedCss(media, suffix) {
        var id, style;

        suffix = suffix ? '-' + suffix : '';
        media = media || ALL;

        id = GRIDLAYOUT + HYPHEN + media + suffix;

        style = document.getElementById(id);
        if (style) {
            while (style.childNodes.length > 0) {
                style.removeChild(style.childNodes[0]);
            }
        }
    }

    /**
       * embeds styles to the appropriate media
       *
       * @param str styles - the styles to embed
       * @param str media  - the media to apply the stylesheet to (optional)
       * @param bool delay - whether or not to delay the writing of the stylesheet (default = true)
       * 
       * @return obj - the STYLE element
       */
    function embedCss(styles, media, suffix) {
        // determine the medium
        media = media || ALL;
        suffix = suffix ? '-' + suffix : '';
        // determine the id
        var id = GRIDLAYOUT + HYPHEN + media + suffix, style;
        // find or create the embedded stylesheet
        if (!in_object(media + suffix, embedded_css)) {
            // make the new style element
            style = newStyleElement(media, id);
            // store the medium
            embedded_css.push(media + suffix);
        } else {
            style = document.getElementById(id);
        }
        // add the rules to the sheet
        if (style !== null) {
            addRules(style, styles);
        }
        // return the style element
        return style;
    }


    /**
       * eCSStender::getCSSValue()
       * gets the computed value of a CSS property
       *
       * @param obj el - the element
       * @param str prop - the property name
       * 
       * @return str - the value
       */
    function getCssValue(el, prop) {
        var computed = window.getComputedStyle;
        if (el.currentStyle) {
            return el.currentStyle[camelize(prop)];
        }

        if (computed) {
            return computed(el, null).getPropertyValue(prop);
        }

        return false;
    }

    return {
        makeUniqueClass: makeUniqueClass,
        getCssValue: getCssValue,
        addClass: addClass,
        embedCss: embedCss,
        clearEmbeddedCss: clearEmbeddedCss
    };
});
/*global define, document, window */
define('scalejs.layout-cssgrid/utils',[
    './utils.base',
    './utils.css'
], function (
    base,
    css
) {
    

    return {
        is: base.is,
        defined: base.defined,
        createBoundedWrapper: base.createBoundedWrapper,
        makeUniqueClass: css.makeUniqueClass,
        getCssValue: css.getCssValue,
        addClass: css.addClass,
        embedCss: css.embedCss,
        clearEmbeddedCss: css.clearEmbeddedCss
    };
});
/*global define, document */
define('scalejs.layout-cssgrid/layoutMeasure',[
    './consts',
    './enums',
    './utils'
], function (
    consts,
    enums,
    utils
) {
    

    var precision = consts.precision,
        PERIOD = consts.PERIOD,
        PX = consts.PX,
        EM = consts.EM,
        REM = consts.REM,
        PERCENT = consts.PERCENT,
        HEIGHT = consts.HEIGHT,
        WIDTH = consts.WIDTH,
        LEFT = consts.LEFT,
        RIGHT = consts.RIGHT,
        TOP = consts.TOP,
        BOTTOM = consts.BOTTOM,
        NONE = consts.NONE,
        zerostring = '0',
        borderWidths = enums.borderWidths,
        getCssValue = utils.getCssValue;

    function create(measure) {
        var internalMeasure;

        if (measure % 1 !== 0) {
            throw new Error('LayoutMeasures must be integers, measure was ' + typeof (measure) + '(' + measure + ')');
        }

        internalMeasure = measure;

        function getRawMeasure() {
            return internalMeasure;
        }

        function getPixelValue() {
            return internalMeasure / Math.pow(10, precision);
        }

        function getMeasureRoundedToWholePixel() {
            var abs = Math.abs,
			    pow = Math.pow,
			    fractionOfPixel = abs(internalMeasure % pow(10, precision)),
			    adjustment;

            if (fractionOfPixel >= 5 * pow(10, precision - 1)) {
                // Round up.
                adjustment = pow(10, precision) - fractionOfPixel;
            } else {
                // Round down.
                adjustment = -fractionOfPixel;
            }

            if (internalMeasure < 0) {
                adjustment = -adjustment;
            }
            return create(internalMeasure + adjustment);
        }

        function add(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.add only accepts layout measures');
            }

            return create(internalMeasure + measure.getRawMeasure());
        }

        function subtract(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.subtract only accepts layout measures');
            }
            return create(internalMeasure - measure.getRawMeasure());
        }

        function multiply(number) {
            if (typeof number !== "number") {
                throw new Error('LayoutMeasure.multiply only accepts numbers');
            }
            // Integer arithmetic; drop any remainder.
            return create(Math.floor(internalMeasure * number));
        }

        function divide(number) {
            if (typeof number !== "number") {
                throw new Error('LayoutMeasure.divide only accepts number');
            }
            // Integer arithmetic; drop any remainder.
            return create(Math.floor(internalMeasure / number));
        }

        function equals(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.equals only accepts layout measures');
            }
            return internalMeasure === measure.getRawMeasure();
        }

        return {
            getRawMeasure: getRawMeasure,
            getPixelValue: getPixelValue,
            getMeasureRoundedToWholePixel: getMeasureRoundedToWholePixel,
            add: add,
            subtract: subtract,
            multiply: multiply,
            divide: divide,
            equals: equals
        };
    }

    function measureFromPx(measureInPx) {
        // Convert to accuracy of agent's layout engine.
        return create(Math.round(measureInPx * Math.pow(10, precision)));
    }

    function zero() {
        return create(0);
    }

    function min(a, b) {
        return create(Math.min(a.getRawMeasure(), b.getRawMeasure()));
    }

    function max(a, b) {
        return create(Math.max(a.getRawMeasure(), b.getRawMeasure()));
    }

    function measureFromPxString(measureInPxString) {
        var length = measureInPxString.length,
		    wholePart = 0,
		    fractionPart = 0,
		    decimalPosition = measureInPxString.indexOf(PERIOD);

        // Don't depend on a potentially lossy conversion to a float-- we'll parse it ourselves.
        measureInPxString = measureInPxString.substr(0, measureInPxString.length - 2);

        if (decimalPosition >= 0) {
            fractionPart = measureInPxString.substring(decimalPosition + 1);
            while (fractionPart.length < precision) {
                fractionPart += zerostring;
            }
            fractionPart = parseInt(fractionPart, 10);
        }
        if (decimalPosition !== 0) {
            wholePart = measureInPxString.substring(0, decimalPosition >= 0 ? decimalPosition : length);
            wholePart = parseInt(wholePart, 10) * Math.pow(10, precision);
        }
        //return create(wholePart + fractionPart);
        return create(wholePart);
    }

    function measureFromStyleProperty(el, property) {
        // TODO: handle borders with no style and keywords
        var val = getCssValue(el, property),
		    found = false,
		    size,
            s,
            em,
            rem,
            percent;

        if (!val.contains(PX)) {
            if (property.contains('border-width')) {
                size = getCssValue(el, 'border-style');
                if (size === NONE) {
                    val = '0' + PX;
                    found = true;
                } else {
                    for (s in borderWidths) {
                        if (borderWidths.hasOwnProperty(s)) {
                            if (size === s) {
                                val = borderWidths[s] + PX;
                                found = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (!found) {
                em = val.contains(EM);
                rem = val.contains(REM);
                percent = val.contains(PERCENT);
                if (em || rem) {
                    size = parseInt(getCssValue((em ? el : document.body), 'font-size'), 10);
                    val = (parseInt(val, 10) * size) + PX;
                } else if (percent) {
                    if (property.contains(WIDTH) ||
                            property.contains(LEFT) ||
                                property.contains(RIGHT)) {
                        s = el.parentNode.clientWidth;
                    } else if (property.contains(HEIGHT) ||
                                property.contains(TOP) ||
                                    property.contains(BOTTOM)) {
                        s = el.parentNode.clientHeight;
                    }
                    val = Math.round((parseInt(val, 10) / 100) * s) + PX;
                }
            }
        }
        return measureFromPxString(val);
    }

    return {
        create: create,
        measureFromPx: measureFromPx,
        measureFromStyleProperty: measureFromStyleProperty,
        zero: zero,
        min: min,
        max: max
    };
});
/*global define, console */
define('scalejs.layout-cssgrid/trackManager',[
    './consts',
    './enums',
    './objects'
], function (
    consts,
    enums,
    objects
) {
    

    var FR = consts.FR,
        sizingType = enums.sizingType,
        gridTrackValue = enums.gridTrackValue,
        track = objects.track,
        implicitTrackRange = objects.implicitTrackRange;

	return function trackManager() {
	    var tracks = [],
            implicitTrackRanges = [];

	    function trackIterator() {
	        var iteratingtracks = true,
                currentTrackIndex = 0,
                currentImplicitTrackRangeIndex = 0;

	        function reset() {
	            iteratingtracks = true;
	            currentTrackIndex = 0;
	            currentImplicitTrackRangeIndex = 0;
	        }

	        function next() {
	            var nextTrack = null,
                    returnNextTrackRange = false,
                    tracksLength = tracks.length,
                    implicitTrackRangesLength = implicitTrackRanges.length;

	            if (currentTrackIndex >= tracksLength) {
	                returnNextTrackRange = true;
	            } else if (currentImplicitTrackRangeIndex < implicitTrackRangesLength) {
	                // We have both a non-range track and a range track-- check to see if we should return the track range first.
	                if (implicitTrackRanges[currentImplicitTrackRangeIndex].firstNumber < tracks[currentTrackIndex].number) {
	                    returnNextTrackRange = true;
	                }
	            }
	            if (returnNextTrackRange &&
                        currentImplicitTrackRangeIndex < implicitTrackRangesLength) {
	                nextTrack = implicitTrackRanges[currentImplicitTrackRangeIndex];
	                currentImplicitTrackRangeIndex += 1;
	            } else if (currentTrackIndex < tracksLength) {
	                nextTrack = tracks[currentTrackIndex];
	                currentTrackIndex += 1;
	            }
	            return nextTrack;
	        }

	        return {
	            reset: reset,
	            next: next
	        };
	    }

	    function addTrack(trackToAdd) {
	        tracks.push(trackToAdd);
	    }

	    function getRangeLastTrackNumber(range) {
	        return range.firstNumber + range.span - 1;
	    }

	    function makeRoomForExplicitTrack(trackNumber) {
	        var i = 0,
                len = implicitTrackRanges.length,
			    curRange,
                nextRange,
                firstRangeNum,
                firstRangeSpan,
                secondRangeNum,
                //secondRangeSpan,
                //newRange,
                lastTrackNumber;

	        for (i = 0; i < len; i += 1) {
	            curRange		= implicitTrackRanges[i];
	            lastTrackNumber = getRangeLastTrackNumber(curRange);
	            if (trackNumber >= curRange.firstNumber &&
					    trackNumber <= lastTrackNumber) {
	                // This range covers the explicit track we are adding. Split, if necessary, and vacate the track.
	                nextRange = i < len - 1 ? null : implicitTrackRanges[i + 1];
	                // In the first track this range covers.
	                if (trackNumber === curRange.firstNumber) {
	                    if (curRange.span === 1) {
	                        // Remove the range.
	                        implicitTrackRanges.splice(i, 1);
	                    } else {
	                        // Vacate the track.
	                        curRange.firstNumber += 1;
	                        curRange.span -= 1;
	                    }
	                } else if (trackNumber === lastTrackNumber) {
	                    // In the last track this range covers.					
	                    // Vacate the track.
	                    curRange.span -= 1;
	                } else {
	                    // Need to split the range.
	                    // Compute new range values.
	                    firstRangeNum	= curRange.firstNumber;
	                    firstRangeSpan	= trackNumber - curRange.firstNumber;
	                    secondRangeNum = trackNumber + 1;
	                    throw new Error('Not implemented');
                        /*
	                    secondRangeSpan = lastTrackNumber - secondRangeFirstNumber + 1;

	                    // Move the existing range to the second half and add a new range before it.
	                    curRange.firstNumber = secondRangeFirstNumber;
	                    curRange.span = secondRangeSpan;

	                    newRange = new ImplicitTrackRange();
	                    newRange.firstNumber	= firstRangeFirstNumber;
	                    newRange.span			= firstRangeSpan;
	                    // Insert before the existing range.
	                    this.implicitTrackRanges.splice(i, 0, newRange); */
	                }
	                break;
	            }
	        }
	    }

	    function ensureFirstTrackExists(firstTrackNumber) {
	        // Ensure an actual track object exists for the first track.
	        makeRoomForExplicitTrack(firstTrackNumber);

	        var i = 0,
			    len = tracks.length,
			    newTrack = track();

	        newTrack.number		= firstTrackNumber;
	        newTrack.sizingType = sizingType.keyword;
	        newTrack.size		= gridTrackValue.auto;
	        newTrack.implicit = true;

	        if (len === 0 ||
				    firstTrackNumber > tracks[len - 1].number) {
	            // No tracks OR it doesn't exist
	            // add to the end.
	            addTrack(newTrack);
	        //} else if (firstTrackNumber === tracks[len - 1].number) {
	            // Already exists at the end.
	        } else if (firstTrackNumber !== tracks[len - 1].number) {
	            // Doesn't belong at the end. Determine if it exists and, if not, create one and insert it.
	            for (i = 0; i < len; i += 1) {
	                if (firstTrackNumber === tracks[i].number) {
	                    break; // Already exists.
	                } else if (firstTrackNumber < tracks[i].number) {
	                    tracks.splice(i, 0, newTrack);
	                    break;
	                }
	            }
	        }
	    }

	    function ensureTracksExist(firstTrackNumber, lastTrackNumber) {
	        var //newRangeFirstNumber = firstTrackNumber,
			    //newRangeLastNumber = lastTrackNumber,
			    trackLength = tracks.length,
			    mathMin = Math.min,
			    mathMax = Math.max,
			    rangesToCreate,
                curFirstTrackNumber,
                curLastTrackNumber,
                nonRangeTrackIndex,
			    existingRangeIndex,
                newRangeIndex,
                rangesToCreateLength,
                implicitTrackRangesLength,
			    rangeToCreate,
                rangeToCreateFirstNumber,
                rangeToCreateLastNumber,
                needToCreateRange,
			    existingRange,
                existingRangeFirstNumber,
                existingRangeLastNumber,
			    firstRangeFirstNumber,
                firstRangeSpan,
			    secondRangeFirstNumber,
                secondRangeSpan,
			    thirdRangeFirstNumber,
                thirdRangeSpan,
			    newRange;

	        ensureFirstTrackExists(firstTrackNumber);

	        // First track now exists; insert one or more ranges into the set of implicit track ranges.
	        firstTrackNumber += 1;

	        if (firstTrackNumber <= lastTrackNumber) {
	            rangesToCreate		= [];
	            curFirstTrackNumber = firstTrackNumber;
	            curLastTrackNumber	= lastTrackNumber;
	            // Iterate over the non-range track objects and split up our range into multiple ones if necessary.
	            if (trackLength === 0) {
	                // TODO: throw instead of pushing here; at least one track should have been created by ensureFirstTrackExists.
	                rangesToCreate.push({ first: curFirstTrackNumber, last: curLastTrackNumber });
	            }
	            for (nonRangeTrackIndex = 0; nonRangeTrackIndex < trackLength; nonRangeTrackIndex += 1) {
	                if (curFirstTrackNumber > curLastTrackNumber ||
						    tracks[nonRangeTrackIndex].number > curLastTrackNumber) {
	                    break;
	                }

	                // This track sits inside our range.
	                if (tracks[nonRangeTrackIndex].number >= curFirstTrackNumber &&
						    tracks[nonRangeTrackIndex].number <= curLastTrackNumber) {
	                    if (curFirstTrackNumber === tracks[nonRangeTrackIndex].number) {
	                        // No need to create a new range; just move out of the way.
	                        curFirstTrackNumber += 1;
	                    } else if (curLastTrackNumber === tracks[nonRangeTrackIndex].number) {
	                        // No need to create a new range; just move out of the way.
	                        curLastTrackNumber -= 1;
	                    } else {
	                        // Split the range
	                        // add the first half to the list of ranges to create,
	                        // and continue through the loop with the second half, searching
	                        // for more intersections with non-range tracks.
	                        rangesToCreate.push({ first: curFirstTrackNumber, last: tracks[nonRangeTrackIndex].number - 1 });
	                        curFirstTrackNumber = tracks[nonRangeTrackIndex].number + 1;
	                    }
	                }
	            }
	            if (curFirstTrackNumber <= curLastTrackNumber) {
	                rangesToCreate.push({ first: curFirstTrackNumber, last: curLastTrackNumber });
	            }
	            existingRangeIndex		= 0;
	            rangesToCreateLength	= rangesToCreate.length;
	            for (newRangeIndex = 0; newRangeIndex < rangesToCreateLength; newRangeIndex += 1) {
	                rangeToCreate				= rangesToCreate[newRangeIndex];
	                rangeToCreateFirstNumber	= rangeToCreate.first;
	                rangeToCreateLastNumber		= rangeToCreate.last;
	                needToCreateRange			= true;
	                implicitTrackRangesLength = implicitTrackRanges.length;

	                for (existingRangeIndex = 0; existingRangeIndex < implicitTrackRangesLength; existingRangeIndex += 1) {
	                    // Find any ranges that might intersect.
	                    existingRange				= implicitTrackRanges[existingRangeIndex];
	                    existingRangeFirstNumber	= existingRange.firstNumber;
	                    existingRangeLastNumber		= getRangeLastTrackNumber(existingRange);

	                    if (rangeToCreateLastNumber < existingRangeFirstNumber) {
	                        // We are past the existing range.
	                        break;
	                    }

	                    if (rangeToCreateFirstNumber <= existingRangeLastNumber) {
	                        if (rangeToCreateFirstNumber === existingRangeFirstNumber &&
                                            rangeToCreateLastNumber === existingRangeLastNumber) {
	                            // Check if this same range already exists.
	                            needToCreateRange = false;
	                            break;
	                        }


	                        // We have some intersection. 
	                        // Split into up to three ranges to cover the existing range and our new one.else
	                        firstRangeFirstNumber = mathMin(rangeToCreateFirstNumber, existingRangeFirstNumber);
	                        firstRangeSpan = mathMax(rangeToCreateFirstNumber, existingRangeFirstNumber) - firstRangeFirstNumber;
	                        secondRangeFirstNumber = firstRangeFirstNumber + firstRangeSpan;
	                        secondRangeSpan = mathMin(rangeToCreateLastNumber, existingRangeLastNumber) - secondRangeFirstNumber;
	                        thirdRangeFirstNumber = secondRangeFirstNumber + secondRangeSpan;
	                        thirdRangeSpan = mathMax(rangeToCreateLastNumber, existingRangeLastNumber) - thirdRangeFirstNumber + 1;

	                        // Insert the new ranges in front of the existing one.
	                        if (firstRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = firstRangeFirstNumber;
	                            newRange.span = firstRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }

	                        if (secondRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = secondRangeFirstNumber;
	                            newRange.span = secondRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }

	                        if (thirdRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = thirdRangeFirstNumber;
	                            newRange.span = thirdRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }
	                        // Remove the old range.

	                        implicitTrackRanges.splice(existingRangeIndex, 1);
	                        needToCreateRange = false;
	                        break;
	                    }
	                }

	                if (needToCreateRange) {
	                    newRange				= implicitTrackRange();
	                    newRange.firstNumber	= rangeToCreateFirstNumber;
	                    newRange.span			= rangeToCreateLastNumber - rangeToCreateFirstNumber + 1;

	                    if (existingRangeIndex >= implicitTrackRanges.length) {
	                        // Add to the end.
	                        implicitTrackRanges.push(newRange);
	                    } else {
	                        // Add before the existing one.
	                        implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                    }
	                }
	            }
	        }
	    }

	    function getIterator() {
	        return trackIterator();
	    }

	    function getTrack(trackNumber) {
	        var i,
                len,
                curRangeLastNumber;

	        for (len = tracks.length - 1; len >= 0; len -= 1) {
	            if (tracks[len].number < trackNumber) {
	                break;
	            }

	            if (trackNumber === tracks[len].number) {
	                return tracks[len];
	            }
	        }

	        len = implicitTrackRanges.length;

	        for (i = 0; i < len; i += 1) {
	            curRangeLastNumber = implicitTrackRanges[i].firstNumber + implicitTrackRanges[i].span - 1;
	            if (trackNumber >= implicitTrackRanges[i].firstNumber &&
					    trackNumber <= curRangeLastNumber) {
	                return implicitTrackRanges[i];
	            }
	        }
	        // console.log("getTrack: invalid track number " + trackNumber);
	    }

	    function getTracks(firstTrackNumber, lastTrackNumber) {
	        var collection			= [],
			    number,
                i,
                len,
                curRangeLastNumber;

	        for (i = 0, len = tracks.length; i < len; i += 1) {
	            number = tracks[i].number;

	            if (number > lastTrackNumber) {
	                break;
	            }

	            if (number >= firstTrackNumber &&
					    number <= lastTrackNumber) {
	                collection.push(tracks[i]);
	            }
	        }
	        for (i = 0, len = implicitTrackRanges.length; i < len; i += 1) {
	            curRangeLastNumber = implicitTrackRanges[i].firstNumber + implicitTrackRanges[i].span - 1;
	            if (firstTrackNumber >= implicitTrackRanges[i].firstNumber &&
					    lastTrackNumber <= curRangeLastNumber) {
	                collection.push(implicitTrackRanges[i]);
	            }
	            if (curRangeLastNumber >= lastTrackNumber) {
	                break;
	            }
	        }
	        if (collection.length === 0) {
	            console.log("getTracks: a track in the range " + firstTrackNumber + " - " + lastTrackNumber + " doesn't exist");
	        }
	        return collection;
	    }

	    function trackIsFractionSized(trackToCheck) {
	        return trackToCheck.sizingType === sizingType.valueAndUnit &&
				    trackToCheck.size.unit === FR;
	    }

	    function spanIsInFractionalTrack(firstTrackNum, numSpanned) {
	        var i,
	            len;
	        // Fractional tracks are always represented by actual track objects.
	        for (i = firstTrackNum - 1, len = tracks.length; i < len && i < (firstTrackNum + numSpanned - 1); i += 1) {
	            if (trackIsFractionSized(tracks[i])) {
	                return true;
	            }
	        }
	        return false;
	    }

	    return {
            tracks: tracks,
	        addTrack: addTrack,
	        ensureTracksExist: ensureTracksExist,
	        getIterator: getIterator,
	        getTrack: getTrack,
	        getTracks: getTracks,
            spanIsInFractionalTrack: spanIsInFractionalTrack
	    };
	};
});
/*global define */
define('scalejs.layout-cssgrid/propertyParser',[
    './consts',
    './enums',
    './objects'
], function (
    consts,
    enums,
    objects
) {
    

    // Parses property string definitions and get an associative array of track objects.

    var regexSpaces = consts.regexSpaces,
        NONE = consts.NONE,
        PERIOD = consts.PERIOD,
        PX = consts.PX,
        PERCENT = consts.PERCENT,
        EM = consts.EM,
        REM = consts.REM,
        FR = consts.FR,
        gridTrackValueEnum = enums.gridTrackValue,
        sizingTypeEnum = enums.sizingType,
        track = objects.track,
        cssValueAndUnit = objects.cssValueAndUnit;

    function isKeywordTrackDefinition(definition) {
        var ret = false;

        switch (definition) {
        case gridTrackValueEnum.auto.keyword:
        case gridTrackValueEnum.minContent.keyword:
        case gridTrackValueEnum.maxContent.keyword:
        case gridTrackValueEnum.fitContent.keyword:
            ret = true;
            break;
        }

        return ret;
    }

    function tryParseCssValue(typedValue) {
        // First match: 0 or more digits, an optional decimal, and any digits after the decimal.
        // Second match: anything after the first match (the unit).
        var expression = /^(\d*\.?\d*)([\w\W]*)/,
            regexResult = typedValue.match(expression),
            valueAndUnit = cssValueAndUnit();

        if (regexResult[0].length > 0 &&
                regexResult[1].length > 0 &&
                    regexResult[2].length > 0) {
            if (regexResult[1].indexOf(PERIOD) < 0) {
                valueAndUnit.value = parseInt(regexResult[1], 10);
            } else {
                valueAndUnit.value = parseFloat(regexResult[1], 10);
            }
            valueAndUnit.unit = regexResult[2];
        }
        return valueAndUnit;
    }

    function isValidCssValueUnit(unit) {
        var ret = false;
        switch (unit) {
        case PX:
        case PERCENT:
        case 'pt':
        case 'pc':
        case 'in':
        case 'cm':
        case 'mm':
        case EM:
        case 'ex':
        case 'vh':
        case 'vw':
        case 'vm':
        case 'ch':
        case REM:
        case FR: // Grid only
            ret = true;
            break;
        }
        return ret;
    }

    function parseGridTracksString(tracksDefinition, trackManager) {
        // TODO: add support for minmax definitions which will involve a more complicated tokenizer than split() (a regex?).
        var trackStrings = tracksDefinition.split(regexSpaces),
            length = trackStrings.length,
            i,
            newTrack,
            valueAndUnit;

        if (length === 1 &&
                (trackStrings[0].length === 0 ||
                 trackStrings[0].toLowerCase() === NONE)) {
            // Empty definition.
            return;
        }

        for (i = 0; i < length; i += 1) {
            trackStrings[i] = trackStrings[i].toLowerCase();

            newTrack = null;
            if (isKeywordTrackDefinition(trackStrings[i])) {
                //throw new Error('Not implemented');
                newTrack = track();
                newTrack.number = i + 1;
                newTrack.size = gridTrackValueEnum.parse(trackStrings[i]);
                newTrack.sizingType = sizingTypeEnum.keyword;
                trackManager.addTrack(newTrack);
            } else {
                // Not a keyword; this is a CSS value.
                valueAndUnit = tryParseCssValue(trackStrings[i]);
                if (valueAndUnit.value === null ||
                        valueAndUnit.unit === null) {
                    throw new Error('Not a keyword or a valid CSS value; track ' + (i + 1) + ' = ' + trackStrings[i] +
                                    '. Invalid track definition "' + trackStrings[i] + '"');
                }

                if (!isValidCssValueUnit(valueAndUnit.unit)) {
                    throw new Error('Invalid track unit "' + valueAndUnit.unit + '"');
                }

                newTrack = track();
                newTrack.number = i + 1;
                newTrack.size = valueAndUnit;
                newTrack.sizingType = sizingTypeEnum.valueAndUnit;
                trackManager.addTrack(newTrack);
            }
        }
    }

    // Parses CSS values into their value and their unit.

    return {
        parseGridTracksString: parseGridTracksString
    };
});
/*global define */
define('scalejs.layout-cssgrid/boxSizeCalculator',[
    './consts',
    './utils',
    './layoutMeasure'
], function (
    consts,
    utils,
    layoutMeasure
) {
    

    var BOXSIZING = consts.BOXSIZING,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        TOP = consts.TOP,
        BOTTOM = consts.BOTTOM,
        MARGIN = consts.MARGIN,
        PADDING = consts.PADDING,
        BORDER = consts.BORDER,
        HYPHEN = consts.HYPHEN,
        LEFT = consts.LEFT,
        RIGHT = consts.RIGHT,
        CONTENTBOX = consts.CONTENTBOX,
        PADDINGBOX = consts.PADDINGBOX,
        STYLE = consts.STYLE,
        NONE = consts.NONE,
        getCssValue = utils.getCssValue;

	function calcMarginBoxWidth(element) {
        var boxSizing = getCssValue(element, BOXSIZING),
            marginBoxWidth = layoutMeasure.measureFromStyleProperty(element, WIDTH);

	    marginBoxWidth = marginBoxWidth
							.add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + LEFT))
							.add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + RIGHT));

	    if (boxSizing === CONTENTBOX) {
	        marginBoxWidth = marginBoxWidth
								.add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + LEFT))
								.add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + RIGHT));
	    }
	    if (boxSizing === CONTENTBOX ||
				boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + LEFT + STYLE) !== NONE) {
	            marginBoxWidth = marginBoxWidth
									.add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + LEFT + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + RIGHT + STYLE) !== NONE) {
	            marginBoxWidth = marginBoxWidth
									.add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + RIGHT + HYPHEN + WIDTH));
	        }
	    }
	    return marginBoxWidth;
	}

	function calcMarginBoxHeight(element) {
	    var boxSizing = getCssValue(element, BOXSIZING),
            marginBoxHeight = layoutMeasure.measureFromStyleProperty(element, HEIGHT);

	    marginBoxHeight = marginBoxHeight
                            .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + TOP))
                            .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + BOTTOM));

	    if (boxSizing === CONTENTBOX) {
	        marginBoxHeight = marginBoxHeight
                                .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + TOP))
                                .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + BOTTOM));
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + TOP + STYLE) !== NONE) {
	            marginBoxHeight = marginBoxHeight
                                    .add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + TOP + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + BOTTOM + STYLE) !== NONE) {
	            marginBoxHeight = marginBoxHeight
                                    .add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + BOTTOM + HYPHEN + WIDTH));
	        }
	    }
	    return marginBoxHeight;
	}
	    // Calculates a box width suitable for use with the width property from a given margin box width.
	    // Takes into account the box-sizing of the box.
	function calcBoxWidthFromMarginBoxWidth(element, marginBoxWidth) {
	    var boxSizing = getCssValue(element, BOXSIZING),
            boxWidth = marginBoxWidth;

	    if (boxSizing === CONTENTBOX) {
	        boxWidth = boxWidth
                .subtract(
                    layoutMeasure
                        .measureFromStyleProperty(element, PADDING + HYPHEN + LEFT)
                        .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + RIGHT))
                );
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + LEFT + STYLE) !== NONE) {
	            boxWidth = boxWidth.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + LEFT + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + RIGHT + STYLE) !== NONE) {
	            boxWidth = boxWidth.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + RIGHT + HYPHEN + WIDTH));
	        }
	    }
	    boxWidth = boxWidth
            .subtract(
                layoutMeasure
                    .measureFromStyleProperty(element, MARGIN + HYPHEN + LEFT)
                    .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + RIGHT))
            );
	    return boxWidth;
	}
	    // Calculates a box height suitable for use with the height property from a given margin box height.
	    // Takes into account the box-sizing of the box.
	function calcBoxHeightFromMarginBoxHeight(element, marginBoxHeight) {
	    var boxSizing = getCssValue(element, BOXSIZING),
	        boxHeight = marginBoxHeight,
            usedStyle; // TODO: what is this???

	    if (boxSizing === CONTENTBOX) {
	        boxHeight = boxHeight
                .subtract(
                    layoutMeasure
                        .measureFromStyleProperty(element, PADDING + HYPHEN + TOP)
                        .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + BOTTOM))
                );
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + TOP + STYLE) !== NONE) {
	            boxHeight = boxHeight.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + TOP + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + BOTTOM + STYLE) !== NONE) {
	            boxHeight = boxHeight.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + BOTTOM + HYPHEN + WIDTH));
	        }
	    }

	    boxHeight = boxHeight
            .subtract(
                layoutMeasure
                    .measureFromStyleProperty(usedStyle, MARGIN + HYPHEN + TOP)
                    .add(layoutMeasure.measureFromStyleProperty(usedStyle, MARGIN + HYPHEN + BOTTOM))
            );
	    return boxHeight;
	}

	return {
	    calcMarginBoxWidth: calcMarginBoxWidth,
	    calcMarginBoxHeight: calcMarginBoxHeight,
	    calcBoxWidthFromMarginBoxWidth: calcBoxWidthFromMarginBoxWidth,
	    calcBoxHeightFromMarginBoxHeight: calcBoxHeightFromMarginBoxHeight
    };
});
/*global define, document, window*/
define('scalejs.layout-cssgrid/intrinsicSizeCalculator',[
    './consts',
    './enums',
    './objects',
    './utils',
    './boxSizeCalculator'
], function (
    consts,
    enums,
    objects,
    utils,
    boxSizeCalculator
) {
    

    var EMPTY = consts.EMPTY,
        STRETCH = consts.STRETCH,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        COLON = consts.COLON,
        PX = consts.PX,
        SEMICOL = consts.SEMICOL,
        BLOCKPROGRESSION = consts.BLOCKPROGRESSION,
        MIN = consts.MIN,
        MAX = consts.MAX,
        calculatorOperation = enums.calculatorOperation,
        widthAndHeight = objects.widthAndHeight,
        defined = utils.defined,
        getCssValue = utils.getCssValue,
        zeroLength = { cssText: '0px' },
        infiniteLength = { cssText: '1000000px' },
        div = document.createElement('div'),
	    intrinsicSizeCalculatorElement = null,
	    intrinsicSizeCalculatorElementParent = null;


	/* last 2 params only required for shrink-to-fit calculation */
	function prepare(element, calculatorOperation, containerWidth, containerHeight) {
	    if (intrinsicSizeCalculatorElement === null) {
	        intrinsicSizeCalculatorElement = div.cloneNode(true);
	        intrinsicSizeCalculatorElement.id = "intrinsicSizeCalculator";
	    }

	    var cssText = EMPTY,
		    gridElement = element.parentNode,
		    //gridElementUsedStyle,
		    FONT = 'font-',
		    FONTFAMILY = FONT + 'family',
		    FONTSIZE = FONT + 'size',
		    FONTADJUST = FONTSIZE + '-adjust',
		    FONTSTRETCH = FONT + STRETCH,
		    FONTSTYLE = FONT + 'style',
		    FONTVARIANT = FONT + 'variant',
		    FONTWEIGHT = FONT + 'weight',
		    DIRECTION = 'direction';

	    if (defined(containerWidth) &&
			    containerWidth !== null) {
	        cssText += WIDTH + COLON + containerWidth.getPixelValue() + PX + SEMICOL;
	    } else {
	        switch (calculatorOperation) {
	        case calculatorOperation.minWidth:
	        case calculatorOperation.maxHeight:
	            cssText += WIDTH + COLON + zeroLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.minHeight:
	        case calculatorOperation.maxWidth:
	            cssText += WIDTH + COLON + infiniteLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.shrinkToFit:
	            // console.log("Calculating shrink to fit size without specified container width");
	            break;
	        }
	    }

	    if (defined(containerHeight) &&
				containerHeight !== null) {
	        cssText += HEIGHT + COLON + containerHeight.getPixelValue() + PX + SEMICOL;
	    } else {
	        switch (calculatorOperation) {
	        case calculatorOperation.minWidth:
	        case calculatorOperation.maxHeight:
	            cssText += HEIGHT + COLON + infiniteLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.minHeight:
	        case calculatorOperation.maxWidth:
	            cssText += HEIGHT + COLON + zeroLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.shrinkToFit:
	            // console.log("Calculating shrink to fit size without specified container height");
	            break;
	        }
	    }

	    /* Insert our calculator at the same level as the grid to ensure child selectors work as well as we can reasonably achieve.
			* Special case: the grid is the body element.
			* In that case, put the calculator under the grid anyway;
			* it shouldn't impact calculations assuming selectors aren't impacted.
			**/
	    intrinsicSizeCalculatorElementParent = gridElement === document.body ? gridElement : gridElement.parentNode;

	    // Copy styles from the grid to the calculator to ensure any values that are inherited by grid items still happens.
	    // TODO: add additional properties if new test content requires it.
	    if (intrinsicSizeCalculatorElementParent !== gridElement) {
	        cssText += FONTFAMILY + COLON + getCssValue(gridElement, FONTFAMILY) + SEMICOL
					+ FONTSIZE + COLON + getCssValue(gridElement, FONTSIZE) + SEMICOL
					+ FONTADJUST + COLON + getCssValue(gridElement, FONTADJUST) + SEMICOL
					+ FONTSTRETCH + COLON + getCssValue(gridElement, FONTSTRETCH) + SEMICOL
					+ FONTSTYLE + COLON + getCssValue(gridElement, FONTSTYLE) + SEMICOL
					+ FONTVARIANT + COLON + getCssValue(gridElement, FONTVARIANT) + SEMICOL
					+ FONTWEIGHT + COLON + getCssValue(gridElement, FONTWEIGHT) + SEMICOL
					+ DIRECTION + COLON + getCssValue(gridElement, DIRECTION) + SEMICOL
					+ BLOCKPROGRESSION + COLON + getCssValue(gridElement, BLOCKPROGRESSION) + SEMICOL;
	    }
	    intrinsicSizeCalculatorElement.style.cssText += cssText;
	    intrinsicSizeCalculatorElementParent.appendChild(intrinsicSizeCalculatorElement);
	}

	function unprepare() {
	    intrinsicSizeCalculatorElementParent.removeChild(intrinsicSizeCalculatorElement);
	}

	function cloneAndAppendToCalculator(element) {
	    var clone = element.cloneNode(true);
	    // Float it so that the box won't constrain itself to the parent's size.
	    clone.style.cssText = clone.style.cssText + SEMICOL + "float:left";
	    intrinsicSizeCalculatorElement.appendChild(clone);
	    return clone;
	}

	function calcMinWidth(element) {
	    prepare(element, calculatorOperation.minWidth);

	    var clone = cloneAndAppendToCalculator(element),
            width = boxSizeCalculator.calcMarginBoxWidth(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return width;
	}

	function calcMaxWidth(element) {
	    prepare(element, calculatorOperation.maxWidth);

	    var clone = cloneAndAppendToCalculator(element),
            width = boxSizeCalculator.calcMarginBoxWidth(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return width;
	}

	function calcMinHeight(element, usedWidth) {
	    if (!defined(usedWidth) ||
                usedWidth === null) {
	        throw new Error('No `usedWidth` specified.');
	    }

	    prepare(element, calculatorOperation.minHeight, usedWidth);

	    var clone = cloneAndAppendToCalculator(element),
            height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return height;
	}

	function calcMaxHeight(element, usedWidth) {
	    if (!defined(usedWidth) ||
                usedWidth === null) {
	        throw new Error('No `usedWidth` specified');
	    }

	    prepare(element, calculatorOperation.maxHeight, usedWidth);

	    var clone = cloneAndAppendToCalculator(element),
            height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return height;
	}

	function calcShrinkToFitWidthAndHeight(element, containerWidth, containerHeight, forcedMarginBoxWidth, forcedMarginBoxHeight) {
	    // If we're forcing a specific size on the grid item, adjust the calculator's container size to accomodate it.
	    if (forcedMarginBoxWidth !== null) {
	        containerWidth = forcedMarginBoxWidth;
	    }
	    if (forcedMarginBoxHeight !== null) {
	        containerHeight = forcedMarginBoxHeight;
	    }

	    prepare(element, calculatorOperation.shrinkToFit, containerWidth, containerHeight);

	    var clone = cloneAndAppendToCalculator(element),
            //cloneUsedStyle = window.getComputedStyle(clone, null),
            shrinkToFitWidthAndHeight = widthAndHeight(),
            forcedWidth,
            forcedHeight;

	    /* Force a width or height for width/height if requested.
         * We don't want to change the box-sizing on the box since we are not 
         * overriding all of the border/padding/width/height properties and
         * want the original values to work correctly. Convert the specified 
         * forced length to the appropriate length for the width/height property.
         **/
	    if (forcedMarginBoxWidth !== null) {
	        forcedWidth = boxSizeCalculator.calcBoxWidthFromMarginBoxWidth(clone, forcedMarginBoxWidth);
	        clone.style.cssText += MIN + WIDTH + COLON + forcedWidth.getPixelValueString() + PX + SEMICOL +
                                    MAX + WIDTH + COLON + forcedWidth.getPixelValueString() + PX + SEMICOL;
	    }
	    if (forcedMarginBoxHeight !== null) {
	        forcedHeight = boxSizeCalculator.calcBoxHeightFromMarginBoxHeight(clone, forcedMarginBoxHeight);
	        clone.style.cssText += MIN + HEIGHT + COLON + forcedHeight.getPixelValueString() + PX + SEMICOL +
                                    MAX + HEIGHT + COLON + forcedHeight.getPixelValueString() + PX + SEMICOL;
	    }
	    shrinkToFitWidthAndHeight.width = boxSizeCalculator.calcMarginBoxWidth(clone);
	    shrinkToFitWidthAndHeight.height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return shrinkToFitWidthAndHeight;
	}

	return {
	    calcMinWidth: calcMinWidth,
	    calcMaxWidth: calcMaxWidth,
	    calcMinHeight: calcMinHeight,
	    calcMaxHeight: calcMaxHeight,
	    calcShrinkToFitWidthAndHeight: calcShrinkToFitWidthAndHeight
	};
});
/*global define, document, window */
define('scalejs.layout-cssgrid/gridLayout',[
    './consts',
    './enums',
    './objects',
    './utils',
    './layoutMeasure',
    './trackManager',
    './propertyParser',
    './boxSizeCalculator',
    './intrinsicSizeCalculator'
], function (
    consts,
    enums,
    objects,
    utils,
    layoutMeasure,
    trackManager,
    propertyParser,
    boxSizeCalculator,
    intrinsicSizeCalculator
) {
    

    var BLOCKPROGRESSION = consts.BLOCKPROGRESSION,
        EMPTY = consts.EMPTY,
        OPEN_CURLY = consts.OPEN_CURLY,
        ABSOLUTE = consts.ABSOLUTE,
        CLOSE_CURLY = consts.CLOSE_CURLY,
        RELATIVE = consts.RELATIVE,
        STATIC = consts.STATIC,
        PERIOD = consts.PERIOD,
        GRIDLAYOUT = consts.GRIDLAYOUT,
        GRIDCOLUMNS = consts.GRIDCOLUMNS,
        GRIDROWS = consts.GRIDROWS,
        GRIDCOLUMN = consts.GRIDCOLUMN,
        GRIDCOLUMNSPAN = consts.GRIDCOLUMNSPAN,
        GRIDROW = consts.GRIDROW,
        GRIDROWSPAN = consts.GRIDROWSPAN,
        GRIDROWALIGN = consts.GRIDROWALIGN,
        GRIDCOLUMNALIGN = consts.GRIDCOLUMNALIGN,
        NONE = consts.NONE,
        TOP = consts.TOP,
        RIGHT = consts.RIGHT,
        BOTTOM = consts.BOTTOM,
        LEFT = consts.LEFT,
        INLINEGRID = consts.INLINEGRID,
        MARGIN = consts.MARGIN,
        HYPHEN = consts.HYPHEN,
        PADDING = consts.PADDING,
        BORDER = consts.BORDER,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        AUTO = consts.AUTO,
        PX = consts.PX,
        FR = consts.FR,
        DISPLAY = consts.DISPLAY,
        COLON = consts.COLON,
        SEMICOL = consts.SEMICOL,
        STYLE = consts.STYLE,
        BOXSIZING = consts.BOXSIZING,
        MIN = consts.MIN,
        MAX = consts.MAX,
        POSITION = consts.POSITION,
        STRETCH = consts.STRETCH,
        precision = consts.precision,
        blockProgressionEnum = enums.blockProgression,
        positionEnum = enums.position,
        gridAlignEnum = enums.gridAlign,
        sizingTypeEnum = enums.sizingType,
        borderWidthsEnum = enums.borderWidths,
        blockProgressionStringToEnum = blockProgressionEnum.parse,
        positionStringToEnum = positionEnum.parse,
        gridAlignStringToEnum = gridAlignEnum.parse,
        gridTrackValue = enums.gridTrackValue,
        widthAndHeight = objects.widthAndHeight,
        item = objects.item,
        getCssValue = utils.getCssValue,
        createBoundedWrapper = utils.createBoundedWrapper,
        defined = utils.defined,
        makeUniqueClass = utils.makeUniqueClass,
        addClass = utils.addClass,
        embedCss = utils.embedCss,
        clearEmbeddedCss = utils.clearEmbeddedCss,
        div = document.createElement('div');


    return function cssGridLayout(element, selector, properties, media, grid_items) {
        var gridElement = element,
            blockProgression = blockProgressionStringToEnum(getCssValue(element, BLOCKPROGRESSION)),
            availableSpaceForColumns = null,
            availableSpaceForRows = null,
            items = null,
            columnTrackManager = trackManager(),
            rowTrackManager = trackManager(),
            useAlternateFractionalSizingForColumns = false,
            useAlternateFractionalSizingForRows = false,
            error = false;

        function determineSize(dimension, margins, padding, borders) {
            var parent = gridElement.parentNode,
                one = dimension === WIDTH ? LEFT : TOP,
                two = dimension === WIDTH ? RIGHT : BOTTOM,
                size = dimension === WIDTH ? parent.offsetWidth : parent.offsetHeight,
                border1 = layoutMeasure.measureFromStyleProperty(parent, BORDER + HYPHEN + one + HYPHEN + WIDTH),
                border2 = layoutMeasure.measureFromStyleProperty(parent, BORDER + HYPHEN + two + HYPHEN + WIDTH),
                padd1 = layoutMeasure.measureFromStyleProperty(parent, PADDING + HYPHEN + one),
                padd2 = layoutMeasure.measureFromStyleProperty(parent, PADDING + HYPHEN + two);

            size -= (border1.getRawMeasure() + border2.getRawMeasure() +
                        padd1.getRawMeasure() + padd2.getRawMeasure() +
                        margins[one].getRawMeasure() + margins[two].getRawMeasure() +
                        borders[one].getRawMeasure() + borders[two].getRawMeasure() +
                        padding[one].getRawMeasure() + padding[two].getRawMeasure());

            return size;
        }

        function verticalScrollbarWidth() {
            return window.innerWidth - document.documentElement.clientWidth;
        }

        function horizontalScrollbarHeight() {
            return window.innerHeight - document.documentElement.clientHeight;
        }

        function shouldSwapWidthAndHeight() {
            return (blockProgression === blockProgressionEnum.lr ||
                     blockProgression === blockProgressionEnum.rl);
        }


        /* Determines the available space for the grid by:
         * 1. Swapping in a dummy block|inline-block element where the grid 
         *    element was with one fractionally sized column and one fractionally sized row,
         *    causing it to take up all available space.
         *    a. If getting the cascaded (not used) style is possible (IE only),
         *          copy the same width/height/box-sizing values to ensure the available
         *          space takes into account explicit constraints.
         * 2. Querying for the used widths/heights
         * 3. Swapping back the real grid element
         * Yes, this depends on the dummy block|inline-block sizing to work correctly.
         **/
        function determineGridAvailableSpace() {
            var dummy = gridElement.cloneNode(false),
                gridProperties = properties,
                gridElementParent = gridElement.parentNode,
                isInlineGrid,
                zero = '0px',
                sides = [TOP, RIGHT, BOTTOM, LEFT],
                margins = {},
                padding = {},
                borders = {},
                oldDisplay = gridElement.style.display,
                //innerHTML,
                //s,
                width,
                height,
                floated,
                widthToUse,
                heightToUse,
                //marginToUse,
                //borderWidthToUse,
                //borderStyleToUse,
                //paddingToUse,
                cssText,
                scrollWidth,
                scrollHeight,
                removedElement,
                widthAdjustment,
                heightAdjustment,
                widthMeasure,
                heightMeasure,
                widthAdjustmentMeasure,
                heightAdjustmentMeasure;

            // we need to get grid props from the passed styles
            isInlineGrid = gridProperties.display === INLINEGRID ? true : false;

            // Get each individual margin, border, and padding value for
            // using with calc() when specifying the width/height of the dummy element.
            sides.forEach(function (side) {
                margins[side] = layoutMeasure.measureFromStyleProperty(gridElement, MARGIN + HYPHEN + side);
                padding[side] = layoutMeasure.measureFromStyleProperty(gridElement, PADDING + HYPHEN + side);
                borders[side] = layoutMeasure.measureFromStyleProperty(gridElement, BORDER + HYPHEN + side + HYPHEN + WIDTH);
            });

            // If the grid has an explicit width and/or height, that determines the available space for the tracks.
            // If there is none, we need to use alternate fractional sizing. The exception is if we are a non-inline grid;
            // in that case, we are a block element and take up all available width.
            // TODO: ensure we do the right thing for floats.
            // need to remove the content to ensure we get the right height
            gridElementParent.insertBefore(dummy, gridElement);
            gridElement.style.display = 'none';
            width = getCssValue(dummy, WIDTH);
            floated = getCssValue(gridElement, 'float');
            if (width === zero) { width = AUTO; }
            if (width === AUTO &&
                    (isInlineGrid ||
                        floated === LEFT ||
                        floated === RIGHT)) {
                useAlternateFractionalSizingForColumns = true;
            }
            height = getCssValue(dummy, HEIGHT);
            if (height === zero) { height = AUTO; }
            if (height === AUTO) {
                useAlternateFractionalSizingForRows = true;
            }
            // remove the dummy
            gridElement.style.display = oldDisplay;
            gridElementParent.removeChild(dummy);

            // build the straw man for getting dimensions
            dummy = document.createElement(gridElement.tagName);
            widthToUse = width !== AUTO
                ? width
                : determineSize(WIDTH, margins, padding, borders) + PX;

            heightToUse = height !== AUTO
                ? height
                : determineSize(HEIGHT, margins, padding, borders) + PX;

            cssText = DISPLAY + COLON + (!isInlineGrid ? "block" : "inline-block") + SEMICOL
                    + MARGIN + COLON + getCssValue(gridElement, MARGIN) + SEMICOL
                    + BORDER + HYPHEN + WIDTH + COLON + getCssValue(gridElement, BORDER + HYPHEN + WIDTH) + SEMICOL
                    + PADDING + COLON + getCssValue(gridElement, PADDING) + SEMICOL
                    + BORDER + STYLE + COLON + getCssValue(gridElement, BORDER + STYLE) + SEMICOL
                    + WIDTH + COLON + widthToUse + SEMICOL
                    + HEIGHT + COLON + heightToUse + SEMICOL
                    + BOXSIZING + COLON + getCssValue(gridElement, BOXSIZING) + SEMICOL
                    + MIN + WIDTH + COLON + getCssValue(gridElement, MIN + WIDTH) + SEMICOL
                    + MIN + HEIGHT + COLON + getCssValue(gridElement, MIN + HEIGHT) + SEMICOL
                    + MAX + WIDTH + COLON + getCssValue(gridElement, MAX + WIDTH) + SEMICOL
                    + MAX + HEIGHT + COLON + getCssValue(gridElement, MAX + HEIGHT) + SEMICOL;
            dummy.style.cssText = cssText;

            // Determine width/height (if any) of scrollbars are showing with the grid element on the page.
            scrollWidth = verticalScrollbarWidth();
            scrollHeight = horizontalScrollbarHeight();

            // Insert before the real grid element.
            gridElementParent.insertBefore(dummy, gridElement);

            // Remove the real grid element.
            removedElement = gridElementParent.removeChild(gridElement);

            // The dummy item should never add scrollbars if the grid element didn't.
            widthAdjustment = width !== AUTO ? 0 : scrollWidth - verticalScrollbarWidth();
            heightAdjustment = height !== AUTO ? 0 : scrollHeight - horizontalScrollbarHeight();
            // get the final measurements
            widthMeasure = layoutMeasure.measureFromStyleProperty(dummy, WIDTH);
            heightMeasure = layoutMeasure.measureFromStyleProperty(dummy, HEIGHT);
            widthAdjustmentMeasure = layoutMeasure.measureFromPx(widthAdjustment);
            heightAdjustmentMeasure = layoutMeasure.measureFromPx(heightAdjustment);

            // Get the content width/height; this is the available space for tracks and grid items to be placed in.
            if (!shouldSwapWidthAndHeight()) {
                availableSpaceForColumns = widthMeasure.subtract(widthAdjustmentMeasure);
                availableSpaceForRows = heightMeasure.subtract(heightAdjustmentMeasure);
            } else {
                availableSpaceForColumns = heightMeasure.subtract(heightAdjustmentMeasure);
                availableSpaceForRows = widthMeasure.subtract(widthAdjustmentMeasure);
            }

            // Restore the DOM.
            gridElementParent.insertBefore(removedElement, dummy);
            gridElementParent.removeChild(dummy);
        }

        // Creates track objects for implicit tracks if needed.
        function ensureTracksExist(trackManager, firstTrackNumber, lastTrackNumber) {
            /* TODO: we need a better data structure for tracks created by spans.
             * If a grid item has a really high span value,
             * we currently end up creating implicit tracks for every one of the
             * implicit tracks (span 100000=>100000 tracks created).
             * Instead, a single track object should be able to represent multiple
             * implicit tracks. The number of implicit tracks it represents would 
             * be used during the track sizing algorithm when redistributing space
             * among each of the tracks to ensure it gets the right proportional amount.
             **/
            trackManager.ensureTracksExist(firstTrackNumber, lastTrackNumber);
        }

        // Traverses all tracks that the item belongs to and adds a reference to it in each of the track objects.
        function addItemToTracks(trackManager, itemToAdd, firstTrackNumber, lastTrackNumber) {
            var i,
                tracks = trackManager.tracks.length,
                implicitTrackIndex,
                implicitTracks = trackManager.implicitTracks;

            for (i = 0; i < tracks; i += 1) {
                if (trackManager.tracks[i].number === firstTrackNumber) {
                    trackManager.tracks[i].items.push(itemToAdd);
                } else if (trackManager.tracks[i].number > firstTrackNumber) {
                    break;
                }
            }
            // TODO: check if we can remove 
            for (implicitTrackIndex = 0; implicitTrackIndex < implicitTracks; implicitTrackIndex += 1) {
                if (firstTrackNumber >= trackManager.implicitTracks[implicitTrackIndex].firstNumber &&
                        lastTrackNumber <= trackManager.implicitTracks[implicitTrackIndex].length) {
                    trackManager.implicitTracks[implicitTrackIndex].items.push(itemToAdd);
                }
            }
        }

        function mapGridItemsToTracks() {
            items = grid_items.map(function (curItem) {
                var column,
                    columnSpan,
                    row,
                    rowSpan,
                    columnAlignString,
                    columnAlign,
                    rowAlignString,
                    rowAlign,
                    boxSizing,
                    newItem,
                    firstColumn,
                    lastColumn,
                    firstRow,
                    lastRow;

                column = parseInt(curItem.details.properties[GRIDCOLUMN], 10);

                if (isNaN(column)) {
                    error = true;
                    // console.log("column is NaN");
                    column = 1;
                }

                columnSpan = parseInt(curItem.details.properties[GRIDCOLUMNSPAN], 10);
                if (isNaN(columnSpan)) {
                    error = true;
                    // console.log("column-span is NaN");
                    columnSpan = 1;
                }

                row = parseInt(curItem.details.properties[GRIDROW], 10);
                if (isNaN(row)) {
                    error = true;
                    // console.log("row is NaN");
                    row = 1;
                }

                rowSpan = parseInt(curItem.details.properties[GRIDROWSPAN], 10);
                if (isNaN(rowSpan)) {
                    error = true;
                    // console.log("row-span is NaN");
                    rowSpan = 1;
                }

                columnAlignString = curItem.details.properties[GRIDCOLUMNALIGN] || EMPTY;
                if (columnAlignString.length === 0) {
                    error = true;
                    // console.log("getPropertyValue for " + GRIDCOLUMNALIGN + " is an empty string");
                }
                columnAlign = gridAlignStringToEnum(columnAlignString);

                rowAlignString = curItem.details.properties[GRIDROWALIGN] || EMPTY;
                if (rowAlignString.length === 0) {
                    error = true;
                    // console.log("getPropertyValue for " + GRIDROWALIGN + " is an empty string");
                }
                rowAlign = gridAlignStringToEnum(rowAlignString);

                // TODO: handle directionality. These properties are physical; we probably need to map them to logical values.
                boxSizing = getCssValue(curItem.element, BOXSIZING);

                newItem = item();
                newItem.itemElement = curItem.element;
                newItem.styles = curItem.details;
                newItem.column = column;
                newItem.columnSpan = columnSpan;
                newItem.columnAlign = columnAlign;
                newItem.row = row;
                newItem.rowSpan = rowSpan;
                newItem.rowAlign = rowAlign;

                firstColumn = newItem.column;
                lastColumn = firstColumn + newItem.columnSpan - 1;
                firstRow = newItem.row;
                lastRow = firstRow + newItem.rowSpan - 1;

                // Ensure implicit track definitions exist for all tracks this item spans.
                ensureTracksExist(columnTrackManager, firstColumn, lastColumn);
                ensureTracksExist(rowTrackManager, firstRow, lastRow);

                // place the items as appropriate
                addItemToTracks(columnTrackManager, newItem, firstColumn, lastColumn);
                addItemToTracks(rowTrackManager, newItem, firstRow, lastRow);

                return newItem;
            });
        }

        function saveItemPositioningTypes() {
            // console.log('saving positioning types');
            items.forEach(function (item) {
                if (item.position === null) {
                    item.position = positionStringToEnum(getCssValue(item.itemElement, POSITION));
                }
            });
        }

        function usePhysicalWidths(blockProgression, verifyingColumns) {
            var ret = false;
            if (((blockProgression === blockProgressionEnum.tb ||
                     blockProgression === blockProgressionEnum.bt) &&
                     verifyingColumns === true) ||
                    ((blockProgression === blockProgressionEnum.lr ||
                        blockProgression === blockProgressionEnum.rl) &&
                        verifyingColumns === false)) {
                ret = true;
            }
            return ret;
        }


        // Inserts an empty grid item into a given track and gets its size.
        function getActualTrackMeasure(trackNumber, computingColumns) {
            var blockProgression, trackMeasure,
                dummyItem = div.cloneNode(true),
                cssText = "margin:0px;border:0px;padding:0px;"
                + (computingColumns ? GRIDCOLUMNALIGN : GRIDROWALIGN)
                + COLON + STRETCH + SEMICOL
                + (computingColumns ? GRIDCOLUMN : GRIDROW)
                + COLON + trackNumber + SEMICOL;

            dummyItem.style.cssText = cssText;

            dummyItem = gridElement.appendChild(dummyItem);
            blockProgression = blockProgressionStringToEnum(getCssValue(gridElement, BLOCKPROGRESSION));
            trackMeasure = usePhysicalWidths(blockProgression, computingColumns)
                                ? layoutMeasure.measureFromStyleProperty(dummyItem, WIDTH)
                                : layoutMeasure.measureFromStyleProperty(dummyItem, HEIGHT);

            gridElement.removeChild(dummyItem);
            return trackMeasure;
        }

        function getSumOfTrackMeasures(trackManager) {
            var sum = layoutMeasure.zero(),
                trackIter = trackManager.getIterator(),
                curTrack = trackIter.next();

            while (curTrack !== null) {
                sum = sum.add(curTrack.measure);
                curTrack = trackIter.next();
            }

            return sum;
        }

        function compareAutoTracksAvailableGrowth(a, b) {
            var availableGrowthA = a.maxMeasure.subtract(a.measure),
                availableGrowthB = b.maxMeasure.subtract(b.measure);

            if (availableGrowthA.getRawMeasure() < availableGrowthB.getRawMeasure()) {
                return -1;
            }

            if (availableGrowthA.getRawMeasure() > availableGrowthB.getRawMeasure()) {
                return 1;
            }

            return 0;
        }

        function trackIsFractionSized(trackToCheck) {
            return (trackToCheck.sizingType === sizingTypeEnum.valueAndUnit &&
                     trackToCheck.size.unit === FR);
        }

        function getSumOfSpannedTrackMeasures(trackManager, firstTrackNum, numSpanned) {
            var sum,
                tracks = trackManager.getTracks(firstTrackNum, firstTrackNum + numSpanned - 1);

            sum = tracks.reduce(function (acc, track) {
                return acc.add(track.measure);
            }, layoutMeasure.zero());

            return sum;
        }

        function getNormalFractionMeasure(track) {
            if (!trackIsFractionSized(track)) {
                throw new Error('getNormalFractionMeasure called for non-fraction sized track');
            }
            var frValue = track.size.value;
            return frValue === 0 ? layoutMeasure.zero() : track.measure.divide(frValue);
        }

        function compareFractionTracksNormalMeasure(a, b) {
            var result = 0,
                // Called from a sort function; can't depend on "this" object being CSSGridAlignment.
                normalFractionMeasureA = getNormalFractionMeasure(a),
                normalFractionMeasureB = getNormalFractionMeasure(b);

            if (defined(a) &&
                    defined(b)) {
                if (normalFractionMeasureA.getRawMeasure() < normalFractionMeasureB.getRawMeasure()) {
                    result = -1;
                } else if (normalFractionMeasureA.getRawMeasure() > normalFractionMeasureB.getRawMeasure()) {
                    result = 1;
                } else {
                    if (a.size.value > b.size.value) {
                        result = -1;
                    } else if (a.size.value < b.size.value) {
                        result = 1;
                    }
                }
            }
            return result;
        }

        function determineMeasureOfOneFractionUnconstrained(fractionalTracks) {
            // Iterate over all of the fractional tracks, 
            var maxOneFractionMeasure = layoutMeasure.zero();

            fractionalTracks.forEach(function (curTrack) {
                var curFractionValue = curTrack.size.value,
                    oneFractionMeasure = curTrack.maxMeasure.divide(curFractionValue);

                if (oneFractionMeasure.getRawMeasure() > maxOneFractionMeasure.getRawMeasure()) {
                    maxOneFractionMeasure = oneFractionMeasure;
                }
            });

            return maxOneFractionMeasure;
        }

        function saveUsedCellWidths(columnTrackManager) {
            var iter = columnTrackManager.getIterator(),
                curTrack = iter.next();

            function setUsedWithMeasure(curItem) {
                if (curItem.usedWidthMeasure === null) {
                    curItem.usedWidthMeasure = getSumOfSpannedTrackMeasures(columnTrackManager, curItem.column, curItem.columnSpan);
                }
            }

            while (curTrack !== null) {
                curTrack.items.forEach(setUsedWithMeasure);

                curTrack = iter.next();
            }
        }

        /* Determines track sizes using the algorithm from sections 9.1 and 9.2 of the W3C spec.
         * Rules:
         *   1. If it's a defined length, that is the track size.
         *      2. If it's a keyword, its sizing is based on its content. 
         *         Iterate over the items in the track to attempt to determine the size of the track.
         * TODO: handle percentages
         **/
        function determineTrackSizes(lengthPropertyName) {
            var computingColumns = (lengthPropertyName.toLowerCase() === WIDTH),
                trackManager = computingColumns ? columnTrackManager : rowTrackManager,
                availableSpace = computingColumns ? availableSpaceForColumns : availableSpaceForRows,
                useAlternateFractionalSizing = computingColumns ? useAlternateFractionalSizingForColumns
                                                                    : useAlternateFractionalSizingForRows,
                // Keep track of spans which could affect track sizing later.
                spans = [],
                autoTracks = [],
                fractionalTracks = [],
                respectAvailableLength = true,
                iter = trackManager.getIterator(),
                curTrack = iter.next(),
                curSize,
                sizingAlternateFraction,
                i,
                iLen,
                curItem,
                minItemMeasure,
                maxCellMeasure,
                actualMeasure,
                remainingSpace,
                autoTrackIndex,
                autoTrackLength,
                trackShareOfSpace,
                curSpanningItem,
                firstTrack,
                numSpanned,
                sumOfTrackMeasures,
                measureSpanCanGrow,
                sumOfFractions,
                oneFractionMeasure,
                totalMeasureToAdd,
                lastNormalizedFractionalMeasure,
                accumulatedFactors,
                accumulatedFactorsInDistributionSet,
                normalizedDelta,
                j,
                spaceToDistribute,
                sortFunc;

            if (useAlternateFractionalSizing &&
                    availableSpace.getRawMeasure() === 0) {
                // Assume we have as much space as we want.
                respectAvailableLength = false;
            }

            // 9.1.1/9.2.1: [Columns|Widths] are initialized to their minimum [widths|heights].
            while (curTrack !== null) {
                if (curTrack.sizingType !== sizingTypeEnum.keyword &&
                        curTrack.sizingType !== sizingTypeEnum.valueAndUnit) {
                    throw new Error('Unknown grid track sizing type');
                }

                // TODO: add support for minmax (M3)
                curTrack.measure = layoutMeasure.zero();
                curTrack.minMeasure = layoutMeasure.zero();
                curTrack.maxMeasure = layoutMeasure.zero();
                sizingAlternateFraction = (useAlternateFractionalSizing && trackIsFractionSized(curTrack));

                if (curTrack.sizingType === sizingTypeEnum.keyword ||
                        sizingAlternateFraction) {
                    curSize = curTrack.size;

                    if (curSize !== gridTrackValue.fitContent &&
                            curSize !== gridTrackValue.minContent &&
                            curSize !== gridTrackValue.maxContent &&
                            curSize !== gridTrackValue.auto &&
                            !sizingAlternateFraction) {
                        throw new Error('Unknown grid track sizing value ' + curSize.keyword);
                    }
                    if (!sizingAlternateFraction) {
                        curTrack.contentSizedTrack = true;
                    }

                    for (i = 0, iLen = curTrack.items.length; i < iLen; i += 1) {
                        curItem = curTrack.items[i];

                        if (curItem.position !== positionEnum[STATIC] &&
                                curItem.position !== positionEnum.relative) {
                            // Only position: static and position: relative items contribute to track size.
                            /*jslint continue:true*/
                            continue;
                        }

                        // 9.1.a.i/9.2.a.i: Spanning elements are ignored to avoid premature growth of [columns|rows].
                        if ((computingColumns ? curItem.columnSpan : curItem.rowSpan) > 1) {
                            // This is a span; determine and save its max width or height for use later in the track sizing algorithm.
                            if (curItem.maxWidthMeasure === null) {
                                if (computingColumns) {
                                    curItem.maxWidthMeasure = intrinsicSizeCalculator
                                                                .calcMaxWidth(curItem.itemElement);
                                } else {
                                    curItem.maxHeightMeasure = intrinsicSizeCalculator
                                                                .calcMaxHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }
                            }
                            if (curSize === gridTrackValue.fitContent ||
                                    curSize === gridTrackValue.auto) {
                                /* Only keep track of this span if we found it in a non-fixed size track.
                                 * Note: we are adding the span multiple times for each track but the 
                                 * sizing algorithm will be unaffected by trying to
                                 * process the same span multiple times.
                                 **/
                                spans.push(curItem);
                            }
                        } else {
                            // Not a span. Let's size the track.
                            if (!sizingAlternateFraction &&
                                    (curSize === gridTrackValue.minContent ||
                                        curSize === gridTrackValue.fitContent ||
                                        curSize === gridTrackValue.auto)) {
                                if (computingColumns) {
                                    minItemMeasure = intrinsicSizeCalculator.calcMinWidth(curItem.itemElement);
                                } else {
                                    minItemMeasure = intrinsicSizeCalculator.calcMinHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }

                                if (minItemMeasure.getRawMeasure() > curTrack.minMeasure.getRawMeasure()) {
                                    curTrack.minMeasure = minItemMeasure;
                                }
                            }
                            // Auto sized tracks may grow to their maximum length. Determine that length up front.
                            if (sizingAlternateFraction ||
                                    curSize === gridTrackValue.maxContent ||
                                    curSize === gridTrackValue.auto) {
                                if (computingColumns) {
                                    maxCellMeasure = intrinsicSizeCalculator.calcMaxWidth(curItem.itemElement);
                                } else {
                                    maxCellMeasure = intrinsicSizeCalculator.calcMaxHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }

                                if (maxCellMeasure.getRawMeasure() > curTrack.maxMeasure.getRawMeasure()) {
                                    curTrack.maxMeasure = maxCellMeasure;
                                }
                            }
                        }
                    }
                    /* Note: for content sized tracks, the layout engine may be using more than 1px precision.
                     * To ensure we match the layout engine's rounded result, we will get the actual track length
                     * and compare against our calculated length. If it is within 1px, we will assume that it is correct.
                     **/
                    // console.log( 'dealing with content-sized tracks now' );
                    switch (curSize) {
                    case gridTrackValue.maxContent:
                        actualMeasure = getActualTrackMeasure(curTrack.number, computingColumns);
                        //if (actualMeasure.equals(curTrack.maxMeasure) !== true) {
                            // Not an error; we will catch the problem later when we verify grid items.
                            // console.log( (computingColumns ? "Column" : "Row") + " " + curTrack.number + 
                            //             ": " + "max-content length difference detected; expected = " +
                            //             curTrack.maxMeasure.getPixelValueString() + ", actual = " +
                            //             actualMeasure.getPixelValueString() );
                        //}
                        curTrack.measure = curTrack.minMeasure = curTrack.maxMeasure;
                        break;
                    case gridTrackValue.minContent:
                        actualMeasure = getActualTrackMeasure(curTrack.number, computingColumns);
                        //if (actualMeasure.equals(curTrack.minMeasure) !== true) {
                            // Not an error; we will catch the problem later when we verify grid items.
                            // console.log( (computingColumns ? "Column" : "Row") + " " + curTrack.number + 
                            //              ": " + "min-content length difference detected; expected = " +
                            //              curTrack.minMeasure.getPixelValueString() + ", actual = " +
                            //              actualMeasure.getPixelValueString() );
                        //}
                        curTrack.measure = curTrack.maxMeasure = curTrack.minMeasure;
                        break;
                    case gridTrackValue.fitContent:
                    case gridTrackValue.auto:
                        // We can't determine at this point if we need to adjust 
                        // to the actual track length since sizing isn't complete.
                        curTrack.measure = curTrack.minMeasure;
                        break;
                    }
                }

                if (curTrack.sizingType === sizingTypeEnum.keyword &&
                        (curTrack.size === gridTrackValue.auto ||
                         curTrack.size === gridTrackValue.fitContent)) {
                    autoTracks.push(curTrack);
                }
                if (curTrack.sizingType === sizingTypeEnum.valueAndUnit) {
                    if (curTrack.size.unit === PX) {
                        curTrack.measure = curTrack.minMeasure = curTrack.maxMeasure = layoutMeasure.measureFromPx(curTrack.size.value);
                    } else if (curTrack.size.unit === FR) {
                        // 9.1.1.b/9.2.1.b: A column with a fraction-sized minimum length is assigned a 0px minimum.
                        curTrack.measure = layoutMeasure.zero();
                        fractionalTracks.push(curTrack);
                        // TODO: fractional tracks should go through the max calculation for 
                        // use with verifying a grid in infinite/unconstrained space.
                    } else {
                        // Track lengths are assumed to always be in pixels or fractions. Convert before going into this function.
                        error = true;
                        // console.log("track size not converted into px!");
                        // TODO: throw after we start doing conversions and don't want to ignore this anymore.
                    }
                }
                curTrack = iter.next();
            }

            // 9.1.2/9.2.2: All [columns|rows] not having a fraction-sized maximum are grown from
            // their minimum to their maximum specified size until available space is exhausted.
            sumOfTrackMeasures = getSumOfTrackMeasures(trackManager);
            remainingSpace = availableSpace.subtract(sumOfTrackMeasures);

            if (remainingSpace.getRawMeasure() > 0) {
                sortFunc = createBoundedWrapper(compareAutoTracksAvailableGrowth);
                autoTracks.sort(sortFunc);

                for (autoTrackIndex = 0, autoTrackLength = autoTracks.length; autoTrackIndex < autoTrackLength; autoTrackIndex += 1) {
                    if (remainingSpace.getRawMeasure() <= 0) {
                        break;
                    }
                    trackShareOfSpace = remainingSpace.divide(autoTracks.length - autoTrackIndex);

                    trackShareOfSpace = layoutMeasure
                                            .min(trackShareOfSpace, autoTracks[autoTrackIndex]
                                                                        .maxMeasure
                                                                        .subtract(autoTracks[autoTrackIndex].measure));
                    autoTracks[autoTrackIndex].measure = autoTracks[autoTrackIndex].measure.add(trackShareOfSpace);
                    remainingSpace = remainingSpace.subtract(trackShareOfSpace);
                }
            }

            /* 9.1.2.c/9.2.2.c: After all [columns|rows] (excluding those with a fractional maximum)
             * have grown to their maximum [width|height], consider any spanning elements that could
             * contribute to a content-based [column|row] [width|height] (minimum or maximum) and 
             * grow equally all [columns|rows] covered by the span until available space is exhausted.
             **/
            for (i = 0, iLen = spans.length; i < iLen && remainingSpace > 0; i += 1) {
                curSpanningItem = spans[i];
                firstTrack = (computingColumns ? curSpanningItem.column : curSpanningItem.row);
                numSpanned = (computingColumns ? curSpanningItem.columnSpan : curSpanningItem.rowSpan);

                /* 9.1.2.c.i/9.2.2.c.i. Spanning elements covering [columns|rows] with
                 * fraction-sized maximums are ignored as the fraction column "eats" all
                 * the space from the spanning element which could have caused growth 
                 * in [columns|rows] with a content-based size.
                 **/
                if (!trackManager.spanIsInFractionalTrack(firstTrack, numSpanned)) {
                    continue;
                }

                sumOfTrackMeasures = getSumOfSpannedTrackMeasures(trackManager, firstTrack, numSpanned);
                measureSpanCanGrow = (computingColumns === true ? curSpanningItem.maxWidthMeasure
                                                                 : curSpanningItem.maxHeightMeasure).subtract(sumOfTrackMeasures);

                if (measureSpanCanGrow.getRawMeasure() > 0) {
                    throw new Error('Not implemented');
                    // Redistribute among all content-sized tracks that this span is a member of.
                    //tracksToGrow = getContentBasedTracksThatSpanCrosses(trackManager, firstTrack, numSpanned);
                    //remainingSpace = redistributeSpace(tracksToGrow, remainingSpace, measureSpanCanGrow);
                }
            }

            // REMOVING AS IT SEEMS UNNECESSARY RIGHT NOW
            // remainingSpace = remainingSpace
            //                         .subtract( adjustForTrackLengthDifferences( autoTracks, computingColumns ) );

            /* 9.1.3/9.2.3: Fraction-sized [columns|rows] are grown 
             * from their minimum to their maximum [width|height] in 
             * accordance with their space distribution factor until 
             * available space is exhausted.
             **/
            if (fractionalTracks.length > 0 &&
                    (remainingSpace.getRawMeasure() > 0 ||
                     useAlternateFractionalSizing)) {
                //if (!useAlternateFractionalSizing || respectAvailableLength) {
                    // console.log("remaining space for fractional sizing = " + remainingSpace.getPixelValueString());
                //}
                sortFunc = createBoundedWrapper(compareFractionTracksNormalMeasure);
                fractionalTracks.sort(sortFunc);
                sumOfFractions = 0;
                for (i = 0, iLen = fractionalTracks.length; i < iLen; i += 1) {
                    sumOfFractions += fractionalTracks[i].size.value;
                }
                oneFractionMeasure = null;
                if (!useAlternateFractionalSizing) {
                    oneFractionMeasure = remainingSpace.divide(sumOfFractions);
                } else {
                    // In alternate fractional sizing, we determine the max "1fr"
                    // length based on the max-content size of the track.
                    oneFractionMeasure = determineMeasureOfOneFractionUnconstrained(fractionalTracks);
                }

                iLen = fractionalTracks.length;
                if (useAlternateFractionalSizing) {
                    if (respectAvailableLength) {
                        // Using alternate sizing but still need to stay within the remaining space.
                        // Adjust the one fraction length so that everything will fit.
                        totalMeasureToAdd = layoutMeasure.zero();
                        for (i = 0; i < iLen; i += 1) {
                            totalMeasureToAdd = totalMeasureToAdd.add(oneFractionMeasure.multiply(fractionalTracks[i].size.value));
                        }
                        if (totalMeasureToAdd.getRawMeasure() > 0 &&
                                remainingSpace.getRawMeasure() > 0 &&
                                totalMeasureToAdd.getRawMeasure() > remainingSpace.getRawMeasure()) {
                            oneFractionMeasure = oneFractionMeasure.multiply(remainingSpace.divide(totalMeasureToAdd.getRawMeasure()).getRawMeasure());
                        }
                    }
                    for (i = 0; i < iLen; i += 1) {
                        fractionalTracks[i].measure = fractionalTracks[i]
                                                        .measure
                                                        .add(oneFractionMeasure.multiply(fractionalTracks[i].size.value));
                    }
                } else if (iLen > 0) {
                    lastNormalizedFractionalMeasure = getNormalFractionMeasure(fractionalTracks[0]);
                    accumulatedFactors = 0;
                    accumulatedFactorsInDistributionSet = 0;
                    for (i = 0; i < iLen; i += 1) {
                        if (lastNormalizedFractionalMeasure.getRawMeasure() <
                                getNormalFractionMeasure(fractionalTracks[i]).getRawMeasure()) {
                            accumulatedFactorsInDistributionSet = accumulatedFactors;
                            normalizedDelta = getNormalFractionMeasure(fractionalTracks[i])
                                                .subtract(lastNormalizedFractionalMeasure);
                            for (j = 0; j < i; j += 1) {
                                spaceToDistribute = 0;
                                if (accumulatedFactorsInDistributionSet > 0) {
                                    spaceToDistribute = remainingSpace
                                                            .multiply(fractionalTracks[j].size.value)
                                                            .divide(accumulatedFactorsInDistributionSet);
                                    spaceToDistribute = layoutMeasure
                                                            .min(spaceToDistribute,
                                                                 normalizedDelta.multiply(fractionalTracks[j].size.value));
                                    spaceToDistribute = layoutMeasure.min(spaceToDistribute, fractionalTracks[j].maxMeasure);
                                }

                                fractionalTracks[j].measure = fractionalTracks[j].measure.add(spaceToDistribute);
                                remainingSpace -= spaceToDistribute;
                                accumulatedFactorsInDistributionSet -= fractionalTracks[j].size.value;
                            }
                            lastNormalizedFractionalMeasure = getNormalFractionMeasure(fractionalTracks[i]);
                        }
                        accumulatedFactors += fractionalTracks[i].size.value;
                        if (remainingSpace.getRawMeasure() <= 0) {
                            break;
                        }
                    }
                    // Once all fractional tracks are in the same group, do a final pass to distribute the remaining space.
                    accumulatedFactorsInDistributionSet = accumulatedFactors;
                    for (i = 0; i < iLen; i += 1) {
                        spaceToDistribute = 0;
                        if (accumulatedFactorsInDistributionSet > 0) {
                            spaceToDistribute = remainingSpace
                                                    .multiply(fractionalTracks[i].size.value / accumulatedFactorsInDistributionSet);
                            //    uncomment and scope to minmax functionality
                            //spaceToDistribute = layoutMeasure.min(spaceToDistribute, fractionalTracks[i].maxMeasure);
                        }
                        fractionalTracks[i].measure = fractionalTracks[i].measure.add(spaceToDistribute);
                        remainingSpace = remainingSpace.subtract(spaceToDistribute);
                        accumulatedFactorsInDistributionSet -= fractionalTracks[i].size.value;
                    }
                }
                // REMOVING AS IT SEEMS UNNECESSARY RIGHT NOW
                // remainingSpace = remainingSpace
                //                     .subtract( adjustForTrackLengthDifferences( fractionalTracks, computingColumns ) );
            }
            if (computingColumns) {
                // Save the used widths for each of the items so that it can be used during row size resolution.
                saveUsedCellWidths(trackManager);
            }
        }

        function calculateGridItemShrinkToFitSizes() {
            var i,
                iLen = items.length,
                curItem,
                columnsBreadth,
                rowsBreadth,
                swapWidthAndHeight,
                forcedWidth = null,
                forcedHeight = null;

            for (i = 0; i < iLen; i += 1) {
                curItem = items[i];
                if (curItem.shrinkToFitSize === null) {
                    // Percentage resolution is based on the size of the cell for the grid item.
                    columnsBreadth = getSumOfSpannedTrackMeasures(columnTrackManager, curItem.column, curItem.columnSpan);
                    rowsBreadth = getSumOfSpannedTrackMeasures(rowTrackManager, curItem.row, curItem.rowSpan);

                    // Force a stretch if requested.
                    if (curItem.position === positionEnum[STATIC] ||
                            curItem.position === positionEnum.relative) {
                        swapWidthAndHeight = shouldSwapWidthAndHeight();
                        if (curItem.columnAlign === gridAlignEnum.stretch) {
                            if (!swapWidthAndHeight) {
                                forcedWidth = columnsBreadth;
                            } else {
                                forcedHeight = columnsBreadth;
                            }
                        }
                        if (curItem.rowAlign === gridAlignEnum.stretch) {
                            if (!swapWidthAndHeight) {
                                forcedHeight = rowsBreadth;
                            } else {
                                forcedWidth = rowsBreadth;
                            }
                        }
                    }

                    // Only calculate an intrinsic size if we're not forcing both width and height.
                    if (forcedWidth === null ||
                            forcedHeight === null) {
                        curItem.shrinkToFitSize =
                            intrinsicSizeCalculator.calcShrinkToFitWidthAndHeight(
                                curItem.itemElement,
                                columnsBreadth,
                                rowsBreadth,
                                forcedWidth,
                                forcedHeight
                            );
                    } else {
                        curItem.shrinkToFitSize = widthAndHeight();
                    }

                    if (forcedWidth !== null) {
                        curItem.shrinkToFitSize.width = forcedWidth;
                    }

                    if (forcedHeight !== null) {
                        curItem.shrinkToFitSize.height = forcedHeight;
                    }
                }
            }
        }

        function determineBorderWidths() {
            var el = div.cloneNode(false),
                border = BORDER + HYPHEN + RIGHT,
                width,
                size;

            document.body.appendChild(el);
            el.style.width = '100px';
            width = parseInt(el.offsetWidth, 10);

            for (size in borderWidthsEnum) {
                if (borderWidthsEnum.hasOwnProperty(size)) {
                    el.style[border] = size + ' solid';
                    borderWidthsEnum[size] = parseInt(el.offsetWidth, 10) - width;
                }
            }

            document.body.removeChild(el);
        }

        function getPosition(item) {
            var col = item.column - 1,
                row = item.row - 1,
                pos = {
                    top: 0,
                    left: 0
                };

            pos.left = columnTrackManager.tracks.slice(0, col).reduce(function (acc, track) {
                return acc + track.measure.getRawMeasure();
            }, 0);

            pos.top = rowTrackManager.tracks.slice(0, row).reduce(function (acc, track) {
                return acc + track.measure.getRawMeasure();
            }, 0);

            /*
            for (col = item.column - 1; col > 0; col -= 1) {
                pos.left += columnTrackManager.tracks[col].measure.internalMeasure;
            }

            for (row = item.row - 1; row > 0; row -= 1) {
                pos.top += rowTrackManager.tracks[row].measure.internalMeasure;
            }
            */
            pos.left += PX;
            pos.top += PX;

            return pos;
        }

        function getDimensions(item) {
            var dimensions = item.shrinkToFitSize,
                element = item.itemElement,
                margins = {},
                padding = {},
                borders = {},
                sides = [TOP, RIGHT, BOTTOM, LEFT];

            dimensions = {
                height: dimensions.height.getRawMeasure(),
                width: dimensions.width.getRawMeasure()
            };

            sides.forEach(function (side) {
                margins[side] = layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + side);
                padding[side] = layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + side);
                borders[side] = layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + side + HYPHEN + WIDTH);
            });

            dimensions.height -= (margins.top.getRawMeasure() + margins.bottom.getRawMeasure() +
                                    padding.top.getRawMeasure() + padding.bottom.getRawMeasure() +
                                    borders.top.getRawMeasure() + borders.bottom.getRawMeasure());
            dimensions.width -= (margins.left.getRawMeasure() + margins.right.getRawMeasure() +
                                   padding.left.getRawMeasure() + padding.right.getRawMeasure() +
                                  borders.left.getRawMeasure() + borders.right.getRawMeasure());
            return dimensions;
        }

        function layout() {
            // console.log('laying out now');
            var styles = EMPTY,
                gridstyles = EMPTY,
                height = 0,
                width = 0,
                rows = rowTrackManager.tracks,
                cols = columnTrackManager.tracks;

            items.forEach(function (item) {
                var details = item.styles,
                    className = item.itemElement.className,
                    newclass = makeUniqueClass(),
                    re,
                    position,
                    dimensions;

                re = new RegExp(GRIDLAYOUT + '-\\d*\\s?', 'g');
                item.itemElement.className = className.replace(re, '');
                addClass(item.itemElement, newclass);
                position = getPosition(item);
                dimensions = getDimensions(item);

                styles += details.selector + PERIOD + newclass + OPEN_CURLY + POSITION + COLON + ABSOLUTE + SEMICOL;
                styles += TOP + COLON + position.top + SEMICOL;
                styles += LEFT + COLON + position.left + SEMICOL;
                styles += WIDTH + COLON + dimensions.width + PX + SEMICOL;
                styles += HEIGHT + COLON + dimensions.height + PX + SEMICOL;
                styles += CLOSE_CURLY;

                // position should be determined by styles in css, not by style attribute on the item
                item.itemElement.style.position = null;
            });

            if (getCssValue(gridElement, POSITION) === STATIC) {
                gridstyles += POSITION + COLON + RELATIVE + SEMICOL;
            }

            height = rows.reduce(function (acc, row) {
                return acc + row.measure.getRawMeasure();
            }, 0);

            gridstyles += HEIGHT + COLON + height + PX + SEMICOL;

            width = cols.reduce(function (acc, col) {
                return acc + col.measure.getRawMeasure();
            }, 0);

            gridstyles += WIDTH + COLON + width + PX + SEMICOL;

            styles += selector + OPEN_CURLY + gridstyles + CLOSE_CURLY;

            // console.log(styles);
            embedCss(styles, media, element.id);
        }

        function prepare() {
            clearEmbeddedCss(media, element.id);
        }

        function setup() {
            var gridCols = properties[GRIDCOLUMNS] || NONE,
                gridRows = properties[GRIDROWS] || NONE;

            // Get the available space for the grid since it is required
            // for determining track sizes for auto/fit-content/minmax 
            // and fractional tracks.
            determineGridAvailableSpace();

            // console.log( "Grid element content available space: columns = " + 
            //             availableSpaceForColumns.getPixelValueString() + "; rows = " +
            //             availableSpaceForRows.getPixelValueString() );

            propertyParser.parseGridTracksString(gridCols, columnTrackManager);
            propertyParser.parseGridTracksString(gridRows, rowTrackManager);

            mapGridItemsToTracks();
            saveItemPositioningTypes();

            determineTrackSizes(WIDTH);
            determineTrackSizes(HEIGHT);

            calculateGridItemShrinkToFitSizes();

            determineBorderWidths();

            //verifyGridItemSizes();
            //verifyGridItemPositions(gridObject);
        }

        function verifyGridItemLengths(verifyingColumnBreadths) {
            var trackManager = verifyingColumnBreadths ? columnTrackManager : rowTrackManager,
                verifyingPhysicalWidths = usePhysicalWidths(blockProgression, verifyingColumnBreadths),
                dimension = verifyingPhysicalWidths ? 'Width' : 'Height';


            // Uncomment if needed for debugging.
            //dumpTrackLengths(trackManager, GridTest.logger, GridTest.logger.logDebug);


            //if (verifyingColumnBreadths && !verifyingPhysicalWidths) {
                // console.log("Column breadths are heights due to block-progression value '" + blockProgressionEnum.keyword + "'");
            //} else if (!verifyingColumnBreadths && verifyingPhysicalWidths) {
                // console.log("Row breadths are widths due to block-progression value '" + blockProgressionEnum.keyword + "'");
            //}

            items.forEach(function (curItem) {
                var curItemElement = curItem.itemElement,
                    trackNum,
                    alignType,
                    actualMeasure,
                    itemId,
                    offsetLength,
                    offsetMeasure,
                    expectedMeasure,
                    firstTrack,
                    trackSpan;

                if ((verifyingColumnBreadths ? curItem.verified.columnBreadth : curItem.verified.rowBreadth) !== true) {
                    trackNum = verifyingColumnBreadths ? curItem.column : curItem.row;
                    alignType = verifyingColumnBreadths ? curItem.columnAlign : curItem.rowAlign;
                    // console.log(curItemElement.parentNode);
                    // console.log(getCssValue(curItemElement,WIDTH));
                    actualMeasure = boxSizeCalculator['calcMarginBox' + dimension](curItemElement);

                    itemId = EMPTY;
                    if (curItem.itemElement.id.length > 0) {
                        itemId = "[ID = " + curItem.itemElement.id + "] ";
                    }

                    // Check the offsetWidth/offsetHeight to make sure it agrees.
                    offsetLength = curItem.itemElement['offset' + dimension];
                    offsetMeasure = layoutMeasure.measureFromPx(offsetLength);
                    if (actualMeasure.getMeasureRoundedToWholePixel().equals(offsetMeasure) !== true) {
                        error = true;
                        // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + 
                        //             trackNum + ", item " + i + ": " +
                        //             "offset length doesn't agree with calculated margin box length (" +
                        //             ( verifyingPhysicalWidths ? "offsetWidth" : "offsetHeight" ) +
                        //             ": " + offsetMeasure.getPixelValueString() + "; expected (unrounded): " +
                        //             actualMeasure.getPixelValueString() );
                    }


                    if (curItem.position === positionEnum.absolute) {
                        // Use shrink-to-fit sizes.
                        if (curItem.shrinkToFitSize === null) {
                            throw new Error('Current item\'s shrink to fit size has not been calculated');
                        }
                        expectedMeasure = (verifyingPhysicalWidths ? curItem.shrinkToFitSize.width : curItem.shrinkToFitSize.height);
                    } else {
                        switch (alignType) {
                        case gridAlignEnum.stretch:
                            // Grid item's width/height should be equal to the lengths of the tracks it spans.
                            firstTrack = (verifyingColumnBreadths ? curItem.column : curItem.row);
                            trackSpan = (verifyingColumnBreadths ? curItem.columnSpan : curItem.rowSpan);
                            expectedMeasure = getSumOfSpannedTrackMeasures(trackManager, firstTrack, trackSpan);
                            break;
                        case gridAlignEnum.start:
                        case gridAlignEnum.end:
                        case gridAlignEnum.center:
                            // Item uses its shrink-to-fit size.
                            if (curItem.shrinkToFitSize === null) {
                                throw new Error('Current item\'s shrink to fit size has not been calculated');
                            }
                            // shrinkToFitSize is physical
                            expectedMeasure = (verifyingPhysicalWidths ? curItem.shrinkToFitSize.width
                                                                        : curItem.shrinkToFitSize.height);
                            break;
                        default:
                            throw new Error("Unknown grid align type " + alignType.keyword);
                        }
                    }

                    if (expectedMeasure.equals(actualMeasure) !== true) {
                        // If the agent is more precise than whole pixels, and we are off 
                        // by just one layout pixel (1/100th of a pixel for IE), it's close enough.
                        if (precision === 0 && Math.abs(expectedMeasure.subtract(actualMeasure).getRawMeasure()) !== 1) {
                            error = true;
                            // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                            //             "sizing check failed (alignment: " + alignType.keyword + "; expected: " +
                            //             expectedMeasure.getPixelValueString() + "; actual: " + 
                            //             actualMeasure.getPixelValueString() + ")" );
                        }
                        // else {
                            // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                            //             "sizing check passed after adjustment for fuzzy error checking (alignment: " + 
                            //             alignType.keyword + "; expected: " + expectedMeasure.getPixelValueString() + 
                            //             "; actual: " + actualMeasure.getPixelValueString() + ")" );
                        //} 
                    }
                    //} else {
                        // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                        //             "sizing check passed (alignment: " + alignType.keyword + "; expected: " +
                        //             expectedMeasure.getPixelValueString() + "; actual: " + actualMeasure.getPixelValueString() + ")" );
                    //}

                    if (verifyingColumnBreadths) {
                        curItem.verified.columnBreadth = true;
                    } else {
                        curItem.verified.rowBreadth = true;
                    }
                }
                //else {
                    // console.log( itemId + ": already verified " + (verifyingColumnBreadths ? "column" : "row") + " breadth" );
                //}
            });
        }

        /*
        function verifyGridItemSizes() {
            verifyGridItemLengths(true);
            verifyGridItemLengths(false);
        }
        */
        /*
        function verifyGridItemPositions(gridObject) {
            verifyGridItemTrackPositions(gridObject, true);
            verifyGridItemTrackPositions(gridObject, false);
        }*/

        prepare();
        setup();
        layout();

        return {
            verifyGridItemLengths: verifyGridItemLengths
        };
    };
});
/*global define, require, document, console, window, clearTimeout, setTimeout */
define('scalejs.layout-cssgrid/cssGridLayout',[
    'scalejs!core',
    './utils.sheetLoader',
    './gridLayout'
], function (
    core,
    utils,
    gridLayout
) {
    

    var cssGridRules,
        cssGridSelectors,
        layoutTimeoutId,
        listeners = [];

    function onLayoutDone(callback) {
        core.array.addOne(listeners, callback);

        return function () {
            core.array.removeOne(listeners, callback);
        };
    }

    function notifyLayoutDone(gridElement, selector) {
        listeners.forEach(function (l) {
            l(gridElement, selector);
        });
    }

    /*jslint unparam:true*/
    function doLayout(element) {
        cssGridSelectors.forEach(function (grid) {
            var selector = grid.selector,
                gridElement,
                properties = grid.properties,
                grid_items,
                gridStyle;

            gridElement = document.getElementById(grid.selector.substring(1));
            if (gridElement === null) { return; }

            gridStyle = gridElement.getAttribute("style");
            if (gridStyle !== null) {
                gridStyle.split('; ').forEach(function (property) {
                    var tokens = property.split(':'),
                        value;

                    if (tokens.length === 2) {
                        property = tokens[0].trim();
                        value = tokens[1].trim();

                        if (property.indexOf('-ms-grid') === 0) {
                            properties[property.substring(4)] = value;
                        }
                    }
                });
            }
            Object.keys(properties).forEach(function (key) {
                gridElement.setAttribute('data-ms-' + key, properties[key]);
            });

            grid_items = cssGridRules
                .filter(function (item) { return item !== grid; })
                .map(function (item) {
                    var grid_item = {},
                        style,
                        gridItemElement;

                    gridItemElement = document.getElementById(item.selector.substring(1));
                    if (gridItemElement === null || gridItemElement.parentNode !== gridElement) {
                        return;
                    }

                    grid_item.element = gridItemElement;
                    grid_item.details = item;

                    style = grid_item.element.getAttribute("style");
                    if (style !== null) {
                        style.split(';').forEach(function (property) {
                            var tokens = property.split(':'),
                                value;

                            if (tokens.length === 2) {
                                property = tokens[0].trim();
                                value = tokens[1].trim();

                                if (property.indexOf('-ms-grid') === 0) {
                                    grid_item.details.properties[property.substring(4)] = value;
                                }
                            }
                        });
                    }

                    Object.keys(grid_item.details.properties).forEach(function (key) {
                        grid_item.element.setAttribute('data-ms-' + key, grid_item.details.properties[key]);
                    });
                    return grid_item;
                })
                .filter(function (item) { return item; });

            //console.log(selector, properties, grid_items);

            gridLayout(gridElement, selector, properties, 'screen', grid_items);

            notifyLayoutDone(gridElement, selector);
        });
    }

    function layout() {
        clearTimeout(layoutTimeoutId);
        layoutTimeoutId = setTimeout(doLayout, 100);
    }

    function polyfill() {
        utils.loadAllStyleSheets(function (stylesheets) {
            //console.log('-->all stylesheets loaded', stylesheets);
            cssGridRules = Object.keys(stylesheets)
                .reduce(function (acc, url) {
                    var sheet = stylesheets[url];
                    return acc.concat(sheet.rulelist);
                }, [])
                .filter(function (rule) {
                    var declarations = rule.declarations;

                    if (rule.type !== 'style' || !declarations) { return false; }

                    return Object.keys(declarations).some(function (property) {
                        return property.indexOf('-ms-grid') === 0;
                    });
                })
                .map(function (rule) {
                    var e = {};

                    e.selector = rule.selector;
                    e.media = 'screen';
                    e.properties = {};
                    Object.keys(rule.declarations).forEach(function (property) {
                        var value = rule.declarations[property];
                        if (property.indexOf('-ms-grid') === 0) {
                            e.properties[property.substring(4)] = value;
                        } else if (property === 'display' && value === '-ms-grid') {
                            e.properties.display = 'grid';
                        } else {
                            e.properties[property] = value;
                        }
                    });

                    return e;
                });

            //console.log('css grid rule', gridRules);

            cssGridSelectors = cssGridRules.filter(function (rule) {
                return rule.properties.display === 'grid';
            });
            //console.log('css grids', grids);

            layout();

            window.addEventListener('resize', function () {
                layout();
            });
        });
    }

    return {
        polyfill: polyfill,
        layout: layout,
        onLayoutDone: onLayoutDone
    };
});

/*global define*/
define('scalejs.layout-cssgrid',[
    'scalejs!core',
    'CSS.supports',
    './scalejs.layout-cssgrid/cssGridLayout'
], function (
    core,
    css,
    cssGridLayout
) {
    

    //console.log('is -ms-grid supported? ' + (css.supports('display', '-ms-grid') || false));
    if (!css.supports('display', '-ms-grid')) {
        cssGridLayout.polyfill();
    }

    core.registerExtension({
        layout: {
            cssGrid: cssGridLayout
        }
    });
});


/*! Hammer.JS - v1.0.6dev - 2013-04-10
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2013 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window, undefined) {
    

/**
 * Hammer
 * use this to create instances
 * @param   {HTMLElement}   element
 * @param   {Object}        options
 * @returns {Hammer.Instance}
 * @constructor
 */
var Hammer = function(element, options) {
    return new Hammer.Instance(element, options || {});
};

// default settings
Hammer.defaults = {
    // add styles and attributes to the element to prevent the browser from doing
    // its native behavior. this doesnt prevent the scrolling, but cancels
    // the contextmenu, tap highlighting etc
    // set to false to disable this
    stop_browser_behavior: {
		// this also triggers onselectstart=false for IE
        userSelect: 'none',
		// this makes the element blocking in IE10 >, you could experiment with the value
		// see for more options this issue; https://github.com/EightMedia/hammer.js/issues/241
        touchAction: 'none',
		touchCallout: 'none',
        contentZooming: 'none',
        userDrag: 'none',
        tapHighlightColor: 'rgba(0,0,0,0)'
    }

    // more settings are defined per gesture at gestures.js
};

// detect touchevents
Hammer.HAS_POINTEREVENTS = navigator.pointerEnabled || navigator.msPointerEnabled;
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

// dont use mouseevents on mobile devices
Hammer.MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;
Hammer.NO_MOUSEEVENTS = Hammer.HAS_TOUCHEVENTS && navigator.userAgent.match(Hammer.MOBILE_REGEX);

// eventtypes per touchevent (start, move, end)
// are filled by Hammer.event.determineEventTypes on setup
Hammer.EVENT_TYPES = {};

// direction defines
Hammer.DIRECTION_DOWN = 'down';
Hammer.DIRECTION_LEFT = 'left';
Hammer.DIRECTION_UP = 'up';
Hammer.DIRECTION_RIGHT = 'right';

// pointer type
Hammer.POINTER_MOUSE = 'mouse';
Hammer.POINTER_TOUCH = 'touch';
Hammer.POINTER_PEN = 'pen';

// touch event defines
Hammer.EVENT_START = 'start';
Hammer.EVENT_MOVE = 'move';
Hammer.EVENT_END = 'end';

// hammer document where the base events are added at
Hammer.DOCUMENT = document;

// plugins namespace
Hammer.plugins = {};

// if the window events are set...
Hammer.READY = false;

/**
 * setup events to detect gestures on the document
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    // find what eventtypes we add listeners to
    Hammer.event.determineEventTypes();

    // Register all gestures inside Hammer.gestures
    for(var name in Hammer.gestures) {
        if(Hammer.gestures.hasOwnProperty(name)) {
            Hammer.detection.register(Hammer.gestures[name]);
        }
    }

    // Add touch events on the document
    Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_MOVE, Hammer.detection.detect);
    Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_END, Hammer.detection.detect);

    // Hammer is ready...!
    Hammer.READY = true;
}

/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}       element
 * @param   {Object}            [options={}]
 * @returns {Hammer.Instance}
 * @constructor
 */
Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;

    // start/stop detection option
    this.enabled = true;

    // merge options
    this.options = Hammer.utils.extend(
        Hammer.utils.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        Hammer.utils.stopDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.EVENT_START, function(ev) {
        if(self.enabled) {
            Hammer.detection.startDetect(self, ev);
        }
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * bind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {Hammer.Instance}
     */
    on: function onEvent(gesture, handler){
        var gestures = gesture.split(' ');
        for(var t=0; t<gestures.length; t++) {
            this.element.addEventListener(gestures[t], handler, false);
        }
        return this;
    },


    /**
     * unbind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {Hammer.Instance}
     */
    off: function offEvent(gesture, handler){
        var gestures = gesture.split(' ');
        for(var t=0; t<gestures.length; t++) {
            this.element.removeEventListener(gestures[t], handler, false);
        }
        return this;
    },


    /**
     * trigger gesture event
     * @param   {String}      gesture
     * @param   {Object}      eventData
     * @returns {Hammer.Instance}
     */
    trigger: function triggerEvent(gesture, eventData){
        // create DOM event
        var event = Hammer.DOCUMENT.createEvent('Event');
		event.initEvent(gesture, true, true);
		event.gesture = eventData;

        // trigger on the target if it is in the instance element,
        // this is for event delegation tricks
        var element = this.element;
        if(Hammer.utils.hasParent(eventData.target, element)) {
            element = eventData.target;
        }

        element.dispatchEvent(event);
        return this;
    },


    /**
     * enable of disable hammer.js detection
     * @param   {Boolean}   state
     * @returns {Hammer.Instance}
     */
    enable: function enable(state) {
        this.enabled = state;
        return this;
    }
};

/**
 * this holds the last move event,
 * used to fix empty touchend issue
 * see the onTouch event for an explanation
 * @type {Object}
 */
var last_move_event = null;


/**
 * when the mouse is hold down, this is true
 * @type {Boolean}
 */
var enable_detect = false;


/**
 * when touch events have been fired, this is true
 * @type {Boolean}
 */
var touch_triggered = false;


Hammer.event = {
    /**
     * simple addEventListener
     * @param   {HTMLElement}   element
     * @param   {String}        type
     * @param   {Function}      handler
     */
    bindDom: function(element, type, handler) {
        var types = type.split(' ');
        for(var t=0; t<types.length; t++) {
            element.addEventListener(types[t], handler, false);
        }
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Function}      handler
     */
    onTouch: function onTouch(element, eventType, handler) {
		var self = this;

        this.bindDom(element, Hammer.EVENT_TYPES[eventType], function bindDomOnTouch(ev) {
            var sourceEventType = ev.type.toLowerCase();

            // onmouseup, but when touchend has been fired we do nothing.
            // this is for touchdevices which also fire a mouseup on touchend
            if(sourceEventType.match(/mouse/) && touch_triggered) {
                return;
            }

            // mousebutton must be down or a touch event
            else if( sourceEventType.match(/touch/) ||   // touch events are always on screen
                sourceEventType.match(/pointerdown/) || // pointerevents touch
                (sourceEventType.match(/mouse/) && ev.which === 1)   // mouse is pressed
            ){
                enable_detect = true;
            }

            // mouse isn't pressed
            else if(sourceEventType.match(/mouse/) && ev.which !== 1) {
                enable_detect = false;
            }


            // we are in a touch event, set the touch triggered bool to true,
            // this for the conflicts that may occur on ios and android
            if(sourceEventType.match(/touch|pointer/)) {
                touch_triggered = true;
            }

            // count the total touches on the screen
            var count_touches = 0;

            // when touch has been triggered in this detection session
            // and we are now handling a mouse event, we stop that to prevent conflicts
            if(enable_detect) {
                // update pointerevent
                if(Hammer.HAS_POINTEREVENTS && eventType != Hammer.EVENT_END) {
                    count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                }
                // touch
                else if(sourceEventType.match(/touch/)) {
                    count_touches = ev.touches.length;
                }
                // mouse
                else if(!touch_triggered) {
                    count_touches = sourceEventType.match(/up/) ? 0 : 1;
                }

                // if we are in a end event, but when we remove one touch and
                // we still have enough, set eventType to move
                if(count_touches > 0 && eventType == Hammer.EVENT_END) {
                    eventType = Hammer.EVENT_MOVE;
                }
                // no touches, force the end event
                else if(!count_touches) {
                    eventType = Hammer.EVENT_END;
                }

                // because touchend has no touches, and we often want to use these in our gestures,
                // we send the last move event as our eventData in touchend
                if(!count_touches && last_move_event !== null) {
                    ev = last_move_event;
                }
                // store the last move event
                else {
                    last_move_event = ev;
                }

                // trigger the handler
                handler.call(Hammer.detection, self.collectEventData(element, eventType, ev));

                // remove pointerevent from list
                if(Hammer.HAS_POINTEREVENTS && eventType == Hammer.EVENT_END) {
                    count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                }
            }

            //debug(sourceEventType +" "+ eventType);

            // on the end we reset everything
            if(!count_touches) {
                last_move_event = null;
                enable_detect = false;
                touch_triggered = false;
                Hammer.PointerEvent.reset();
            }
        });
    },


    /**
     * we have different events for each device/browser
     * determine what we need and set them in the Hammer.EVENT_TYPES constant
     */
    determineEventTypes: function determineEventTypes() {
        // determine the eventtype we want to set
        var types;

        // pointerEvents magic
        if(Hammer.HAS_POINTEREVENTS) {
            types = Hammer.PointerEvent.getEvents();
        }
        // on Android, iOS, blackberry, windows mobile we dont want any mouseevents
        else if(Hammer.NO_MOUSEEVENTS) {
            types = [
                'touchstart',
                'touchmove',
                'touchend touchcancel'];
        }
        // for non pointer events browsers and mixed browsers,
        // like chrome on windows8 touch laptop
        else {
            types = [
                'touchstart mousedown',
                'touchmove mousemove',
                'touchend touchcancel mouseup'];
        }

        Hammer.EVENT_TYPES[Hammer.EVENT_START]  = types[0];
        Hammer.EVENT_TYPES[Hammer.EVENT_MOVE]   = types[1];
        Hammer.EVENT_TYPES[Hammer.EVENT_END]    = types[2];
    },


    /**
     * create touchlist depending on the event
     * @param   {Object}    ev
     * @param   {String}    eventType   used by the fakemultitouch plugin
     */
    getTouchList: function getTouchList(ev/*, eventType*/) {
        // get the fake pointerEvent touchlist
        if(Hammer.HAS_POINTEREVENTS) {
            return Hammer.PointerEvent.getTouchList();
        }
        // get the touchlist
        else if(ev.touches) {
            return ev.touches;
        }
        // make fake touchlist from mouse position
        else {
            return [{
                identifier: 1,
                pageX: ev.pageX,
                pageY: ev.pageY,
                target: ev.target
            }];
        }
    },


    /**
     * collect event data for Hammer js
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Object}        eventData
     */
    collectEventData: function collectEventData(element, eventType, ev) {
        var touches = this.getTouchList(ev, eventType);

        // find out pointerType
        var pointerType = Hammer.POINTER_TOUCH;
        if(ev.type.match(/mouse/) || Hammer.PointerEvent.matchType(Hammer.POINTER_MOUSE, ev)) {
            pointerType = Hammer.POINTER_MOUSE;
        }

        return {
            center      : Hammer.utils.getCenter(touches),
            timeStamp   : new Date().getTime(),
            target      : ev.target,
            touches     : touches,
            eventType   : eventType,
            pointerType : pointerType,
            srcEvent    : ev,

            /**
             * prevent the browser default actions
             * mostly used to disable scrolling of the browser
             */
            preventDefault: function() {
                if(this.srcEvent.preventManipulation) {
                    this.srcEvent.preventManipulation();
                }

                if(this.srcEvent.preventDefault) {
                    this.srcEvent.preventDefault();
                }
            },

            /**
             * stop bubbling the event up to its parents
             */
            stopPropagation: function() {
                this.srcEvent.stopPropagation();
            },

            /**
             * immediately stop gesture detection
             * might be useful after a swipe was detected
             * @return {*}
             */
            stopDetect: function() {
                return Hammer.detection.stopDetect();
            }
        };
    }
};

Hammer.PointerEvent = {
    /**
     * holds all pointers
     * @type {Object}
     */
    pointers: {},

    /**
     * get a list of pointers
     * @returns {Array}     touchlist
     */
    getTouchList: function() {
        var self = this;
        var touchlist = [];

        // we can use forEach since pointerEvents only is in IE10
        Object.keys(self.pointers).sort().forEach(function(id) {
            touchlist.push(self.pointers[id]);
        });
        return touchlist;
    },

    /**
     * update the position of a pointer
     * @param   {String}   type             Hammer.EVENT_END
     * @param   {Object}   pointerEvent
     */
    updatePointer: function(type, pointerEvent) {
        if(type == Hammer.EVENT_END) {
            this.pointers = {};
        }
        else {
            pointerEvent.identifier = pointerEvent.pointerId;
            this.pointers[pointerEvent.pointerId] = pointerEvent;
        }

        return Object.keys(this.pointers).length;
    },

    /**
     * check if ev matches pointertype
     * @param   {String}        pointerType     Hammer.POINTER_MOUSE
     * @param   {PointerEvent}  ev
     */
    matchType: function(pointerType, ev) {
        if(!ev.pointerType) {
            return false;
        }

        var types = {};
        types[Hammer.POINTER_MOUSE] = (ev.pointerType == ev.MSPOINTER_TYPE_MOUSE || ev.pointerType == Hammer.POINTER_MOUSE);
        types[Hammer.POINTER_TOUCH] = (ev.pointerType == ev.MSPOINTER_TYPE_TOUCH || ev.pointerType == Hammer.POINTER_TOUCH);
        types[Hammer.POINTER_PEN] = (ev.pointerType == ev.MSPOINTER_TYPE_PEN || ev.pointerType == Hammer.POINTER_PEN);
        return types[pointerType];
    },


    /**
     * get events
     */
    getEvents: function() {
        return [
            'pointerdown MSPointerDown',
            'pointermove MSPointerMove',
            'pointerup pointercancel MSPointerUp MSPointerCancel'
        ];
    },

    /**
     * reset the list
     */
    reset: function() {
        this.pointers = {};
    }
};


Hammer.utils = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
	 * @parm	{Boolean}	merge		do a merge
     * @returns {Object}    dest
     */
    extend: function extend(dest, src, merge) {
        for (var key in src) {
			if(dest[key] !== undefined && merge) {
				continue;
			}
            dest[key] = src[key];
        }
        return dest;
    },


    /**
     * find if a node is in the given parent
     * used for event delegation tricks
     * @param   {HTMLElement}   node
     * @param   {HTMLElement}   parent
     * @returns {boolean}       has_parent
     */
    hasParent: function(node, parent) {
        while(node){
            if(node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    },


    /**
     * get the center of all the touches
     * @param   {Array}     touches
     * @returns {Object}    center
     */
    getCenter: function getCenter(touches) {
        var valuesX = [], valuesY = [];

        for(var t= 0,len=touches.length; t<len; t++) {
            valuesX.push(touches[t].pageX);
            valuesY.push(touches[t].pageY);
        }

        return {
            pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
            pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
        };
    },


    /**
     * calculate the velocity between two points
     * @param   {Number}    delta_time
     * @param   {Number}    delta_x
     * @param   {Number}    delta_y
     * @returns {Object}    velocity
     */
    getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
        return {
            x: Math.abs(delta_x / delta_time) || 0,
            y: Math.abs(delta_y / delta_time) || 0
        };
    },


    /**
     * calculate the angle between two coordinates
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    angle
     */
    getAngle: function getAngle(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / Math.PI;
    },


    /**
     * angle to direction define
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {String}    direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
        var x = Math.abs(touch1.pageX - touch2.pageX),
            y = Math.abs(touch1.pageY - touch2.pageY);

        if(x >= y) {
            return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
        }
        else {
            return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
        }
    },


    /**
     * calculate the distance between two touches
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    distance
     */
    getDistance: function getDistance(touch1, touch2) {
        var x = touch2.pageX - touch1.pageX,
            y = touch2.pageY - touch1.pageY;
        return Math.sqrt((x*x) + (y*y));
    },


    /**
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    scale
     */
    getScale: function getScale(start, end) {
        // need two fingers...
        if(start.length >= 2 && end.length >= 2) {
            return this.getDistance(end[0], end[1]) /
                this.getDistance(start[0], start[1]);
        }
        return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    rotation
     */
    getRotation: function getRotation(start, end) {
        // need two fingers
        if(start.length >= 2 && end.length >= 2) {
            return this.getAngle(end[1], end[0]) -
                this.getAngle(start[1], start[0]);
        }
        return 0;
    },


    /**
     * boolean if the direction is vertical
     * @param    {String}    direction
     * @returns  {Boolean}   is_vertical
     */
    isVertical: function isVertical(direction) {
        return (direction == Hammer.DIRECTION_UP || direction == Hammer.DIRECTION_DOWN);
    },


    /**
     * stop browser default behavior with css props
     * @param   {HtmlElement}   element
     * @param   {Object}        css_props
     */
    stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_props) {
        var prop,
            vendors = ['webkit','khtml','moz','ms','o',''];

        if(!css_props || !element.style) {
            return;
        }

        // with css properties for modern browsers
        for(var i = 0; i < vendors.length; i++) {
            for(var p in css_props) {
                if(css_props.hasOwnProperty(p)) {
                    prop = p;

                    // vender prefix at the property
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }

                    // set the style
                    element.style[prop] = css_props[p];
                }
            }
        }

        // also the disable onselectstart
        if(css_props.userSelect == 'none') {
            element.onselectstart = function() {
                return false;
            };
        }
    }
};

Hammer.detection = {
    // contains all registred Hammer.gestures in the correct order
    gestures: [],

    // data of the current Hammer.gesture detection session
    current: null,

    // the previous Hammer.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,

    // when this becomes true, no gestures are fired
    stopped: false,


    /**
     * start Hammer.gesture detection
     * @param   {Hammer.Instance}   inst
     * @param   {Object}            eventData
     */
    startDetect: function startDetect(inst, eventData) {
        // already busy with a Hammer.gesture detection on an element
        if(this.current) {
            return;
        }

        this.stopped = false;

        this.current = {
            inst        : inst, // reference to HammerInstance we're working for
            startEvent  : Hammer.utils.extend({}, eventData), // start eventData for distances, timing etc
            lastEvent   : false, // last eventData
            name        : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        this.detect(eventData);
    },


    /**
     * Hammer.gesture detection
     * @param   {Object}    eventData
     * @param   {Object}    eventData
     */
    detect: function detect(eventData) {
        if(!this.current || this.stopped) {
            return;
        }

        // extend event data with calculations about scale, distance etc
        eventData = this.extendEventData(eventData);

        // instance options
        var inst_options = this.current.inst.options;

        // call Hammer.gesture handlers
        for(var g=0,len=this.gestures.length; g<len; g++) {
            var gesture = this.gestures[g];

            // only when the instance options have enabled this gesture
            if(!this.stopped && inst_options[gesture.name] !== false) {
                // if a handler returns false, we stop with the detection
                if(gesture.handler.call(gesture, eventData, this.current.inst) === false) {
                    this.stopDetect();
                    break;
                }
            }
        }

        // store as previous event event
        if(this.current) {
            this.current.lastEvent = eventData;
        }

        // endevent, but not the last touch, so dont stop
        if(eventData.eventType == Hammer.EVENT_END && !eventData.touches.length-1) {
            this.stopDetect();
        }

        return eventData;
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stopDetect: function stopDetect() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        this.previous = Hammer.utils.extend({}, this.current);

        // reset the current
        this.current = null;

        // stopped!
        this.stopped = true;
    },


    /**
     * extend eventData for Hammer.gestures
     * @param   {Object}   ev
     * @returns {Object}   ev
     */
    extendEventData: function extendEventData(ev) {
        var startEv = this.current.startEvent;

        // if the touches change, set the new touches over the startEvent touches
        // this because touchevents don't have all the touches on touchstart, or the
        // user must place his fingers at the EXACT same time on the screen, which is not realistic
        // but, sometimes it happens that both fingers are touching at the EXACT same time
        if(startEv && (ev.touches.length != startEv.touches.length || ev.touches === startEv.touches)) {
            // extend 1 level deep to get the touchlist with the touch objects
            startEv.touches = [];
            for(var i=0,len=ev.touches.length; i<len; i++) {
                startEv.touches.push(Hammer.utils.extend({}, ev.touches[i]));
            }
        }

        var delta_time = ev.timeStamp - startEv.timeStamp,
            delta_x = ev.center.pageX - startEv.center.pageX,
            delta_y = ev.center.pageY - startEv.center.pageY,
            velocity = Hammer.utils.getVelocity(delta_time, delta_x, delta_y);

        Hammer.utils.extend(ev, {
            deltaTime   : delta_time,

            deltaX      : delta_x,
            deltaY      : delta_y,

            velocityX   : velocity.x,
            velocityY   : velocity.y,

            distance    : Hammer.utils.getDistance(startEv.center, ev.center),
            angle       : Hammer.utils.getAngle(startEv.center, ev.center),
            direction   : Hammer.utils.getDirection(startEv.center, ev.center),

            scale       : Hammer.utils.getScale(startEv.touches, ev.touches),
            rotation    : Hammer.utils.getRotation(startEv.touches, ev.touches),

            startEvent  : startEv
        });

        return ev;
    },


    /**
     * register new gesture
     * @param   {Object}    gesture object, see gestures.js for documentation
     * @returns {Array}     gestures
     */
    register: function register(gesture) {
        // add an enable gesture options if there is no given
        var options = gesture.defaults || {};
        if(options[gesture.name] === undefined) {
            options[gesture.name] = true;
        }

        // extend Hammer default options with the Hammer.gesture options
        Hammer.utils.extend(Hammer.defaults, options, true);

        // set its index
        gesture.index = gesture.index || 1000;

        // add Hammer.gesture to the list
        this.gestures.push(gesture);

        // sort the list by index
        this.gestures.sort(function(a, b) {
            if (a.index < b.index) {
                return -1;
            }
            if (a.index > b.index) {
                return 1;
            }
            return 0;
        });

        return this.gestures;
    }
};


Hammer.gestures = Hammer.gestures || {};

/**
 * Custom gestures
 * ==============================
 *
 * Gesture object
 * --------------------
 * The object structure of a gesture:
 *
 * { name: 'mygesture',
 *   index: 1337,
 *   defaults: {
 *     mygesture_option: true
 *   }
 *   handler: function(type, ev, inst) {
 *     // trigger gesture event
 *     inst.trigger(this.name, ev);
 *   }
 * }

 * @param   {String}    name
 * this should be the name of the gesture, lowercase
 * it is also being used to disable/enable the gesture per instance config.
 *
 * @param   {Number}    [index=1000]
 * the index of the gesture, where it is going to be in the stack of gestures detection
 * like when you build an gesture that depends on the drag gesture, it is a good
 * idea to place it after the index of the drag gesture.
 *
 * @param   {Object}    [defaults={}]
 * the default settings of the gesture. these are added to the instance settings,
 * and can be overruled per instance. you can also add the name of the gesture,
 * but this is also added by default (and set to true).
 *
 * @param   {Function}  handler
 * this handles the gesture detection of your custom gesture and receives the
 * following arguments:
 *
 *      @param  {Object}    eventData
 *      event data containing the following properties:
 *          timeStamp   {Number}        time the event occurred
 *          target      {HTMLElement}   target element
 *          touches     {Array}         touches (fingers, pointers, mouse) on the screen
 *          pointerType {String}        kind of pointer that was used. matches Hammer.POINTER_MOUSE|TOUCH
 *          center      {Object}        center position of the touches. contains pageX and pageY
 *          deltaTime   {Number}        the total time of the touches in the screen
 *          deltaX      {Number}        the delta on x axis we haved moved
 *          deltaY      {Number}        the delta on y axis we haved moved
 *          velocityX   {Number}        the velocity on the x
 *          velocityY   {Number}        the velocity on y
 *          angle       {Number}        the angle we are moving
 *          direction   {String}        the direction we are moving. matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
 *          distance    {Number}        the distance we haved moved
 *          scale       {Number}        scaling of the touches, needs 2 touches
 *          rotation    {Number}        rotation of the touches, needs 2 touches *
 *          eventType   {String}        matches Hammer.EVENT_START|MOVE|END
 *          srcEvent    {Object}        the source event, like TouchStart or MouseDown *
 *          startEvent  {Object}        contains the same properties as above,
 *                                      but from the first touch. this is used to calculate
 *                                      distances, deltaTime, scaling etc
 *
 *      @param  {Hammer.Instance}    inst
 *      the instance we are doing the detection for. you can get the options from
 *      the inst.options object and trigger the gesture event by calling inst.trigger
 *
 *
 * Handle gestures
 * --------------------
 * inside the handler you can get/set Hammer.detection.current. This is the current
 * detection session. It has the following properties
 *      @param  {String}    name
 *      contains the name of the gesture we have detected. it has not a real function,
 *      only to check in other gestures if something is detected.
 *      like in the drag gesture we set it to 'drag' and in the swipe gesture we can
 *      check if the current gesture is 'drag' by accessing Hammer.detection.current.name
 *
 *      @readonly
 *      @param  {Hammer.Instance}    inst
 *      the instance we do the detection for
 *
 *      @readonly
 *      @param  {Object}    startEvent
 *      contains the properties of the first gesture detection in this session.
 *      Used for calculations about timing, distance, etc.
 *
 *      @readonly
 *      @param  {Object}    lastEvent
 *      contains all the properties of the last gesture detect in this session.
 *
 * after the gesture detection session has been completed (user has released the screen)
 * the Hammer.detection.current object is copied into Hammer.detection.previous,
 * this is usefull for gestures like doubletap, where you need to know if the
 * previous gesture was a tap
 *
 * options that have been set by the instance can be received by calling inst.options
 *
 * You can trigger a gesture event by calling inst.trigger("mygesture", event).
 * The first param is the name of your gesture, the second the event argument
 *
 *
 * Register gestures
 * --------------------
 * When an gesture is added to the Hammer.gestures object, it is auto registered
 * at the setup of the first Hammer instance. You can also call Hammer.detection.register
 * manually and pass your gesture object as a param
 *
 */

/**
 * Hold
 * Touch stays at the same place for x time
 * @events  hold
 */
Hammer.gestures.Hold = {
    name: 'hold',
    index: 10,
    defaults: {
        hold_timeout	: 500,
        hold_threshold	: 1
    },
    timer: null,
    handler: function holdGesture(ev, inst) {
        switch(ev.eventType) {
            case Hammer.EVENT_START:
                // clear any running timers
                clearTimeout(this.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.detection.current.name = this.name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                this.timer = setTimeout(function() {
                    if(Hammer.detection.current.name == 'hold') {
                        inst.trigger('hold', ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case Hammer.EVENT_MOVE:
                if(ev.distance > inst.options.hold_threshold) {
                    clearTimeout(this.timer);
                }
                break;

            case Hammer.EVENT_END:
                clearTimeout(this.timer);
                break;
        }
    }
};


/**
 * Tap/DoubleTap
 * Quick touch at a place or double at the same place
 * @events  tap, doubletap
 */
Hammer.gestures.Tap = {
    name: 'tap',
    index: 100,
    defaults: {
        tap_max_touchtime	: 250,
        tap_max_distance	: 10,
		tap_always			: true,
        doubletap_distance	: 20,
        doubletap_interval	: 300
    },
    handler: function tapGesture(ev, inst) {
        if(ev.eventType == Hammer.EVENT_END) {
            // previous gesture, for the double tap since these are two different gesture detections
            var prev = Hammer.detection.previous,
				did_doubletap = false;

            // when the touchtime is higher then the max touch time
            // or when the moving distance is too much
            if(ev.deltaTime > inst.options.tap_max_touchtime ||
                ev.distance > inst.options.tap_max_distance) {
                return;
            }

            // check if double tap
            if(prev && prev.name == 'tap' &&
                (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
                ev.distance < inst.options.doubletap_distance) {
				inst.trigger('doubletap', ev);
				did_doubletap = true;
            }

			// do a single tap
			if(!did_doubletap || inst.options.tap_always) {
				Hammer.detection.current.name = 'tap';
				inst.trigger(Hammer.detection.current.name, ev);
			}
        }
    }
};


/**
 * Swipe
 * triggers swipe events when the end velocity is above the threshold
 * @events  swipe, swipeleft, swiperight, swipeup, swipedown
 */
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 40,
    defaults: {
        // set 0 for unlimited, but this can conflict with transform
        swipe_max_touches  : 1,
        swipe_velocity     : 0.7
    },
    handler: function swipeGesture(ev, inst) {
        if(ev.eventType == Hammer.EVENT_END) {
            // max touches
            if(inst.options.swipe_max_touches > 0 &&
                ev.touches.length > inst.options.swipe_max_touches) {
                return;
            }

            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(ev.velocityX > inst.options.swipe_velocity ||
                ev.velocityY > inst.options.swipe_velocity) {
                // trigger swipe events
                inst.trigger(this.name, ev);
                inst.trigger(this.name + ev.direction, ev);
            }
        }
    }
};


/**
 * Drag
 * Move with x fingers (default 1) around on the page. Blocking the scrolling when
 * moving left and right is a good practice. When all the drag events are blocking
 * you disable scrolling on that area.
 * @events  drag, drapleft, dragright, dragup, dragdown
 */
Hammer.gestures.Drag = {
    name: 'drag',
    index: 50,
    defaults: {
        drag_min_distance : 10,
        // set 0 for unlimited, but this can conflict with transform
        drag_max_touches  : 1,
        // prevent default browser behavior when dragging occurs
        // be careful with it, it makes the element a blocking element
        // when you are using the drag gesture, it is a good practice to set this true
        drag_block_horizontal   : false,
        drag_block_vertical     : false,
        // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
        // It disallows vertical directions if the initial direction was horizontal, and vice versa.
        drag_lock_to_axis       : false,
        // drag lock only kicks in when distance > drag_lock_min_distance
        // This way, locking occurs only when the distance has become large enough to reliably determine the direction
        drag_lock_min_distance : 25
    },
    triggered: false,
    handler: function dragGesture(ev, inst) {
        // current gesture isnt drag, but dragged is true
        // this means an other gesture is busy. now call dragend
        if(Hammer.detection.current.name != this.name && this.triggered) {
            inst.trigger(this.name +'end', ev);
            this.triggered = false;
            return;
        }

        // max touches
        if(inst.options.drag_max_touches > 0 &&
            ev.touches.length > inst.options.drag_max_touches) {
            return;
        }

        switch(ev.eventType) {
            case Hammer.EVENT_START:
                this.triggered = false;
                break;

            case Hammer.EVENT_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(ev.distance < inst.options.drag_min_distance &&
                    Hammer.detection.current.name != this.name) {
                    return;
                }

                // we are dragging!
                Hammer.detection.current.name = this.name;

                // lock drag to axis?
                if(Hammer.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance<=ev.distance)) {
                    ev.drag_locked_to_axis = true;
                }
                var last_direction = Hammer.detection.current.lastEvent.direction;
                if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
                    // keep direction on the axis that the drag gesture started on
                    if(Hammer.utils.isVertical(last_direction)) {
                        ev.direction = (ev.deltaY < 0) ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
                    }
                    else {
                        ev.direction = (ev.deltaX < 0) ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
                    }
                }

                // first time, trigger dragstart event
                if(!this.triggered) {
                    inst.trigger(this.name +'start', ev);
                    this.triggered = true;
                }

                // trigger normal event
                inst.trigger(this.name, ev);

                // direction event, like dragdown
                inst.trigger(this.name + ev.direction, ev);

                // block the browser events
                if( (inst.options.drag_block_vertical && Hammer.utils.isVertical(ev.direction)) ||
                    (inst.options.drag_block_horizontal && !Hammer.utils.isVertical(ev.direction))) {
                    ev.preventDefault();
                }
                break;

            case Hammer.EVENT_END:
                // trigger dragend
                if(this.triggered) {
                    inst.trigger(this.name +'end', ev);
                }

                this.triggered = false;
                break;
        }
    }
};


/**
 * Transform
 * User want to scale or rotate with 2 fingers
 * @events  transform, pinch, pinchin, pinchout, rotate
 */
Hammer.gestures.Transform = {
    name: 'transform',
    index: 45,
    defaults: {
        // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
        transform_min_scale     : 0.01,
        // rotation in degrees
        transform_min_rotation  : 1,
        // prevent default browser behavior when two touches are on the screen
        // but it makes the element a blocking element
        // when you are using the transform gesture, it is a good practice to set this true
        transform_always_block  : false
    },
    triggered: false,
    handler: function transformGesture(ev, inst) {
        // current gesture isnt drag, but dragged is true
        // this means an other gesture is busy. now call dragend
        if(Hammer.detection.current.name != this.name && this.triggered) {
            inst.trigger(this.name +'end', ev);
            this.triggered = false;
            return;
        }

        // atleast multitouch
        if(ev.touches.length < 2) {
            return;
        }

        // prevent default when two fingers are on the screen
        if(inst.options.transform_always_block) {
            ev.preventDefault();
        }

        switch(ev.eventType) {
            case Hammer.EVENT_START:
                this.triggered = false;
                break;

            case Hammer.EVENT_MOVE:
                var scale_threshold = Math.abs(1-ev.scale);
                var rotation_threshold = Math.abs(ev.rotation);

                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(scale_threshold < inst.options.transform_min_scale &&
                    rotation_threshold < inst.options.transform_min_rotation) {
                    return;
                }

                // we are transforming!
                Hammer.detection.current.name = this.name;

                // first time, trigger dragstart event
                if(!this.triggered) {
                    inst.trigger(this.name +'start', ev);
                    this.triggered = true;
                }

                inst.trigger(this.name, ev); // basic transform event

                // trigger rotate event
                if(rotation_threshold > inst.options.transform_min_rotation) {
                    inst.trigger('rotate', ev);
                }

                // trigger pinch event
                if(scale_threshold > inst.options.transform_min_scale) {
                    inst.trigger('pinch', ev);
                    inst.trigger('pinch'+ ((ev.scale < 1) ? 'in' : 'out'), ev);
                }
                break;

            case Hammer.EVENT_END:
                // trigger dragend
                if(this.triggered) {
                    inst.trigger(this.name +'end', ev);
                }

                this.triggered = false;
                break;
        }
    }
};


/**
 * Touch
 * Called as first, tells the user has touched the screen
 * @events  touch
 */
Hammer.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    defaults: {
        // call preventDefault at touchstart, and makes the element blocking by
        // disabling the scrolling of the page, but it improves gestures like
        // transforming and dragging.
        // be careful with using this, it can be very annoying for users to be stuck
        // on the page
        prevent_default: false,

        // disable mouse events, so only touch (or pen!) input triggers events
        prevent_mouseevents: false
    },
    handler: function touchGesture(ev, inst) {
        if(inst.options.prevent_mouseevents && ev.pointerType == Hammer.POINTER_MOUSE) {
            ev.stopDetect();
            return;
        }

        if(inst.options.prevent_default) {
            ev.preventDefault();
        }

        if(ev.eventType ==  Hammer.EVENT_START) {
            inst.trigger(this.name, ev);
        }
    }
};


/**
 * Release
 * Called as last, tells the user has released the screen
 * @events  release
 */
Hammer.gestures.Release = {
    name: 'release',
    index: Infinity,
    handler: function releaseGesture(ev, inst) {
        if(ev.eventType ==  Hammer.EVENT_END) {
            inst.trigger(this.name, ev);
        }
    }
};

// node export
if(typeof module === 'object' && typeof module.exports === 'object'){
    module.exports = Hammer;
}
// just window export
else {
    window.Hammer = Hammer;

    // requireJS module definition
    if(typeof window.define === 'function' && window.define.amd) {
        window.define('hammer', [], function() {
            return Hammer;
        });
    }
}
})(this);
define("hammer", function(){});

// Knockout JavaScript library v2.3.0
// (c) Steven Sanderson - http://knockoutjs.com/
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function(){
var DEBUG=true;
(function(undefined){
    // (0, eval)('this') is a robust way of getting a reference to the global object
    // For details, see http://stackoverflow.com/questions/14119988/return-this-0-evalthis/14120023#14120023
    var window = this || (0, eval)('this'),
        document = window['document'],
        navigator = window['navigator'],
        jQuery = window["jQuery"],
        JSON = window["JSON"];
(function(factory) {
    // Support three module loading scenarios
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        // [1] CommonJS/Node.js
        var target = module['exports'] || exports; // module.exports is for Node.js
        factory(target);
    } else if (typeof define === 'function' && define['amd']) {
        // [2] AMD anonymous module
        define('knockout',['exports'], factory);
    } else {
        // [3] No module loader (plain <script> tag) - put directly in global namespace
        factory(window['ko'] = {});
    }
}(function(koExports){
// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
var ko = typeof koExports !== 'undefined' ? koExports : {};
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = function(koPath, object) {
	var tokens = koPath.split(".");

	// In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
	// At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
	var target = ko;

	for (var i = 0; i < tokens.length - 1; i++)
		target = target[tokens[i]];
	target[tokens[tokens.length - 1]] = object;
};
ko.exportProperty = function(owner, publicName, object) {
  owner[publicName] = object;
};
ko.version = "2.3.0";

ko.exportSymbol('version', ko.version);
ko.utils = (function () {
    var objectForEach = function(obj, action) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                action(prop, obj[prop]);
            }
        }
    };

    // Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
    var knownEvents = {}, knownEventTypesByEventName = {};
    var keyEventTypeName = (navigator && /Firefox\/2/i.test(navigator.userAgent)) ? 'KeyboardEvent' : 'UIEvents';
    knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];
    knownEvents['MouseEvents'] = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave'];
    objectForEach(knownEvents, function(eventType, knownEventsForType) {
        if (knownEventsForType.length) {
            for (var i = 0, j = knownEventsForType.length; i < j; i++)
                knownEventTypesByEventName[knownEventsForType[i]] = eventType;
        }
    });
    var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true }; // Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406

    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
    // Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
    // Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
    // If there is a future need to detect specific versions of IE10+, we will amend this.
    var ieVersion = document && (function() {
        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            iElems[0]
        ) {}
        return version > 4 ? version : undefined;
    }());
    var isIe6 = ieVersion === 6,
        isIe7 = ieVersion === 7;

    function isClickOnCheckableElement(element, eventType) {
        if ((ko.utils.tagNameLower(element) !== "input") || !element.type) return false;
        if (eventType.toLowerCase() != "click") return false;
        var inputType = element.type;
        return (inputType == "checkbox") || (inputType == "radio");
    }

    return {
        fieldsIncludedWithJsonPost: ['authenticity_token', /^__RequestVerificationToken(_.*)?$/],

        arrayForEach: function (array, action) {
            for (var i = 0, j = array.length; i < j; i++)
                action(array[i]);
        },

        arrayIndexOf: function (array, item) {
            if (typeof Array.prototype.indexOf == "function")
                return Array.prototype.indexOf.call(array, item);
            for (var i = 0, j = array.length; i < j; i++)
                if (array[i] === item)
                    return i;
            return -1;
        },

        arrayFirst: function (array, predicate, predicateOwner) {
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate.call(predicateOwner, array[i]))
                    return array[i];
            return null;
        },

        arrayRemoveItem: function (array, itemToRemove) {
            var index = ko.utils.arrayIndexOf(array, itemToRemove);
            if (index >= 0)
                array.splice(index, 1);
        },

        arrayGetDistinctValues: function (array) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(result, array[i]) < 0)
                    result.push(array[i]);
            }
            return result;
        },

        arrayMap: function (array, mapping) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                result.push(mapping(array[i]));
            return result;
        },

        arrayFilter: function (array, predicate) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate(array[i]))
                    result.push(array[i]);
            return result;
        },

        arrayPushAll: function (array, valuesToPush) {
            if (valuesToPush instanceof Array)
                array.push.apply(array, valuesToPush);
            else
                for (var i = 0, j = valuesToPush.length; i < j; i++)
                    array.push(valuesToPush[i]);
            return array;
        },

        addOrRemoveItem: function(array, value, included) {
            var existingEntryIndex = array.indexOf ? array.indexOf(value) : ko.utils.arrayIndexOf(array, value);
            if (existingEntryIndex < 0) {
                if (included)
                    array.push(value);
            } else {
                if (!included)
                    array.splice(existingEntryIndex, 1);
            }
        },

        extend: function (target, source) {
            if (source) {
                for(var prop in source) {
                    if(source.hasOwnProperty(prop)) {
                        target[prop] = source[prop];
                    }
                }
            }
            return target;
        },

        objectForEach: objectForEach,

        emptyDomNode: function (domNode) {
            while (domNode.firstChild) {
                ko.removeNode(domNode.firstChild);
            }
        },

        moveCleanedNodesToContainerElement: function(nodes) {
            // Ensure it's a real array, as we're about to reparent the nodes and
            // we don't want the underlying collection to change while we're doing that.
            var nodesArray = ko.utils.makeArray(nodes);

            var container = document.createElement('div');
            for (var i = 0, j = nodesArray.length; i < j; i++) {
                container.appendChild(ko.cleanNode(nodesArray[i]));
            }
            return container;
        },

        cloneNodes: function (nodesArray, shouldCleanNodes) {
            for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
                var clonedNode = nodesArray[i].cloneNode(true);
                newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
            }
            return newNodesArray;
        },

        setDomNodeChildren: function (domNode, childNodes) {
            ko.utils.emptyDomNode(domNode);
            if (childNodes) {
                for (var i = 0, j = childNodes.length; i < j; i++)
                    domNode.appendChild(childNodes[i]);
            }
        },

        replaceDomNodes: function (nodeToReplaceOrNodeArray, newNodesArray) {
            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
            if (nodesToReplaceArray.length > 0) {
                var insertionPoint = nodesToReplaceArray[0];
                var parent = insertionPoint.parentNode;
                for (var i = 0, j = newNodesArray.length; i < j; i++)
                    parent.insertBefore(newNodesArray[i], insertionPoint);
                for (var i = 0, j = nodesToReplaceArray.length; i < j; i++) {
                    ko.removeNode(nodesToReplaceArray[i]);
                }
            }
        },

        setOptionNodeSelectionState: function (optionNode, isSelected) {
            // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
            if (ieVersion < 7)
                optionNode.setAttribute("selected", isSelected);
            else
                optionNode.selected = isSelected;
        },

        stringTrim: function (string) {
            return string === null || string === undefined ? '' :
                string.trim ?
                    string.trim() :
                    string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        },

        stringTokenize: function (string, delimiter) {
            var result = [];
            var tokens = (string || "").split(delimiter);
            for (var i = 0, j = tokens.length; i < j; i++) {
                var trimmed = ko.utils.stringTrim(tokens[i]);
                if (trimmed !== "")
                    result.push(trimmed);
            }
            return result;
        },

        stringStartsWith: function (string, startsWith) {
            string = string || "";
            if (startsWith.length > string.length)
                return false;
            return string.substring(0, startsWith.length) === startsWith;
        },

        domNodeIsContainedBy: function (node, containedByNode) {
            if (containedByNode.compareDocumentPosition)
                return (containedByNode.compareDocumentPosition(node) & 16) == 16;
            while (node != null) {
                if (node == containedByNode)
                    return true;
                node = node.parentNode;
            }
            return false;
        },

        domNodeIsAttachedToDocument: function (node) {
            return ko.utils.domNodeIsContainedBy(node, node.ownerDocument);
        },

        anyDomNodeIsAttachedToDocument: function(nodes) {
            return !!ko.utils.arrayFirst(nodes, ko.utils.domNodeIsAttachedToDocument);
        },

        tagNameLower: function(element) {
            // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
            // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
            // we don't need to do the .toLowerCase() as it will always be lower case anyway.
            return element && element.tagName && element.tagName.toLowerCase();
        },

        registerEventHandler: function (element, eventType, handler) {
            var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
            if (!mustUseAttachEvent && typeof jQuery != "undefined") {
                if (isClickOnCheckableElement(element, eventType)) {
                    // For click events on checkboxes, jQuery interferes with the event handling in an awkward way:
                    // it toggles the element checked state *after* the click event handlers run, whereas native
                    // click events toggle the checked state *before* the event handler.
                    // Fix this by intecepting the handler and applying the correct checkedness before it runs.
                    var originalHandler = handler;
                    handler = function(event, eventData) {
                        var jQuerySuppliedCheckedState = this.checked;
                        if (eventData)
                            this.checked = eventData.checkedStateBeforeEvent !== true;
                        originalHandler.call(this, event);
                        this.checked = jQuerySuppliedCheckedState; // Restore the state jQuery applied
                    };
                }
                jQuery(element)['bind'](eventType, handler);
            } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
                element.addEventListener(eventType, handler, false);
            else if (typeof element.attachEvent != "undefined") {
                var attachEventHandler = function (event) { handler.call(element, event); },
                    attachEventName = "on" + eventType;
                element.attachEvent(attachEventName, attachEventHandler);

                // IE does not dispose attachEvent handlers automatically (unlike with addEventListener)
                // so to avoid leaks, we have to remove them manually. See bug #856
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    element.detachEvent(attachEventName, attachEventHandler);
                });
            } else
                throw new Error("Browser doesn't support addEventListener or attachEvent");
        },

        triggerEvent: function (element, eventType) {
            if (!(element && element.nodeType))
                throw new Error("element must be a DOM node when calling triggerEvent");

            if (typeof jQuery != "undefined") {
                var eventData = [];
                if (isClickOnCheckableElement(element, eventType)) {
                    // Work around the jQuery "click events on checkboxes" issue described above by storing the original checked state before triggering the handler
                    eventData.push({ checkedStateBeforeEvent: element.checked });
                }
                jQuery(element)['trigger'](eventType, eventData);
            } else if (typeof document.createEvent == "function") {
                if (typeof element.dispatchEvent == "function") {
                    var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
                    var event = document.createEvent(eventCategory);
                    event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
                    element.dispatchEvent(event);
                }
                else
                    throw new Error("The supplied element doesn't support dispatchEvent");
            } else if (typeof element.fireEvent != "undefined") {
                // Unlike other browsers, IE doesn't change the checked state of checkboxes/radiobuttons when you trigger their "click" event
                // so to make it consistent, we'll do it manually here
                if (isClickOnCheckableElement(element, eventType))
                    element.checked = element.checked !== true;
                element.fireEvent("on" + eventType);
            }
            else
                throw new Error("Browser doesn't support triggering events");
        },

        unwrapObservable: function (value) {
            return ko.isObservable(value) ? value() : value;
        },

        peekObservable: function (value) {
            return ko.isObservable(value) ? value.peek() : value;
        },

        toggleDomNodeCssClass: function (node, classNames, shouldHaveClass) {
            if (classNames) {
                var cssClassNameRegex = /\S+/g,
                    currentClassNames = node.className.match(cssClassNameRegex) || [];
                ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
                    ko.utils.addOrRemoveItem(currentClassNames, className, shouldHaveClass);
                });
                node.className = currentClassNames.join(" ");
            }
        },

        setTextContent: function(element, textContent) {
            var value = ko.utils.unwrapObservable(textContent);
            if ((value === null) || (value === undefined))
                value = "";

            // We need there to be exactly one child: a text node.
            // If there are no children, more than one, or if it's not a text node,
            // we'll clear everything and create a single text node.
            var innerTextNode = ko.virtualElements.firstChild(element);
            if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
                ko.virtualElements.setDomNodeChildren(element, [document.createTextNode(value)]);
            } else {
                innerTextNode.data = value;
            }

            ko.utils.forceRefresh(element);
        },

        setElementName: function(element, name) {
            element.name = name;

            // Workaround IE 6/7 issue
            // - https://github.com/SteveSanderson/knockout/issues/197
            // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
            if (ieVersion <= 7) {
                try {
                    element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
                }
                catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
            }
        },

        forceRefresh: function(node) {
            // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
            if (ieVersion >= 9) {
                // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
                var elem = node.nodeType == 1 ? node : node.parentNode;
                if (elem.style)
                    elem.style.zoom = elem.style.zoom;
            }
        },

        ensureSelectElementIsRenderedCorrectly: function(selectElement) {
            // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
            // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
            // Also fixes IE7 and IE8 bug that causes selects to be zero width if enclosed by 'if' or 'with'. (See issue #839)
            if (ieVersion) {
                var originalWidth = selectElement.style.width;
                selectElement.style.width = 0;
                selectElement.style.width = originalWidth;
            }
        },

        range: function (min, max) {
            min = ko.utils.unwrapObservable(min);
            max = ko.utils.unwrapObservable(max);
            var result = [];
            for (var i = min; i <= max; i++)
                result.push(i);
            return result;
        },

        makeArray: function(arrayLikeObject) {
            var result = [];
            for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
                result.push(arrayLikeObject[i]);
            };
            return result;
        },

        isIe6 : isIe6,
        isIe7 : isIe7,
        ieVersion : ieVersion,

        getFormFields: function(form, fieldName) {
            var fields = ko.utils.makeArray(form.getElementsByTagName("input")).concat(ko.utils.makeArray(form.getElementsByTagName("textarea")));
            var isMatchingField = (typeof fieldName == 'string')
                ? function(field) { return field.name === fieldName }
                : function(field) { return fieldName.test(field.name) }; // Treat fieldName as regex or object containing predicate
            var matches = [];
            for (var i = fields.length - 1; i >= 0; i--) {
                if (isMatchingField(fields[i]))
                    matches.push(fields[i]);
            };
            return matches;
        },

        parseJson: function (jsonString) {
            if (typeof jsonString == "string") {
                jsonString = ko.utils.stringTrim(jsonString);
                if (jsonString) {
                    if (JSON && JSON.parse) // Use native parsing where available
                        return JSON.parse(jsonString);
                    return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
                }
            }
            return null;
        },

        stringifyJson: function (data, replacer, space) {   // replacer and space are optional
            if (!JSON || !JSON.stringify)
                throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
            return JSON.stringify(ko.utils.unwrapObservable(data), replacer, space);
        },

        postJson: function (urlOrForm, data, options) {
            options = options || {};
            var params = options['params'] || {};
            var includeFields = options['includeFields'] || this.fieldsIncludedWithJsonPost;
            var url = urlOrForm;

            // If we were given a form, use its 'action' URL and pick out any requested field values
            if((typeof urlOrForm == 'object') && (ko.utils.tagNameLower(urlOrForm) === "form")) {
                var originalForm = urlOrForm;
                url = originalForm.action;
                for (var i = includeFields.length - 1; i >= 0; i--) {
                    var fields = ko.utils.getFormFields(originalForm, includeFields[i]);
                    for (var j = fields.length - 1; j >= 0; j--)
                        params[fields[j].name] = fields[j].value;
                }
            }

            data = ko.utils.unwrapObservable(data);
            var form = document.createElement("form");
            form.style.display = "none";
            form.action = url;
            form.method = "post";
            for (var key in data) {
                // Since 'data' this is a model object, we include all properties including those inherited from its prototype
                var input = document.createElement("input");
                input.name = key;
                input.value = ko.utils.stringifyJson(ko.utils.unwrapObservable(data[key]));
                form.appendChild(input);
            }
            objectForEach(params, function(key, value) {
                var input = document.createElement("input");
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            options['submitter'] ? options['submitter'](form) : form.submit();
            setTimeout(function () { form.parentNode.removeChild(form); }, 0);
        }
    }
}());

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
ko.exportSymbol('utils.arrayGetDistinctValues', ko.utils.arrayGetDistinctValues);
ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
ko.exportSymbol('utils.arrayMap', ko.utils.arrayMap);
ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
ko.exportSymbol('utils.extend', ko.utils.extend);
ko.exportSymbol('utils.fieldsIncludedWithJsonPost', ko.utils.fieldsIncludedWithJsonPost);
ko.exportSymbol('utils.getFormFields', ko.utils.getFormFields);
ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
ko.exportSymbol('utils.postJson', ko.utils.postJson);
ko.exportSymbol('utils.parseJson', ko.utils.parseJson);
ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
ko.exportSymbol('utils.range', ko.utils.range);
ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);
ko.exportSymbol('utils.objectForEach', ko.utils.objectForEach);
ko.exportSymbol('utils.addOrRemoveItem', ko.utils.addOrRemoveItem);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly

if (!Function.prototype['bind']) {
    // Function.prototype.bind is a standard part of ECMAScript 5th Edition (December 2009, http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf)
    // In case the browser doesn't implement it natively, provide a JavaScript implementation. This implementation is based on the one in prototype.js
    Function.prototype['bind'] = function (object) {
        var originalFunction = this, args = Array.prototype.slice.call(arguments), object = args.shift();
        return function () {
            return originalFunction.apply(object, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

ko.utils.domData = new (function () {
    var uniqueId = 0;
    var dataStoreKeyExpandoPropertyName = "__ko__" + (new Date).getTime();
    var dataStore = {};
    return {
        get: function (node, key) {
            var allDataForNode = ko.utils.domData.getAll(node, false);
            return allDataForNode === undefined ? undefined : allDataForNode[key];
        },
        set: function (node, key, value) {
            if (value === undefined) {
                // Make sure we don't actually create a new domData key if we are actually deleting a value
                if (ko.utils.domData.getAll(node, false) === undefined)
                    return;
            }
            var allDataForNode = ko.utils.domData.getAll(node, true);
            allDataForNode[key] = value;
        },
        getAll: function (node, createIfNotFound) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
            if (!hasExistingDataStore) {
                if (!createIfNotFound)
                    return undefined;
                dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
                dataStore[dataStoreKey] = {};
            }
            return dataStore[dataStoreKey];
        },
        clear: function (node) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            if (dataStoreKey) {
                delete dataStore[dataStoreKey];
                node[dataStoreKeyExpandoPropertyName] = null;
                return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
            }
            return false;
        }
    }
})();

ko.exportSymbol('utils.domData', ko.utils.domData);
ko.exportSymbol('utils.domData.clear', ko.utils.domData.clear); // Exporting only so specs can clear up after themselves fully

ko.utils.domNodeDisposal = new (function () {
    var domDataKey = "__ko_domNodeDisposal__" + (new Date).getTime();
    var cleanableNodeTypes = { 1: true, 8: true, 9: true };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: true, 9: true }; // Element, Document

    function getDisposeCallbacksCollection(node, createIfNotFound) {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if ((allDisposeCallbacks === undefined) && createIfNotFound) {
            allDisposeCallbacks = [];
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    }
    function destroyCallbacksCollection(node) {
        ko.utils.domData.set(node, domDataKey, undefined);
    }

    function cleanSingleNode(node) {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node, false);
        if (callbacks) {
            callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            for (var i = 0; i < callbacks.length; i++)
                callbacks[i](node);
        }

        // Also erase the DOM data
        ko.utils.domData.clear(node);

        // Special support for jQuery here because it's so commonly used.
        // Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
        // so notify it to tear down any resources associated with the node & descendants here.
        if ((typeof jQuery == "function") && (typeof jQuery['cleanData'] == "function"))
            jQuery['cleanData']([node]);

        // Also clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        if (cleanableNodeTypesWithDescendants[node.nodeType])
            cleanImmediateCommentTypeChildren(node);
    }

    function cleanImmediateCommentTypeChildren(nodeWithChildren) {
        var child, nextChild = nodeWithChildren.firstChild;
        while (child = nextChild) {
            nextChild = child.nextSibling;
            if (child.nodeType === 8)
                cleanSingleNode(child);
        }
    }

    return {
        addDisposeCallback : function(node, callback) {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, true).push(callback);
        },

        removeDisposeCallback : function(node, callback) {
            var callbacksCollection = getDisposeCallbacksCollection(node, false);
            if (callbacksCollection) {
                ko.utils.arrayRemoveItem(callbacksCollection, callback);
                if (callbacksCollection.length == 0)
                    destroyCallbacksCollection(node);
            }
        },

        cleanNode : function(node) {
            // First clean this node, where applicable
            if (cleanableNodeTypes[node.nodeType]) {
                cleanSingleNode(node);

                // ... then its descendants, where applicable
                if (cleanableNodeTypesWithDescendants[node.nodeType]) {
                    // Clone the descendants list in case it changes during iteration
                    var descendants = [];
                    ko.utils.arrayPushAll(descendants, node.getElementsByTagName("*"));
                    for (var i = 0, j = descendants.length; i < j; i++)
                        cleanSingleNode(descendants[i]);
                }
            }
            return node;
        },

        removeNode : function(node) {
            ko.cleanNode(node);
            if (node.parentNode)
                node.parentNode.removeChild(node);
        }
    }
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('cleanNode', ko.cleanNode);
ko.exportSymbol('removeNode', ko.removeNode);
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
ko.exportSymbol('utils.domNodeDisposal.removeDisposeCallback', ko.utils.domNodeDisposal.removeDisposeCallback);
(function () {
    var leadingCommentRegex = /^(\s*)<!--(.*?)-->/;

    function simpleHtmlParse(html) {
        // Based on jQuery's "clean" function, but only accounting for table-related elements.
        // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

        // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
        // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
        // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
        // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

        // Trim whitespace, otherwise indexOf won't work as expected
        var tags = ko.utils.stringTrim(html).toLowerCase(), div = document.createElement("div");

        // Finds the first match from the left column, and returns the corresponding "wrap" data from the right column
        var wrap = tags.match(/^<(thead|tbody|tfoot)/)              && [1, "<table>", "</table>"] ||
                   !tags.indexOf("<tr")                             && [2, "<table><tbody>", "</tbody></table>"] ||
                   (!tags.indexOf("<td") || !tags.indexOf("<th"))   && [3, "<table><tbody><tr>", "</tr></tbody></table>"] ||
                   /* anything else */                                 [0, "", ""];

        // Go to html and back, then peel off extra wrappers
        // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
        var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
        if (typeof window['innerShiv'] == "function") {
            div.appendChild(window['innerShiv'](markup));
        } else {
            div.innerHTML = markup;
        }

        // Move to the right depth
        while (wrap[0]--)
            div = div.lastChild;

        return ko.utils.makeArray(div.lastChild.childNodes);
    }

    function jQueryHtmlParse(html) {
        // jQuery's "parseHTML" function was introduced in jQuery 1.8.0 and is a documented public API.
        if (jQuery['parseHTML']) {
            return jQuery['parseHTML'](html) || []; // Ensure we always return an array and never null
        } else {
            // For jQuery < 1.8.0, we fall back on the undocumented internal "clean" function.
            var elems = jQuery['clean']([html]);

            // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
            // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
            // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
            if (elems && elems[0]) {
                // Find the top-most parent element that's a direct child of a document fragment
                var elem = elems[0];
                while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
                    elem = elem.parentNode;
                // ... then detach it
                if (elem.parentNode)
                    elem.parentNode.removeChild(elem);
            }

            return elems;
        }
    }

    ko.utils.parseHtmlFragment = function(html) {
        return typeof jQuery != 'undefined' ? jQueryHtmlParse(html)   // As below, benefit from jQuery's optimisations where possible
                                            : simpleHtmlParse(html);  // ... otherwise, this simple logic will do in most common cases.
    };

    ko.utils.setHtml = function(node, html) {
        ko.utils.emptyDomNode(node);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        html = ko.utils.unwrapObservable(html);

        if ((html !== null) && (html !== undefined)) {
            if (typeof html != 'string')
                html = html.toString();

            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
            // for example <tr> elements which are not normally allowed to exist on their own.
            // If you've referenced jQuery we'll use that rather than duplicating its code.
            if (typeof jQuery != 'undefined') {
                jQuery(node)['html'](html);
            } else {
                // ... otherwise, use KO's own parsing logic.
                var parsedNodes = ko.utils.parseHtmlFragment(html);
                for (var i = 0; i < parsedNodes.length; i++)
                    node.appendChild(parsedNodes[i]);
            }
        }
    };
})();

ko.exportSymbol('utils.parseHtmlFragment', ko.utils.parseHtmlFragment);
ko.exportSymbol('utils.setHtml', ko.utils.setHtml);

ko.memoization = (function () {
    var memos = {};

    function randomMax8HexChars() {
        return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
    }
    function generateRandomId() {
        return randomMax8HexChars() + randomMax8HexChars();
    }
    function findMemoNodes(rootNode, appendToArray) {
        if (!rootNode)
            return;
        if (rootNode.nodeType == 8) {
            var memoId = ko.memoization.parseMemoText(rootNode.nodeValue);
            if (memoId != null)
                appendToArray.push({ domNode: rootNode, memoId: memoId });
        } else if (rootNode.nodeType == 1) {
            for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
                findMemoNodes(childNodes[i], appendToArray);
        }
    }

    return {
        memoize: function (callback) {
            if (typeof callback != "function")
                throw new Error("You can only pass a function to ko.memoization.memoize()");
            var memoId = generateRandomId();
            memos[memoId] = callback;
            return "<!--[ko_memo:" + memoId + "]-->";
        },

        unmemoize: function (memoId, callbackParams) {
            var callback = memos[memoId];
            if (callback === undefined)
                throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
            try {
                callback.apply(null, callbackParams || []);
                return true;
            }
            finally { delete memos[memoId]; }
        },

        unmemoizeDomNodeAndDescendants: function (domNode, extraCallbackParamsArray) {
            var memos = [];
            findMemoNodes(domNode, memos);
            for (var i = 0, j = memos.length; i < j; i++) {
                var node = memos[i].domNode;
                var combinedParams = [node];
                if (extraCallbackParamsArray)
                    ko.utils.arrayPushAll(combinedParams, extraCallbackParamsArray);
                ko.memoization.unmemoize(memos[i].memoId, combinedParams);
                node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
                if (node.parentNode)
                    node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
            }
        },

        parseMemoText: function (memoText) {
            var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
            return match ? match[1] : null;
        }
    };
})();

ko.exportSymbol('memoization', ko.memoization);
ko.exportSymbol('memoization.memoize', ko.memoization.memoize);
ko.exportSymbol('memoization.unmemoize', ko.memoization.unmemoize);
ko.exportSymbol('memoization.parseMemoText', ko.memoization.parseMemoText);
ko.exportSymbol('memoization.unmemoizeDomNodeAndDescendants', ko.memoization.unmemoizeDomNodeAndDescendants);
ko.extenders = {
    'throttle': function(target, timeout) {
        // Throttling means two things:

        // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
        //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
        target['throttleEvaluation'] = timeout;

        // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
        //     so the target cannot change value synchronously or faster than a certain rate
        var writeTimeoutInstance = null;
        return ko.dependentObservable({
            'read': target,
            'write': function(value) {
                clearTimeout(writeTimeoutInstance);
                writeTimeoutInstance = setTimeout(function() {
                    target(value);
                }, timeout);
            }
        });
    },

    'notify': function(target, notifyWhen) {
        target["equalityComparer"] = notifyWhen == "always"
            ? function() { return false } // Treat all values as not equal
            : ko.observable["fn"]["equalityComparer"];
        return target;
    }
};

function applyExtenders(requestedExtenders) {
    var target = this;
    if (requestedExtenders) {
        ko.utils.objectForEach(requestedExtenders, function(key, value) {
            var extenderHandler = ko.extenders[key];
            if (typeof extenderHandler == 'function') {
                target = extenderHandler(target, value);
            }
        });
    }
    return target;
}

ko.exportSymbol('extenders', ko.extenders);

ko.subscription = function (target, callback, disposeCallback) {
    this.target = target;
    this.callback = callback;
    this.disposeCallback = disposeCallback;
    ko.exportProperty(this, 'dispose', this.dispose);
};
ko.subscription.prototype.dispose = function () {
    this.isDisposed = true;
    this.disposeCallback();
};

ko.subscribable = function () {
    this._subscriptions = {};

    ko.utils.extend(this, ko.subscribable['fn']);
    ko.exportProperty(this, 'subscribe', this.subscribe);
    ko.exportProperty(this, 'extend', this.extend);
    ko.exportProperty(this, 'getSubscriptionsCount', this.getSubscriptionsCount);
}

var defaultEvent = "change";

ko.subscribable['fn'] = {
    subscribe: function (callback, callbackTarget, event) {
        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new ko.subscription(this, boundCallback, function () {
            ko.utils.arrayRemoveItem(this._subscriptions[event], subscription);
        }.bind(this));

        if (!this._subscriptions[event])
            this._subscriptions[event] = [];
        this._subscriptions[event].push(subscription);
        return subscription;
    },

    "notifySubscribers": function (valueToNotify, event) {
        event = event || defaultEvent;
        if (this._subscriptions[event]) {
            ko.dependencyDetection.ignore(function() {
                ko.utils.arrayForEach(this._subscriptions[event].slice(0), function (subscription) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    if (subscription && (subscription.isDisposed !== true))
                        subscription.callback(valueToNotify);
                });
            }, this);
        }
    },

    getSubscriptionsCount: function () {
        var total = 0;
        ko.utils.objectForEach(this._subscriptions, function(eventName, subscriptions) {
            total += subscriptions.length;
        });
        return total;
    },

    extend: applyExtenders
};


ko.isSubscribable = function (instance) {
    return instance != null && typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
};

ko.exportSymbol('subscribable', ko.subscribable);
ko.exportSymbol('isSubscribable', ko.isSubscribable);

ko.dependencyDetection = (function () {
    var _frames = [];

    return {
        begin: function (callback) {
            _frames.push({ callback: callback, distinctDependencies:[] });
        },

        end: function () {
            _frames.pop();
        },

        registerDependency: function (subscribable) {
            if (!ko.isSubscribable(subscribable))
                throw new Error("Only subscribable things can act as dependencies");
            if (_frames.length > 0) {
                var topFrame = _frames[_frames.length - 1];
                if (!topFrame || ko.utils.arrayIndexOf(topFrame.distinctDependencies, subscribable) >= 0)
                    return;
                topFrame.distinctDependencies.push(subscribable);
                topFrame.callback(subscribable);
            }
        },

        ignore: function(callback, callbackTarget, callbackArgs) {
            try {
                _frames.push(null);
                return callback.apply(callbackTarget, callbackArgs || []);
            } finally {
                _frames.pop();
            }
        }
    };
})();
var primitiveTypes = { 'undefined':true, 'boolean':true, 'number':true, 'string':true };

ko.observable = function (initialValue) {
    var _latestValue = initialValue;

    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if ((!observable['equalityComparer']) || !observable['equalityComparer'](_latestValue, arguments[0])) {
                observable.valueWillMutate();
                _latestValue = arguments[0];
                if (DEBUG) observable._latestValue = _latestValue;
                observable.valueHasMutated();
            }
            return this; // Permits chained assignments
        }
        else {
            // Read
            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
            return _latestValue;
        }
    }
    if (DEBUG) observable._latestValue = _latestValue;
    ko.subscribable.call(observable);
    observable.peek = function() { return _latestValue };
    observable.valueHasMutated = function () { observable["notifySubscribers"](_latestValue); }
    observable.valueWillMutate = function () { observable["notifySubscribers"](_latestValue, "beforeChange"); }
    ko.utils.extend(observable, ko.observable['fn']);

    ko.exportProperty(observable, 'peek', observable.peek);
    ko.exportProperty(observable, "valueHasMutated", observable.valueHasMutated);
    ko.exportProperty(observable, "valueWillMutate", observable.valueWillMutate);

    return observable;
}

ko.observable['fn'] = {
    "equalityComparer": function valuesArePrimitiveAndEqual(a, b) {
        var oldValueIsPrimitive = (a === null) || (typeof(a) in primitiveTypes);
        return oldValueIsPrimitive ? (a === b) : false;
    }
};

var protoProperty = ko.observable.protoProperty = "__ko_proto__";
ko.observable['fn'][protoProperty] = ko.observable;

ko.hasPrototype = function(instance, prototype) {
    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
    if (instance[protoProperty] === prototype) return true;
    return ko.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
};

ko.isObservable = function (instance) {
    return ko.hasPrototype(instance, ko.observable);
}
ko.isWriteableObservable = function (instance) {
    // Observable
    if ((typeof instance == "function") && instance[protoProperty] === ko.observable)
        return true;
    // Writeable dependent observable
    if ((typeof instance == "function") && (instance[protoProperty] === ko.dependentObservable) && (instance.hasWriteFunction))
        return true;
    // Anything else
    return false;
}


ko.exportSymbol('observable', ko.observable);
ko.exportSymbol('isObservable', ko.isObservable);
ko.exportSymbol('isWriteableObservable', ko.isWriteableObservable);
ko.observableArray = function (initialValues) {
    initialValues = initialValues || [];

    if (typeof initialValues != 'object' || !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    var result = ko.observable(initialValues);
    ko.utils.extend(result, ko.observableArray['fn']);
    return result;
};

ko.observableArray['fn'] = {
    'remove': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var removedValues = [];
        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        for (var i = 0; i < underlyingArray.length; i++) {
            var value = underlyingArray[i];
            if (predicate(value)) {
                if (removedValues.length === 0) {
                    this.valueWillMutate();
                }
                removedValues.push(value);
                underlyingArray.splice(i, 1);
                i--;
            }
        }
        if (removedValues.length) {
            this.valueHasMutated();
        }
        return removedValues;
    },

    'removeAll': function (arrayOfValues) {
        // If you passed zero args, we remove everything
        if (arrayOfValues === undefined) {
            var underlyingArray = this.peek();
            var allValues = underlyingArray.slice(0);
            this.valueWillMutate();
            underlyingArray.splice(0, underlyingArray.length);
            this.valueHasMutated();
            return allValues;
        }
        // If you passed an arg, we interpret it as an array of entries to remove
        if (!arrayOfValues)
            return [];
        return this['remove'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'destroy': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        this.valueWillMutate();
        for (var i = underlyingArray.length - 1; i >= 0; i--) {
            var value = underlyingArray[i];
            if (predicate(value))
                underlyingArray[i]["_destroy"] = true;
        }
        this.valueHasMutated();
    },

    'destroyAll': function (arrayOfValues) {
        // If you passed zero args, we destroy everything
        if (arrayOfValues === undefined)
            return this['destroy'](function() { return true });

        // If you passed an arg, we interpret it as an array of entries to destroy
        if (!arrayOfValues)
            return [];
        return this['destroy'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'indexOf': function (item) {
        var underlyingArray = this();
        return ko.utils.arrayIndexOf(underlyingArray, item);
    },

    'replace': function(oldItem, newItem) {
        var index = this['indexOf'](oldItem);
        if (index >= 0) {
            this.valueWillMutate();
            this.peek()[index] = newItem;
            this.valueHasMutated();
        }
    }
};

// Populate ko.observableArray.fn with read/write functions from native arrays
// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
ko.utils.arrayForEach(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
        // (for consistency with mutating regular observables)
        var underlyingArray = this.peek();
        this.valueWillMutate();
        var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
        this.valueHasMutated();
        return methodCallResult;
    };
});

// Populate ko.observableArray.fn with read-only functions from native arrays
ko.utils.arrayForEach(["slice"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        var underlyingArray = this();
        return underlyingArray[methodName].apply(underlyingArray, arguments);
    };
});

ko.exportSymbol('observableArray', ko.observableArray);
ko.dependentObservable = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
    var _latestValue,
        _hasBeenEvaluated = false,
        _isBeingEvaluated = false,
        readFunction = evaluatorFunctionOrOptions;

    if (readFunction && typeof readFunction == "object") {
        // Single-parameter syntax - everything is on this "options" param
        options = readFunction;
        readFunction = options["read"];
    } else {
        // Multi-parameter syntax - construct the options according to the params passed
        options = options || {};
        if (!readFunction)
            readFunction = options["read"];
    }
    if (typeof readFunction != "function")
        throw new Error("Pass a function that returns the value of the ko.computed");

    function addSubscriptionToDependency(subscribable) {
        _subscriptionsToDependencies.push(subscribable.subscribe(evaluatePossiblyAsync));
    }

    function disposeAllSubscriptionsToDependencies() {
        ko.utils.arrayForEach(_subscriptionsToDependencies, function (subscription) {
            subscription.dispose();
        });
        _subscriptionsToDependencies = [];
    }

    function evaluatePossiblyAsync() {
        var throttleEvaluationTimeout = dependentObservable['throttleEvaluation'];
        if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
            clearTimeout(evaluationTimeoutInstance);
            evaluationTimeoutInstance = setTimeout(evaluateImmediate, throttleEvaluationTimeout);
        } else
            evaluateImmediate();
    }

    function evaluateImmediate() {
        if (_isBeingEvaluated) {
            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
            return;
        }

        // Don't dispose on first evaluation, because the "disposeWhen" callback might
        // e.g., dispose when the associated DOM element isn't in the doc, and it's not
        // going to be in the doc until *after* the first evaluation
        if (_hasBeenEvaluated && disposeWhen()) {
            dispose();
            return;
        }

        _isBeingEvaluated = true;
        try {
            // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
            // Then, during evaluation, we cross off any that are in fact still being used.
            var disposalCandidates = ko.utils.arrayMap(_subscriptionsToDependencies, function(item) {return item.target;});

            ko.dependencyDetection.begin(function(subscribable) {
                var inOld;
                if ((inOld = ko.utils.arrayIndexOf(disposalCandidates, subscribable)) >= 0)
                    disposalCandidates[inOld] = undefined; // Don't want to dispose this subscription, as it's still being used
                else
                    addSubscriptionToDependency(subscribable); // Brand new subscription - add it
            });

            var newValue = readFunction.call(evaluatorFunctionTarget);

            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
            for (var i = disposalCandidates.length - 1; i >= 0; i--) {
                if (disposalCandidates[i])
                    _subscriptionsToDependencies.splice(i, 1)[0].dispose();
            }
            _hasBeenEvaluated = true;

            dependentObservable["notifySubscribers"](_latestValue, "beforeChange");

            _latestValue = newValue;
            if (DEBUG) dependentObservable._latestValue = _latestValue;
            dependentObservable["notifySubscribers"](_latestValue);

        } finally {
            ko.dependencyDetection.end();
            _isBeingEvaluated = false;
        }

        if (!_subscriptionsToDependencies.length)
            dispose();
    }

    function dependentObservable() {
        if (arguments.length > 0) {
            if (typeof writeFunction === "function") {
                // Writing a value
                writeFunction.apply(evaluatorFunctionTarget, arguments);
            } else {
                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
            }
            return this; // Permits chained assignments
        } else {
            // Reading the value
            if (!_hasBeenEvaluated)
                evaluateImmediate();
            ko.dependencyDetection.registerDependency(dependentObservable);
            return _latestValue;
        }
    }

    function peek() {
        if (!_hasBeenEvaluated)
            evaluateImmediate();
        return _latestValue;
    }

    function isActive() {
        return !_hasBeenEvaluated || _subscriptionsToDependencies.length > 0;
    }

    // By here, "options" is always non-null
    var writeFunction = options["write"],
        disposeWhenNodeIsRemoved = options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
        disposeWhen = options["disposeWhen"] || options.disposeWhen || function() { return false; },
        dispose = disposeAllSubscriptionsToDependencies,
        _subscriptionsToDependencies = [],
        evaluationTimeoutInstance = null;

    if (!evaluatorFunctionTarget)
        evaluatorFunctionTarget = options["owner"];

    dependentObservable.peek = peek;
    dependentObservable.getDependenciesCount = function () { return _subscriptionsToDependencies.length; };
    dependentObservable.hasWriteFunction = typeof options["write"] === "function";
    dependentObservable.dispose = function () { dispose(); };
    dependentObservable.isActive = isActive;

    ko.subscribable.call(dependentObservable);
    ko.utils.extend(dependentObservable, ko.dependentObservable['fn']);

    ko.exportProperty(dependentObservable, 'peek', dependentObservable.peek);
    ko.exportProperty(dependentObservable, 'dispose', dependentObservable.dispose);
    ko.exportProperty(dependentObservable, 'isActive', dependentObservable.isActive);
    ko.exportProperty(dependentObservable, 'getDependenciesCount', dependentObservable.getDependenciesCount);

    // Evaluate, unless deferEvaluation is true
    if (options['deferEvaluation'] !== true)
        evaluateImmediate();

    // Build "disposeWhenNodeIsRemoved" and "disposeWhenNodeIsRemovedCallback" option values.
    // But skip if isActive is false (there will never be any dependencies to dispose).
    // (Note: "disposeWhenNodeIsRemoved" option both proactively disposes as soon as the node is removed using ko.removeNode(),
    // plus adds a "disposeWhen" callback that, on each evaluation, disposes if the node was removed by some other means.)
    if (disposeWhenNodeIsRemoved && isActive()) {
        dispose = function() {
            ko.utils.domNodeDisposal.removeDisposeCallback(disposeWhenNodeIsRemoved, dispose);
            disposeAllSubscriptionsToDependencies();
        };
        ko.utils.domNodeDisposal.addDisposeCallback(disposeWhenNodeIsRemoved, dispose);
        var existingDisposeWhenFunction = disposeWhen;
        disposeWhen = function () {
            return !ko.utils.domNodeIsAttachedToDocument(disposeWhenNodeIsRemoved) || existingDisposeWhenFunction();
        }
    }

    return dependentObservable;
};

ko.isComputed = function(instance) {
    return ko.hasPrototype(instance, ko.dependentObservable);
};

var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
ko.dependentObservable[protoProp] = ko.observable;

ko.dependentObservable['fn'] = {};
ko.dependentObservable['fn'][protoProp] = ko.dependentObservable;

ko.exportSymbol('dependentObservable', ko.dependentObservable);
ko.exportSymbol('computed', ko.dependentObservable); // Make "ko.computed" an alias for "ko.dependentObservable"
ko.exportSymbol('isComputed', ko.isComputed);

(function() {
    var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

    ko.toJS = function(rootObject) {
        if (arguments.length == 0)
            throw new Error("When calling ko.toJS, pass the object you want to convert.");

        // We just unwrap everything at every level in the object graph
        return mapJsObjectGraph(rootObject, function(valueToMap) {
            // Loop because an observable's value might in turn be another observable wrapper
            for (var i = 0; ko.isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
                valueToMap = valueToMap();
            return valueToMap;
        });
    };

    ko.toJSON = function(rootObject, replacer, space) {     // replacer and space are optional
        var plainJavaScriptObject = ko.toJS(rootObject);
        return ko.utils.stringifyJson(plainJavaScriptObject, replacer, space);
    };

    function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
        visitedObjects = visitedObjects || new objectLookup();

        rootObject = mapInputCallback(rootObject);
        var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof Date)) && (!(rootObject instanceof String)) && (!(rootObject instanceof Number)) && (!(rootObject instanceof Boolean));
        if (!canHaveProperties)
            return rootObject;

        var outputProperties = rootObject instanceof Array ? [] : {};
        visitedObjects.save(rootObject, outputProperties);

        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
            var propertyValue = mapInputCallback(rootObject[indexer]);

            switch (typeof propertyValue) {
                case "boolean":
                case "number":
                case "string":
                case "function":
                    outputProperties[indexer] = propertyValue;
                    break;
                case "object":
                case "undefined":
                    var previouslyMappedValue = visitedObjects.get(propertyValue);
                    outputProperties[indexer] = (previouslyMappedValue !== undefined)
                        ? previouslyMappedValue
                        : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
                    break;
            }
        });

        return outputProperties;
    }

    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
        if (rootObject instanceof Array) {
            for (var i = 0; i < rootObject.length; i++)
                visitorCallback(i);

            // For arrays, also respect toJSON property for custom mappings (fixes #278)
            if (typeof rootObject['toJSON'] == 'function')
                visitorCallback('toJSON');
        } else {
            for (var propertyName in rootObject) {
                visitorCallback(propertyName);
            }
        }
    };

    function objectLookup() {
        this.keys = [];
        this.values = [];
    };

    objectLookup.prototype = {
        constructor: objectLookup,
        save: function(key, value) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            if (existingIndex >= 0)
                this.values[existingIndex] = value;
            else {
                this.keys.push(key);
                this.values.push(value);
            }
        },
        get: function(key) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            return (existingIndex >= 0) ? this.values[existingIndex] : undefined;
        }
    };
})();

ko.exportSymbol('toJS', ko.toJS);
ko.exportSymbol('toJSON', ko.toJSON);
(function () {
    var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

    // Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
    // are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
    // that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
    ko.selectExtensions = {
        readValue : function(element) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    if (element[hasDomDataExpandoProperty] === true)
                        return ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey);
                    return ko.utils.ieVersion <= 7
                        ? (element.getAttributeNode('value') && element.getAttributeNode('value').specified ? element.value : element.text)
                        : element.value;
                case 'select':
                    return element.selectedIndex >= 0 ? ko.selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
                default:
                    return element.value;
            }
        },

        writeValue: function(element, value) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    switch(typeof value) {
                        case "string":
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                            if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
                                delete element[hasDomDataExpandoProperty];
                            }
                            element.value = value;
                            break;
                        default:
                            // Store arbitrary object using DomData
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                            element[hasDomDataExpandoProperty] = true;

                            // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                            element.value = typeof value === "number" ? value : "";
                            break;
                    }
                    break;
                case 'select':
                    if (value === "")
                        value = undefined;
                    if (value === null || value === undefined)
                        element.selectedIndex = -1;
                    for (var i = element.options.length - 1; i >= 0; i--) {
                        if (ko.selectExtensions.readValue(element.options[i]) == value) {
                            element.selectedIndex = i;
                            break;
                        }
                    }
                    // for drop-down select, ensure first is selected
                    if (!(element.size > 1) && element.selectedIndex === -1) {
                        element.selectedIndex = 0;
                    }
                    break;
                default:
                    if ((value === null) || (value === undefined))
                        value = "";
                    element.value = value;
                    break;
            }
        }
    };
})();

ko.exportSymbol('selectExtensions', ko.selectExtensions);
ko.exportSymbol('selectExtensions.readValue', ko.selectExtensions.readValue);
ko.exportSymbol('selectExtensions.writeValue', ko.selectExtensions.writeValue);
ko.expressionRewriting = (function () {
    var restoreCapturedTokensRegex = /\@ko_token_(\d+)\@/g;
    var javaScriptReservedWords = ["true", "false", "null", "undefined"];

    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
    var javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i;

    function restoreTokens(string, tokens) {
        var prevValue = null;
        while (string != prevValue) { // Keep restoring tokens until it no longer makes a difference (they may be nested)
            prevValue = string;
            string = string.replace(restoreCapturedTokensRegex, function (match, tokenIndex) {
                return tokens[tokenIndex];
            });
        }
        return string;
    }

    function getWriteableValue(expression) {
        if (ko.utils.arrayIndexOf(javaScriptReservedWords, ko.utils.stringTrim(expression).toLowerCase()) >= 0)
            return false;
        var match = expression.match(javaScriptAssignmentTarget);
        return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
    }

    function ensureQuoted(key) {
        var trimmedKey = ko.utils.stringTrim(key);
        switch (trimmedKey.length && trimmedKey.charAt(0)) {
            case "'":
            case '"':
                return key;
            default:
                return "'" + trimmedKey + "'";
        }
    }

    return {
        bindingRewriteValidators: [],

        parseObjectLiteral: function(objectLiteralString) {
            // A full tokeniser+lexer would add too much weight to this library, so here's a simple parser
            // that is sufficient just to split an object literal string into a set of top-level key-value pairs

            var str = ko.utils.stringTrim(objectLiteralString);
            if (str.length < 3)
                return [];
            if (str.charAt(0) === "{")// Ignore any braces surrounding the whole object literal
                str = str.substring(1, str.length - 1);

            // Pull out any string literals and regex literals
            var tokens = [];
            var tokenStart = null, tokenEndChar;
            for (var position = 0; position < str.length; position++) {
                var c = str.charAt(position);
                if (tokenStart === null) {
                    switch (c) {
                        case '"':
                        case "'":
                        case "/":
                            tokenStart = position;
                            tokenEndChar = c;
                            break;
                    }
                } else if ((c == tokenEndChar) && (str.charAt(position - 1) !== "\\")) {
                    var token = str.substring(tokenStart, position + 1);
                    tokens.push(token);
                    var replacement = "@ko_token_" + (tokens.length - 1) + "@";
                    str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
                    position -= (token.length - replacement.length);
                    tokenStart = null;
                }
            }

            // Next pull out balanced paren, brace, and bracket blocks
            tokenStart = null;
            tokenEndChar = null;
            var tokenDepth = 0, tokenStartChar = null;
            for (var position = 0; position < str.length; position++) {
                var c = str.charAt(position);
                if (tokenStart === null) {
                    switch (c) {
                        case "{": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = "}";
                                  break;
                        case "(": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = ")";
                                  break;
                        case "[": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = "]";
                                  break;
                    }
                }

                if (c === tokenStartChar)
                    tokenDepth++;
                else if (c === tokenEndChar) {
                    tokenDepth--;
                    if (tokenDepth === 0) {
                        var token = str.substring(tokenStart, position + 1);
                        tokens.push(token);
                        var replacement = "@ko_token_" + (tokens.length - 1) + "@";
                        str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
                        position -= (token.length - replacement.length);
                        tokenStart = null;
                    }
                }
            }

            // Now we can safely split on commas to get the key/value pairs
            var result = [];
            var keyValuePairs = str.split(",");
            for (var i = 0, j = keyValuePairs.length; i < j; i++) {
                var pair = keyValuePairs[i];
                var colonPos = pair.indexOf(":");
                if ((colonPos > 0) && (colonPos < pair.length - 1)) {
                    var key = pair.substring(0, colonPos);
                    var value = pair.substring(colonPos + 1);
                    result.push({ 'key': restoreTokens(key, tokens), 'value': restoreTokens(value, tokens) });
                } else {
                    result.push({ 'unknown': restoreTokens(pair, tokens) });
                }
            }
            return result;
        },

        preProcessBindings: function (objectLiteralStringOrKeyValueArray) {
            var keyValueArray = typeof objectLiteralStringOrKeyValueArray === "string"
                ? ko.expressionRewriting.parseObjectLiteral(objectLiteralStringOrKeyValueArray)
                : objectLiteralStringOrKeyValueArray;
            var resultStrings = [], propertyAccessorResultStrings = [];

            var keyValueEntry;
            for (var i = 0; keyValueEntry = keyValueArray[i]; i++) {
                if (resultStrings.length > 0)
                    resultStrings.push(",");

                if (keyValueEntry['key']) {
                    var quotedKey = ensureQuoted(keyValueEntry['key']), val = keyValueEntry['value'];
                    resultStrings.push(quotedKey);
                    resultStrings.push(":");
                    resultStrings.push(val);

                    if (val = getWriteableValue(ko.utils.stringTrim(val))) {
                        if (propertyAccessorResultStrings.length > 0)
                            propertyAccessorResultStrings.push(", ");
                        propertyAccessorResultStrings.push(quotedKey + " : function(__ko_value) { " + val + " = __ko_value; }");
                    }
                } else if (keyValueEntry['unknown']) {
                    resultStrings.push(keyValueEntry['unknown']);
                }
            }

            var combinedResult = resultStrings.join("");
            if (propertyAccessorResultStrings.length > 0) {
                var allPropertyAccessors = propertyAccessorResultStrings.join("");
                combinedResult = combinedResult + ", '_ko_property_writers' : { " + allPropertyAccessors + " } ";
            }

            return combinedResult;
        },

        keyValueArrayContainsKey: function(keyValueArray, key) {
            for (var i = 0; i < keyValueArray.length; i++)
                if (ko.utils.stringTrim(keyValueArray[i]['key']) == key)
                    return true;
            return false;
        },

        // Internal, private KO utility for updating model properties from within bindings
        // property:            If the property being updated is (or might be) an observable, pass it here
        //                      If it turns out to be a writable observable, it will be written to directly
        // allBindingsAccessor: All bindings in the current execution context.
        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
        // value:               The value to be written
        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
        //                      it is !== existing value on that writable observable
        writeValueToProperty: function(property, allBindingsAccessor, key, value, checkIfDifferent) {
            if (!property || !ko.isObservable(property)) {
                var propWriters = allBindingsAccessor()['_ko_property_writers'];
                if (propWriters && propWriters[key])
                    propWriters[key](value);
            } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
                property(value);
            }
        }
    };
})();

ko.exportSymbol('expressionRewriting', ko.expressionRewriting);
ko.exportSymbol('expressionRewriting.bindingRewriteValidators', ko.expressionRewriting.bindingRewriteValidators);
ko.exportSymbol('expressionRewriting.parseObjectLiteral', ko.expressionRewriting.parseObjectLiteral);
ko.exportSymbol('expressionRewriting.preProcessBindings', ko.expressionRewriting.preProcessBindings);

// For backward compatibility, define the following aliases. (Previously, these function names were misleading because
// they referred to JSON specifically, even though they actually work with arbitrary JavaScript object literal expressions.)
ko.exportSymbol('jsonExpressionRewriting', ko.expressionRewriting);
ko.exportSymbol('jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.expressionRewriting.preProcessBindings);(function() {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    // IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
    // but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
    // So, use node.text where available, and node.nodeValue elsewhere
    var commentNodesHaveTextProperty = document && document.createComment("test").text === "<!--test-->";

    var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*-->$/ : /^\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*$/;
    var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
    var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

    function isStartComment(node) {
        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(endCommentRegex);
    }

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                depth--;
                if (depth === 0)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                depth++;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            if (allVirtualChildren.length > 0)
                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
            return startComment.nextSibling;
        } else
            return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    function getUnbalancedChildTags(node) {
        // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
        //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
        var childNode = node.firstChild, captureRemaining = null;
        if (childNode) {
            do {
                if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
                    captureRemaining.push(childNode);
                else if (isStartComment(childNode)) {
                    var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
                    if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
                        childNode = matchingEndComment;
                    else
                        captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
                } else if (isEndComment(childNode)) {
                    captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
                }
            } while (childNode = childNode.nextSibling);
        }
        return captureRemaining;
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: function(node) {
            return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
        },

        emptyNode: function(node) {
            if (!isStartComment(node))
                ko.utils.emptyDomNode(node);
            else {
                var virtualChildren = ko.virtualElements.childNodes(node);
                for (var i = 0, j = virtualChildren.length; i < j; i++)
                    ko.removeNode(virtualChildren[i]);
            }
        },

        setDomNodeChildren: function(node, childNodes) {
            if (!isStartComment(node))
                ko.utils.setDomNodeChildren(node, childNodes);
            else {
                ko.virtualElements.emptyNode(node);
                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
                for (var i = 0, j = childNodes.length; i < j; i++)
                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
            }
        },

        prepend: function(containerNode, nodeToPrepend) {
            if (!isStartComment(containerNode)) {
                if (containerNode.firstChild)
                    containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
                else
                    containerNode.appendChild(nodeToPrepend);
            } else {
                // Start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
            }
        },

        insertAfter: function(containerNode, nodeToInsert, insertAfterNode) {
            if (!insertAfterNode) {
                ko.virtualElements.prepend(containerNode, nodeToInsert);
            } else if (!isStartComment(containerNode)) {
                // Insert after insertion point
                if (insertAfterNode.nextSibling)
                    containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
                else
                    containerNode.appendChild(nodeToInsert);
            } else {
                // Children of start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
            }
        },

        firstChild: function(node) {
            if (!isStartComment(node))
                return node.firstChild;
            if (!node.nextSibling || isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        nextSibling: function(node) {
            if (isStartComment(node))
                node = getMatchingEndComment(node);
            if (node.nextSibling && isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        virtualNodeBindingValue: function(node) {
            var regexMatch = isStartComment(node);
            return regexMatch ? regexMatch[1] : null;
        },

        normaliseVirtualElementDomStructure: function(elementVerified) {
            // Workaround for https://github.com/SteveSanderson/knockout/issues/155
            // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
            // that are direct descendants of <ul> into the preceding <li>)
            if (!htmlTagsWithOptionallyClosingChildren[ko.utils.tagNameLower(elementVerified)])
                return;

            // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
            // must be intended to appear *after* that child, so move them there.
            var childNode = elementVerified.firstChild;
            if (childNode) {
                do {
                    if (childNode.nodeType === 1) {
                        var unbalancedTags = getUnbalancedChildTags(childNode);
                        if (unbalancedTags) {
                            // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
                            var nodeToInsertBefore = childNode.nextSibling;
                            for (var i = 0; i < unbalancedTags.length; i++) {
                                if (nodeToInsertBefore)
                                    elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
                                else
                                    elementVerified.appendChild(unbalancedTags[i]);
                            }
                        }
                    }
                } while (childNode = childNode.nextSibling);
            }
        }
    };
})();
ko.exportSymbol('virtualElements', ko.virtualElements);
ko.exportSymbol('virtualElements.allowedBindings', ko.virtualElements.allowedBindings);
ko.exportSymbol('virtualElements.emptyNode', ko.virtualElements.emptyNode);
//ko.exportSymbol('virtualElements.firstChild', ko.virtualElements.firstChild);     // firstChild is not minified
ko.exportSymbol('virtualElements.insertAfter', ko.virtualElements.insertAfter);
//ko.exportSymbol('virtualElements.nextSibling', ko.virtualElements.nextSibling);   // nextSibling is not minified
ko.exportSymbol('virtualElements.prepend', ko.virtualElements.prepend);
ko.exportSymbol('virtualElements.setDomNodeChildren', ko.virtualElements.setDomNodeChildren);
(function() {
    var defaultBindingAttributeName = "data-bind";

    ko.bindingProvider = function() {
        this.bindingCache = {};
    };

    ko.utils.extend(ko.bindingProvider.prototype, {
        'nodeHasBindings': function(node) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName) != null;   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node) != null; // Comment node
                default: return false;
            }
        },

        'getBindings': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext);
            return bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node) : null;
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'getBindingsString': function(node, bindingContext) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
                default: return null;
            }
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'parseBindingsString': function(bindingsString, bindingContext, node) {
            try {
                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, this.bindingCache);
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
                throw ex;
            }
        }
    });

    ko.bindingProvider['instance'] = new ko.bindingProvider();

    function createBindingsStringEvaluatorViaCache(bindingsString, cache) {
        var cacheKey = bindingsString;
        return cache[cacheKey]
            || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString));
    }

    function createBindingsStringEvaluator(bindingsString) {
        // Build the source for a function that evaluates "expression"
        // For each scope variable, add an extra level of "with" nesting
        // Example result: with(sc1) { with(sc0) { return (expression) } }
        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString),
            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
        return new Function("$context", "$element", functionBody);
    }
})();

ko.exportSymbol('bindingProvider', ko.bindingProvider);
(function () {
    ko.bindingHandlers = {};

    ko.bindingContext = function(dataItem, parentBindingContext, dataItemAlias) {
        if (parentBindingContext) {
            ko.utils.extend(this, parentBindingContext); // Inherit $root and any custom properties
            this['$parentContext'] = parentBindingContext;
            this['$parent'] = parentBindingContext['$data'];
            this['$parents'] = (parentBindingContext['$parents'] || []).slice(0);
            this['$parents'].unshift(this['$parent']);
        } else {
            this['$parents'] = [];
            this['$root'] = dataItem;
            // Export 'ko' in the binding context so it will be available in bindings and templates
            // even if 'ko' isn't exported as a global, such as when using an AMD loader.
            // See https://github.com/SteveSanderson/knockout/issues/490
            this['ko'] = ko;
        }
        this['$data'] = dataItem;
        if (dataItemAlias)
            this[dataItemAlias] = dataItem;
    }
    ko.bindingContext.prototype['createChildContext'] = function (dataItem, dataItemAlias) {
        return new ko.bindingContext(dataItem, this, dataItemAlias);
    };
    ko.bindingContext.prototype['extend'] = function(properties) {
        var clone = ko.utils.extend(new ko.bindingContext(), this);
        return ko.utils.extend(clone, properties);
    };

    function validateThatBindingIsAllowedForVirtualElements(bindingName) {
        var validator = ko.virtualElements.allowedBindings[bindingName];
        if (!validator)
            throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
    }

    function applyBindingsToDescendantsInternal (viewModel, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement) {
        var currentChild, nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);
        while (currentChild = nextInQueue) {
            // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
            nextInQueue = ko.virtualElements.nextSibling(currentChild);
            applyBindingsToNodeAndDescendantsInternal(viewModel, currentChild, bindingContextsMayDifferFromDomParentElement);
        }
    }

    function applyBindingsToNodeAndDescendantsInternal (viewModel, nodeVerified, bindingContextMayDifferFromDomParentElement) {
        var shouldBindDescendants = true;

        // Perf optimisation: Apply bindings only if...
        // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
        //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
        // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
        var isElement = (nodeVerified.nodeType === 1);
        if (isElement) // Workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(nodeVerified);

        var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement)             // Case (1)
                               || ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified);       // Case (2)
        if (shouldApplyBindings)
            shouldBindDescendants = applyBindingsToNodeInternal(nodeVerified, null, viewModel, bindingContextMayDifferFromDomParentElement).shouldBindDescendants;

        if (shouldBindDescendants) {
            // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
            //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
            //    hence bindingContextsMayDifferFromDomParentElement is false
            //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
            //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
            //    hence bindingContextsMayDifferFromDomParentElement is true
            applyBindingsToDescendantsInternal(viewModel, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement);
        }
    }

    var boundElementDomDataKey = '__ko_boundElement';
    function applyBindingsToNodeInternal (node, bindings, viewModelOrBindingContext, bindingContextMayDifferFromDomParentElement) {
        // Need to be sure that inits are only run once, and updates never run until all the inits have been run
        var initPhase = 0; // 0 = before all inits, 1 = during inits, 2 = after all inits

        // Each time the dependentObservable is evaluated (after data changes),
        // the binding attribute is reparsed so that it can pick out the correct
        // model properties in the context of the changed data.
        // DOM event callbacks need to be able to access this changed data,
        // so we need a single parsedBindings variable (shared by all callbacks
        // associated with this node's bindings) that all the closures can access.
        var parsedBindings;
        function makeValueAccessor(bindingKey) {
            return function () { return parsedBindings[bindingKey] }
        }
        function parsedBindingsAccessor() {
            return parsedBindings;
        }

        var bindingHandlerThatControlsDescendantBindings;

        // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
        var alreadyBound = ko.utils.domData.get(node, boundElementDomDataKey);
        if (!bindings) {
            if (alreadyBound) {
                throw Error("You cannot apply bindings multiple times to the same element.");
            }
            ko.utils.domData.set(node, boundElementDomDataKey, true);
        }

        ko.dependentObservable(
            function () {
                // Ensure we have a nonnull binding context to work with
                var bindingContextInstance = viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
                    ? viewModelOrBindingContext
                    : new ko.bindingContext(ko.utils.unwrapObservable(viewModelOrBindingContext));
                var viewModel = bindingContextInstance['$data'];

                // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
                // we can easily recover it just by scanning up the node's ancestors in the DOM
                // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
                if (!alreadyBound && bindingContextMayDifferFromDomParentElement)
                    ko.storedBindingContextForNode(node, bindingContextInstance);

                // Use evaluatedBindings if given, otherwise fall back on asking the bindings provider to give us some bindings
                var evaluatedBindings = (typeof bindings == "function") ? bindings(bindingContextInstance, node) : bindings;
                parsedBindings = evaluatedBindings || ko.bindingProvider['instance']['getBindings'](node, bindingContextInstance);

                if (parsedBindings) {
                    // First run all the inits, so bindings can register for notification on changes
                    if (initPhase === 0) {
                        initPhase = 1;
                        ko.utils.objectForEach(parsedBindings, function(bindingKey) {
                            var binding = ko.bindingHandlers[bindingKey];
                            if (binding && node.nodeType === 8)
                                validateThatBindingIsAllowedForVirtualElements(bindingKey);

                            if (binding && typeof binding["init"] == "function") {
                                var handlerInitFn = binding["init"];
                                var initResult = handlerInitFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);

                                // If this binding handler claims to control descendant bindings, make a note of this
                                if (initResult && initResult['controlsDescendantBindings']) {
                                    if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                        throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                                    bindingHandlerThatControlsDescendantBindings = bindingKey;
                                }
                            }
                        });
                        initPhase = 2;
                    }

                    // ... then run all the updates, which might trigger changes even on the first evaluation
                    if (initPhase === 2) {
                        ko.utils.objectForEach(parsedBindings, function(bindingKey) {
                            var binding = ko.bindingHandlers[bindingKey];
                            if (binding && typeof binding["update"] == "function") {
                                var handlerUpdateFn = binding["update"];
                                handlerUpdateFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);
                            }
                        });
                    }
                }
            },
            null,
            { disposeWhenNodeIsRemoved : node }
        );

        return {
            shouldBindDescendants: bindingHandlerThatControlsDescendantBindings === undefined
        };
    };

    var storedBindingContextDomDataKey = "__ko_bindingContext__";
    ko.storedBindingContextForNode = function (node, bindingContext) {
        if (arguments.length == 2)
            ko.utils.domData.set(node, storedBindingContextDomDataKey, bindingContext);
        else
            return ko.utils.domData.get(node, storedBindingContextDomDataKey);
    }

    ko.applyBindingsToNode = function (node, bindings, viewModel) {
        if (node.nodeType === 1) // If it's an element, workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(node);
        return applyBindingsToNodeInternal(node, bindings, viewModel, true);
    };

    ko.applyBindingsToDescendants = function(viewModel, rootNode) {
        if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
            applyBindingsToDescendantsInternal(viewModel, rootNode, true);
    };

    ko.applyBindings = function (viewModel, rootNode) {
        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
        rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

        applyBindingsToNodeAndDescendantsInternal(viewModel, rootNode, true);
    };

    // Retrieving binding context from arbitrary nodes
    ko.contextFor = function(node) {
        // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
        switch (node.nodeType) {
            case 1:
            case 8:
                var context = ko.storedBindingContextForNode(node);
                if (context) return context;
                if (node.parentNode) return ko.contextFor(node.parentNode);
                break;
        }
        return undefined;
    };
    ko.dataFor = function(node) {
        var context = ko.contextFor(node);
        return context ? context['$data'] : undefined;
    };

    ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
    ko.exportSymbol('applyBindings', ko.applyBindings);
    ko.exportSymbol('applyBindingsToDescendants', ko.applyBindingsToDescendants);
    ko.exportSymbol('applyBindingsToNode', ko.applyBindingsToNode);
    ko.exportSymbol('contextFor', ko.contextFor);
    ko.exportSymbol('dataFor', ko.dataFor);
})();
var attrHtmlToJavascriptMap = { 'class': 'className', 'for': 'htmlFor' };
ko.bindingHandlers['attr'] = {
    'update': function(element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        ko.utils.objectForEach(value, function(attrName, attrValue) {
            attrValue = ko.utils.unwrapObservable(attrValue);

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
            if (toRemove)
                element.removeAttribute(attrName);

            // In IE <= 7 and IE8 Quirks Mode, you have to use the Javascript property name instead of the
            // HTML attribute name for certain attributes. IE8 Standards Mode supports the correct behavior,
            // but instead of figuring out the mode, we'll just set the attribute through the Javascript
            // property for IE <= 8.
            if (ko.utils.ieVersion <= 8 && attrName in attrHtmlToJavascriptMap) {
                attrName = attrHtmlToJavascriptMap[attrName];
                if (toRemove)
                    element.removeAttribute(attrName);
                else
                    element[attrName] = attrValue;
            } else if (!toRemove) {
                element.setAttribute(attrName, attrValue.toString());
            }

            // Treat "name" specially - although you can think of it as an attribute, it also needs
            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
            // entirely, and there's no strong reason to allow for such casing in HTML.
            if (attrName === "name") {
                ko.utils.setElementName(element, toRemove ? "" : attrValue.toString());
            }
        });
    }
};
ko.bindingHandlers['checked'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        var updateHandler = function() {
            var valueToWrite;
            if (element.type == "checkbox") {
                valueToWrite = element.checked;
            } else if ((element.type == "radio") && (element.checked)) {
                valueToWrite = element.value;
            } else {
                return; // "checked" binding only responds to checkboxes and selected radio buttons
            }

            var modelValue = valueAccessor(), unwrappedValue = ko.utils.unwrapObservable(modelValue);
            if ((element.type == "checkbox") && (unwrappedValue instanceof Array)) {
                // For checkboxes bound to an array, we add/remove the checkbox value to that array
                // This works for both observable and non-observable arrays
                ko.utils.addOrRemoveItem(modelValue, element.value, element.checked);
            } else {
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'checked', valueToWrite, true);
            }
        };
        ko.utils.registerEventHandler(element, "click", updateHandler);

        // IE 6 won't allow radio buttons to be selected unless they have a name
        if ((element.type == "radio") && !element.name)
            ko.bindingHandlers['uniqueName']['init'](element, function() { return true });
    },
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (element.type == "checkbox") {
            if (value instanceof Array) {
                // When bound to an array, the checkbox being checked represents its value being present in that array
                element.checked = ko.utils.arrayIndexOf(value, element.value) >= 0;
            } else {
                // When bound to any other value (not an array), the checkbox being checked represents the value being trueish
                element.checked = value;
            }
        } else if (element.type == "radio") {
            element.checked = (element.value == value);
        }
    }
};
var classesWrittenByBindingKey = '__ko__cssValue';
ko.bindingHandlers['css'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (typeof value == "object") {
            ko.utils.objectForEach(value, function(className, shouldHaveClass) {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
            });
        } else {
            value = String(value || ''); // Make sure we don't try to store or set a non-string value
            ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            ko.utils.toggleDomNodeCssClass(element, value, true);
        }
    }
};
ko.bindingHandlers['enable'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value && element.disabled)
            element.removeAttribute("disabled");
        else if ((!value) && (!element.disabled))
            element.disabled = true;
    }
};

ko.bindingHandlers['disable'] = {
    'update': function (element, valueAccessor) {
        ko.bindingHandlers['enable']['update'](element, function() { return !ko.utils.unwrapObservable(valueAccessor()) });
    }
};
// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var newValueAccessor = function () {
                var result = {};
                result[eventName] = valueAccessor();
                return result;
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindingsAccessor, viewModel);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var eventsToHandle = valueAccessor() || {};
        ko.utils.objectForEach(eventsToHandle, function(eventName) {
            if (typeof eventName == "string") {
                ko.utils.registerEventHandler(element, eventName, function (event) {
                    var handlerReturnValue;
                    var handlerFunction = valueAccessor()[eventName];
                    if (!handlerFunction)
                        return;
                    var allBindings = allBindingsAccessor();

                    try {
                        // Take all the event args, and prefix with the viewmodel
                        var argsForHandler = ko.utils.makeArray(arguments);
                        argsForHandler.unshift(viewModel);
                        handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
                    } finally {
                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                            if (event.preventDefault)
                                event.preventDefault();
                            else
                                event.returnValue = false;
                        }
                    }

                    var bubble = allBindings[eventName + 'Bubble'] !== false;
                    if (!bubble) {
                        event.cancelBubble = true;
                        if (event.stopPropagation)
                            event.stopPropagation();
                    }
                });
            }
        });
    }
};
// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
ko.bindingHandlers['foreach'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue);    // Unwrap without setting a dependency here

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': modelValue, 'templateEngine': ko.nativeTemplateEngine.instance };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(modelValue);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'includeDestroyed': unwrappedValue['includeDestroyed'],
                'afterAdd': unwrappedValue['afterAdd'],
                'beforeRemove': unwrappedValue['beforeRemove'],
                'afterRender': unwrappedValue['afterRender'],
                'beforeMove': unwrappedValue['beforeMove'],
                'afterMove': unwrappedValue['afterMove'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
    }
};
ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['foreach'] = true;
var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
var hasfocusLastValue = '__ko_hasfocusLastValue';
ko.bindingHandlers['hasfocus'] = {
    'init': function(element, valueAccessor, allBindingsAccessor) {
        var handleElementFocusChange = function(isFocused) {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            var ownerDoc = element.ownerDocument;
            if ("activeElement" in ownerDoc) {
                var active;
                try {
                    active = ownerDoc.activeElement;
                } catch(e) {
                    // IE9 throws if you access activeElement during page load (see issue #703)
                    active = ownerDoc.body;
                }
                isFocused = (active === element);
            }
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'hasfocus', isFocused, true);

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        ko.utils.registerEventHandler(element, "focus", handleElementFocusIn);
        ko.utils.registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
        ko.utils.registerEventHandler(element, "blur",  handleElementFocusOut);
        ko.utils.registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
    },
    'update': function(element, valueAccessor) {
        var value = !!ko.utils.unwrapObservable(valueAccessor()); //force boolean to compare with last value
        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();
            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, value ? "focusin" : "focusout"]); // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
        }
    }
};

ko.bindingHandlers['hasFocus'] = ko.bindingHandlers['hasfocus']; // Make "hasFocus" an alias
ko.bindingHandlers['html'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        // setHtml will unwrap the value if needed
        ko.utils.setHtml(element, valueAccessor());
    }
};
var withIfDomDataKey = '__ko_withIfBindingData';
// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot, makeContextCallback) {
    ko.bindingHandlers[bindingKey] = {
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            ko.utils.domData.set(element, withIfDomDataKey, {});
            return { 'controlsDescendantBindings': true };
        },
        'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var withIfData = ko.utils.domData.get(element, withIfDomDataKey),
                dataValue = ko.utils.unwrapObservable(valueAccessor()),
                shouldDisplay = !isNot !== !dataValue, // equivalent to isNot ? !dataValue : !!dataValue
                isFirstRender = !withIfData.savedNodes,
                needsRefresh = isFirstRender || isWith || (shouldDisplay !== withIfData.didDisplayOnLastUpdate);

            if (needsRefresh) {
                if (isFirstRender) {
                    withIfData.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    if (!isFirstRender) {
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(withIfData.savedNodes));
                    }
                    ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);
                }

                withIfData.didDisplayOnLastUpdate = shouldDisplay;
            }
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */, false /* isNot */,
    function(bindingContext, dataValue) {
        return bindingContext['createChildContext'](dataValue);
    }
);
function ensureDropdownSelectionIsConsistentWithModelValue(element, modelValue, preferModelValue) {
    if (preferModelValue) {
        if (modelValue !== ko.selectExtensions.readValue(element))
            ko.selectExtensions.writeValue(element, modelValue);
    }

    // No matter which direction we're syncing in, we want the end result to be equality between dropdown value and model value.
    // If they aren't equal, either we prefer the dropdown value, or the model value couldn't be represented, so either way,
    // change the model value to match the dropdown.
    if (modelValue !== ko.selectExtensions.readValue(element))
        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
};

ko.bindingHandlers['options'] = {
    'init': function(element) {
        if (ko.utils.tagNameLower(element) !== "select")
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        while (element.length > 0) {
            element.remove(0);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor, allBindingsAccessor) {
        var selectWasPreviouslyEmpty = element.length == 0;
        var previousScrollTop = (!selectWasPreviouslyEmpty && element.multiple) ? element.scrollTop : null;

        var unwrappedArray = ko.utils.unwrapObservable(valueAccessor());
        var allBindings = allBindingsAccessor();
        var includeDestroyed = allBindings['optionsIncludeDestroyed'];
        var captionPlaceholder = {};
        var captionValue;
        var previousSelectedValues;
        if (element.multiple) {
            previousSelectedValues = ko.utils.arrayMap(element.selectedOptions || ko.utils.arrayFilter(element.childNodes, function (node) {
                    return node.tagName && (ko.utils.tagNameLower(node) === "option") && node.selected;
                }), function (node) {
                    return ko.selectExtensions.readValue(node);
                });
        } else if (element.selectedIndex >= 0) {
            previousSelectedValues = [ ko.selectExtensions.readValue(element.options[element.selectedIndex]) ];
        }

        if (unwrappedArray) {
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return includeDestroyed || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // If caption is included, add it to the array
            if ('optionsCaption' in allBindings) {
                captionValue = ko.utils.unwrapObservable(allBindings['optionsCaption']);
                // If caption value is null or undefined, don't show a caption
                if (captionValue !== null && captionValue !== undefined) {
                    filteredArray.unshift(captionPlaceholder);
                }
            }
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
            unwrappedArray = [];
        }

        function applyToObject(object, predicate, defaultValue) {
            var predicateType = typeof predicate;
            if (predicateType == "function")    // Given a function; run it against the data value
                return predicate(object);
            else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                return object[predicate];
            else                                // Given no optionsText arg; use the data value itself
                return defaultValue;
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        function optionForArrayItem(arrayEntry, index, oldOptions) {
            if (oldOptions.length) {
                previousSelectedValues = oldOptions[0].selected && [ ko.selectExtensions.readValue(oldOptions[0]) ];
            }
            var option = document.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                ko.utils.setHtml(option, captionValue);
                ko.selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings['optionsValue'], arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings['optionsText'], optionValue);
                ko.utils.setTextContent(option, optionText);
            }
            return [option];
        }

        function setSelectionCallback(arrayEntry, newOptions) {
            // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
            // That's why we first added them without selection. Now it's time to set the selection.
            if (previousSelectedValues) {
                var isSelected = ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[0])) >= 0;
                ko.utils.setOptionNodeSelectionState(newOptions[0], isSelected);
            }
        }

        var callback = setSelectionCallback;
        if (allBindings['optionsAfterRender']) {
            callback = function(arrayEntry, newOptions) {
                setSelectionCallback(arrayEntry, newOptions);
                ko.dependencyDetection.ignore(allBindings['optionsAfterRender'], null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            }
        }

        ko.utils.setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, null, callback);

        // Clear previousSelectedValues so that future updates to individual objects don't get stale data
        previousSelectedValues = null;

        if (selectWasPreviouslyEmpty && ('value' in allBindings)) {
            // Ensure consistency between model value and selected option.
            // If the dropdown is being populated for the first time here (or was otherwise previously empty),
            // the dropdown selection state is meaningless, so we preserve the model value.
            ensureDropdownSelectionIsConsistentWithModelValue(element, ko.utils.peekObservable(allBindings['value']), /* preferModelValue */ true);
        }

        // Workaround for IE bug
        ko.utils.ensureSelectElementIsRenderedCorrectly(element);

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = '__ko.optionValueDomData__';
ko.bindingHandlers['selectedOptions'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        ko.utils.registerEventHandler(element, "change", function () {
            var value = valueAccessor(), valueToWrite = [];
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                if (node.selected)
                    valueToWrite.push(ko.selectExtensions.readValue(node));
            });
            ko.expressionRewriting.writeValueToProperty(value, allBindingsAccessor, 'selectedOptions', valueToWrite);
        });
    },
    'update': function (element, valueAccessor) {
        if (ko.utils.tagNameLower(element) != "select")
            throw new Error("values binding applies only to SELECT elements");

        var newValue = ko.utils.unwrapObservable(valueAccessor());
        if (newValue && typeof newValue.length == "number") {
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                var isSelected = ko.utils.arrayIndexOf(newValue, ko.selectExtensions.readValue(node)) >= 0;
                ko.utils.setOptionNodeSelectionState(node, isSelected);
            });
        }
    }
};
ko.bindingHandlers['style'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor() || {});
        ko.utils.objectForEach(value, function(styleName, styleValue) {
            styleValue = ko.utils.unwrapObservable(styleValue);
            element.style[styleName] = styleValue || ""; // Empty string removes the value, whereas null/undefined have no effect
        });
    }
};
ko.bindingHandlers['submit'] = {
    'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        ko.utils.registerEventHandler(element, "submit", function (event) {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(viewModel, element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    if (event.preventDefault)
                        event.preventDefault();
                    else
                        event.returnValue = false;
                }
            }
        });
    }
};
ko.bindingHandlers['text'] = {
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
ko.bindingHandlers['uniqueName'] = {
    'init': function (element, valueAccessor) {
        if (valueAccessor()) {
            var name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
            ko.utils.setElementName(element, name);
        }
    }
};
ko.bindingHandlers['uniqueName'].currentIndex = 0;
ko.bindingHandlers['value'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        // Always catch "change" event; possibly other events too if asked
        var eventsToCatch = ["change"];
        var requestedEventsToCatch = allBindingsAccessor()["valueUpdate"];
        var propertyChangedFired = false;
        if (requestedEventsToCatch) {
            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
                requestedEventsToCatch = [requestedEventsToCatch];
            ko.utils.arrayPushAll(eventsToCatch, requestedEventsToCatch);
            eventsToCatch = ko.utils.arrayGetDistinctValues(eventsToCatch);
        }

        var valueUpdateHandler = function() {
            propertyChangedFired = false;
            var modelValue = valueAccessor();
            var elementValue = ko.selectExtensions.readValue(element);
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'value', elementValue);
        }

        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
        var ieAutoCompleteHackNeeded = ko.utils.ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
        if (ieAutoCompleteHackNeeded && ko.utils.arrayIndexOf(eventsToCatch, "propertychange") == -1) {
            ko.utils.registerEventHandler(element, "propertychange", function () { propertyChangedFired = true });
            ko.utils.registerEventHandler(element, "blur", function() {
                if (propertyChangedFired) {
                    valueUpdateHandler();
                }
            });
        }

        ko.utils.arrayForEach(eventsToCatch, function(eventName) {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if (ko.utils.stringStartsWith(eventName, "after")) {
                handler = function() { setTimeout(valueUpdateHandler, 0) };
                eventName = eventName.substring("after".length);
            }
            ko.utils.registerEventHandler(element, eventName, handler);
        });
    },
    'update': function (element, valueAccessor) {
        var valueIsSelectOption = ko.utils.tagNameLower(element) === "select";
        var newValue = ko.utils.unwrapObservable(valueAccessor());
        var elementValue = ko.selectExtensions.readValue(element);
        var valueHasChanged = (newValue !== elementValue);

        if (valueHasChanged) {
            var applyValueAction = function () { ko.selectExtensions.writeValue(element, newValue); };
            applyValueAction();

            // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
            // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
            // to apply the value as well.
            var alsoApplyAsynchronously = valueIsSelectOption;
            if (alsoApplyAsynchronously)
                setTimeout(applyValueAction, 0);
        }

        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
        // because you're not allowed to have a model value that disagrees with a visible UI selection.
        if (valueIsSelectOption && (element.length > 0))
            ensureDropdownSelectionIsConsistentWithModelValue(element, newValue, /* preferModelValue */ false);
    }
};
ko.bindingHandlers['visible'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if ((!value) && isCurrentlyVisible)
            element.style.display = "none";
    }
};
// 'click' is just a shorthand for the usual full-length event:{click:handler}
makeEventHandlerShortcut('click');
// If you want to make a custom template engine,
//
// [1] Inherit from this class (like ko.nativeTemplateEngine does)
// [2] Override 'renderTemplateSource', supplying a function with this signature:
//
//        function (templateSource, bindingContext, options) {
//            // - templateSource.text() is the text of the template you should render
//            // - bindingContext.$data is the data you should pass into the template
//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
//            //     and bindingContext.$root available in the template too
//            // - options gives you access to any other properties set on "data-bind: { template: options }"
//            //
//            // Return value: an array of DOM nodes
//        }
//
// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
//
//        function (script) {
//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
//        }
//
//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

ko.templateEngine = function () { };

ko.templateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
    throw new Error("Override renderTemplateSource");
};

ko.templateEngine.prototype['createJavaScriptEvaluatorBlock'] = function (script) {
    throw new Error("Override createJavaScriptEvaluatorBlock");
};

ko.templateEngine.prototype['makeTemplateSource'] = function(template, templateDocument) {
    // Named template
    if (typeof template == "string") {
        templateDocument = templateDocument || document;
        var elem = templateDocument.getElementById(template);
        if (!elem)
            throw new Error("Cannot find template with ID " + template);
        return new ko.templateSources.domElement(elem);
    } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
        // Anonymous template
        return new ko.templateSources.anonymousTemplate(template);
    } else
        throw new Error("Unknown template type: " + template);
};

ko.templateEngine.prototype['renderTemplate'] = function (template, bindingContext, options, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    return this['renderTemplateSource'](templateSource, bindingContext, options);
};

ko.templateEngine.prototype['isTemplateRewritten'] = function (template, templateDocument) {
    // Skip rewriting if requested
    if (this['allowTemplateRewriting'] === false)
        return true;
    return this['makeTemplateSource'](template, templateDocument)['data']("isRewritten");
};

ko.templateEngine.prototype['rewriteTemplate'] = function (template, rewriterCallback, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    var rewritten = rewriterCallback(templateSource['text']());
    templateSource['text'](rewritten);
    templateSource['data']("isRewritten", true);
};

ko.exportSymbol('templateEngine', ko.templateEngine);

ko.templateRewriting = (function () {
    var memoizeDataBindingAttributeSyntaxRegex = /(<([a-z]+\d*)(?:\s+(?!data-bind\s*=\s*)[a-z0-9\-]+(?:=(?:\"[^\"]*\"|\'[^\']*\'))?)*\s+)data-bind\s*=\s*(["'])([\s\S]*?)\3/gi;
    var memoizeVirtualContainerBindingSyntaxRegex = /<!--\s*ko\b\s*([\s\S]*?)\s*-->/g;

    function validateDataBindValuesForRewriting(keyValueArray) {
        var allValidators = ko.expressionRewriting.bindingRewriteValidators;
        for (var i = 0; i < keyValueArray.length; i++) {
            var key = keyValueArray[i]['key'];
            if (allValidators.hasOwnProperty(key)) {
                var validator = allValidators[key];

                if (typeof validator === "function") {
                    var possibleErrorMessage = validator(keyValueArray[i]['value']);
                    if (possibleErrorMessage)
                        throw new Error(possibleErrorMessage);
                } else if (!validator) {
                    throw new Error("This template engine does not support the '" + key + "' binding within its templates");
                }
            }
        }
    }

    function constructMemoizedTagReplacement(dataBindAttributeValue, tagToRetain, nodeName, templateEngine) {
        var dataBindKeyValueArray = ko.expressionRewriting.parseObjectLiteral(dataBindAttributeValue);
        validateDataBindValuesForRewriting(dataBindKeyValueArray);
        var rewrittenDataBindAttributeValue = ko.expressionRewriting.preProcessBindings(dataBindKeyValueArray);

        // For no obvious reason, Opera fails to evaluate rewrittenDataBindAttributeValue unless it's wrapped in an additional
        // anonymous function, even though Opera's built-in debugger can evaluate it anyway. No other browser requires this
        // extra indirection.
        var applyBindingsToNextSiblingScript =
            "ko.__tr_ambtns(function($context,$element){return(function(){return{ " + rewrittenDataBindAttributeValue + " } })()},'" + nodeName.toLowerCase() + "')";
        return templateEngine['createJavaScriptEvaluatorBlock'](applyBindingsToNextSiblingScript) + tagToRetain;
    }

    return {
        ensureTemplateIsRewritten: function (template, templateEngine, templateDocument) {
            if (!templateEngine['isTemplateRewritten'](template, templateDocument))
                templateEngine['rewriteTemplate'](template, function (htmlString) {
                    return ko.templateRewriting.memoizeBindingAttributeSyntax(htmlString, templateEngine);
                }, templateDocument);
        },

        memoizeBindingAttributeSyntax: function (htmlString, templateEngine) {
            return htmlString.replace(memoizeDataBindingAttributeSyntaxRegex, function () {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[4], /* tagToRetain: */ arguments[1], /* nodeName: */ arguments[2], templateEngine);
            }).replace(memoizeVirtualContainerBindingSyntaxRegex, function() {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[1], /* tagToRetain: */ "<!-- ko -->", /* nodeName: */ "#comment", templateEngine);
            });
        },

        applyMemoizedBindingsToNextSibling: function (bindings, nodeName) {
            return ko.memoization.memoize(function (domNode, bindingContext) {
                var nodeToBind = domNode.nextSibling;
                if (nodeToBind && nodeToBind.nodeName.toLowerCase() === nodeName) {
                    ko.applyBindingsToNode(nodeToBind, bindings, bindingContext);
                }
            });
        }
    }
})();


// Exported only because it has to be referenced by string lookup from within rewritten template
ko.exportSymbol('__tr_ambtns', ko.templateRewriting.applyMemoizedBindingsToNextSibling);
(function() {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    // You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
    // Template sources need to have the following functions:
    //   text() 			- returns the template text from your storage location
    //   text(value)		- writes the supplied template text to your storage location
    //   data(key)			- reads values stored using data(key, value) - see below
    //   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
    //
    // Optionally, template sources can also have the following functions:
    //   nodes()            - returns a DOM element containing the nodes of this template, where available
    //   nodes(value)       - writes the given DOM element to your storage location
    // If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
    // for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    ko.templateSources = {};

    // ---- ko.templateSources.domElement -----

    ko.templateSources.domElement = function(element) {
        this.domElement = element;
    }

    ko.templateSources.domElement.prototype['text'] = function(/* valueToWrite */) {
        var tagNameLower = ko.utils.tagNameLower(this.domElement),
            elemContentsProperty = tagNameLower === "script" ? "text"
                                 : tagNameLower === "textarea" ? "value"
                                 : "innerHTML";

        if (arguments.length == 0) {
            return this.domElement[elemContentsProperty];
        } else {
            var valueToWrite = arguments[0];
            if (elemContentsProperty === "innerHTML")
                ko.utils.setHtml(this.domElement, valueToWrite);
            else
                this.domElement[elemContentsProperty] = valueToWrite;
        }
    };

    ko.templateSources.domElement.prototype['data'] = function(key /*, valueToWrite */) {
        if (arguments.length === 1) {
            return ko.utils.domData.get(this.domElement, "templateSourceData_" + key);
        } else {
            ko.utils.domData.set(this.domElement, "templateSourceData_" + key, arguments[1]);
        }
    };

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

    var anonymousTemplatesDomDataKey = "__ko_anon_template__";
    ko.templateSources.anonymousTemplate = function(element) {
        this.domElement = element;
    }
    ko.templateSources.anonymousTemplate.prototype = new ko.templateSources.domElement();
    ko.templateSources.anonymousTemplate.prototype.constructor = ko.templateSources.anonymousTemplate;
    ko.templateSources.anonymousTemplate.prototype['text'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
            if (templateData.textData === undefined && templateData.containerData)
                templateData.textData = templateData.containerData.innerHTML;
            return templateData.textData;
        } else {
            var valueToWrite = arguments[0];
            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {textData: valueToWrite});
        }
    };
    ko.templateSources.domElement.prototype['nodes'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
            return templateData.containerData;
        } else {
            var valueToWrite = arguments[0];
            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {containerData: valueToWrite});
        }
    };

    ko.exportSymbol('templateSources', ko.templateSources);
    ko.exportSymbol('templateSources.domElement', ko.templateSources.domElement);
    ko.exportSymbol('templateSources.anonymousTemplate', ko.templateSources.anonymousTemplate);
})();
(function () {
    var _templateEngine;
    ko.setTemplateEngine = function (templateEngine) {
        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
            throw new Error("templateEngine must inherit from ko.templateEngine");
        _templateEngine = templateEngine;
    }

    function invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, action) {
        var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
        while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
            nextInQueue = ko.virtualElements.nextSibling(node);
            if (node.nodeType === 1 || node.nodeType === 8)
                action(node);
        }
    }

    function activateBindingsOnContinuousNodeArray(continuousNodeArray, bindingContext) {
        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
        // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
        // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

        if (continuousNodeArray.length) {
            var firstNode = continuousNodeArray[0], lastNode = continuousNodeArray[continuousNodeArray.length - 1];

            // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
            // whereas a regular applyBindings won't introduce new memoized nodes
            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
                ko.applyBindings(bindingContext, node);
            });
            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
                ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);
            });
        }
    }

    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                        : null;
    }

    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
        options = options || {};
        var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
        var templateDocument = firstTargetNode && firstTargetNode.ownerDocument;
        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse, templateDocument);
        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options, templateDocument);

        // Loosely check result is an array of DOM nodes
        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
            throw new Error("Template engine must return an array of DOM nodes");

        var haveAddedNodesToParent = false;
        switch (renderMode) {
            case "replaceChildren":
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "replaceNode":
                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "ignoreTargetNode": break;
            default:
                throw new Error("Unknown renderMode: " + renderMode);
        }

        if (haveAddedNodesToParent) {
            activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
            if (options['afterRender'])
                ko.dependencyDetection.ignore(options['afterRender'], null, [renderedNodesArray, bindingContext['$data']]);
        }

        return renderedNodesArray;
    }

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        if ((options['templateEngine'] || _templateEngine) == undefined)
            throw new Error("Set a template engine before calling renderTemplate");
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;

            return ko.dependentObservable( // So the DOM is automatically updated when any dependency changes
                function () {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
                        ? dataOrBindingContext
                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

                    // Support selecting template as a function of the data being rendered
                    var templateName = typeof(template) == 'function' ? template(bindingContext['$data'], bindingContext) : template;

                    var renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);
                    if (renderMode == "replaceNode") {
                        targetNodeOrNodeArray = renderedNodesArray;
                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
                    }
                },
                null,
                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
            );
        } else {
            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
            return ko.memoization.memoize(function (domNode) {
                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
            });
        }
    };

    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {
        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
        var arrayItemContext;

        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
        var executeTemplateForArrayItem = function (arrayValue, index) {
            // Support selecting template as a function of the data being rendered
            arrayItemContext = parentBindingContext['createChildContext'](ko.utils.unwrapObservable(arrayValue), options['as']);
            arrayItemContext['$index'] = index;
            var templateName = typeof(template) == 'function' ? template(arrayValue, arrayItemContext) : template;
            return executeTemplate(null, "ignoreTargetNode", templateName, arrayItemContext, options);
        }

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = function(arrayValue, addedNodesArray, index) {
            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);
            if (options['afterRender'])
                options['afterRender'](addedNodesArray, arrayValue);
        };

        return ko.dependentObservable(function () {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return options['includeDestroyed'] || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options, activateBindingsCallback]);

        }, null, { disposeWhenNodeIsRemoved: targetNode });
    };

    var templateComputedDomDataKey = '__ko__templateComputedDomDataKey__';
    function disposeOldComputedAndStoreNewOne(element, newComputed) {
        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
        if (oldComputed && (typeof(oldComputed.dispose) == 'function'))
            oldComputed.dispose();
        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
    }

    ko.bindingHandlers['template'] = {
        'init': function(element, valueAccessor) {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if ((typeof bindingValue != "string") && (!bindingValue['name']) && (element.nodeType == 1 || element.nodeType == 8)) {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = element.nodeType == 1 ? element.childNodes : ko.virtualElements.childNodes(element),
                    container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var templateName = ko.utils.unwrapObservable(valueAccessor()),
                options = {},
                shouldDisplay = true,
                dataValue,
                templateComputed = null;

            if (typeof templateName != "string") {
                options = templateName;
                templateName = ko.utils.unwrapObservable(options['name']);

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                dataValue = ko.utils.unwrapObservable(options['data']);
            }

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && options['foreach']) || [];
                templateComputed = ko.renderTemplateForEach(templateName || element, dataArray, options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = ('data' in options) ?
                    bindingContext['createChildContext'](dataValue, options['as']) :  // Given an explitit 'data' value, we create a child binding context for it
                    bindingContext;                                                        // Given no explicit 'data' value, we retain the same binding context
                templateComputed = ko.renderTemplate(templateName || element, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();

ko.exportSymbol('setTemplateEngine', ko.setTemplateEngine);
ko.exportSymbol('renderTemplate', ko.renderTemplate);

ko.utils.compareArrays = (function () {
    var statusNotInOld = 'added', statusNotInNew = 'deleted';

    // Simple calculation based on Levenshtein distance.
    function compareArrays(oldArray, newArray, dontLimitMoves) {
        oldArray = oldArray || [];
        newArray = newArray || [];

        if (oldArray.length <= newArray.length)
            return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, dontLimitMoves);
        else
            return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, dontLimitMoves);
    }

    function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, dontLimitMoves) {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, lastRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
            lastRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                editScript.push({
                    'status': "retained",
                    'value': bigArray[--bigIndex] });
                --smlIndex;
            }
        }

        if (notInSml.length && notInBig.length) {
            // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
            // smlIndexMax keeps the time complexity of this algorithm linear.
            var limitFailedCompares = smlIndexMax * 10, failedCompares,
                a, d, notInSmlItem, notInBigItem;
            // Go through the items that have been added and deleted and try to find matches between them.
            for (failedCompares = a = 0; (dontLimitMoves || failedCompares < limitFailedCompares) && (notInSmlItem = notInSml[a]); a++) {
                for (d = 0; notInBigItem = notInBig[d]; d++) {
                    if (notInSmlItem['value'] === notInBigItem['value']) {
                        notInSmlItem['moved'] = notInBigItem['index'];
                        notInBigItem['moved'] = notInSmlItem['index'];
                        notInBig.splice(d,1);       // This item is marked as moved; so remove it from notInBig list
                        failedCompares = d = 0;     // Reset failed compares count because we're checking for consecutive failures
                        break;
                    }
                }
                failedCompares += d;
            }
        }
        return editScript.reverse();
    }

    return compareArrays;
})();

ko.exportSymbol('utils.compareArrays', ko.utils.compareArrays);

(function () {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function fixUpNodesToBeMovedOrRemoved(contiguousNodeArray) {
        // Before moving, deleting, or replacing a set of nodes that were previously outputted by the "map" function, we have to reconcile
        // them against what is in the DOM right now. It may be that some of the nodes have already been removed from the document,
        // or that new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
        // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
        // So, this function translates the old "map" output array into its best guess of what set of current DOM nodes should be removed.
        //
        // Rules:
        //   [A] Any leading nodes that aren't in the document any more should be ignored
        //       These most likely correspond to memoization nodes that were already removed during binding
        //       See https://github.com/SteveSanderson/knockout/pull/440
        //   [B] We want to output a contiguous series of nodes that are still in the document. So, ignore any nodes that
        //       have already been removed, and include any nodes that have been inserted among the previous collection

        // Rule [A]
        while (contiguousNodeArray.length && !ko.utils.domNodeIsAttachedToDocument(contiguousNodeArray[0]))
            contiguousNodeArray.splice(0, 1);

        // Rule [B]
        if (contiguousNodeArray.length > 1) {
            // Build up the actual new contiguous node set
            var current = contiguousNodeArray[0], last = contiguousNodeArray[contiguousNodeArray.length - 1], newContiguousSet = [current];
            while (current !== last) {
                current = current.nextSibling;
                if (!current) // Won't happen, except if the developer has manually removed some DOM elements (then we're in an undefined scenario)
                    return;
                newContiguousSet.push(current);
            }

            // ... then mutate the input array to match this.
            // (The following line replaces the contents of contiguousNodeArray with newContiguousSet)
            Array.prototype.splice.apply(contiguousNodeArray, [0, contiguousNodeArray.length].concat(newContiguousSet));
        }
        return contiguousNodeArray;
    }

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.dependentObservable(function() {
            var newMappedNodes = mapping(valueToMap, index, fixUpNodesToBeMovedOrRemoved(mappedNodes)) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                ko.utils.replaceDomNodes(mappedNodes, newMappedNodes);
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.splice(0, mappedNodes.length);
            ko.utils.arrayPushAll(mappedNodes, newMappedNodes);
        }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return !ko.utils.anyDomNodeIsAttachedToDocument(mappedNodes); } });
        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
    }

    var lastMappingResultDomDataKey = "setDomNodeChildrenFromArrayMapping_lastMappingResult";

    ko.utils.setDomNodeChildrenFromArrayMapping = function (domNode, array, mapping, options, callbackAfterAddingNodes) {
        // Compare the provided array against the previous one
        array = array || [];
        options = options || {};
        var isFirstExecution = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) === undefined;
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) || [];
        var lastArray = ko.utils.arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
        var editScript = ko.utils.compareArrays(lastArray, array, options['dontLimitMoves']);

        // Build the new mapping result
        var newMappingResult = [];
        var lastMappingResultIndex = 0;
        var newMappingResultIndex = 0;

        var nodesToDelete = [];
        var itemsToProcess = [];
        var itemsForBeforeRemoveCallbacks = [];
        var itemsForMoveCallbacks = [];
        var itemsForAfterAddCallbacks = [];
        var mapData;

        function itemMovedOrRetained(editScriptIndex, oldPosition) {
            mapData = lastMappingResult[oldPosition];
            if (newMappingResultIndex !== oldPosition)
                itemsForMoveCallbacks[editScriptIndex] = mapData;
            // Since updating the index might change the nodes, do so before calling fixUpNodesToBeMovedOrRemoved
            mapData.indexObservable(newMappingResultIndex++);
            fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes);
            newMappingResult.push(mapData);
            itemsToProcess.push(mapData);
        }

        function callCallback(callback, items) {
            if (callback) {
                for (var i = 0, n = items.length; i < n; i++) {
                    if (items[i]) {
                        ko.utils.arrayForEach(items[i].mappedNodes, function(node) {
                            callback(node, i, items[i].arrayEntry);
                        });
                    }
                }
            }
        }

        for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
            movedIndex = editScriptItem['moved'];
            switch (editScriptItem['status']) {
                case "deleted":
                    if (movedIndex === undefined) {
                        mapData = lastMappingResult[lastMappingResultIndex];

                        // Stop tracking changes to the mapping for these nodes
                        if (mapData.dependentObservable)
                            mapData.dependentObservable.dispose();

                        // Queue these nodes for later removal
                        nodesToDelete.push.apply(nodesToDelete, fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes));
                        if (options['beforeRemove']) {
                            itemsForBeforeRemoveCallbacks[i] = mapData;
                            itemsToProcess.push(mapData);
                        }
                    }
                    lastMappingResultIndex++;
                    break;

                case "retained":
                    itemMovedOrRetained(i, lastMappingResultIndex++);
                    break;

                case "added":
                    if (movedIndex !== undefined) {
                        itemMovedOrRetained(i, movedIndex);
                    } else {
                        mapData = { arrayEntry: editScriptItem['value'], indexObservable: ko.observable(newMappingResultIndex++) };
                        newMappingResult.push(mapData);
                        itemsToProcess.push(mapData);
                        if (!isFirstExecution)
                            itemsForAfterAddCallbacks[i] = mapData;
                    }
                    break;
            }
        }

        // Call beforeMove first before any changes have been made to the DOM
        callCallback(options['beforeMove'], itemsForMoveCallbacks);

        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
        ko.utils.arrayForEach(nodesToDelete, options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
        for (var i = 0, nextNode = ko.virtualElements.firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
            // Get nodes for newly added items
            if (!mapData.mappedNodes)
                ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
                if (node !== nextNode)
                    ko.virtualElements.insertAfter(domNode, node, lastNode);
            }

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
            }
        }

        // If there's a beforeRemove callback, call it after reordering.
        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
        // Perhaps we'll make that change in the future if this scenario becomes more common.
        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

        // Finally call afterMove and afterAdd callbacks
        callCallback(options['afterMove'], itemsForMoveCallbacks);
        callCallback(options['afterAdd'], itemsForAfterAddCallbacks);

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);
    }
})();

ko.exportSymbol('utils.setDomNodeChildrenFromArrayMapping', ko.utils.setDomNodeChildrenFromArrayMapping);
ko.nativeTemplateEngine = function () {
    this['allowTemplateRewriting'] = false;
}

ko.nativeTemplateEngine.prototype = new ko.templateEngine();
ko.nativeTemplateEngine.prototype.constructor = ko.nativeTemplateEngine;
ko.nativeTemplateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
    var useNodesIfAvailable = !(ko.utils.ieVersion < 9), // IE<9 cloneNode doesn't work properly
        templateNodesFunc = useNodesIfAvailable ? templateSource['nodes'] : null,
        templateNodes = templateNodesFunc ? templateSource['nodes']() : null;

    if (templateNodes) {
        return ko.utils.makeArray(templateNodes.cloneNode(true).childNodes);
    } else {
        var templateText = templateSource['text']();
        return ko.utils.parseHtmlFragment(templateText);
    }
};

ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
ko.setTemplateEngine(ko.nativeTemplateEngine.instance);

ko.exportSymbol('nativeTemplateEngine', ko.nativeTemplateEngine);
(function() {
    ko.jqueryTmplTemplateEngine = function () {
        // Detect which version of jquery-tmpl you're using. Unfortunately jquery-tmpl
        // doesn't expose a version number, so we have to infer it.
        // Note that as of Knockout 1.3, we only support jQuery.tmpl 1.0.0pre and later,
        // which KO internally refers to as version "2", so older versions are no longer detected.
        var jQueryTmplVersion = this.jQueryTmplVersion = (function() {
            if ((typeof(jQuery) == "undefined") || !(jQuery['tmpl']))
                return 0;
            // Since it exposes no official version number, we use our own numbering system. To be updated as jquery-tmpl evolves.
            try {
                if (jQuery['tmpl']['tag']['tmpl']['open'].toString().indexOf('__') >= 0) {
                    // Since 1.0.0pre, custom tags should append markup to an array called "__"
                    return 2; // Final version of jquery.tmpl
                }
            } catch(ex) { /* Apparently not the version we were looking for */ }

            return 1; // Any older version that we don't support
        })();

        function ensureHasReferencedJQueryTemplates() {
            if (jQueryTmplVersion < 2)
                throw new Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");
        }

        function executeTemplate(compiledTemplate, data, jQueryTemplateOptions) {
            return jQuery['tmpl'](compiledTemplate, data, jQueryTemplateOptions);
        }

        this['renderTemplateSource'] = function(templateSource, bindingContext, options) {
            options = options || {};
            ensureHasReferencedJQueryTemplates();

            // Ensure we have stored a precompiled version of this template (don't want to reparse on every render)
            var precompiled = templateSource['data']('precompiled');
            if (!precompiled) {
                var templateText = templateSource['text']() || "";
                // Wrap in "with($whatever.koBindingContext) { ... }"
                templateText = "{{ko_with $item.koBindingContext}}" + templateText + "{{/ko_with}}";

                precompiled = jQuery['template'](null, templateText);
                templateSource['data']('precompiled', precompiled);
            }

            var data = [bindingContext['$data']]; // Prewrap the data in an array to stop jquery.tmpl from trying to unwrap any arrays
            var jQueryTemplateOptions = jQuery['extend']({ 'koBindingContext': bindingContext }, options['templateOptions']);

            var resultNodes = executeTemplate(precompiled, data, jQueryTemplateOptions);
            resultNodes['appendTo'](document.createElement("div")); // Using "appendTo" forces jQuery/jQuery.tmpl to perform necessary cleanup work

            jQuery['fragments'] = {}; // Clear jQuery's fragment cache to avoid a memory leak after a large number of template renders
            return resultNodes;
        };

        this['createJavaScriptEvaluatorBlock'] = function(script) {
            return "{{ko_code ((function() { return " + script + " })()) }}";
        };

        this['addTemplate'] = function(templateName, templateMarkup) {
            document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
        };

        if (jQueryTmplVersion > 0) {
            jQuery['tmpl']['tag']['ko_code'] = {
                open: "__.push($1 || '');"
            };
            jQuery['tmpl']['tag']['ko_with'] = {
                open: "with($1) {",
                close: "} "
            };
        }
    };

    ko.jqueryTmplTemplateEngine.prototype = new ko.templateEngine();
    ko.jqueryTmplTemplateEngine.prototype.constructor = ko.jqueryTmplTemplateEngine;

    // Use this one by default *only if jquery.tmpl is referenced*
    var jqueryTmplTemplateEngineInstance = new ko.jqueryTmplTemplateEngine();
    if (jqueryTmplTemplateEngineInstance.jQueryTmplVersion > 0)
        ko.setTemplateEngine(jqueryTmplTemplateEngineInstance);

    ko.exportSymbol('jqueryTmplTemplateEngine', ko.jqueryTmplTemplateEngine);
})();
}));
}());
})();


/*global define, document*/
define('scalejs.layout-cssgrid-splitter/splitter', [
    'scalejs!core',
    'hammer'
], function (
    core,
    hammer
) {
    

    /*
    function getStyle(element, cssRule) {
        var value;

        if (document.defaultView && document.defaultView.getComputedStyle) {
            value = document.defaultView.getComputedStyle(element, "").getPropertyValue(cssRule);
        } else if (element.currentStyle) {
            cssRule = cssRule.replace(/\-(\w)/g, function (match, p) {
                return p.toUpperCase();
            });
            value = element.currentStyle[cssRule];
        }

        return value;
    }*/

    function handleDrag(element) {
        var resizer;

        function createResizer(rowOrColumn, deltaProperty, e) {
            var position = (element.currentStyle && element.currentStyle['-ms-grid-' + rowOrColumn]) ||
                            element.getAttribute('data-ms-grid-' + rowOrColumn),
                grid = element.parentNode,
                definition = (grid.currentStyle && grid.currentStyle['-ms-grid-' + rowOrColumn + 's']) ||
                              grid.getAttribute('data-ms-grid-' + rowOrColumn + 's'),
                index,
                dragStartDefinitions;

            function updateDefinitions(delta) {
                var prev = dragStartDefinitions[index - 1],
                    next = dragStartDefinitions[index + 1],
                    definitions = dragStartDefinitions.slice();

                function resize(measure, delta) {
                    //console.log('--->resize: ' + left + ' by ' + delta);
                    var value = /(\d+)/.exec(measure);
                    if (value) {
                        return (Math.max(parseInt(value, 10) + delta, 0)) + 'px';
                    }

                    return measure;
                }

                if (!prev.match(/fr/i)) {
                    definitions[index - 1] = resize(prev, delta);
                    return definitions;
                }

                if (!next.match(/fr/i)) {
                    definitions[index + 1] = resize(next, -delta);
                    return definitions;
                }
            }

            function resize(e) {
                var newDefinitions = updateDefinitions(e.gesture[deltaProperty]);
                if (newDefinitions) {
                    element.parentNode.setAttribute('style', '-ms-grid-' + rowOrColumn + 's: ' + newDefinitions.join(' '));
                    if (core.layout.cssGrid) {
                        core.layout.cssGrid.layout();
                    }
                }
            }

            function stop(e) {
                resize(e);
            }

            if (!definition) {
                return;
            }

            try {
                index = parseInt(position, 10) - 1;
            } catch (ex) {
                return;
            }

            dragStartDefinitions = definition.match(/\S+/g);

            resize(e);

            return {
                resize: resize,
                stop: stop
            };
        }

        function startResizing(e) {
            return element.offsetWidth > element.offsetHeight
                ? createResizer('row', 'deltaY', e)
                : createResizer('column', 'deltaX', e);
        }

        return function (e) {
            switch (e.type) {
            case 'dragstart':
                resizer = startResizing(e);
                break;
            case 'drag':
                resizer.resize(e);
                break;
            case 'dragend':
                resizer.stop(e);
                break;
            }
        };
    }

    /*jslint unparam:true*/
    function init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        //element.setAttribute('data-ms-grid-column', '2');
        //element.parentNode.setAttribute('data-ms-grid-columns', 'auto 50px 1fr 1fr');
        hammer(element).on('dragstart drag dragend', handleDrag(element));
    }
    /*jslint unparam:false*/

    return {
        init: init
    };
});
/*global define*/
define('scalejs.layout-cssgrid-splitter',[
    './scalejs.layout-cssgrid-splitter/splitter',
    'knockout'
], function (
    splitter,
    ko
) {
    

    ko.bindingHandlers.splitter = splitter;
});


/*--------------------------------------------------------------------------
 * linq.js - LINQ for JavaScript
 * ver 3.0.2-RC (Sep. 16th, 2012)
 *
 * created and maintained by neuecc <ils@neue.cc>
 * licensed under MIT License
 * http://linqjs.codeplex.com/
 *------------------------------------------------------------------------*/
(function(w,j){var l="enumerator is disposed",q="single:sequence contains more than one element.",a=false,b=null,e=true,g={Identity:function(a){return a},True:function(){return e},Blank:function(){}},i={Boolean:typeof e,Number:typeof 0,String:typeof"",Object:typeof{},Undefined:typeof j,Function:typeof function(){}},d={createLambda:function(a){if(a==b)return g.Identity;if(typeof a==i.String)if(a=="")return g.Identity;else if(a.indexOf("=>")==-1){var m=new RegExp("[$]+","g"),c=0,j;while(j=m.exec(a)){var e=j[0].length;if(e>c)c=e}for(var f=[],d=1;d<=c;d++){for(var h="",l=0;l<d;l++)h+="$";f.push(h)}var n=Array.prototype.join.call(f,",");return new Function(n,"return "+a)}else{var k=a.match(/^[(\s]*([^()]*?)[)\s]*=>(.*)/);return new Function(k[1],"return "+k[2])}return a},isIEnumerable:function(b){if(typeof Enumerator!==i.Undefined)try{new Enumerator(b);return e}catch(c){}return a},defineProperty:Object.defineProperties!=b?function(c,b,d){Object.defineProperty(c,b,{enumerable:a,configurable:e,writable:e,value:d})}:function(b,a,c){b[a]=c},compare:function(a,b){return a===b?0:a>b?1:-1},dispose:function(a){a!=b&&a.dispose()}},o={Before:0,Running:1,After:2},f=function(d,f,g){var c=new u,b=o.Before;this.current=c.current;this.moveNext=function(){try{switch(b){case o.Before:b=o.Running;d();case o.Running:if(f.apply(c))return e;else{this.dispose();return a}case o.After:return a}}catch(g){this.dispose();throw g;}};this.dispose=function(){if(b!=o.Running)return;try{g()}finally{b=o.After}}},u=function(){var c=b;this.current=function(){return c};this.yieldReturn=function(a){c=a;return e};this.yieldBreak=function(){return a}},c=function(a){this.getEnumerator=a};c.Utils={};c.Utils.createLambda=function(a){return d.createLambda(a)};c.Utils.createEnumerable=function(a){return new c(a)};c.Utils.createEnumerator=function(a,b,c){return new f(a,b,c)};c.Utils.extendTo=function(i){var e=i.prototype,f;if(i===Array){f=h.prototype;d.defineProperty(e,"getSource",function(){return this})}else{f=c.prototype;d.defineProperty(e,"getEnumerator",function(){return c.from(this).getEnumerator()})}for(var a in f){var g=f[a];if(e[a]==g)continue;if(e[a]!=b){a=a+"ByLinq";if(e[a]==g)continue}g instanceof Function&&d.defineProperty(e,a,g)}};c.choice=function(){var a=arguments;return new c(function(){return new f(function(){a=a[0]instanceof Array?a[0]:a[0].getEnumerator!=b?a[0].toArray():a},function(){return this.yieldReturn(a[Math.floor(Math.random()*a.length)])},g.Blank)})};c.cycle=function(){var a=arguments;return new c(function(){var c=0;return new f(function(){a=a[0]instanceof Array?a[0]:a[0].getEnumerator!=b?a[0].toArray():a},function(){if(c>=a.length)c=0;return this.yieldReturn(a[c++])},g.Blank)})};c.empty=function(){return new c(function(){return new f(g.Blank,function(){return a},g.Blank)})};c.from=function(j){if(j==b)return c.empty();if(j instanceof c)return j;if(typeof j==i.Number||typeof j==i.Boolean)return c.repeat(j,1);if(typeof j==i.String)return new c(function(){var b=0;return new f(g.Blank,function(){return b<j.length?this.yieldReturn(j.charAt(b++)):a},g.Blank)});if(typeof j!=i.Function){if(typeof j.length==i.Number)return new h(j);if(!(j instanceof Object)&&d.isIEnumerable(j))return new c(function(){var c=e,b;return new f(function(){b=new Enumerator(j)},function(){if(c)c=a;else b.moveNext();return b.atEnd()?a:this.yieldReturn(b.item())},g.Blank)});if(typeof Windows===i.Object&&typeof j.first===i.Function)return new c(function(){var c=e,b;return new f(function(){b=j.first()},function(){if(c)c=a;else b.moveNext();return b.hasCurrent?this.yieldReturn(b.current):this.yieldBreak()},g.Blank)})}return new c(function(){var b=[],c=0;return new f(function(){for(var a in j){var c=j[a];!(c instanceof Function)&&Object.prototype.hasOwnProperty.call(j,a)&&b.push({key:a,value:c})}},function(){return c<b.length?this.yieldReturn(b[c++]):a},g.Blank)})},c.make=function(a){return c.repeat(a,1)};c.matches=function(h,e,d){if(d==b)d="";if(e instanceof RegExp){d+=e.ignoreCase?"i":"";d+=e.multiline?"m":"";e=e.source}if(d.indexOf("g")===-1)d+="g";return new c(function(){var b;return new f(function(){b=new RegExp(e,d)},function(){var c=b.exec(h);return c?this.yieldReturn(c):a},g.Blank)})};c.range=function(e,d,a){if(a==b)a=1;return new c(function(){var b,c=0;return new f(function(){b=e-a},function(){return c++<d?this.yieldReturn(b+=a):this.yieldBreak()},g.Blank)})};c.rangeDown=function(e,d,a){if(a==b)a=1;return new c(function(){var b,c=0;return new f(function(){b=e+a},function(){return c++<d?this.yieldReturn(b-=a):this.yieldBreak()},g.Blank)})};c.rangeTo=function(d,e,a){if(a==b)a=1;return d<e?new c(function(){var b;return new f(function(){b=d-a},function(){var c=b+=a;return c<=e?this.yieldReturn(c):this.yieldBreak()},g.Blank)}):new c(function(){var b;return new f(function(){b=d+a},function(){var c=b-=a;return c>=e?this.yieldReturn(c):this.yieldBreak()},g.Blank)})};c.repeat=function(a,d){return d!=b?c.repeat(a).take(d):new c(function(){return new f(g.Blank,function(){return this.yieldReturn(a)},g.Blank)})};c.repeatWithFinalize=function(a,e){a=d.createLambda(a);e=d.createLambda(e);return new c(function(){var c;return new f(function(){c=a()},function(){return this.yieldReturn(c)},function(){if(c!=b){e(c);c=b}})})};c.generate=function(a,e){if(e!=b)return c.generate(a).take(e);a=d.createLambda(a);return new c(function(){return new f(g.Blank,function(){return this.yieldReturn(a())},g.Blank)})};c.toInfinity=function(d,a){if(d==b)d=0;if(a==b)a=1;return new c(function(){var b;return new f(function(){b=d-a},function(){return this.yieldReturn(b+=a)},g.Blank)})};c.toNegativeInfinity=function(d,a){if(d==b)d=0;if(a==b)a=1;return new c(function(){var b;return new f(function(){b=d+a},function(){return this.yieldReturn(b-=a)},g.Blank)})};c.unfold=function(h,b){b=d.createLambda(b);return new c(function(){var d=e,c;return new f(g.Blank,function(){if(d){d=a;c=h;return this.yieldReturn(c)}c=b(c);return this.yieldReturn(c)},g.Blank)})};c.defer=function(a){return new c(function(){var b;return new f(function(){b=c.from(a()).getEnumerator()},function(){return b.moveNext()?this.yieldReturn(b.current()):this.yieldBreak()},function(){d.dispose(b)})})};c.prototype.traverseBreadthFirst=function(g,b){var h=this;g=d.createLambda(g);b=d.createLambda(b);return new c(function(){var i,k=0,j=[];return new f(function(){i=h.getEnumerator()},function(){while(e){if(i.moveNext()){j.push(i.current());return this.yieldReturn(b(i.current(),k))}var f=c.from(j).selectMany(function(a){return g(a)});if(!f.any())return a;else{k++;j=[];d.dispose(i);i=f.getEnumerator()}}},function(){d.dispose(i)})})};c.prototype.traverseDepthFirst=function(g,b){var h=this;g=d.createLambda(g);b=d.createLambda(b);return new c(function(){var j=[],i;return new f(function(){i=h.getEnumerator()},function(){while(e){if(i.moveNext()){var f=b(i.current(),j.length);j.push(i);i=c.from(g(i.current())).getEnumerator();return this.yieldReturn(f)}if(j.length<=0)return a;d.dispose(i);i=j.pop()}},function(){try{d.dispose(i)}finally{c.from(j).forEach(function(a){a.dispose()})}})})};c.prototype.flatten=function(){var h=this;return new c(function(){var j,i=b;return new f(function(){j=h.getEnumerator()},function(){while(e){if(i!=b)if(i.moveNext())return this.yieldReturn(i.current());else i=b;if(j.moveNext())if(j.current()instanceof Array){d.dispose(i);i=c.from(j.current()).selectMany(g.Identity).flatten().getEnumerator();continue}else return this.yieldReturn(j.current());return a}},function(){try{d.dispose(j)}finally{d.dispose(i)}})})};c.prototype.pairwise=function(b){var e=this;b=d.createLambda(b);return new c(function(){var c;return new f(function(){c=e.getEnumerator();c.moveNext()},function(){var d=c.current();return c.moveNext()?this.yieldReturn(b(d,c.current())):a},function(){d.dispose(c)})})};c.prototype.scan=function(i,g){var h;if(g==b){g=d.createLambda(i);h=a}else{g=d.createLambda(g);h=e}var j=this;return new c(function(){var b,c,k=e;return new f(function(){b=j.getEnumerator()},function(){if(k){k=a;if(!h){if(b.moveNext())return this.yieldReturn(c=b.current())}else return this.yieldReturn(c=i)}return b.moveNext()?this.yieldReturn(c=g(c,b.current())):a},function(){d.dispose(b)})})};c.prototype.select=function(e){e=d.createLambda(e);if(e.length<=1)return new m(this,b,e);else{var g=this;return new c(function(){var b,c=0;return new f(function(){b=g.getEnumerator()},function(){return b.moveNext()?this.yieldReturn(e(b.current(),c++)):a},function(){d.dispose(b)})})}};c.prototype.selectMany=function(g,e){var h=this;g=d.createLambda(g);if(e==b)e=function(b,a){return a};e=d.createLambda(e);return new c(function(){var k,i=j,l=0;return new f(function(){k=h.getEnumerator()},function(){if(i===j)if(!k.moveNext())return a;do{if(i==b){var f=g(k.current(),l++);i=c.from(f).getEnumerator()}if(i.moveNext())return this.yieldReturn(e(k.current(),i.current()));d.dispose(i);i=b}while(k.moveNext());return a},function(){try{d.dispose(k)}finally{d.dispose(i)}})})};c.prototype.where=function(b){b=d.createLambda(b);if(b.length<=1)return new n(this,b);else{var e=this;return new c(function(){var c,g=0;return new f(function(){c=e.getEnumerator()},function(){while(c.moveNext())if(b(c.current(),g++))return this.yieldReturn(c.current());return a},function(){d.dispose(c)})})}};c.prototype.choose=function(a){a=d.createLambda(a);var e=this;return new c(function(){var c,g=0;return new f(function(){c=e.getEnumerator()},function(){while(c.moveNext()){var d=a(c.current(),g++);if(d!=b)return this.yieldReturn(d)}return this.yieldBreak()},function(){d.dispose(c)})})};c.prototype.ofType=function(c){var a;switch(c){case Number:a=i.Number;break;case String:a=i.String;break;case Boolean:a=i.Boolean;break;case Function:a=i.Function;break;default:a=b}return a===b?this.where(function(a){return a instanceof c}):this.where(function(b){return typeof b===a})};c.prototype.zip=function(){var i=arguments,e=d.createLambda(arguments[arguments.length-1]),g=this;if(arguments.length==2){var h=arguments[0];return new c(function(){var i,b,j=0;return new f(function(){i=g.getEnumerator();b=c.from(h).getEnumerator()},function(){return i.moveNext()&&b.moveNext()?this.yieldReturn(e(i.current(),b.current(),j++)):a},function(){try{d.dispose(i)}finally{d.dispose(b)}})})}else return new c(function(){var a,h=0;return new f(function(){var b=c.make(g).concat(c.from(i).takeExceptLast().select(c.from)).select(function(a){return a.getEnumerator()}).toArray();a=c.from(b)},function(){if(a.all(function(a){return a.moveNext()})){var c=a.select(function(a){return a.current()}).toArray();c.push(h++);return this.yieldReturn(e.apply(b,c))}else return this.yieldBreak()},function(){c.from(a).forEach(d.dispose)})})};c.prototype.merge=function(){var b=arguments,a=this;return new c(function(){var e,g=-1;return new f(function(){e=c.make(a).concat(c.from(b).select(c.from)).select(function(a){return a.getEnumerator()}).toArray()},function(){while(e.length>0){g=g>=e.length-1?0:g+1;var a=e[g];if(a.moveNext())return this.yieldReturn(a.current());else{a.dispose();e.splice(g--,1)}}return this.yieldBreak()},function(){c.from(e).forEach(d.dispose)})})};c.prototype.join=function(n,i,h,l,k){i=d.createLambda(i);h=d.createLambda(h);l=d.createLambda(l);k=d.createLambda(k);var m=this;return new c(function(){var o,r,p=b,q=0;return new f(function(){o=m.getEnumerator();r=c.from(n).toLookup(h,g.Identity,k)},function(){while(e){if(p!=b){var c=p[q++];if(c!==j)return this.yieldReturn(l(o.current(),c));c=b;q=0}if(o.moveNext()){var d=i(o.current());p=r.get(d).toArray()}else return a}},function(){d.dispose(o)})})};c.prototype.groupJoin=function(l,h,e,j,i){h=d.createLambda(h);e=d.createLambda(e);j=d.createLambda(j);i=d.createLambda(i);var k=this;return new c(function(){var m=k.getEnumerator(),n=b;return new f(function(){m=k.getEnumerator();n=c.from(l).toLookup(e,g.Identity,i)},function(){if(m.moveNext()){var b=n.get(h(m.current()));return this.yieldReturn(j(m.current(),b))}return a},function(){d.dispose(m)})})};c.prototype.all=function(b){b=d.createLambda(b);var c=e;this.forEach(function(d){if(!b(d)){c=a;return a}});return c};c.prototype.any=function(c){c=d.createLambda(c);var b=this.getEnumerator();try{if(arguments.length==0)return b.moveNext();while(b.moveNext())if(c(b.current()))return e;return a}finally{d.dispose(b)}};c.prototype.isEmpty=function(){return!this.any()};c.prototype.concat=function(){var e=this;if(arguments.length==1){var g=arguments[0];return new c(function(){var i,h;return new f(function(){i=e.getEnumerator()},function(){if(h==b){if(i.moveNext())return this.yieldReturn(i.current());h=c.from(g).getEnumerator()}return h.moveNext()?this.yieldReturn(h.current()):a},function(){try{d.dispose(i)}finally{d.dispose(h)}})})}else{var h=arguments;return new c(function(){var a;return new f(function(){a=c.make(e).concat(c.from(h).select(c.from)).select(function(a){return a.getEnumerator()}).toArray()},function(){while(a.length>0){var b=a[0];if(b.moveNext())return this.yieldReturn(b.current());else{b.dispose();a.splice(0,1)}}return this.yieldBreak()},function(){c.from(a).forEach(d.dispose)})})}};c.prototype.insert=function(h,b){var g=this;return new c(function(){var j,i,l=0,k=a;return new f(function(){j=g.getEnumerator();i=c.from(b).getEnumerator()},function(){if(l==h&&i.moveNext()){k=e;return this.yieldReturn(i.current())}if(j.moveNext()){l++;return this.yieldReturn(j.current())}return!k&&i.moveNext()?this.yieldReturn(i.current()):a},function(){try{d.dispose(j)}finally{d.dispose(i)}})})};c.prototype.alternate=function(a){var g=this;return new c(function(){var j,i,k,h;return new f(function(){if(a instanceof Array||a.getEnumerator!=b)k=c.from(c.from(a).toArray());else k=c.make(a);i=g.getEnumerator();if(i.moveNext())j=i.current()},function(){while(e){if(h!=b)if(h.moveNext())return this.yieldReturn(h.current());else h=b;if(j==b&&i.moveNext()){j=i.current();h=k.getEnumerator();continue}else if(j!=b){var a=j;j=b;return this.yieldReturn(a)}return this.yieldBreak()}},function(){try{d.dispose(i)}finally{d.dispose(h)}})})};c.prototype.contains=function(f,b){b=d.createLambda(b);var c=this.getEnumerator();try{while(c.moveNext())if(b(c.current())===f)return e;return a}finally{d.dispose(c)}};c.prototype.defaultIfEmpty=function(g){var h=this;if(g===j)g=b;return new c(function(){var b,c=e;return new f(function(){b=h.getEnumerator()},function(){if(b.moveNext()){c=a;return this.yieldReturn(b.current())}else if(c){c=a;return this.yieldReturn(g)}return a},function(){d.dispose(b)})})};c.prototype.distinct=function(a){return this.except(c.empty(),a)};c.prototype.distinctUntilChanged=function(b){b=d.createLambda(b);var e=this;return new c(function(){var c,g,h;return new f(function(){c=e.getEnumerator()},function(){while(c.moveNext()){var d=b(c.current());if(h){h=a;g=d;return this.yieldReturn(c.current())}if(g===d)continue;g=d;return this.yieldReturn(c.current())}return this.yieldBreak()},function(){d.dispose(c)})})};c.prototype.except=function(e,b){b=d.createLambda(b);var g=this;return new c(function(){var h,i;return new f(function(){h=g.getEnumerator();i=new r(b);c.from(e).forEach(function(a){i.add(a)})},function(){while(h.moveNext()){var b=h.current();if(!i.contains(b)){i.add(b);return this.yieldReturn(b)}}return a},function(){d.dispose(h)})})};c.prototype.intersect=function(e,b){b=d.createLambda(b);var g=this;return new c(function(){var h,i,j;return new f(function(){h=g.getEnumerator();i=new r(b);c.from(e).forEach(function(a){i.add(a)});j=new r(b)},function(){while(h.moveNext()){var b=h.current();if(!j.contains(b)&&i.contains(b)){j.add(b);return this.yieldReturn(b)}}return a},function(){d.dispose(h)})})};c.prototype.sequenceEqual=function(h,f){f=d.createLambda(f);var g=this.getEnumerator();try{var b=c.from(h).getEnumerator();try{while(g.moveNext())if(!b.moveNext()||f(g.current())!==f(b.current()))return a;return b.moveNext()?a:e}finally{d.dispose(b)}}finally{d.dispose(g)}};c.prototype.union=function(e,b){b=d.createLambda(b);var g=this;return new c(function(){var k,h,i;return new f(function(){k=g.getEnumerator();i=new r(b)},function(){var b;if(h===j){while(k.moveNext()){b=k.current();if(!i.contains(b)){i.add(b);return this.yieldReturn(b)}}h=c.from(e).getEnumerator()}while(h.moveNext()){b=h.current();if(!i.contains(b)){i.add(b);return this.yieldReturn(b)}}return a},function(){try{d.dispose(k)}finally{d.dispose(h)}})})};c.prototype.orderBy=function(b){return new k(this,b,a)};c.prototype.orderByDescending=function(a){return new k(this,a,e)};c.prototype.reverse=function(){var b=this;return new c(function(){var c,d;return new f(function(){c=b.toArray();d=c.length},function(){return d>0?this.yieldReturn(c[--d]):a},g.Blank)})};c.prototype.shuffle=function(){var b=this;return new c(function(){var c;return new f(function(){c=b.toArray()},function(){if(c.length>0){var b=Math.floor(Math.random()*c.length);return this.yieldReturn(c.splice(b,1)[0])}return a},g.Blank)})};c.prototype.weightedSample=function(a){a=d.createLambda(a);var e=this;return new c(function(){var c,d=0;return new f(function(){c=e.choose(function(e){var c=a(e);if(c<=0)return b;d+=c;return{value:e,bound:d}}).toArray()},function(){if(c.length>0){var f=Math.floor(Math.random()*d)+1,e=-1,a=c.length;while(a-e>1){var b=Math.floor((e+a)/2);if(c[b].bound>=f)a=b;else e=b}return this.yieldReturn(c[a].value)}return this.yieldBreak()},g.Blank)})};c.prototype.groupBy=function(i,h,e,g){var j=this;i=d.createLambda(i);h=d.createLambda(h);if(e!=b)e=d.createLambda(e);g=d.createLambda(g);return new c(function(){var c;return new f(function(){c=j.toLookup(i,h,g).toEnumerable().getEnumerator()},function(){while(c.moveNext())return e==b?this.yieldReturn(c.current()):this.yieldReturn(e(c.current().key(),c.current()));return a},function(){d.dispose(c)})})};c.prototype.partitionBy=function(j,i,g,h){var l=this;j=d.createLambda(j);i=d.createLambda(i);h=d.createLambda(h);var k;if(g==b){k=a;g=function(b,a){return new t(b,a)}}else{k=e;g=d.createLambda(g)}return new c(function(){var b,n,o,m=[];return new f(function(){b=l.getEnumerator();if(b.moveNext()){n=j(b.current());o=h(n);m.push(i(b.current()))}},function(){var d;while((d=b.moveNext())==e)if(o===h(j(b.current())))m.push(i(b.current()));else break;if(m.length>0){var f=k?g(n,c.from(m)):g(n,m);if(d){n=j(b.current());o=h(n);m=[i(b.current())]}else m=[];return this.yieldReturn(f)}return a},function(){d.dispose(b)})})};c.prototype.buffer=function(e){var b=this;return new c(function(){var c;return new f(function(){c=b.getEnumerator()},function(){var b=[],d=0;while(c.moveNext()){b.push(c.current());if(++d>=e)return this.yieldReturn(b)}return b.length>0?this.yieldReturn(b):a},function(){d.dispose(c)})})};c.prototype.aggregate=function(c,b,a){a=d.createLambda(a);return a(this.scan(c,b,a).last())};c.prototype.average=function(a){a=d.createLambda(a);var c=0,b=0;this.forEach(function(d){c+=a(d);++b});return c/b};c.prototype.count=function(a){a=a==b?g.True:d.createLambda(a);var c=0;this.forEach(function(d,b){if(a(d,b))++c});return c};c.prototype.max=function(a){if(a==b)a=g.Identity;return this.select(a).aggregate(function(a,b){return a>b?a:b})};c.prototype.min=function(a){if(a==b)a=g.Identity;return this.select(a).aggregate(function(a,b){return a<b?a:b})};c.prototype.maxBy=function(a){a=d.createLambda(a);return this.aggregate(function(b,c){return a(b)>a(c)?b:c})};c.prototype.minBy=function(a){a=d.createLambda(a);return this.aggregate(function(b,c){return a(b)<a(c)?b:c})};c.prototype.sum=function(a){if(a==b)a=g.Identity;return this.select(a).aggregate(0,function(a,b){return a+b})};c.prototype.elementAt=function(d){var c,b=a;this.forEach(function(g,f){if(f==d){c=g;b=e;return a}});if(!b)throw new Error("index is less than 0 or greater than or equal to the number of elements in source.");return c};c.prototype.elementAtOrDefault=function(g,c){if(c===j)c=b;var f,d=a;this.forEach(function(c,b){if(b==g){f=c;d=e;return a}});return!d?c:f};c.prototype.first=function(c){if(c!=b)return this.where(c).first();var f,d=a;this.forEach(function(b){f=b;d=e;return a});if(!d)throw new Error("first:No element satisfies the condition.");return f};c.prototype.firstOrDefault=function(d,c){if(c===j)c=b;if(d!=b)return this.where(d).firstOrDefault(b,c);var g,f=a;this.forEach(function(b){g=b;f=e;return a});return!f?c:g};c.prototype.last=function(c){if(c!=b)return this.where(c).last();var f,d=a;this.forEach(function(a){d=e;f=a});if(!d)throw new Error("last:No element satisfies the condition.");return f};c.prototype.lastOrDefault=function(d,c){if(c===j)c=b;if(d!=b)return this.where(d).lastOrDefault(b,c);var g,f=a;this.forEach(function(a){f=e;g=a});return!f?c:g};c.prototype.single=function(d){if(d!=b)return this.where(d).single();var f,c=a;this.forEach(function(a){if(!c){c=e;f=a}else throw new Error(q);});if(!c)throw new Error("single:No element satisfies the condition.");return f};c.prototype.singleOrDefault=function(f,c){if(c===j)c=b;if(f!=b)return this.where(f).singleOrDefault(b,c);var g,d=a;this.forEach(function(a){if(!d){d=e;g=a}else throw new Error(q);});return!d?c:g};c.prototype.skip=function(e){var b=this;return new c(function(){var c,g=0;return new f(function(){c=b.getEnumerator();while(g++<e&&c.moveNext());},function(){return c.moveNext()?this.yieldReturn(c.current()):a},function(){d.dispose(c)})})};c.prototype.skipWhile=function(b){b=d.createLambda(b);var g=this;return new c(function(){var c,i=0,h=a;return new f(function(){c=g.getEnumerator()},function(){while(!h)if(c.moveNext()){if(!b(c.current(),i++)){h=e;return this.yieldReturn(c.current())}continue}else return a;return c.moveNext()?this.yieldReturn(c.current()):a},function(){d.dispose(c)})})};c.prototype.take=function(e){var b=this;return new c(function(){var c,g=0;return new f(function(){c=b.getEnumerator()},function(){return g++<e&&c.moveNext()?this.yieldReturn(c.current()):a},function(){d.dispose(c)})})};c.prototype.takeWhile=function(b){b=d.createLambda(b);var e=this;return new c(function(){var c,g=0;return new f(function(){c=e.getEnumerator()},function(){return c.moveNext()&&b(c.current(),g++)?this.yieldReturn(c.current()):a},function(){d.dispose(c)})})};c.prototype.takeExceptLast=function(e){if(e==b)e=1;var g=this;return new c(function(){if(e<=0)return g.getEnumerator();var b,c=[];return new f(function(){b=g.getEnumerator()},function(){while(b.moveNext()){if(c.length==e){c.push(b.current());return this.yieldReturn(c.shift())}c.push(b.current())}return a},function(){d.dispose(b)})})};c.prototype.takeFromLast=function(e){if(e<=0||e==b)return c.empty();var g=this;return new c(function(){var j,h,i=[];return new f(function(){j=g.getEnumerator()},function(){while(j.moveNext()){i.length==e&&i.shift();i.push(j.current())}if(h==b)h=c.from(i).getEnumerator();return h.moveNext()?this.yieldReturn(h.current()):a},function(){d.dispose(h)})})};c.prototype.indexOf=function(d){var c=b;if(typeof d===i.Function)this.forEach(function(e,b){if(d(e,b)){c=b;return a}});else this.forEach(function(e,b){if(e===d){c=b;return a}});return c!==b?c:-1};c.prototype.lastIndexOf=function(b){var a=-1;if(typeof b===i.Function)this.forEach(function(d,c){if(b(d,c))a=c});else this.forEach(function(d,c){if(d===b)a=c});return a};c.prototype.asEnumerable=function(){return c.from(this)};c.prototype.toArray=function(){var a=[];this.forEach(function(b){a.push(b)});return a};c.prototype.toLookup=function(c,b,a){c=d.createLambda(c);b=d.createLambda(b);a=d.createLambda(a);var e=new r(a);this.forEach(function(g){var f=c(g),a=b(g),d=e.get(f);if(d!==j)d.push(a);else e.add(f,[a])});return new v(e)};c.prototype.toObject=function(b,a){b=d.createLambda(b);a=d.createLambda(a);var c={};this.forEach(function(d){c[b(d)]=a(d)});return c};c.prototype.toDictionary=function(c,b,a){c=d.createLambda(c);b=d.createLambda(b);a=d.createLambda(a);var e=new r(a);this.forEach(function(a){e.add(c(a),b(a))});return e};c.prototype.toJSONString=function(a,c){if(typeof JSON===i.Undefined||JSON.stringify==b)throw new Error("toJSONString can't find JSON.stringify. This works native JSON support Browser or include json2.js");return JSON.stringify(this.toArray(),a,c)};c.prototype.toJoinedString=function(a,c){if(a==b)a="";if(c==b)c=g.Identity;return this.select(c).toArray().join(a)};c.prototype.doAction=function(b){var e=this;b=d.createLambda(b);return new c(function(){var c,g=0;return new f(function(){c=e.getEnumerator()},function(){if(c.moveNext()){b(c.current(),g++);return this.yieldReturn(c.current())}return a},function(){d.dispose(c)})})};c.prototype.forEach=function(c){c=d.createLambda(c);var e=0,b=this.getEnumerator();try{while(b.moveNext())if(c(b.current(),e++)===a)break}finally{d.dispose(b)}};c.prototype.write=function(c,f){if(c==b)c="";f=d.createLambda(f);var g=e;this.forEach(function(b){if(g)g=a;else document.write(c);document.write(f(b))})};c.prototype.writeLine=function(a){a=d.createLambda(a);this.forEach(function(b){document.writeln(a(b)+"<br />")})};c.prototype.force=function(){var a=this.getEnumerator();try{while(a.moveNext());}finally{d.dispose(a)}};c.prototype.letBind=function(b){b=d.createLambda(b);var e=this;return new c(function(){var g;return new f(function(){g=c.from(b(e)).getEnumerator()},function(){return g.moveNext()?this.yieldReturn(g.current()):a},function(){d.dispose(g)})})};c.prototype.share=function(){var i=this,c,h=a;return new s(function(){return new f(function(){if(c==b)c=i.getEnumerator()},function(){if(h)throw new Error(l);return c.moveNext()?this.yieldReturn(c.current()):a},g.Blank)},function(){h=e;d.dispose(c)})};c.prototype.memoize=function(){var j=this,h,c,i=a;return new s(function(){var d=-1;return new f(function(){if(c==b){c=j.getEnumerator();h=[]}},function(){if(i)throw new Error(l);d++;return h.length<=d?c.moveNext()?this.yieldReturn(h[d]=c.current()):a:this.yieldReturn(h[d])},g.Blank)},function(){i=e;d.dispose(c);h=b})};c.prototype.catchError=function(b){b=d.createLambda(b);var e=this;return new c(function(){var c;return new f(function(){c=e.getEnumerator()},function(){try{return c.moveNext()?this.yieldReturn(c.current()):a}catch(d){b(d);return a}},function(){d.dispose(c)})})};c.prototype.finallyAction=function(b){b=d.createLambda(b);var e=this;return new c(function(){var c;return new f(function(){c=e.getEnumerator()},function(){return c.moveNext()?this.yieldReturn(c.current()):a},function(){try{d.dispose(c)}finally{b()}})})};c.prototype.log=function(a){a=d.createLambda(a);return this.doAction(function(b){typeof console!==i.Undefined&&console.log(a(b))})};c.prototype.trace=function(c,a){if(c==b)c="Trace";a=d.createLambda(a);return this.doAction(function(b){typeof console!==i.Undefined&&console.log(c,a(b))})};var k=function(f,b,c,e){var a=this;a.source=f;a.keySelector=d.createLambda(b);a.descending=c;a.parent=e};k.prototype=new c;k.prototype.createOrderedEnumerable=function(a,b){return new k(this.source,a,b,this)};k.prototype.thenBy=function(b){return this.createOrderedEnumerable(b,a)};k.prototype.thenByDescending=function(a){return this.createOrderedEnumerable(a,e)};k.prototype.getEnumerator=function(){var h=this,d,c,e=0;return new f(function(){d=[];c=[];h.source.forEach(function(b,a){d.push(b);c.push(a)});var a=p.create(h,b);a.GenerateKeys(d);c.sort(function(b,c){return a.compare(b,c)})},function(){return e<c.length?this.yieldReturn(d[c[e++]]):a},g.Blank)};var p=function(c,d,e){var a=this;a.keySelector=c;a.descending=d;a.child=e;a.keys=b};p.create=function(a,d){var c=new p(a.keySelector,a.descending,d);return a.parent!=b?p.create(a.parent,c):c};p.prototype.GenerateKeys=function(d){var a=this;for(var f=d.length,g=a.keySelector,e=new Array(f),c=0;c<f;c++)e[c]=g(d[c]);a.keys=e;a.child!=b&&a.child.GenerateKeys(d)};p.prototype.compare=function(e,f){var a=this,c=d.compare(a.keys[e],a.keys[f]);return c==0?a.child!=b?a.child.compare(e,f):d.compare(e,f):a.descending?-c:c};var s=function(a,b){this.dispose=b;c.call(this,a)};s.prototype=new c;var h=function(a){this.getSource=function(){return a}};h.prototype=new c;h.prototype.any=function(a){return a==b?this.getSource().length>0:c.prototype.any.apply(this,arguments)};h.prototype.count=function(a){return a==b?this.getSource().length:c.prototype.count.apply(this,arguments)};h.prototype.elementAt=function(a){var b=this.getSource();return 0<=a&&a<b.length?b[a]:c.prototype.elementAt.apply(this,arguments)};h.prototype.elementAtOrDefault=function(c,a){if(a===j)a=b;var d=this.getSource();return 0<=c&&c<d.length?d[c]:a};h.prototype.first=function(d){var a=this.getSource();return d==b&&a.length>0?a[0]:c.prototype.first.apply(this,arguments)};h.prototype.firstOrDefault=function(e,a){if(a===j)a=b;if(e!=b)return c.prototype.firstOrDefault.apply(this,arguments);var d=this.getSource();return d.length>0?d[0]:a};h.prototype.last=function(d){var a=this.getSource();return d==b&&a.length>0?a[a.length-1]:c.prototype.last.apply(this,arguments)};h.prototype.lastOrDefault=function(e,a){if(a===j)a=b;if(e!=b)return c.prototype.lastOrDefault.apply(this,arguments);var d=this.getSource();return d.length>0?d[d.length-1]:a};h.prototype.skip=function(d){var b=this.getSource();return new c(function(){var c;return new f(function(){c=d<0?0:d},function(){return c<b.length?this.yieldReturn(b[c++]):a},g.Blank)})};h.prototype.takeExceptLast=function(a){if(a==b)a=1;return this.take(this.getSource().length-a)};h.prototype.takeFromLast=function(a){return this.skip(this.getSource().length-a)};h.prototype.reverse=function(){var b=this.getSource();return new c(function(){var c;return new f(function(){c=b.length},function(){return c>0?this.yieldReturn(b[--c]):a},g.Blank)})};h.prototype.sequenceEqual=function(d,e){return(d instanceof h||d instanceof Array)&&e==b&&c.from(d).count()!=this.count()?a:c.prototype.sequenceEqual.apply(this,arguments)};h.prototype.toJoinedString=function(a,e){var d=this.getSource();if(e!=b||!(d instanceof Array))return c.prototype.toJoinedString.apply(this,arguments);if(a==b)a="";return d.join(a)};h.prototype.getEnumerator=function(){var a=this.getSource(),b=-1;return{current:function(){return a[b]},moveNext:function(){return++b<a.length},dispose:g.Blank}};var n=function(b,a){this.prevSource=b;this.prevPredicate=a};n.prototype=new c;n.prototype.where=function(a){a=d.createLambda(a);if(a.length<=1){var e=this.prevPredicate,b=function(b){return e(b)&&a(b)};return new n(this.prevSource,b)}else return c.prototype.where.call(this,a)};n.prototype.select=function(a){a=d.createLambda(a);return a.length<=1?new m(this.prevSource,this.prevPredicate,a):c.prototype.select.call(this,a)};n.prototype.getEnumerator=function(){var c=this.prevPredicate,e=this.prevSource,b;return new f(function(){b=e.getEnumerator()},function(){while(b.moveNext())if(c(b.current()))return this.yieldReturn(b.current());return a},function(){d.dispose(b)})};var m=function(c,a,b){this.prevSource=c;this.prevPredicate=a;this.prevSelector=b};m.prototype=new c;m.prototype.where=function(a){a=d.createLambda(a);return a.length<=1?new n(this,a):c.prototype.where.call(this,a)};m.prototype.select=function(a){var b=this;a=d.createLambda(a);if(a.length<=1){var f=b.prevSelector,e=function(b){return a(f(b))};return new m(b.prevSource,b.prevPredicate,e)}else return c.prototype.select.call(b,a)};m.prototype.getEnumerator=function(){var e=this.prevPredicate,g=this.prevSelector,h=this.prevSource,c;return new f(function(){c=h.getEnumerator()},function(){while(c.moveNext())if(e==b||e(c.current()))return this.yieldReturn(g(c.current()));return a},function(){d.dispose(c)})};var r=function(){var d=function(a,b){return Object.prototype.hasOwnProperty.call(a,b)},h=function(a){return a===b?"null":a===j?"undefined":typeof a.toString===i.Function?a.toString():Object.prototype.toString.call(a)},m=function(d,c){var a=this;a.key=d;a.value=c;a.prev=b;a.next=b},k=function(){this.first=b;this.last=b};k.prototype={addLast:function(c){var a=this;if(a.last!=b){a.last.next=c;c.prev=a.last;a.last=c}else a.first=a.last=c},replace:function(c,a){if(c.prev!=b){c.prev.next=a;a.prev=c.prev}else this.first=a;if(c.next!=b){c.next.prev=a;a.next=c.next}else this.last=a},remove:function(a){if(a.prev!=b)a.prev.next=a.next;else this.first=a.next;if(a.next!=b)a.next.prev=a.prev;else this.last=a.prev}};var l=function(c){var a=this;a.countField=0;a.entryList=new k;a.buckets={};a.compareSelector=c==b?g.Identity:c};l.prototype={add:function(i,j){var a=this,g=a.compareSelector(i),f=h(g),c=new m(i,j);if(d(a.buckets,f)){for(var b=a.buckets[f],e=0;e<b.length;e++)if(a.compareSelector(b[e].key)===g){a.entryList.replace(b[e],c);b[e]=c;return}b.push(c)}else a.buckets[f]=[c];a.countField++;a.entryList.addLast(c)},"get":function(i){var a=this,c=a.compareSelector(i),g=h(c);if(!d(a.buckets,g))return j;for(var e=a.buckets[g],b=0;b<e.length;b++){var f=e[b];if(a.compareSelector(f.key)===c)return f.value}return j},"set":function(k,l){var b=this,g=b.compareSelector(k),j=h(g);if(d(b.buckets,j))for(var f=b.buckets[j],c=0;c<f.length;c++)if(b.compareSelector(f[c].key)===g){var i=new m(k,l);b.entryList.replace(f[c],i);f[c]=i;return e}return a},contains:function(j){var b=this,f=b.compareSelector(j),i=h(f);if(!d(b.buckets,i))return a;for(var g=b.buckets[i],c=0;c<g.length;c++)if(b.compareSelector(g[c].key)===f)return e;return a},clear:function(){this.countField=0;this.buckets={};this.entryList=new k},remove:function(g){var a=this,f=a.compareSelector(g),e=h(f);if(!d(a.buckets,e))return;for(var b=a.buckets[e],c=0;c<b.length;c++)if(a.compareSelector(b[c].key)===f){a.entryList.remove(b[c]);b.splice(c,1);if(b.length==0)delete a.buckets[e];a.countField--;return}},count:function(){return this.countField},toEnumerable:function(){var d=this;return new c(function(){var c;return new f(function(){c=d.entryList.first},function(){if(c!=b){var d={key:c.key,value:c.value};c=c.next;return this.yieldReturn(d)}return a},g.Blank)})}};return l}(),v=function(a){var b=this;b.count=function(){return a.count()};b.get=function(b){return c.from(a.get(b))};b.contains=function(b){return a.contains(b)};b.toEnumerable=function(){return a.toEnumerable().select(function(a){return new t(a.key,a.value)})}},t=function(b,a){this.key=function(){return b};h.call(this,a)};t.prototype=new h;if(typeof define===i.Function&&define.amd)define("linqjs",[],function(){return c});else if(typeof module!==i.Undefined&&module.exports)module.exports=c;else w.Enumerable=c})(this);

/*global define*/
define('scalejs.linq-linqjs',[
    'scalejs!core',
    'linqjs'
], function (
    core,
    Enumerable
) {
    

    core.registerExtension({
        linq: {
            enumerable: Enumerable
        }
    });
});


/// Knockout Mapping plugin v2.3.4
/// (c) 2012 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
/// License: MIT (http://www.opensource.org/licenses/mit-license.php)
(function (factory) {
	// Module systems magic dance.

	if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
		// CommonJS or Node: hard-coded dependency on "knockout"
		factory(require("knockout"), exports);
	} else if (typeof define === "function" && define["amd"]) {
		// AMD anonymous module with hard-coded dependency on "knockout"
		define('knockout.mapping',["knockout", "exports"], factory);
	} else {
		// <script> tag: use the global `ko` object, attaching a `mapping` property
		factory(ko, ko.mapping = {});
	}
}(function (ko, exports) {
	var DEBUG=true;
	var mappingProperty = "__ko_mapping__";
	var realKoDependentObservable = ko.dependentObservable;
	var mappingNesting = 0;
	var dependentObservables;
	var visitedObjects;
	var recognizedRootProperties = ["create", "update", "key", "arrayChanged"];
	var emptyReturn = {};

	var _defaultOptions = {
		include: ["_destroy"],
		ignore: [],
		copy: [],
		observe: []
	};
	var defaultOptions = _defaultOptions;

	// Author: KennyTM @ StackOverflow
	function unionArrays (x, y) {
		var obj = {};
		for (var i = x.length - 1; i >= 0; -- i) obj[x[i]] = x[i];
		for (var i = y.length - 1; i >= 0; -- i) obj[y[i]] = y[i];
		var res = [];

		for (var k in obj) {
			res.push(obj[k]);
		};

		return res;
	}

	function extendObject(destination, source) {
		var destType;

		for (var key in source) {
			if (source.hasOwnProperty(key) && source[key]) {
				destType = exports.getType(destination[key]);
				if (key && destination[key] && destType !== "array" && destType !== "string") {
					extendObject(destination[key], source[key]);
				} else {
					var bothArrays = exports.getType(destination[key]) === "array" && exports.getType(source[key]) === "array";
					if (bothArrays) {
						destination[key] = unionArrays(destination[key], source[key]);
					} else {
						destination[key] = source[key];
					}
				}
			}
		}
	}

	function merge(obj1, obj2) {
		var merged = {};
		extendObject(merged, obj1);
		extendObject(merged, obj2);

		return merged;
	}

	exports.isMapped = function (viewModel) {
		var unwrapped = ko.utils.unwrapObservable(viewModel);
		return unwrapped && unwrapped[mappingProperty];
	}

	exports.fromJS = function (jsObject /*, inputOptions, target*/ ) {
		if (arguments.length == 0) throw new Error("When calling ko.fromJS, pass the object you want to convert.");

		// When mapping is completed, even with an exception, reset the nesting level
		window.setTimeout(function () {
			mappingNesting = 0;
		}, 0);

		if (!mappingNesting++) {
			dependentObservables = [];
			visitedObjects = new objectLookup();
		}

		var options;
		var target;

		if (arguments.length == 2) {
			if (arguments[1][mappingProperty]) {
				target = arguments[1];
			} else {
				options = arguments[1];
			}
		}
		if (arguments.length == 3) {
			options = arguments[1];
			target = arguments[2];
		}

		if (target) {
			options = merge(options, target[mappingProperty]);
		}
		options = fillOptions(options);

		var result = updateViewModel(target, jsObject, options);
		if (target) {
			result = target;
		}

		// Evaluate any dependent observables that were proxied.
		// Do this in a timeout to defer execution. Basically, any user code that explicitly looks up the DO will perform the first evaluation. Otherwise,
		// it will be done by this code.
		if (!--mappingNesting) {
			window.setTimeout(function () {
				while (dependentObservables.length) {
					var DO = dependentObservables.pop();
					if (DO) DO();
				}
			}, 0);
		}

		// Save any new mapping options in the view model, so that updateFromJS can use them later.
		result[mappingProperty] = merge(result[mappingProperty], options);

		return result;
	};

	exports.fromJSON = function (jsonString /*, options, target*/ ) {
		var parsed = ko.utils.parseJson(jsonString);
		arguments[0] = parsed;
		return exports.fromJS.apply(this, arguments);
	};

	exports.updateFromJS = function (viewModel) {
		throw new Error("ko.mapping.updateFromJS, use ko.mapping.fromJS instead. Please note that the order of parameters is different!");
	};

	exports.updateFromJSON = function (viewModel) {
		throw new Error("ko.mapping.updateFromJSON, use ko.mapping.fromJSON instead. Please note that the order of parameters is different!");
	};

	exports.toJS = function (rootObject, options) {
		if (!defaultOptions) exports.resetDefaultOptions();

		if (arguments.length == 0) throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");
		if (exports.getType(defaultOptions.ignore) !== "array") throw new Error("ko.mapping.defaultOptions().ignore should be an array.");
		if (exports.getType(defaultOptions.include) !== "array") throw new Error("ko.mapping.defaultOptions().include should be an array.");
		if (exports.getType(defaultOptions.copy) !== "array") throw new Error("ko.mapping.defaultOptions().copy should be an array.");

		// Merge in the options used in fromJS
		options = fillOptions(options, rootObject[mappingProperty]);

		// We just unwrap everything at every level in the object graph
		return exports.visitModel(rootObject, function (x) {
			return ko.utils.unwrapObservable(x)
		}, options);
	};

	exports.toJSON = function (rootObject, options) {
		var plainJavaScriptObject = exports.toJS(rootObject, options);
		return ko.utils.stringifyJson(plainJavaScriptObject);
	};

	exports.defaultOptions = function () {
		if (arguments.length > 0) {
			defaultOptions = arguments[0];
		} else {
			return defaultOptions;
		}
	};

	exports.resetDefaultOptions = function () {
		defaultOptions = {
			include: _defaultOptions.include.slice(0),
			ignore: _defaultOptions.ignore.slice(0),
			copy: _defaultOptions.copy.slice(0)
		};
	};

	exports.getType = function(x) {
		if ((x) && (typeof (x) === "object")) {
			if (x.constructor == (new Date).constructor) return "date";
			if (Object.prototype.toString.call(x) === "[object Array]") return "array";
		}
		return typeof x;
	}

	function fillOptions(rawOptions, otherOptions) {
		var options = merge({}, rawOptions);

		// Move recognized root-level properties into a root namespace
		for (var i = recognizedRootProperties.length - 1; i >= 0; i--) {
			var property = recognizedRootProperties[i];
			
			// Carry on, unless this property is present
			if (!options[property]) continue;
			
			// Move the property into the root namespace
			if (!(options[""] instanceof Object)) options[""] = {};
			options[""][property] = options[property];
			delete options[property];
		}

		if (otherOptions) {
			options.ignore = mergeArrays(otherOptions.ignore, options.ignore);
			options.include = mergeArrays(otherOptions.include, options.include);
			options.copy = mergeArrays(otherOptions.copy, options.copy);
			options.observe = mergeArrays(otherOptions.observe, options.observe);
		}
		options.ignore = mergeArrays(options.ignore, defaultOptions.ignore);
		options.include = mergeArrays(options.include, defaultOptions.include);
		options.copy = mergeArrays(options.copy, defaultOptions.copy);
		options.observe = mergeArrays(options.observe, defaultOptions.observe);

		options.mappedProperties = options.mappedProperties || {};
		options.copiedProperties = options.copiedProperties || {};
		return options;
	}

	function mergeArrays(a, b) {
		if (exports.getType(a) !== "array") {
			if (exports.getType(a) === "undefined") a = [];
			else a = [a];
		}
		if (exports.getType(b) !== "array") {
			if (exports.getType(b) === "undefined") b = [];
			else b = [b];
		}

		return ko.utils.arrayGetDistinctValues(a.concat(b));
	}

	// When using a 'create' callback, we proxy the dependent observable so that it doesn't immediately evaluate on creation.
	// The reason is that the dependent observables in the user-specified callback may contain references to properties that have not been mapped yet.
	function withProxyDependentObservable(dependentObservables, callback) {
		var localDO = ko.dependentObservable;
		ko.dependentObservable = function (read, owner, options) {
			options = options || {};

			if (read && typeof read == "object") { // mirrors condition in knockout implementation of DO's
				options = read;
			}

			var realDeferEvaluation = options.deferEvaluation;

			var isRemoved = false;

			// We wrap the original dependent observable so that we can remove it from the 'dependentObservables' list we need to evaluate after mapping has
			// completed if the user already evaluated the DO themselves in the meantime.
			var wrap = function (DO) {
				// Temporarily revert ko.dependentObservable, since it is used in ko.isWriteableObservable
				var tmp = ko.dependentObservable;
				ko.dependentObservable = realKoDependentObservable;
				var isWriteable = ko.isWriteableObservable(DO);
				ko.dependentObservable = tmp;

				var wrapped = realKoDependentObservable({
					read: function () {
						if (!isRemoved) {
							ko.utils.arrayRemoveItem(dependentObservables, DO);
							isRemoved = true;
						}
						return DO.apply(DO, arguments);
					},
					write: isWriteable && function (val) {
						return DO(val);
					},
					deferEvaluation: true
				});
				if (DEBUG) wrapped._wrapper = true;
				return wrapped;
			};
			
			options.deferEvaluation = true; // will either set for just options, or both read/options.
			var realDependentObservable = new realKoDependentObservable(read, owner, options);

			if (!realDeferEvaluation) {
				realDependentObservable = wrap(realDependentObservable);
				dependentObservables.push(realDependentObservable);
			}

			return realDependentObservable;
		}
		ko.dependentObservable.fn = realKoDependentObservable.fn;
		ko.computed = ko.dependentObservable;
		var result = callback();
		ko.dependentObservable = localDO;
		ko.computed = ko.dependentObservable;
		return result;
	}

	function updateViewModel(mappedRootObject, rootObject, options, parentName, parent, parentPropertyName, mappedParent) {
		var isArray = exports.getType(ko.utils.unwrapObservable(rootObject)) === "array";

		parentPropertyName = parentPropertyName || "";

		// If this object was already mapped previously, take the options from there and merge them with our existing ones.
		if (exports.isMapped(mappedRootObject)) {
			var previousMapping = ko.utils.unwrapObservable(mappedRootObject)[mappingProperty];
			options = merge(previousMapping, options);
		}

		var callbackParams = {
			data: rootObject,
			parent: mappedParent || parent
		};

		var hasCreateCallback = function () {
			return options[parentName] && options[parentName].create instanceof Function;
		};

		var createCallback = function (data) {
			return withProxyDependentObservable(dependentObservables, function () {
				
				if (ko.utils.unwrapObservable(parent) instanceof Array) {
					return options[parentName].create({
						data: data || callbackParams.data,
						parent: callbackParams.parent,
						skip: emptyReturn
					});
				} else {
					return options[parentName].create({
						data: data || callbackParams.data,
						parent: callbackParams.parent
					});
				}				
			});
		};

		var hasUpdateCallback = function () {
			return options[parentName] && options[parentName].update instanceof Function;
		};

		var updateCallback = function (obj, data) {
			var params = {
				data: data || callbackParams.data,
				parent: callbackParams.parent,
				target: ko.utils.unwrapObservable(obj)
			};

			if (ko.isWriteableObservable(obj)) {
				params.observable = obj;
			}

			return options[parentName].update(params);
		}

		var alreadyMapped = visitedObjects.get(rootObject);
		if (alreadyMapped) {
			return alreadyMapped;
		}

		parentName = parentName || "";

		if (!isArray) {
			// For atomic types, do a direct update on the observable
			if (!canHaveProperties(rootObject)) {
				switch (exports.getType(rootObject)) {
				case "function":
					if (hasUpdateCallback()) {
						if (ko.isWriteableObservable(rootObject)) {
							rootObject(updateCallback(rootObject));
							mappedRootObject = rootObject;
						} else {
							mappedRootObject = updateCallback(rootObject);
						}
					} else {
						mappedRootObject = rootObject;
					}
					break;
				default:
					if (ko.isWriteableObservable(mappedRootObject)) {
						if (hasUpdateCallback()) {
							var valueToWrite = updateCallback(mappedRootObject);
							mappedRootObject(valueToWrite);
							return valueToWrite;
						} else {
							var valueToWrite = ko.utils.unwrapObservable(rootObject);
							mappedRootObject(valueToWrite);
							return valueToWrite;
						}
					} else {
						var hasCreateOrUpdateCallback = hasCreateCallback() || hasUpdateCallback();
						
						if (hasCreateCallback()) {
							mappedRootObject = createCallback();
						} else {
							mappedRootObject = ko.observable(ko.utils.unwrapObservable(rootObject));
						}

						if (hasUpdateCallback()) {
							mappedRootObject(updateCallback(mappedRootObject));
						}
						
						if (hasCreateOrUpdateCallback) return mappedRootObject;
					}
				}

			} else {
				mappedRootObject = ko.utils.unwrapObservable(mappedRootObject);
				if (!mappedRootObject) {
					if (hasCreateCallback()) {
						var result = createCallback();

						if (hasUpdateCallback()) {
							result = updateCallback(result);
						}

						return result;
					} else {
						if (hasUpdateCallback()) {
							return updateCallback(result);
						}

						mappedRootObject = {};
					}
				}

				if (hasUpdateCallback()) {
					mappedRootObject = updateCallback(mappedRootObject);
				}

				visitedObjects.save(rootObject, mappedRootObject);
				if (hasUpdateCallback()) return mappedRootObject;

				// For non-atomic types, visit all properties and update recursively
				visitPropertiesOrArrayEntries(rootObject, function (indexer) {
					var fullPropertyName = parentPropertyName.length ? parentPropertyName + "." + indexer : indexer;

					if (ko.utils.arrayIndexOf(options.ignore, fullPropertyName) != -1) {
						return;
					}

					if (ko.utils.arrayIndexOf(options.copy, fullPropertyName) != -1) {
						mappedRootObject[indexer] = rootObject[indexer];
						return;
					}

					if(typeof rootObject[indexer] != "object" && typeof rootObject[indexer] != "array" && options.observe.length > 0 && ko.utils.arrayIndexOf(options.observe, fullPropertyName) == -1)
					{
						mappedRootObject[indexer] = rootObject[indexer];
						options.copiedProperties[fullPropertyName] = true;
						return;
					}
					
					// In case we are adding an already mapped property, fill it with the previously mapped property value to prevent recursion.
					// If this is a property that was generated by fromJS, we should use the options specified there
					var prevMappedProperty = visitedObjects.get(rootObject[indexer]);
					var retval = updateViewModel(mappedRootObject[indexer], rootObject[indexer], options, indexer, mappedRootObject, fullPropertyName, mappedRootObject);
					var value = prevMappedProperty || retval;
					
					if(options.observe.length > 0 && ko.utils.arrayIndexOf(options.observe, fullPropertyName) == -1)
					{
						mappedRootObject[indexer] = value();
						options.copiedProperties[fullPropertyName] = true;
						return;
					}
					
					if (ko.isWriteableObservable(mappedRootObject[indexer])) {
						mappedRootObject[indexer](ko.utils.unwrapObservable(value));
					} else {
						mappedRootObject[indexer] = value;
					}

					options.mappedProperties[fullPropertyName] = true;
				});
			}
		} else { //mappedRootObject is an array
			var changes = [];

			var hasKeyCallback = false;
			var keyCallback = function (x) {
				return x;
			}
			if (options[parentName] && options[parentName].key) {
				keyCallback = options[parentName].key;
				hasKeyCallback = true;
			}

			if (!ko.isObservable(mappedRootObject)) {
				// When creating the new observable array, also add a bunch of utility functions that take the 'key' of the array items into account.
				mappedRootObject = ko.observableArray([]);

				mappedRootObject.mappedRemove = function (valueOrPredicate) {
					var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) {
							return value === keyCallback(valueOrPredicate);
						};
					return mappedRootObject.remove(function (item) {
						return predicate(keyCallback(item));
					});
				}

				mappedRootObject.mappedRemoveAll = function (arrayOfValues) {
					var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
					return mappedRootObject.remove(function (item) {
						return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
					});
				}

				mappedRootObject.mappedDestroy = function (valueOrPredicate) {
					var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) {
							return value === keyCallback(valueOrPredicate);
						};
					return mappedRootObject.destroy(function (item) {
						return predicate(keyCallback(item));
					});
				}

				mappedRootObject.mappedDestroyAll = function (arrayOfValues) {
					var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
					return mappedRootObject.destroy(function (item) {
						return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
					});
				}

				mappedRootObject.mappedIndexOf = function (item) {
					var keys = filterArrayByKey(mappedRootObject(), keyCallback);
					var key = keyCallback(item);
					return ko.utils.arrayIndexOf(keys, key);
				}

				mappedRootObject.mappedCreate = function (value) {
					if (mappedRootObject.mappedIndexOf(value) !== -1) {
						throw new Error("There already is an object with the key that you specified.");
					}

					var item = hasCreateCallback() ? createCallback(value) : value;
					if (hasUpdateCallback()) {
						var newValue = updateCallback(item, value);
						if (ko.isWriteableObservable(item)) {
							item(newValue);
						} else {
							item = newValue;
						}
					}
					mappedRootObject.push(item);
					return item;
				}
			}

			var currentArrayKeys = filterArrayByKey(ko.utils.unwrapObservable(mappedRootObject), keyCallback).sort();
			var newArrayKeys = filterArrayByKey(rootObject, keyCallback);
			if (hasKeyCallback) newArrayKeys.sort();
			var editScript = ko.utils.compareArrays(currentArrayKeys, newArrayKeys);

			var ignoreIndexOf = {};
			
			var i, j;

			var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);
			var itemsByKey = {};
			var optimizedKeys = true;
			for (i = 0, j = unwrappedRootObject.length; i < j; i++) {
				var key = keyCallback(unwrappedRootObject[i]);
				if (key === undefined || key instanceof Object) {
					optimizedKeys = false;
					break;
				}
				itemsByKey[key] = unwrappedRootObject[i];
			}

			var newContents = [];
			var passedOver = 0;
			for (i = 0, j = editScript.length; i < j; i++) {
				var key = editScript[i];
				var mappedItem;
				var fullPropertyName = parentPropertyName + "[" + i + "]";
				switch (key.status) {
				case "added":
					var item = optimizedKeys ? itemsByKey[key.value] : getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
					mappedItem = updateViewModel(undefined, item, options, parentName, mappedRootObject, fullPropertyName, parent);
					if(!hasCreateCallback()) {
						mappedItem = ko.utils.unwrapObservable(mappedItem);
					}

					var index = ignorableIndexOf(ko.utils.unwrapObservable(rootObject), item, ignoreIndexOf);
					
					if (mappedItem === emptyReturn) {
						passedOver++;
					} else {
						newContents[index - passedOver] = mappedItem;
					}
						
					ignoreIndexOf[index] = true;
					break;
				case "retained":
					var item = optimizedKeys ? itemsByKey[key.value] : getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
					mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
					updateViewModel(mappedItem, item, options, parentName, mappedRootObject, fullPropertyName, parent);

					var index = ignorableIndexOf(ko.utils.unwrapObservable(rootObject), item, ignoreIndexOf);
					newContents[index] = mappedItem;
					ignoreIndexOf[index] = true;
					break;
				case "deleted":
					mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
					break;
				}

				changes.push({
					event: key.status,
					item: mappedItem
				});
			}

			mappedRootObject(newContents);

			if (options[parentName] && options[parentName].arrayChanged) {
				ko.utils.arrayForEach(changes, function (change) {
					options[parentName].arrayChanged(change.event, change.item);
				});
			}
		}

		return mappedRootObject;
	}

	function ignorableIndexOf(array, item, ignoreIndices) {
		for (var i = 0, j = array.length; i < j; i++) {
			if (ignoreIndices[i] === true) continue;
			if (array[i] === item) return i;
		}
		return null;
	}

	function mapKey(item, callback) {
		var mappedItem;
		if (callback) mappedItem = callback(item);
		if (exports.getType(mappedItem) === "undefined") mappedItem = item;

		return ko.utils.unwrapObservable(mappedItem);
	}

	function getItemByKey(array, key, callback) {
		array = ko.utils.unwrapObservable(array);
		for (var i = 0, j = array.length; i < j; i++) {
			var item = array[i];
			if (mapKey(item, callback) === key) return item;
		}

		throw new Error("When calling ko.update*, the key '" + key + "' was not found!");
	}

	function filterArrayByKey(array, callback) {
		return ko.utils.arrayMap(ko.utils.unwrapObservable(array), function (item) {
			if (callback) {
				return mapKey(item, callback);
			} else {
				return item;
			}
		});
	}

	function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
		if (exports.getType(rootObject) === "array") {
			for (var i = 0; i < rootObject.length; i++)
			visitorCallback(i);
		} else {
			for (var propertyName in rootObject)
			visitorCallback(propertyName);
		}
	};

	function canHaveProperties(object) {
		var type = exports.getType(object);
		return ((type === "object") || (type === "array")) && (object !== null);
	}

	// Based on the parentName, this creates a fully classified name of a property

	function getPropertyName(parentName, parent, indexer) {
		var propertyName = parentName || "";
		if (exports.getType(parent) === "array") {
			if (parentName) {
				propertyName += "[" + indexer + "]";
			}
		} else {
			if (parentName) {
				propertyName += ".";
			}
			propertyName += indexer;
		}
		return propertyName;
	}

	exports.visitModel = function (rootObject, callback, options) {
		options = options || {};
		options.visitedObjects = options.visitedObjects || new objectLookup();

		var mappedRootObject;
		var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);

		if (!canHaveProperties(unwrappedRootObject)) {
			return callback(rootObject, options.parentName);
		} else {
			options = fillOptions(options, unwrappedRootObject[mappingProperty]);

			// Only do a callback, but ignore the results
			callback(rootObject, options.parentName);
			mappedRootObject = exports.getType(unwrappedRootObject) === "array" ? [] : {};
		}

		options.visitedObjects.save(rootObject, mappedRootObject);

		var parentName = options.parentName;
		visitPropertiesOrArrayEntries(unwrappedRootObject, function (indexer) {
			if (options.ignore && ko.utils.arrayIndexOf(options.ignore, indexer) != -1) return;

			var propertyValue = unwrappedRootObject[indexer];
			options.parentName = getPropertyName(parentName, unwrappedRootObject, indexer);

			// If we don't want to explicitly copy the unmapped property...
			if (ko.utils.arrayIndexOf(options.copy, indexer) === -1) {
				// ...find out if it's a property we want to explicitly include
				if (ko.utils.arrayIndexOf(options.include, indexer) === -1) {
					// The mapped properties object contains all the properties that were part of the original object.
					// If a property does not exist, and it is not because it is part of an array (e.g. "myProp[3]"), then it should not be unmapped.
				    if (unwrappedRootObject[mappingProperty]
				        && unwrappedRootObject[mappingProperty].mappedProperties && !unwrappedRootObject[mappingProperty].mappedProperties[indexer]
				        && unwrappedRootObject[mappingProperty].copiedProperties && !unwrappedRootObject[mappingProperty].copiedProperties[indexer]
				        && !(exports.getType(unwrappedRootObject) === "array")) {
						return;
					}
				}
			}

			var outputProperty;
			switch (exports.getType(ko.utils.unwrapObservable(propertyValue))) {
			case "object":
			case "array":
			case "undefined":
				var previouslyMappedValue = options.visitedObjects.get(propertyValue);
				mappedRootObject[indexer] = (exports.getType(previouslyMappedValue) !== "undefined") ? previouslyMappedValue : exports.visitModel(propertyValue, callback, options);
				break;
			default:
				mappedRootObject[indexer] = callback(propertyValue, options.parentName);
			}
		});

		return mappedRootObject;
	}

	function simpleObjectLookup() {
		var keys = [];
		var values = [];
		this.save = function (key, value) {
			var existingIndex = ko.utils.arrayIndexOf(keys, key);
			if (existingIndex >= 0) values[existingIndex] = value;
			else {
				keys.push(key);
				values.push(value);
			}
		};
		this.get = function (key) {
			var existingIndex = ko.utils.arrayIndexOf(keys, key);
			var value = (existingIndex >= 0) ? values[existingIndex] : undefined;
			return value;
		};
	};
	
	function objectLookup() {
		var buckets = {};
		
		var findBucket = function(key) {
			var bucketKey;
			try {
				bucketKey = key;//JSON.stringify(key);
			}
			catch (e) {
				bucketKey = "$$$";
			}

			var bucket = buckets[bucketKey];
			if (bucket === undefined) {
				bucket = new simpleObjectLookup();
				buckets[bucketKey] = bucket;
			}
			return bucket;
		};
		
		this.save = function (key, value) {
			findBucket(key).save(key, value);
		};
		this.get = function (key) {
			return findBucket(key).get(key);
		};
	};
}));


//knockout-classBindingProvider v0.4.0 | (c) 2012 Ryan Niemeyer | http://www.opensource.org/licenses/mit-license
// modified by Peter Lisovin:
// - requirejs-ified
// - added a `log` option
// - added a log warning if binding handler isn't found)
/*global define*/
define('scalejs.mvvm/classBindingProvider',['knockout'], function (ko) {
    
    //a bindingProvider that uses something different than data-bind attributes
    //  bindings - an object that contains the binding classes
    //  options - is an object that can include "attribute", "virtualAttribute", bindingRouter, and "fallback" options
    return function classBindingProvider(options) {
        var existingProvider = new ko.bindingProvider(),
            bindings = {},
            bindingRouter,
            attribute,
            virtualAttribute;

        //returns a binding class, given the class name and the bindings object
        function defaultBindingRouter(className) {
            var classPath, bindingObject;

            //if the class name matches a property directly, then return it
            if (bindings[className]) {
                return bindings[className];
            }

            //search for sub-properites that might contain the bindings
            classPath = className.split(".");
            bindingObject = classPath.reduce(function (bindingObject, cp) { return bindingObject[cp]; }, bindings);

            return bindingObject;
        }

        function registerBindings(newBindings) {
            //allow bindings to be registered after instantiation
	        ko.utils.extend(bindings, newBindings);
        }

        function nodeHasBindings(node) {
            //determine if an element has any bindings
            var result, value;

            if (node.nodeType === 1) {
                result = node.getAttribute(attribute);
            } else if (node.nodeType === 8) {
                value = (node.nodeValue || node.text || '').toString();
                result = value.indexOf(virtualAttribute) > -1;
            }

            if (!result && options.fallback) {
                result = existingProvider.nodeHasBindings(node);
            }


            return result;
        }

        function getBindings(node, bindingContext) {
            //return the bindings given a node and the bindingContext
            var bindingAccessor,
                binding,
                bindingName,
                result = {},
                value,
                index,
                classes = "";

            if (node.nodeType === 1) {
                classes = node.getAttribute(attribute);
            } else if (node.nodeType === 8) {
                value = (node.nodeValue || node.text || '').toString();
                index = value.indexOf(virtualAttribute);

                if (index > -1) {
                    classes = value.substring(index + virtualAttribute.length);
                }
            }

            if (classes) {
                classes = classes
                    .replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, "")
                    .replace(/(\s|\u00A0){2,}/g, " ")
                    .split(' ');
                //evaluate each class, build a single object to return
                classes.forEach(function (cp) {
                    bindingAccessor = bindingRouter(cp);
                    if (bindingAccessor) {
                        binding = typeof bindingAccessor === "function"
                            ? bindingAccessor.call(bindingContext.$data, bindingContext, classes)
                            : bindingAccessor;
                        ko.utils.extend(result, binding);
                    }
                });
            } else if (options.fallback) {
                result = existingProvider.getBindings(node, bindingContext);
            }

            //inspect the returned bindings
            for (bindingName in result) {
                if (result.hasOwnProperty(bindingName) &&
                        bindingName !== "_ko_property_writers" &&
                            bindingName !== 'valueUpdate' &&
                                !ko.bindingHandlers[bindingName]) {
                    if (options.log) {
                        if (binding) {
                            options.log('Unknown binding handler "' + bindingName + '" found in',
                                        node,
                                        'defined in data-class "' + classes + '" as',
                                        binding,
                                        'Make sure that binding handler\'s name spelled correctly ' +
                                        'and that it\'s properly registered. ' +
                                        'The binding will be ignored.');
                        } else {
                            options.log('Unknown binding handler "' + bindingName + '" in',
                                        node,
                                        'Make sure that it\'s name spelled correctly and that it\'s ' +
                                        'properly registered. ' +
                                        'The binding will be ignored.');
                        }
                    }
                }
            }

            return result;
        }

        options = options || {};
        attribute = options.attribute || "data-class";
        virtualAttribute = "ko " + (options.virtualAttribute || "class") + ":";
        bindingRouter = options.bindingRouter || defaultBindingRouter;

        return {
            registerBindings: registerBindings,
            getBindings: getBindings,
            nodeHasBindings: nodeHasBindings,
            bindingRouter: bindingRouter
        };
    };
});
/*global define,document*/
define('scalejs.mvvm/htmlTemplateSource',[
    'knockout',
    'scalejs!core'
], function (
    ko,
    core
) {
    

	var toArray = core.array.toArray,
        has = core.object.has,
        templateEngine = new ko.nativeTemplateEngine(),
		templates = {
            data: {}
        };

	function registerTemplates(templatesHtml) {
		// iterate through all templates (e.g. children of root in templatesHtml)
		// for every child get its templateId and templateHtml 
		// and add it to 'templates'			
		var div = document.createElement('div');
		div.innerHTML = templatesHtml;
		toArray(div.childNodes).forEach(function (childNode) {
			if (childNode.nodeType === 1 && has(childNode, 'id')) {
				templates[childNode.id] = childNode.innerHTML;
			}
		});
	}

	function makeTemplateSource(templateId) {
		function data(key, value) {
            if (!has(templates.data, templateId)) {
                templates.data[templateId] = {};
            }

            // if called with only key then return the associated value
			if (arguments.length === 1) {
				return templates.data[templateId][key];
			}

			// if called with key and value then store the value
			templates.data[templateId][key] = value;
		}

		function text(value) {
			// if no value return the template content since that's what KO wants
			if (arguments.length === 0) {
				return templates[templateId];
			}

            throw new Error('An attempt to override template "' + templateId + '" with content "' + value + '" ' +
                            'Template overriding is not supported.');
		}

		return {
			data: data,
			text: text
		};
	}

    templateEngine.makeTemplateSource = makeTemplateSource;

    ko.setTemplateEngine(templateEngine);

    return {
		registerTemplates: registerTemplates
	};
});

/*global define,document,setTimeout*/
/*jslint nomen: true*/
/// <reference path="../Scripts/knockout-2.2.1.debug.js" />
define('scalejs.mvvm/selectableArray',[
    'knockout',
    'scalejs!core'
], function (
    ko,
    core
) {
    /// <param name="ko" value="window.ko"/>
    

    var isObservable = ko.isObservable,
        unwrap = ko.utils.unwrapObservable,
        observable = ko.observable,
        computed = ko.computed,
        has = core.object.has,
        array = core.array;

    return function selectableArray(items, opts) {
        /*selectable(items, {
            selectedItem: selectedTile,
            selectionPolicy: 'single',
            isSelectedPath: 'isSelected'
        });*/
        opts = opts || {};

        var selectedItem = opts.selectedItem || observable(),
            selectionPolicy = opts.selectionPolicy || 'single',
            result;

        function ensureIsSelectedExists(item) {
            // if item has isSelected property which is observable and selectedPath is not set
            // then nothing to do
            if (isObservable(item.isSelected) && (!has(opts.isSelectedPath) || opts.isSelectedPath === 'isSelected')) {
                return;
            }

            if (isObservable(item.isSelected)) {
                throw new Error('item has observable `isSelected` property but `isSelectedPath` specified as "' +
                                opts.isSelectedPath + '". `selectable` uses `isSelected` property of an item ' +
                                'to determine whether it\'s selected. Either don\'t specify `isSelectedPath` or ' +
                                'rename `isSelected` property to something else.');
            }

            if (item.hasOwnProperty('isSelected')) {
                throw new Error('item has non-observable `isSelected` property. `selectable` uses `isSelected` ' +
                                'property of an item to determine whether it\'s selected. Either make `isSelected` ' +
                                'observable or rename it.');
            }

            item.isSelected = observable();

            // subscribe isSelectedPath property to isSelected
            if (has(opts.isSelectedPath) &&
                    opts.isSelectedPath !== 'isSelected' &&
                        !isObservable(item[opts.isSelectedPath])) {
                throw new Error('item\'s property "' + opts.isSelectedPath + '" specified by `isSelectedPath` ' +
                                ' isn\'t observable. Either make it observable or specify different property in ' +
                                ' `isSelectedPath`');
            }

            if (has(opts.isSelectedPath)) {
                item.isSelected = item[opts.isSelectedPath];
            }

            item.isSelected.subscribe(function (newValue) {
                if (newValue) {
                    selectedItem(item);
                } else {
                    if (selectedItem() === item) {
                        selectedItem(undefined);
                    }
                }
            });
        }

        // subscribe to isSelected property of every item if isSelectedPath is specified
        if (isObservable(items)) {
            result = computed(function () {
                var unwrapped = unwrap(items);
                unwrapped.forEach(ensureIsSelectedExists);
                return array.copy(unwrapped);
            });
        } else {
            items.forEach(ensureIsSelectedExists);
            result = array.copy(items);
        }

        selectedItem.subscribe(function (newItem) {
            unwrap(result).forEach(function (item) {
                item.isSelected(item === newItem);
            });

            if (selectionPolicy === 'deselect' && newItem) {
                setTimeout(function () { selectedItem(undefined); }, 0);
            }
        });

        result.selectedItem = selectedItem;

        return result;
    };
});

/*global define*/
define('scalejs.mvvm/ko.utils',[
    'scalejs!core',
    'knockout'
], function (
    core,
    ko
) {
    

    function cloneNodes(nodesArray, shouldCleanNodes) {
        return core.array.toArray(nodesArray).map(function (node) {
            var clonedNode = node.cloneNode(true);
            return shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode;
        });
    }

    return {
        cloneNodes: cloneNodes
    };
});

/*global define,document*/
/*jslint nomen: true*/
define('scalejs.mvvm/mvvm',[
    'knockout',
    'knockout.mapping',
    'scalejs!core',
    './classBindingProvider',
    './htmlTemplateSource',
    './selectableArray',
    './ko.utils',
    'module'
], function (
    ko,
    mapping,
    core,
    createClassBindingProvider,
    htmlTemplateSource,
    selectableArray,
    koUtils,
    module
) {
    

    var merge = core.object.merge,
        toArray = core.array.toArray,
        classBindingProvider = createClassBindingProvider({
            log: module.config().logWarnings ? core.log.warn : undefined,
            fallback: true
        }),
        root = ko.observable();

    ko.bindingProvider.instance = classBindingProvider;

    function observable(initialValue) {
        return ko.observable(initialValue);
    }

    function observableArray(initialValue) {
        return ko.observableArray(initialValue);
    }

    function computed(func) {
        return ko.computed(func);
    }

    function toJson(viewModel) {
        // Extracts underlying value from observables
        return mapping.toJSON(viewModel);
    }

    function toObject(viewModel) {
        return JSON.parse(toJson(viewModel));
    }

    function registerBindings(newBindings) {
        classBindingProvider.registerBindings(newBindings);
    }

    function toViewModel(data, viewModel, mappings) {
        var knockoutStyleMappings = Object.keys(mappings).reduce(function (o, k) {
            return merge(o, {
                k: k,
                create: function (options) { return mappings[k](options.data); }
            });
        }, {});

        return mapping.fromJS(data, knockoutStyleMappings, viewModel);
    }

    function registerTemplates() {
        toArray(arguments).forEach(htmlTemplateSource.registerTemplates);
    }

    function dataBinding(name, data) {
        var binding = {};

        binding[name] = data;

        return binding;
    }

    function template(name, data) {
        return dataBinding('template', {
            name: name,
            data: data
        });
    }

    function dataClass(name, data) {
        return {
            dataClass: name,
            viewmodel: data
        };
    }

    function init() {
        var body = document.getElementsByTagName('body')[0];

        body.innerHTML = '<!-- ko class: scalejs-shell --><!-- /ko -->';
        registerBindings({
            'scalejs-shell': function (context) {
                return {
                    render: context.$data.root
                };
            }
        });

        ko.applyBindings({ root: root });
    }

    return {
        core: {
            mvvm: {
                toJson: toJson,
                registerBindings: registerBindings,
                registerTemplates: registerTemplates,
                dataClass: dataClass,
                template: template,
                dataBinding: dataBinding,
                selectableArray: selectableArray,
                ko: {
                    utils: koUtils
                }
            }
        },
        sandbox: {
            mvvm: {
                observable: observable,
                observableArray: observableArray,
                computed: computed,
                registerBindings: registerBindings,
                registerTemplates: registerTemplates,
                toJson: toJson,
                toViewModel: toViewModel,
                toObject: toObject,
                dataClass: dataClass,
                template: template,
                dataBinding: dataBinding,
                selectableArray: selectableArray,
                root: root
            }
        },
        init: init
    };
});

/*global define*/
define('scalejs.bindings/change',[
    'knockout',
    'scalejs!core'
], function (
    ko,
    core
) {
    

    var is = core.type.is,
        has = core.object.has;

    /*jslint unparam: true*/
    function init(element, valueAccessor, allBindingsAccessor, viewModel) {
        if (!has(viewModel)) {
            return;
        }

        var unwrap = ko.utils.unwrapObservable,
            value = valueAccessor(),
            properties = unwrap(value),
            property,
            handler,
            //currentValue,
            changeHandler;

        function bindPropertyChangeHandler(h, currentValue) {
            return function (newValue) {
                if (newValue !== currentValue) {
                    currentValue = newValue;
                    h.call(viewModel, newValue, element);
                }
            };
        }

        function subscribeChangeHandler(property, changeHandler) {
            ko.computed({
                read: function () {
                    var value = unwrap(viewModel[property]);
                    changeHandler(value);
                },
                disposeWhenNodeIsRemoved: element
            });
        }

        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                handler = properties[property];
                if (is(handler.initial, 'function')) {
                    handler.initial.apply(viewModel, [unwrap(viewModel[property]), element]);
                }
                if (is(handler.update, 'function')) {
                    changeHandler = bindPropertyChangeHandler(handler.update, unwrap(viewModel[property]));
                }
                if (is(handler, 'function')) {
                    changeHandler = bindPropertyChangeHandler(handler, unwrap(viewModel[property]));
                }
                if (changeHandler) {
                    subscribeChangeHandler(property, changeHandler);
                }
            }
        }
    }
    /*jslint unparam: false*/

    return {
        init: init
    };
});

/*global define,setTimeout*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.bindings/render',[
    'scalejs!core',
    'knockout',
    'scalejs.functional'
], function (
    core,
    ko
) {
    /// <param name="ko" value="window.ko" />
    

    var is = core.type.is,
        has = core.object.has,
        unwrap = ko.utils.unwrapObservable,
        complete = core.functional.builders.complete,
        $DO = core.functional.builder.$DO,
        oldElement,
        oldBinding,
        context;


    function init() {
        return { 'controlsDescendantBindings' : true };
    }

    /*jslint unparam: true*/
    function update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = unwrap(valueAccessor()),
            inTransition,
            outTransition,
            bindingAccessor,
            binding,
            result;

        if (!value) {
            return;
        }

        if (is(value.dataClass, 'string')) {
            // if dataClass is specified then get the binding from the bindingRouter
            bindingAccessor = ko.bindingProvider.instance.bindingRouter(value.dataClass);
            if (!bindingAccessor) {
                throw new Error('Don\'t know how to render binding "' + value.dataClass +
                                '" - no such binding registered. ' +
                                'Either register the bindng or correct its name.');
            }

            if (bindingAccessor) {
                binding = is(bindingAccessor, 'function')
                        ? bindingAccessor.call(value.viewmodel || viewModel, bindingContext)
                        : bindingAccessor;
            }

        } else {
            // otherwise whole object is the binding
            binding = is(value, 'function') ? value.call(viewModel, bindingContext) : value;
        }

        if (has(oldBinding) && has(oldBinding.transitions, 'outTransitions')) {
            outTransition = complete.apply(null,
                oldBinding.transitions.outTransitions.map(function (t) { return $DO(t); }));
            context = {
                getElement: function () {
                    return oldElement;
                }
            };

            outTransition.call(context, function () {
                result = ko.applyBindingsToNode(element, binding, viewModel);
            });
        } else {
            result = ko.applyBindingsToNode(element, binding, viewModel);
        }

        if (has(binding, 'transitions')) {
            if (has(binding.transitions, 'inTransitions')) {
                inTransition = complete.apply(null, binding.transitions.inTransitions.map(function (t) { return $DO(t); }));
                context = {
                    getElement: function () {
                        return element;
                    }
                };

                setTimeout(function () {
                    inTransition.call(context);
                }, 0);
            }
            oldBinding = binding;
            oldElement = element;
        } else {
            oldBinding = undefined;
            oldElement = undefined;
        }

        if (is(binding, 'afterRender', 'function')) {
            binding.afterRender(element);
        }

        if (is(value, 'afterRender', 'function')) {
            value.afterRender(element);
        }

        return result;
    }
    /*jslint unparam: false*/

    return {
        init: init,
        update: update
    };
});

/*global define*/
define('scalejs.mvvm',[
    'scalejs!core',
    'knockout',
    'scalejs.mvvm/mvvm',
    './scalejs.bindings/change',
    './scalejs.bindings/render'
], function (
    core,
    ko,
    mvvm,
    changeBinding,
    renderBinding
) {
    

    ko.bindingHandlers.change = changeBinding;
    ko.bindingHandlers.render = renderBinding;

    ko.virtualElements.allowedBindings.change = true;
    ko.virtualElements.allowedBindings.render = true;
    ko.virtualElements.allowedBindings.transitionable = true;

    mvvm.init();

    core.registerExtension(mvvm);
});


//   Copyright 2011-2012 Jacob Beard, INFICON, and other SCION contributors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

//UMD boilerplate - https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('scion',factory);
    } else {
        // Browser globals (root is window)
        root.SCION = factory();
  }
}(this, function () {

    

    var STATE_TYPES = {
        BASIC: 0,
        COMPOSITE: 1,
        PARALLEL: 2,
        HISTORY: 3,
        INITIAL: 4,
        FINAL: 5
    };

    function initializeModel(rootState){
        var transitions = [], idToStateMap = {}, documentOrder = 0;

        //TODO: need to add fake ids to anyone that doesn't have them
        //FIXME: make this safer - break into multiple passes
        var idCount = {};

        function generateId(type){
            if(idCount[type] === undefined) idCount[type] = 0;

            var count = idCount[type]++;
            return '$generated-' + type + '-' + count; 
        }

        function wrapInFakeRootState(state){
            return {
                states : [
                    {
                        type : 'initial',
                        transitions : [{
                            target : state
                        }]
                    },
                    state
                ]
            };
        }

        function traverse(ancestors,state){

            //add to global transition and state id caches
            if(state.transitions) transitions.push.apply(transitions,state.transitions);

            //populate state id map
            if(state.id){
                if(idToStateMap[state.id]) throw new Error('Redefinition of state id ' + state.id);

                idToStateMap[state.id] = state;
            }

            //create a default type, just to normalize things
            //this way we can check for unsupported types below
            state.type = state.type || 'state';

            //add ancestors and depth properties
            state.ancestors = ancestors;
            state.depth = ancestors.length;
            state.parent = ancestors[0];

            //add some information to transitions
            state.transitions = state.transitions || [];
            state.transitions.forEach(function(transition){
                transition.documentOrder = documentOrder++; 
                transition.source = state;
            });

            var t2 = traverse.bind(null,[state].concat(ancestors));

            //recursive step
            if(state.states) state.states.forEach(t2);

            //setup fast state type
            switch(state.type){
                case 'parallel':
                    state.typeEnum = STATE_TYPES.PARALLEL;
                    break;
                case 'initial' : 
                    state.typeEnum = STATE_TYPES.INITIAL;
                    break;
                case 'history' :
                    state.typeEnum = STATE_TYPES.HISTORY;
                    break;
                case 'final' : 
                    state.typeEnum = STATE_TYPES.FINAL;
                    break;
                case 'state' : 
                case 'scxml' :
                    if(state.states && state.states.length){
                        state.typeEnum = STATE_TYPES.COMPOSITE;
                    }else{
                        state.typeEnum = STATE_TYPES.BASIC;
                    }
                    break;
                default :
                    throw new Error('Unknown state type: ' + state.type);
            }

            //descendants property on states will now be populated. add descendants to this state
            if(state.states){
                state.descendants = state.states.concat(state.states.map(function(s){return s.descendants;}).reduce(function(a,b){return a.concat(b);},[]));
            }else{
                state.descendants = [];
            }

            var initialChildren;
            if(state.typeEnum === STATE_TYPES.COMPOSITE){
                //set up initial state
                
                if(typeof state.initial === 'string'){
                    //dereference him from his 
                    initialChildren = state.states.filter(function(child){
                        return child.id === state.initial;
                    });
                    if(initialChildren.length){
                        state.initialRef = initialChildren[0];
                    } 
                }else{
                    //take the first child that has initial type, or first child
                    initialChildren = state.states.filter(function(child){
                        return child.type === 'initial';
                    });

                    state.initialRef = initialChildren.length ? initialChildren[0] : state.states[0];
                }

                if(!state.initialRef) throw new Error('Unable to locate initial state for composite state: ' + state.id);
            }

            //hook up history
            if(state.typeEnum === STATE_TYPES.COMPOSITE ||
                    state.typeEnum === STATE_TYPES.PARALLEL){

                var historyChildren = state.states.filter(function(s){
                    return s.type === 'history';
                }); 

               state.historyRef = historyChildren[0];
            }

            //now it's safe to fill in fake state ids
            if(!state.id){
                state.id = generateId(state.type);
                idToStateMap[state.id] = state;
            }

            //normalize onEntry/onExit, which can be single fn or array
            ['onEntry','onExit'].forEach(function(prop){
                if(typeof state[prop] === 'function'){
                    state[prop] = [state[prop]];
                }
            });
        }

        //TODO: convert events to regular expressions in advance

        function connectTransitionGraph(){
            //normalize as with onEntry/onExit
            transitions.forEach(function(t){
                if(typeof t.onTransition === 'function'){
                    t.onTransition = [t.onTransition];
                }
            });

            transitions.forEach(function(t){
                //normalize "event" attribute into "events" attribute
                if(t.event){
                    t.events = t.event.trim().split(/ +/);
                }
            });

            //hook up targets
            transitions.forEach(function(t){
                if(t.targets || (typeof t.target === 'undefined')) return;   //targets have already been set up

                if(typeof t.target === 'string'){
                    //console.log('here1');
                    var target = idToStateMap[t.target];
                    if(!target) throw new Error('Unable to find target state with id ' + t.target);
                    t.target = target;
                    t.targets = [t.target];
                }else if(Array.isArray(t.target)){
                    //console.log('here2');
                    t.targets = t.target.map(function(target){
                        if(typeof target === 'string'){
                            target = idToStateMap[target];
                            if(!target) throw new Error('Unable to find target state with id ' + t.target);
                            return target;
                        }else{
                            return target;
                        } 
                    }); 
                }else if(typeof t.target === 'object'){
                    t.targets = [t.target];
                }else{
                    throw new Error('Transition target has unknown type: ' + t.target);
                }
            });

            //hook up LCA - optimization
            transitions.forEach(function(t){
                if(t.targets) t.lcca = getLCCA(t.source,t.targets[0]);    //FIXME: we technically do not need to hang onto the lcca. only the scope is used by the algorithm

                t.scope = getScope(t);
                //console.log('scope',t.source.id,t.scope.id,t.targets);
            });
        }

        function getScope(transition){
            //Transition scope is normally the least common compound ancestor (lcca).
            //Internal transitions have a scope equal to the source state.

            var transitionIsReallyInternal = 
                    transition.type === 'internal' &&
                        transition.source.parent &&    //root state won't have parent
                            transition.targets && //does it target its descendants
                                transition.targets.every(
                                    function(target){ return transition.source.descendants.indexOf(target) > -1;});

            if(!transition.targets){
                return transition.source; 
            }else if(transitionIsReallyInternal){
                return transition.source; 
            }else{
                return transition.lcca;
            }
        }

        function getLCCA(s1, s2) {
            //console.log('getLCCA',s1, s2);
            var commonAncestors = [];
            s1.ancestors.forEach(function(anc){
                //console.log('s1.id',s1.id,'anc',anc.id,'anc.typeEnum',anc.typeEnum,'s2.id',s2.id);
                if(anc.typeEnum === STATE_TYPES.COMPOSITE &&
                    anc.descendants.indexOf(s2) > -1){
                    commonAncestors.push(anc);
                }
            });
            //console.log('commonAncestors',s1.id,s2.id,commonAncestors.map(function(s){return s.id;}));
            if(!commonAncestors.length) throw new Error("Could not find LCA for states.");
            return commonAncestors[0];
        }

        //main execution starts here
        //FIXME: only wrap in root state if it's not a compound state
        var fakeRootState = wrapInFakeRootState(rootState);  //I wish we had pointer semantics and could make this a C-style "out argument". Instead we return him
        traverse([],fakeRootState);
        connectTransitionGraph();

        return fakeRootState;
    }


    /* begin ArraySet */

    /** @constructor */
    function ArraySet(l) {
        l = l || [];
        this.o = [];
            
        l.forEach(function(x){
            this.add(x);
        },this);
    }

    ArraySet.prototype = {

        add : function(x) {
            if (!this.contains(x)) return this.o.push(x);
        },

        remove : function(x) {
            var i = this.o.indexOf(x);
            if(i === -1){
                return false;
            }else{
                this.o.splice(i, 1);
            }
            return true;
        },

        union : function(l) {
            l = l.iter ? l.iter() : l;
            l.forEach(function(x){
                this.add(x);
            },this);
            return this;
        },

        difference : function(l) {
            l = l.iter ? l.iter() : l;

            l.forEach(function(x){
                this.remove(x);
            },this);
            return this;
        },

        contains : function(x) {
            return this.o.indexOf(x) > -1;
        },

        iter : function() {
            return this.o;
        },

        isEmpty : function() {
            return !this.o.length;
        },

        equals : function(s2) {
            var l2 = s2.iter();
            var l1 = this.o;

            return l1.every(function(x){
                return l2.indexOf(x) > -1;
            }) && l2.every(function(x){
                return l1.indexOf(x) > -1;
            });
        },

        toString : function() {
            return "Set(" + this.o.toString() + ")";
        }
    };

    var scxmlPrefixTransitionSelector = (function(){

        var eventNameReCache = {};

        function eventNameToRe(name) {
            return new RegExp("^" + (name.replace(/\./g, "\\.")) + "(\\.[0-9a-zA-Z]+)*$");
        }

        function retrieveEventRe(name) {
            return eventNameReCache[name] ? eventNameReCache[name] : eventNameReCache[name] = eventNameToRe(name);
        }

        function nameMatch(t, event) {
            return event && event.name &&
                        (t.events.indexOf("*") > -1 ? 
                            true : 
                                t.events.filter(function(tEvent){
                                    return retrieveEventRe(tEvent).test(event.name);
                                }).length);

        }

        return function(state, event, evaluator) {
            return state.transitions.filter(function(t){
                return (!t.events || nameMatch(t,event)) && (!t.cond || evaluator(t.cond));
            });
        };
    })();

    //model accessor functions
    var query = {
        getAncestors: function(s, root) {
            var ancestors, index, state;
            index = s.ancestors.indexOf(root);
            if (index > -1) {
                return s.ancestors.slice(0, index);
            } else {
                return s.ancestors;
            }
        },
        /** @this {model} */
        getAncestorsOrSelf: function(s, root) {
            return [s].concat(this.getAncestors(s, root));
        },
        getDescendantsOrSelf: function(s) {
            return [s].concat(s.descendants);
        },
        /** @this {model} */
        isOrthogonalTo: function(s1, s2) {
            //Two control states are orthogonal if they are not ancestrally
            //related, and their smallest, mutual parent is a Concurrent-state.
            return !this.isAncestrallyRelatedTo(s1, s2) && this.getLCA(s1, s2).typeEnum === STATE_TYPES.PARALLEL;
        },
        /** @this {model} */
        isAncestrallyRelatedTo: function(s1, s2) {
            //Two control states are ancestrally related if one is child/grandchild of another.
            return this.getAncestorsOrSelf(s2).indexOf(s1) > -1 || this.getAncestorsOrSelf(s1).indexOf(s2) > -1;
        },
        /** @this {model} */
        getLCA: function(s1, s2) {
            var commonAncestors = this.getAncestors(s1).filter(function(a){
                return a.descendants.indexOf(s2) > -1;
            },this);
            return commonAncestors[0];
        }
    };
    
    //priority comparison functions
    function getTransitionWithHigherSourceChildPriority(_arg) {
        var t1 = _arg[0], t2 = _arg[1];
        //compare transitions based first on depth, then based on document order
        if (t1.source.depth < t2.source.depth) {
            return t2;
        } else if (t2.source.depth < t1.source.depth) {
            return t1;
        } else {
            if (t1.documentOrder < t2.documentOrder) {
                return t1;
            } else {
                return t2;
            }
        }
    }

    /** @const */
    var printTrace = false;

    /** @constructor */
    function BaseInterpreter(model, opts){
        this._model = initializeModel(model);

        //console.log(require('util').inspect(this._model,false,4));
       
        this.opts = opts || {};

        this.opts.log = opts.log || (typeof console === 'undefined' ? {log : function(){}} : console.log.bind(console));   //rely on global console if this console is undefined
        this.opts.Set = this.opts.Set || ArraySet;
        this.opts.priorityComparisonFn = this.opts.priorityComparisonFn || getTransitionWithHigherSourceChildPriority;
        this.opts.transitionSelector = this.opts.transitionSelector || scxmlPrefixTransitionSelector;

        this._sessionid = this.opts.sessionid || "";

        this._configuration = new this.opts.Set();
        this._historyValue = {};
        this._internalEventQueue = [];
        this._isInFinalState = false;
        this._timeoutMap = {};

        //SCXML system variables:
        this._x = {
            _sessionId : opts.sessionId || null,
            _name : model.name || opts.name || null,
            _ioprocessors : opts.ioprocessors || null
        };

        this._listeners = [];

        //this object will be the *this* object for onEntry/onExit/onTransition actions
        //It mostly just proxies to public and private methods on the statechart.
        //will also be available via locals?
        this._userScriptingContext = {
            raise : (function(eventOrName, data){
                var e;

                if (typeof eventOrName === 'string') {
                    e = {name: eventOrName, data: data};
                } else {
                    e = eventOrName;
                }
                this._internalEventQueue.push(e);
            }).bind(this),
            send : (function(){
                this.send.apply(this,arguments);
            }).bind(this),
            cancel : (function(){
                this.cancel.apply(this,arguments);
            }).bind(this)
            //TODO: other stuff...
        };
    }

    BaseInterpreter.prototype = {

        /** @expose */
        start : function() {
            //perform big step without events to take all default transitions and reach stable initial state
            if (printTrace) this.opts.log("performing initial big step");

            //We effectively need to figure out states to enter here to populate initial config. assuming root is compound state makes this simple.
            //but if we want it to be parallel, then this becomes more complex. so when initializing the model, we add a 'fake' root state, which
            //makes the following operation safe.
            this._configuration.add(this._model.initialRef);   

            this._performBigStep();
            return this.getConfiguration();
        },

        /** @expose */
        getConfiguration : function() {
            return this._configuration.iter().map(function(s){return s.id;});
        },

        /** @expose */
        getFullConfiguration : function() {
            return this._configuration.iter().
                    map(function(s){ return [s].concat(query.getAncestors(s));},this).
                    reduce(function(a,b){return a.concat(b);},[]).    //flatten
                    map(function(s){return s.id;}).
                    reduce(function(a,b){return a.indexOf(b) > -1 ? a : a.concat(b);},[]); //uniq
        },


        /** @expose */
        isIn : function(stateName) {
            return this.getFullConfiguration().indexOf(stateName) > -1;
        },

        /** @expose */
        isFinal : function(stateName) {
            return this._isInFinalState;
        },

        /** @private */
        _performBigStep : function(e) {
            if (e) this._internalEventQueue.push(e);
            var keepGoing = true;
            while (keepGoing) {
                var currentEvent = this._internalEventQueue.shift() || null;

                var selectedTransitions = this._performSmallStep(currentEvent);
                keepGoing = !selectedTransitions.isEmpty();
            }
            this._isInFinalState = this._configuration.iter().every(function(s){ return s.typeEnum === STATE_TYPES.FINAL; });
        },

        /** @private */
        _performSmallStep : function(currentEvent) {

            if (printTrace) this.opts.log("selecting transitions with currentEvent: ", currentEvent);

            var selectedTransitions = this._selectTransitions(currentEvent);

            if (printTrace) this.opts.log("selected transitions: ", selectedTransitions);

            if (!selectedTransitions.isEmpty()) {

                if (printTrace) this.opts.log("sorted transitions: ", selectedTransitions);

                //we only want to enter and exit states from transitions with targets
                //filter out targetless transitions here - we will only use these to execute transition actions
                var selectedTransitionsWithTargets = new this.opts.Set(selectedTransitions.iter().filter(function(t){return t.targets;}));

                var exitedTuple = this._getStatesExited(selectedTransitionsWithTargets), 
                    basicStatesExited = exitedTuple[0], 
                    statesExited = exitedTuple[1];

                var enteredTuple = this._getStatesEntered(selectedTransitionsWithTargets), 
                    basicStatesEntered = enteredTuple[0], 
                    statesEntered = enteredTuple[1];

                if (printTrace) this.opts.log("basicStatesExited ", basicStatesExited);
                if (printTrace) this.opts.log("basicStatesEntered ", basicStatesEntered);
                if (printTrace) this.opts.log("statesExited ", statesExited);
                if (printTrace) this.opts.log("statesEntered ", statesEntered);

                var eventsToAddToInnerQueue = new this.opts.Set();

                //update history states
                if (printTrace) this.opts.log("executing state exit actions");

                var evaluateAction = this._evaluateAction.bind(this, currentEvent);        //create helper fn that actions can call later on

                statesExited.forEach(function(state){

                    if (printTrace || this.opts.logStatesEnteredAndExited) this.opts.log("exiting ", state.id);

                    //invoke listeners
                    this._listeners.forEach(function(l){
                       if(l.onExit) l.onExit(state.id); 
                    });

                    if(state.onExit !== undefined) state.onExit.forEach(evaluateAction);

                    var f;
                    if (state.historyRef) {
                        if (state.historyRef.isDeep) {
                            f = function(s0) {
                                return s0.typeEnum === STATE_TYPES.BASIC && state.descendants.indexOf(s0) > -1;
                            };
                        } else {
                            f = function(s0) {
                                return s0.parent === state;
                            };
                        }
                        //update history
                        this._historyValue[state.historyRef.id] = statesExited.filter(f);
                    }
                },this);


                // -> Concurrency: Number of transitions: Multiple
                // -> Concurrency: Order of transitions: Explicitly defined
                var sortedTransitions = selectedTransitions.iter().sort(function(t1, t2) {
                    return t1.documentOrder - t2.documentOrder;
                });

                if (printTrace) this.opts.log("executing transitition actions");


                sortedTransitions.forEach(function(transition){

                    var targetIds = transition.targets && transition.targets.map(function(target){return target.id;});

                    this._listeners.forEach(function(l){
                       if(l.onTransition) l.onTransition(transition.source.id,targetIds); 
                    });

                    if(transition.onTransition !== undefined) transition.onTransition.forEach(evaluateAction);
                },this);
     
                if (printTrace) this.opts.log("executing state enter actions");

                statesEntered.forEach(function(state){

                    if (printTrace || this.opts.logStatesEnteredAndExited) this.opts.log("entering", state.id);

                    this._listeners.forEach(function(l){
                       if(l.onEntry) l.onEntry(state.id); 
                    });

                    if(state.onEntry !== undefined) state.onEntry.forEach(evaluateAction);
                },this);

                if (printTrace) this.opts.log("updating configuration ");
                if (printTrace) this.opts.log("old configuration ", this._configuration);

                //update configuration by removing basic states exited, and adding basic states entered
                this._configuration.difference(basicStatesExited);
                this._configuration.union(basicStatesEntered);


                if (printTrace) this.opts.log("new configuration ", this._configuration);
                
                //add set of generated events to the innerEventQueue -> Event Lifelines: Next small-step
                if (!eventsToAddToInnerQueue.isEmpty()) {
                    if (printTrace) this.opts.log("adding triggered events to inner queue ", eventsToAddToInnerQueue);
                    this._internalEventQueue.push(eventsToAddToInnerQueue);
                }

            }

            //if selectedTransitions is empty, we have reached a stable state, and the big-step will stop, otherwise will continue -> Maximality: Take-Many
            return selectedTransitions;
        },

        /** @private */
        _evaluateAction : function(currentEvent, actionRef) {
            return actionRef.call(this._userScriptingContext, currentEvent, this.isIn.bind(this),
                            this._x._sessionId, this._x._name, this._x._ioprocessors, this._x);     //SCXML system variables
        },

        /** @private */
        _getStatesExited : function(transitions) {
            var statesExited = new this.opts.Set();
            var basicStatesExited = new this.opts.Set();

            //States exited are defined to be active states that are
            //descendants of the scope of each priority-enabled transition.
            //Here, we iterate through the transitions, and collect states
            //that match this condition. 
            transitions.iter().forEach(function(transition){
                var scope = transition.scope,
                    desc = scope.descendants;

                //For each state in the configuration
                //is that state a descendant of the transition scope?
                //Store ancestors of that state up to but not including the scope.
                this._configuration.iter().forEach(function(state){
                    if(desc.indexOf(state) > -1){
                        basicStatesExited.add(state);
                        statesExited.add(state);
                        query.getAncestors(state,scope).forEach(function(anc){
                            statesExited.add(anc);
                        });
                    }
                },this);
            },this);

            var sortedStatesExited = statesExited.iter().sort(function(s1, s2) {
                return s2.depth - s1.depth;
            });
            return [basicStatesExited, sortedStatesExited];
        },

        /** @private */
        _getStatesEntered : function(transitions) {

            var o = {
                statesToEnter : new this.opts.Set(),
                basicStatesToEnter : new this.opts.Set(),
                statesProcessed  : new this.opts.Set(),
                statesToProcess : []
            };

            //do the initial setup
            transitions.iter().forEach(function(transition){
                transition.targets.forEach(function(target){
                    this._addStateAndAncestors(target,transition.scope,o);
                },this);
            },this);

            //loop and add states until there are no more to add (we reach a stable state)
            var s;
            /*jsl:ignore*/
            while(s = o.statesToProcess.pop()){
                /*jsl:end*/
                this._addStateAndDescendants(s,o);
            }

            //sort based on depth
            var sortedStatesEntered = o.statesToEnter.iter().sort(function(s1, s2) {
                return s1.depth - s2.depth;
            });

            return [o.basicStatesToEnter, sortedStatesEntered];
        },

        /** @private */
        _addStateAndAncestors : function(target,scope,o){

            //process each target
            this._addStateAndDescendants(target,o);

            //and process ancestors of targets up to the scope, but according to special rules
            query.getAncestors(target,scope).forEach(function(s){

                if (s.typeEnum === STATE_TYPES.COMPOSITE) {
                    //just add him to statesToEnter, and declare him processed
                    //this is to prevent adding his initial state later on
                    o.statesToEnter.add(s);

                    o.statesProcessed.add(s);
                }else{
                    //everything else can just be passed through as normal
                    this._addStateAndDescendants(s,o);
                } 
            },this);
        },

        /** @private */
        _addStateAndDescendants : function(s,o){

            if(o.statesProcessed.contains(s)) return;

            if (s.typeEnum === STATE_TYPES.HISTORY) {
                if (s.id in this._historyValue) {
                    this._historyValue[s.id].forEach(function(stateFromHistory){
                        this._addStateAndAncestors(stateFromHistory,s.parent,o);
                    },this);
                } else {
                    o.statesToEnter.add(s);
                    o.basicStatesToEnter.add(s);
                }
            } else {
                o.statesToEnter.add(s);

                if (s.typeEnum === STATE_TYPES.PARALLEL) {
                    o.statesToProcess.push.apply(o.statesToProcess,
                        s.states.filter(function(s){return s.typeEnum !== STATE_TYPES.HISTORY;}));
                } else if (s.typeEnum === STATE_TYPES.COMPOSITE) {
                    o.statesToProcess.push(s.initialRef); 
                } else if (s.typeEnum === STATE_TYPES.INITIAL || s.typeEnum === STATE_TYPES.BASIC || s.typeEnum === STATE_TYPES.FINAL) {
                    o.basicStatesToEnter.add(s);
                }
            }

            o.statesProcessed.add(s); 
        },

        /** @private */
        _selectTransitions : function(currentEvent) {
            if (this.opts.onlySelectFromBasicStates) {
                var states = this._configuration.iter();
            } else {
                var statesAndParents = new this.opts.Set;

                //get full configuration, unordered
                //this means we may select transitions from parents before states
                
                this._configuration.iter().forEach(function(basicState){
                    statesAndParents.add(basicState);
                    query.getAncestors(basicState).forEach(function(ancestor){
                        statesAndParents.add(ancestor);
                    });
                },this);

                states = statesAndParents.iter();
            }

            

            var usePrefixMatchingAlgorithm = currentEvent && currentEvent.name && currentEvent.name.search(".");

            var transitionSelector = usePrefixMatchingAlgorithm ? scxmlPrefixTransitionSelector : this.opts.transitionSelector;
            var enabledTransitions = new this.opts.Set();

            var e = this._evaluateAction.bind(this,currentEvent);

            states.forEach(function(state){
                transitionSelector(state,currentEvent,e).forEach(function(t){
                    enabledTransitions.add(t);
                });
            });

            var priorityEnabledTransitions = this._selectPriorityEnabledTransitions(enabledTransitions);

            if (printTrace) this.opts.log("priorityEnabledTransitions", priorityEnabledTransitions);
            
            return priorityEnabledTransitions;
        },

        /** @private */
        _selectPriorityEnabledTransitions : function(enabledTransitions) {
            var priorityEnabledTransitions = new this.opts.Set();

            var tuple = this._getInconsistentTransitions(enabledTransitions), 
                consistentTransitions = tuple[0], 
                inconsistentTransitionsPairs = tuple[1];

            priorityEnabledTransitions.union(consistentTransitions);

            if (printTrace) this.opts.log("enabledTransitions", enabledTransitions);
            if (printTrace) this.opts.log("consistentTransitions", consistentTransitions);
            if (printTrace) this.opts.log("inconsistentTransitionsPairs", inconsistentTransitionsPairs);
            if (printTrace) this.opts.log("priorityEnabledTransitions", priorityEnabledTransitions);
            
            while (!inconsistentTransitionsPairs.isEmpty()) {
                enabledTransitions = new this.opts.Set(
                        inconsistentTransitionsPairs.iter().map(function(t){return this.opts.priorityComparisonFn(t);},this));

                tuple = this._getInconsistentTransitions(enabledTransitions);
                consistentTransitions = tuple[0]; 
                inconsistentTransitionsPairs = tuple[1];

                priorityEnabledTransitions.union(consistentTransitions);

                if (printTrace) this.opts.log("enabledTransitions", enabledTransitions);
                if (printTrace) this.opts.log("consistentTransitions", consistentTransitions);
                if (printTrace) this.opts.log("inconsistentTransitionsPairs", inconsistentTransitionsPairs);
                if (printTrace) this.opts.log("priorityEnabledTransitions", priorityEnabledTransitions);
                
            }
            return priorityEnabledTransitions;
        },

        /** @private */
        _getInconsistentTransitions : function(transitions) {
            var allInconsistentTransitions = new this.opts.Set();
            var inconsistentTransitionsPairs = new this.opts.Set();
            var transitionList = transitions.iter();

            if (printTrace) this.opts.log("transitions", transitionList);

            for(var i = 0; i < transitionList.length; i++){
                for(var j = i+1; j < transitionList.length; j++){
                    var t1 = transitionList[i];
                    var t2 = transitionList[j];
                    if (this._conflicts(t1, t2)) {
                        allInconsistentTransitions.add(t1);
                        allInconsistentTransitions.add(t2);
                        inconsistentTransitionsPairs.add([t1, t2]);
                    }
                }
            }

            var consistentTransitions = transitions.difference(allInconsistentTransitions);
            return [consistentTransitions, inconsistentTransitionsPairs];
        },

        /** @private */
        _conflicts : function(t1, t2) {
            return !this._isArenaOrthogonal(t1, t2);
        },

        /** @private */
        _isArenaOrthogonal : function(t1, t2) {

            if (printTrace) this.opts.log("transition scopes", t1.scope, t2.scope);

            var isOrthogonal = query.isOrthogonalTo(t1.scope, t2.scope);

            if (printTrace) this.opts.log("transition scopes are orthogonal?", isOrthogonal);

            return isOrthogonal;
        },


        /*
            registerListener provides a generic mechanism to subscribe to state change notifications.
            Can be used for logging and debugging. For example, can attache a logger that simply logs the state changes.
            Or can attach a network debugging client that sends state change notifications to a debugging server.
        
            listener is of the form:
            {
              onEntry : function(stateId){},
              onExit : function(stateId){},
              onTransition : function(sourceStateId,targetStatesIds[]){}
            }
        */

        /** @expose */
        registerListener : function(listener){
            return this._listeners.push(listener);
        },

        /** @expose */
        unregisterListener : function(listener){
            return this._listeners.splice(this._listeners.indexOf(listener),1);
        }

    };


    /**
     * @constructor
     * @extends BaseInterpreter
     */
    function Statechart(model, opts) {
        opts = opts || {};

        this._isStepping = false;
        this._externalEventQueue = [];

        this.send = opts.send || this.send;

        this.cancel = opts.cancel || this.cancel;

        BaseInterpreter.call(this,model,opts);     //call super constructor
    }
    Statechart.prototype = Object.create(BaseInterpreter.prototype);

    /** @expose */
    Statechart.prototype.gen = function(evtObjOrName,optionalData) {

        var e;
        switch(typeof evtObjOrName){
            case 'string':
                e = {name : evtObjOrName, data : optionalData};
                break;
            case 'object':
                if(typeof evtObjOrName.name === 'string'){
                    e = evtObjOrName;
                }else{
                    throw new Error('Event object must have "name" property of type string.');
                }
                break;
            default:
                throw new Error('First argument to gen must be a string or object.');
        }

        this._externalEventQueue.push(e);

        if(this._isStepping) return null;       //we're already looping, we can exit and we'll process this event when the next big-step completes

        //otherwise, kick him off
        this._isStepping = true;

        var currentEvent;
        /*jsl:ignore*/
        while(currentEvent = this._externalEventQueue.shift()){
        /*jsl:end*/
            this._performBigStep(currentEvent);
        }

        this._isStepping = false;
        return this.getConfiguration();
    };

    /** @expose */
    //include default implementations of send and cancel, which should work in most supported environments
    Statechart.prototype.send = function(evtObjOrName, dataOrOptions, options) {
        var e;
        switch(typeof evtObjOrName){
            case 'string':
                e = {name : evtObjOrName, data : dataOrOptions};
                options = options || {};
                break;
            case 'object':
                if(typeof evtObjOrName.name === 'string'){
                    e = evtObjOrName;
                }else{
                    throw new Error('Event object must have "name" property of type string.');
                }
                options = dataOrOptions || {};
                break;
            default:
                throw new Error('First argument to send must be a string or object.');
        }

        if(options.delay === undefined){
            this.gen(e);
        }else{
            if( typeof setTimeout === 'undefined' ) throw new Error('Default implementation of Statechart.prototype.send will not work unless setTimeout is defined globally.');

            if (printTrace) this.opts.log("sending event", e.name, "with content", e.data, "after delay", options.delay);

            var timeoutId = setTimeout(this.gen.bind(this,e), options.delay || 0);

            if (options.sendid) this._timeoutMap[options.sendid] = timeoutId;
        }
    };

    /** @expose */
    Statechart.prototype.cancel = function(sendid){

        if( typeof clearTimeout === 'undefined' ) throw new Error('Default implementation of Statechart.prototype.cancel will not work unless setTimeout is defined globally.');

        if (sendid in this._timeoutMap) {
            if (printTrace) this.opts.log("cancelling ", sendid, " with timeout id ", this._timeoutMap[sendid]);
            clearTimeout(this._timeoutMap[sendid]);
        }
    };

    return {
        /** @expose */
        BaseInterpreter: BaseInterpreter,
        /** @expose */
        Statechart: Statechart,
        /** @expose */
        ArraySet : ArraySet,
        /** @expose */
        STATE_TYPES : STATE_TYPES,
        /** @expose */
        initializeModel : initializeModel
    };
}));


/*global define,setTimeout,clearTimeout,console*/
define('scalejs.statechart-scion/state.builder',[
    'scalejs!core',
    'scion'
], function (
    core,
    scion
) {
    

    return function (config) {
        var array = core.array,
            has = core.object.has,
            is = core.type.is,
            typeOf = core.type.typeOf,
            merge = core.object.merge,
            builder = core.functional.builder,
            $yield = builder.$yield,
            //$doAction = core.functional.builder.$doAction,
            stateBuilder,
            transitionBuilder,
            state,
            parallel,
            transition;

        stateBuilder = builder({
            run: function (f, opts) {
                var s = new function state() {}; //ignore jslint

                if (has(opts, 'parallel')) {
                    s.type = 'parallel';
                }

                f(s);

                return s;
            },

            delay: function (f) {
                return f();
            },

            zero: function () {
                return function () {};
            },

            $yield: function (f) {
                return f;
            },

            combine: function (f, g) {
                return function (state) {
                    f(state);
                    g(state);
                };
            },

            missing: function (expr) {
                if (typeof expr === 'string') {
                    return function (state) {
                        if (state.id) {
                            throw new Error('Can\'t set state id to "' + expr + '". ' +
                                            'state\'s id is already set to "' + state.id + '"');
                        }
                        state.id = expr;
                    };
                }

                if (typeof expr === 'function') {
                    return expr;
                }

                if (typeOf(expr) === 'state') {
                    return function (state) {
                        if (!state.states) {
                            state.states = [];
                        }
                        state.states.push(expr);
                    };
                }

                throw new Error('Missing builder for expression: ' + JSON.stringify(expr));
            }
        });

        state = stateBuilder();
        parallel = stateBuilder({ parallel: true });

        transitionBuilder = builder({
            run: function (f) {
                return function (state) {
                    if (!state.transitions) {
                        state.transitions = [];
                    }

                    var t = {};
                    f(t);

                    state.transitions.push(t);
                };
            },

            delay: function (f) {
                return f();
            },

            zero: function () {
                return function () {};
            },

            $yield: function (f) {
                return f;
            },

            combine: function (f, g) {
                return function (transition) {
                    f(transition);
                    g(transition);
                };
            },

            missing: function (expr) {
                if (typeof expr === 'function') {
                    return expr;
                }

                throw new Error('Unknown operation "' + expr.kind + '" in transition expression', expr);
            }

        });

        transition = transitionBuilder();

        function onEntry(f) {
            return $yield(function (state) {
                if (state.onEntry) {
                    throw new Error('Only one `onEntry` action is allowed.');
                }

                if (typeof f !== 'function') {
                    throw new Error('`onEntry` takes a function as a parameter.');
                }

                state.onEntry = f;

                return state;
            });
        }

        function onExit(f) {
            return $yield(function (state) {
                if (state.onExit) {
                    throw new Error('Only one `onExit` action is allowed.');
                }

                if (typeof f !== 'function') {
                    throw new Error('`onExit` takes a function as a parameter.');
                }

                state.onExit = f;

                return state;
            });
        }

        function event(eventName) {
            return $yield(function (transition) {
                transition.event = eventName;
            });
        }

        function condition(f) {
            return $yield(function (transition) {
                transition.cond = f;
            });
        }

        function gotoGeneric(isInternal, targetOrAction, action) {
            return $yield(function goto(stateOrTransition) {
                if (typeOf(stateOrTransition) === 'state') {
                    return transition(gotoGeneric(isInternal, targetOrAction, action))(stateOrTransition);
                }

                if (isInternal) {
                    stateOrTransition.type = 'internal';
                }
                if (typeof targetOrAction === 'function') {
                    stateOrTransition.onTransition = targetOrAction;
                } else {
                    stateOrTransition.target = is(targetOrAction, 'array') ? targetOrAction : targetOrAction.split(' ');
                    if (action) {
                        stateOrTransition.onTransition = action;
                    }
                }
            });
        }

        function goto(target, action) {
            return gotoGeneric(false, target, action);
        }

        function gotoInternally(target, action) {
            return gotoGeneric(true, target, action);
        }

        function onTransition(op) {
            if (typeof op === 'function') {
                return $yield(function (transition) {
                    transition.onTransition = op;
                });
            }

            if (op.kind === '$yield') {
                return op;
            }

            throw new Error('Unsupported transition action', op);
        }

        /*jslint unparam: true*/
        function on() {
            var args = array.copy(arguments),
                action = args.pop(),
                params;

            if (args.length > 2) {
                throw new Error('First (optional) argument should be event name, ' +
                                'second (optional) argument should be a condition function');
            }

            if (typeof action !== 'function' &&
                    action.kind !== '$yield') {
                throw new Error('Last argument should be either `goto` or a function.');
            }

            params = args.map(function (a) {
                if (typeof a === 'string') {
                    return event(a);
                }

                if (typeof a === 'function') {
                    return condition(a);
                }

                throw new Error('Transition argument ', a, ' is not supported. ' +
                                'First (optional) argument should be event name, ' +
                                'second (optional) argument should be a condition function');
            });
            /*
            if (action.name.indexOf('goto') !== 0) {
                action = onTransition(action);
            }*/

            return $yield(transition.apply(null, params.concat([onTransition(action)])));
        }

        function whenInStates() {
            var args = array.copy(arguments),
                action = args.pop();

            args.forEach(function (arg) {
                if (!(typeof arg === 'string')) {
                    throw new Error('`whenInStates` accepts list of states and either `goto` ' +
                                    'or a function as the last argument.');
                }
            });

            if (typeof action !== 'function' &&
                    action.kind !== '$yield') {
                throw new Error('Last argument should be either `goto` or a function.');
            }

            return $yield(transition(
                condition(function (e, isIn) {
                    return args.every(function (state) {
                        return isIn(state);
                    });
                }),
                action
            ));
        }

        function whenNotInStates() {
            var args = array.copy(arguments),
                action = args.pop();

            args.forEach(function (arg) {
                if (!(typeof arg === 'string')) {
                    throw new Error('`whenNotInStates` accepts list of states and either `goto` ' +
                                    'or a function as the last argument.');
                }
            });

            if (typeof action !== 'function' && action.kind !== '$yield') {
                throw new Error('Last argument should be either `goto` or a function.');
            }

            return $yield(transition(
                condition(function (e, isIn) {
                    return args.every(function (state) {
                        return !isIn(state);
                    });
                }),
                action
            ));
        }
        /*jslint unparam: false*/

        function initial(value) {
            return $yield(function (state) {
                if (state.parallel) {
                    return new Error('`initial` shouldn\'t be specified on parallel region.');
                }

                state.initial = value;
            });
        }

        function statechartBuilder(options) {
            return function statechart() {
                var spec = state.apply(null, arguments);

                //console.log(spec);

                return new scion.Statechart(spec, merge({
                    log: core.log.debug
                }, options));
            };
        }

        return {
            builder: statechartBuilder,
            state: state,
            parallel: parallel,
            initial: initial,
            onEntry: onEntry,
            onExit: onExit,
            on: on,
            whenInStates: whenInStates,
            whenNotInStates: whenNotInStates,
            goto: goto,
            gotoInternally: gotoInternally,
            statechart: statechartBuilder({
                logStatesEnteredAndExited: config.logStatesEnteredAndExited,
                log: core.log.debug
            })
        };
    };

});


/*global define*/
/*jslint nomen:true*/
define('scalejs.statechart-scion/state',[
    'scalejs!core',
    './state.builder',
    'scion',
    'scalejs.functional'
], function (
    core,
    createBuilder,
    scion
) {
    

    return function (config) {
        var // imports
            enumerable = core.linq.enumerable,
            toArray = core.array.toArray,
            removeOne = core.array.removeOne,
            has = core.object.has,
            is = core.type.is,
            curry = core.functional.curry,
            builder = createBuilder(config),
            state = builder.state,
            parallel = builder.parallel,
            // members
            applicationStatechartSpec,
            applicationStatechart;

        function allStates(current) {
            if (has(current, 'states')) {
                return enumerable
                    .make(current)
                    .concat(enumerable
                        .from(current.states)
                        .selectMany(allStates));
            }

            return enumerable.make(current);
        }

        function findState(root, stateId) {
            var found = allStates(root).firstOrDefault(function (s) { return s.id === stateId; });

            return found;
        }

        function findStateParent(root, stateId) {
            var found = allStates(root).firstOrDefault(function (s) {
                return s.states && s.states.some(function (s) { return s.id === stateId; });
            });

            return found;
        }


        function registerState() {
            return curry(function (parentStateId, state) {
                var parent,
                    existing;

                parent = findState(applicationStatechartSpec, parentStateId);
                if (!parent) {
                    throw new Error('Parent state "' + parentStateId + '" doesn\'t exist');
                }

                if (has(state, 'id')) {
                    existing = findState(applicationStatechartSpec, state.id);
                    if (existing) {
                        throw new Error('State "' + state.id + '" already exists.');
                    }
                }

                if (!has(parent, 'states')) {
                    parent.states = [];
                }
                parent.states.push(state);
            }).apply(null, arguments);
        }

        function registerStates(parentStateId) {
            if (core.isApplicationRunning()) {
                throw new Error('Can\'t register a state while application is running.');
            }

            toArray(arguments, 1).forEach(registerState(parentStateId));
        }

        function unregisterStates() {
            if (core.isApplicationRunning()) {
                throw new Error('Can\'t unregister a state while application is running.');
            }

            toArray(arguments).forEach(function (stateId) {
                var parent = findStateParent(applicationStatechartSpec, stateId),
                    state = enumerable.from(parent.states).first(function (s) { return s.id === stateId; });
                removeOne(parent.states, state);
            });
        }

        function raise(eventOrName, eventDataOrDelay, delay) {
            var e;
            if (is(eventOrName, 'string')) {
                e = {name: eventOrName};
            } else {
                if (!is(eventOrName, 'name')) {
                    throw new Error('event object should have `name` property.');
                }
                e = eventOrName;
            }

            if (!has(delay) && is(eventDataOrDelay, 'number')) {
                delay = eventDataOrDelay;
            } else {
                e.data = eventDataOrDelay;
            }

            applicationStatechart.send(e, {delay: delay});
        }

        function observe() {
            return core.reactive.Observable.create(function (o) {
                var l = {
                    onEntry: function (state) {
                        o.onNext({event: 'entry', state: state});
                    },
                    onExit: function (state) {
                        o.onNext({event: 'exit', state: state});
                    },
                    onTransition: function (source, targets) {
                        o.onNext({event: 'transition', source: source, targets: targets});
                    }
                };
                applicationStatechart.registerListener(l);
                return function () {
                    applicationStatechart.unregisterListener(l);
                };
            });
        }

        function onState(state) {
            return function (complete) {
                observe()
                    .where(function (e) {
                        return e.event === 'entry' && e.state === state;
                    })
                    .take(1)
                    .subscribe(function () {
                        complete();
                    });
            };
        }

        applicationStatechartSpec = state('scalejs-app', parallel('root'));

        core.onApplicationEvent(function (event) {
            switch (event) {
            case 'started':
                applicationStatechart = new scion.Statechart(applicationStatechartSpec, {
                    logStatesEnteredAndExited: config.logStatesEnteredAndExited,
                    log: core.log.debug
                });
                applicationStatechart.start();
                break;
            case 'stopped':
                break;
            }
        });


        return {
            registerStates: registerStates,
            unregisterStates: unregisterStates,
            raise: raise,
            observe: observe,
            onState: onState,
            builder: builder
        };
    };
});



/*global define*/
define('scalejs.statechart-scion',[
    'scalejs!core',
    './scalejs.statechart-scion/state',
    'module'
], function (
    core,
    state,
    module
) {
    

    core.registerExtension({ state: state(module.config()) });
});



define("scalejs/extensions", ["scalejs.functional","scalejs.layout-cssgrid","scalejs.layout-cssgrid-splitter","scalejs.linq-linqjs","scalejs.mvvm","scalejs.statechart-scion"], function () { return Array.prototype.slice(arguments); });
/*global define, setTimeout */
define('app/main/viewmodels/mainViewModel',[
    'scalejs!sandbox/main'
], function (
    sandbox
) {
    

    return function () {
        var observable = sandbox.mvvm.observable,
            //messageBus = sandbox.reactive.messageBus,
            text = observable('Hello World'),
            width = observable(300);
        /*
        function dec() {
            if (width() > 100) {
                width(width() - 20);
                setTimeout(dec, 0);
            }
        }

        etTimeout(dec, 1000);
        */
        return {
            text: text,
            width: width
        };
    };
});

/**
 * @license RequireJS text 1.0.7 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
/*jslint regexp: false, nomen: false, plusplus: false, strict: false */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

(function () {
    var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = [];

    define('text',[],function () {
        var text, get, fs;

        if (typeof window !== "undefined" && window.navigator && window.document) {
            get = function (url, callback) {
                var xhr = text.createXhr();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function (evt) {
                    //Do not explicitly handle errors, those should be
                    //visible via console output in the browser.
                    if (xhr.readyState === 4) {
                        callback(xhr.responseText);
                    }
                };
                xhr.send(null);
            };
        } else if (typeof process !== "undefined" &&
                 process.versions &&
                 !!process.versions.node) {
            //Using special require.nodeRequire, something added by r.js.
            fs = require.nodeRequire('fs');

            get = function (url, callback) {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            };
        } else if (typeof Packages !== 'undefined') {
            //Why Java, why is this so awkward?
            get = function (url, callback) {
                var encoding = "utf-8",
                    file = new java.io.File(url),
                    lineSeparator = java.lang.System.getProperty("line.separator"),
                    input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                    stringBuffer, line,
                    content = '';
                try {
                    stringBuffer = new java.lang.StringBuffer();
                    line = input.readLine();

                    // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                    // http://www.unicode.org/faq/utf_bom.html

                    // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                    // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                    if (line && line.length() && line.charAt(0) === 0xfeff) {
                        // Eat the BOM, since we've already found the encoding on this file,
                        // and we plan to concatenating this buffer with others; the BOM should
                        // only appear at the top of a file.
                        line = line.substring(1);
                    }

                    stringBuffer.append(line);

                    while ((line = input.readLine()) !== null) {
                        stringBuffer.append(lineSeparator);
                        stringBuffer.append(line);
                    }
                    //Make sure we return a JavaScript string and not a Java string.
                    content = String(stringBuffer.toString()); //String
                } finally {
                    input.close();
                }
                callback(content);
            };
        }

        text = {
            version: '1.0.7',

            strip: function (content) {
                //Strips <?xml ...?> declarations so that external SVG and XML
                //documents can be added to a document without worry. Also, if the string
                //is an HTML document, only the part inside the body tag is returned.
                if (content) {
                    content = content.replace(xmlRegExp, "");
                    var matches = content.match(bodyRegExp);
                    if (matches) {
                        content = matches[1];
                    }
                } else {
                    content = "";
                }
                return content;
            },

            jsEscape: function (content) {
                return content.replace(/(['\\])/g, '\\$1')
                    .replace(/[\f]/g, "\\f")
                    .replace(/[\b]/g, "\\b")
                    .replace(/[\n]/g, "\\n")
                    .replace(/[\t]/g, "\\t")
                    .replace(/[\r]/g, "\\r");
            },

            createXhr: function () {
                //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
                var xhr, i, progId;
                if (typeof XMLHttpRequest !== "undefined") {
                    return new XMLHttpRequest();
                } else {
                    for (i = 0; i < 3; i++) {
                        progId = progIds[i];
                        try {
                            xhr = new ActiveXObject(progId);
                        } catch (e) {}

                        if (xhr) {
                            progIds = [progId];  // so faster next time
                            break;
                        }
                    }
                }

                if (!xhr) {
                    throw new Error("createXhr(): XMLHttpRequest not available");
                }

                return xhr;
            },

            get: get,

            /**
             * Parses a resource name into its component parts. Resource names
             * look like: module/name.ext!strip, where the !strip part is
             * optional.
             * @param {String} name the resource name
             * @returns {Object} with properties "moduleName", "ext" and "strip"
             * where strip is a boolean.
             */
            parseName: function (name) {
                var strip = false, index = name.indexOf("."),
                    modName = name.substring(0, index),
                    ext = name.substring(index + 1, name.length);

                index = ext.indexOf("!");
                if (index !== -1) {
                    //Pull off the strip arg.
                    strip = ext.substring(index + 1, ext.length);
                    strip = strip === "strip";
                    ext = ext.substring(0, index);
                }

                return {
                    moduleName: modName,
                    ext: ext,
                    strip: strip
                };
            },

            xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

            /**
             * Is an URL on another domain. Only works for browser use, returns
             * false in non-browser environments. Only used to know if an
             * optimized .js version of a text resource should be loaded
             * instead.
             * @param {String} url
             * @returns Boolean
             */
            useXhr: function (url, protocol, hostname, port) {
                var match = text.xdRegExp.exec(url),
                    uProtocol, uHostName, uPort;
                if (!match) {
                    return true;
                }
                uProtocol = match[2];
                uHostName = match[3];

                uHostName = uHostName.split(':');
                uPort = uHostName[1];
                uHostName = uHostName[0];

                return (!uProtocol || uProtocol === protocol) &&
                       (!uHostName || uHostName === hostname) &&
                       ((!uPort && !uHostName) || uPort === port);
            },

            finishLoad: function (name, strip, content, onLoad, config) {
                content = strip ? text.strip(content) : content;
                if (config.isBuild) {
                    buildMap[name] = content;
                }
                onLoad(content);
            },

            load: function (name, req, onLoad, config) {
                //Name has format: some.module.filext!strip
                //The strip part is optional.
                //if strip is present, then that means only get the string contents
                //inside a body tag in an HTML string. For XML/SVG content it means
                //removing the <?xml ...?> declarations so the content can be inserted
                //into the current doc without problems.

                // Do not bother with the work if a build and text will
                // not be inlined.
                if (config.isBuild && !config.inlineText) {
                    onLoad();
                    return;
                }

                var parsed = text.parseName(name),
                    nonStripName = parsed.moduleName + '.' + parsed.ext,
                    url = req.toUrl(nonStripName),
                    useXhr = (config && config.text && config.text.useXhr) ||
                             text.useXhr;

                //Load the text. Use XHR if possible and in a browser.
                if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                    text.get(url, function (content) {
                        text.finishLoad(name, parsed.strip, content, onLoad, config);
                    });
                } else {
                    //Need to fetch the resource across domains. Assume
                    //the resource has been optimized into a JS module. Fetch
                    //by the module name + extension, but do not include the
                    //!strip part to avoid file system issues.
                    req([nonStripName], function (content) {
                        text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                        parsed.strip, content, onLoad, config);
                    });
                }
            },

            write: function (pluginName, moduleName, write, config) {
                if (moduleName in buildMap) {
                    var content = text.jsEscape(buildMap[moduleName]);
                    write.asModule(pluginName + "!" + moduleName,
                                   "define(function () { return '" +
                                       content +
                                   "';});\n");
                }
            },

            writeFile: function (pluginName, moduleName, req, write, config) {
                var parsed = text.parseName(moduleName),
                    nonStripName = parsed.moduleName + '.' + parsed.ext,
                    //Use a '.js' file name so that it indicates it is a
                    //script that can be loaded across domains.
                    fileName = req.toUrl(parsed.moduleName + '.' +
                                         parsed.ext) + '.js';

                //Leverage own load() method to load plugin value, but only
                //write out values that do not have the strip argument,
                //to avoid any potential issues with ! in file names.
                text.load(nonStripName, req, function (value) {
                    //Use own write() method to construct full module value.
                    //But need to create shell that translates writeFile's
                    //write() to the right interface.
                    var textWrite = function (contents) {
                        return write(fileName, contents);
                    };
                    textWrite.asModule = function (moduleName, contents) {
                        return write.asModule(moduleName, fileName, contents);
                    };

                    text.write(pluginName, nonStripName, textWrite, config);
                }, config);
            }
        };

        return text;
    });
}());

define('text!app/main/views/main.html',[],function () { return '<div id="main_template">\r\n    <div id="main">\r\n        <div id="left" data-class="_left-width">Navigation</div>\r\n        <div id="leftSplitter" data-bind="splitter: \'vertical\'"></div>\r\n        <div id="header">Header</div>\r\n        <div id="headerSplitter" data-bind="splitter: \'horizontal\'"></div>\r\n        <div id="content1">Content 1</div>\r\n        <!--\r\n        <div id="content1">\r\n            <div class="title">THIS IS CONTENT 1</div>\r\n            <div class="minimize">_</div>\r\n            <div class="restore">[]</div>\r\n            <div class="close">X</div>\r\n            <div class="content">Content 1</div>\r\n        </div>\r\n        <div id="content2">\r\n            <div class="title">THIS IS CONTENT 2</div>\r\n            <div class="minimize">_</div>\r\n            <div class="restore">[]</div>\r\n            <div class="close">X</div>\r\n            <div class="content">Content 2</div>\r\n        </div>\r\n        -->\r\n        <div id="footer">Footer</div>\r\n    </div>\r\n</div>\r\n';});

/*global define, console, setTimeout */
/*jslint sloppy: true*/
define('app/main/bindings/mainBindings.js',[
    'scalejs!sandbox',
    'knockout'
], function (
    sandbox,
    ko
) {
    var layout = sandbox.layout.cssGrid.layout,
        unwrap = ko.utils.unwrapObservable;

    return {
        'main': function () {
            return {
                template: {
                    name: 'main_template',
                    data: this,
                    afterRender: function () {
                        console.log('main rendered');
                        //layout('css-grid-layout');
                    }
                }
            };
        },
        'main-columns': function () {
            setTimeout(function () {
                messageBus.notify('css-grid-layout');
            });

            return {
                attr: {
                    style: '-ms-grid-columns: ' + unwrap(this.columns)
                }
            };
        },
        'left-width': function () {
            setTimeout(function () {
                layout();
            });
            return {
                style: {
                    width: unwrap(this.width) + 'px'
                }
                /*
                attr: {
                    style: 'width: ' + unwrap(this.width) + 'px'
                }*/
            };
        }
    };
});

/*global define */
define('app/main/mainModule',[
    'scalejs!sandbox/main',
    'app/main/viewmodels/mainViewModel',
    'text!app/main/views/main.html',
    'app/main/bindings/mainBindings.js'
], function (
    sandbox,
    mainViewModel,
    mainTemplate,
    mainBindings
) {
    
    return function main() {
        var // imports
            root = sandbox.mvvm.root,
            dataClass = sandbox.mvvm.dataClass,
            registerBindings = sandbox.mvvm.registerBindings,
            registerTemplates = sandbox.mvvm.registerTemplates,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            viewModel = mainViewModel(sandbox);

        // Register module bindings
        registerBindings(mainBindings);

        // Register module templates
        registerTemplates(mainTemplate);

        // Register application state for the module.
        registerStates('root',
            state('app',
                state('main',
                    onEntry(function () {
                        // Render viewModel using 'main-text' binding 
                        // and show it set root view
                        root(dataClass('main', viewModel));
                    }))));
    };
});

/*global require*/
require([
    'scalejs!application',
    'app/main/mainModule'
], function (
    application,
    main
) {
    

    application.registerModules(main);

    application.run();
});


define("app/app", function(){});
