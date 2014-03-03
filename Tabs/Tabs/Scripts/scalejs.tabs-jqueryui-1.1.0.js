
/**
 * @license RequireJS text 2.0.10 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.10',

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
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) { }

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.indexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1, name.length);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
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
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
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

            masterConfig.isBuild = config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

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

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                errback(e);
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        errback(err);
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
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

                if (line !== null) {
                    stringBuffer.append(line);
                }

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
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes,
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});
define('text!scalejs.tabs-jqueryui/tabs.html',[],function () { return '<div id="tabs_template">\r\n    <div class="tabs" style="height:100%">\r\n        <div data-class="tabs-header-right" style="position:absolute;right:0px;"></div>\r\n            <ul class="tab-headers" data-class="tabs-sortable"></ul>\r\n                <!-- ko class: tabs-items-source -->\r\n                <div data-class="tabs-content-container">\r\n                        <!-- ko class:tabs-content-template -->\r\n                        <!-- /ko -->\r\n                </div>\r\n                <!-- /ko -->\r\n    </div>\r\n    <div class="tabs-more tabs-menu">\r\n    <!-- ko foreach: itemsSource -->\r\n        <div class="tabs-menu-item">\r\n            <span data-class="tabs-more-item"></span>\r\n            <div class="iconClose" data-class="tab-close"></div>\r\n        </div>\r\n    <!-- /ko -->       \r\n    </div> \r\n        <div class="tabs-add tabs-menu">\r\n            <!-- ko foreach: menuItems -->\r\n                <div class="tabs-menu-item" data-bind="text: header, click: addTab"></div>\r\n            <!-- /ko -->\r\n    </div>\r\n</div>\r\n\r\n <div id="tabs_content_default_template">\r\n         <p data-bind="text: $data"></p>\r\n</div>\r\n \r\n <div id="tabs_more_item_template">\r\n    <li class="tabs-menu-item">\r\n     <div class="tabs-header-text" data-class="tabs-header-text"></div>\r\n     <div class="iconClose" data-class="tab-close"></div></li>\r\n</div>\r\n\r\n <div id="tabs_header_item_template">\r\n    <li>\r\n        <a data-class="tabs-header">\r\n            <div class="tabs-header-text" data-class="tabs-header-text"></div>\r\n        </a>\r\n        <div class="iconClose" data-class="tab-more-close"></div>\r\n        <div class="iconMore" data-class="tab-more"></div>\r\n        <!--<div class="iconMax" data-class="tab-max"></div>-->\r\n    </li>\r\n</div>\r\n\r\n <div id="tabs_menu_temp_template">\r\n    <div class="tabs-menu">\r\n        <!-- ko foreach: menuItems -->\r\n            <div class="tabs-menu-item" data-bind="text: header, click: addTab"></div>\r\n        <!-- /ko -->\r\n    </div> \r\n</div>';});

/*global define*/
define('scalejs.tabs-jqueryui/tabsBindings',{
    'tabs-header': function (ctx) {
        return {
            click: function (data, e) {
                e.preventDefault();
            }
        };
    },
    'tabs-header-text': function () {
        return {
            text: this.header
        };
    },
    'tabs-items-source': function () {
        return {
            foreach: this.itemsSource
        };
    },
    'tabs-header-edit': function () {
        return {
            value: this.header,
            valueUpdate: 'afterkeydown'
        };
    },
    'tabs-content-template': function (ctx) {
        var contentTemplate = this.contentTemplate || ctx.$parent.contentTemplate || "tabs_content_default_template";

        return {
            template: {
                name: contentTemplate,
                data: this.content
            }
        };
    },
    'tabs-header-right': function () {
        if (this.headerTemplate) {
            return {
                template: {
                    name: this.headerTemplate,
                    data: this.content
                }
            };
        }
        return {};
    },
    'tab-more-close': function (ctx) {
        var itemsSource = ctx.$parent.itemsSource,
            refreshTabs = ctx.$parent.refreshTabs;

        return {
            click: function () {
                itemsSource.remove(ctx.$data);
                refreshTabs();
            },
            visible: !ctx.$parent.more()
        };
    },
    'tab-close': function (ctx) {
        var itemsSource = ctx.$parent.itemsSource,
            refreshTabs = ctx.$parent.refreshTabs;

        return {
            click: function () {
                itemsSource.remove(ctx.$data);
                refreshTabs();
            }
        };
    },
    'tab-max': function () {
        return {
            click: function (data) {
                console.log("maximixing", data);
            }
        };
    },
    'tabs-sortable': function () {
        return {
            sortable: {
                template: "tabs_header_item_template",
                data: this.itemsSource,
                options: this.sortOptions,
                afterMove: this.afterMove
            }
        };
    },
    'tab-more': function (ctx) {
        return {
            visible: ctx.$parent.more,
            click: ctx.$parent.openMore
        }
    },
    'tabs-more-item': function (ctx) {
        return {
            style: {
                color: ctx.$parent.active() === ctx.$index() ? 'red' : 'white'
            },
            text: this.header
        };
    }
});


/*global define*/
define('scalejs.tabs-jqueryui',[
	'scalejs!core',
	'knockout',
	'jQuery',
	'text!./scalejs.tabs-jqueryui/tabs.html',
	'./scalejs.tabs-jqueryui/tabsBindings',
	'scalejs.mvvm',
    'bPopup',
    'knockout-sortable'
], function (
	core,
    ko,
    $,
	tabsTemplates,
	tabsBindings
) {


    var registerTemplates = core.mvvm.registerTemplates,
		registerBindings = core.mvvm.registerBindings,
		isObservable = ko.isObservable,
        observableArray = ko.observableArray,
        toEnumerable = core.linq.enumerable.from,
        unwrap = ko.unwrap,
        merge = core.object.merge;

    //TODO: update this
    registerTemplates(tabsTemplates);
    registerBindings(tabsBindings);

    function wrapValueAccessor(valueAccessor, element) {
        return function () {
            var data = valueAccessor(),
                el,
                active,
                $tabs,
                $menu = {};

            /*
             * setupTabs: creates tabs control with edittable headers
             */
            function setupTabs() {
                el = $(ko.virtualElements.firstChild(element)).parent();

                /* finds and hides add and more menu */
                $menu.add = $($(el).find('.tabs-add')).hide();
                $menu.more = $($(el).find('.tabs-more')).hide();

                /* initializes jquery tabs */
                $tabs = $($(el).find('.tabs')).tabs();

                /* enables editable headers */
                $.widget("ui.tabs", $.ui.tabs, {
                    options: { keyboard: true },
                    _tabKeydown: function (e) {
                        if (this.options.keyboard) { this._super('_tabKeydown'); }
                        else { return false; }
                    }
                });
                $tabs.delegate("a.ui-tabs-anchor", "dblclick", function () {
                    var header = ko.dataFor(this).header,
					    $input,
					    el = this;

                    if (isObservable(header)) {
                        $(el).find("[data-class='tabs-header-text']").replaceWith("<input data-class='tabs-header-edit' />");
                        $input = $(el).find("input");

                        ko.applyBindings(ko.dataFor(this), $input.get(0));
                        $input.focus();
                        $input.bind('keyup', function (e) {
                            var code = e.keyCode || e.which;
                            if (code == 13) {
                                $input.replaceWith("<div class='tabs-header-text' data-class='tabs-header-text'></div>");
                                ko.applyBindings(ko.dataFor(el), $(el).find("[data-class='tabs-header-text']").get(0));
                            }
                        });

                        $input.bind('blur', function () {
                            $input.replaceWith("<div class='tabs-header-text' data-class='tabs-header-text'></div>");
                            ko.applyBindings(ko.dataFor(el), $(el).find("[data-class='tabs-header-text']").get(0));
                        });
                    }
                });

                /* binds width calculation on resize */
                $(window).resize(calculateWidth);
            }

            /*
             * refreshTabs: updates tabs whenever a significant change is made
             */
            function refreshTabs(active) {
                /* refreshes jqueryui tabs */

                //knockout binding to index just does not work.
                //luckily this does.
                $tabs.find('a[data-class="tabs-header"]').each(function (i, el) {
                    $(el).attr('href', '#tabs-' + i);
                });
                $tabs.find('div[data-class="tabs-content-container"]').each(function (i, el) {
                    $(el).attr('id', 'tabs-' + i);
                });

                // need to destroy tabs and re-initalize
                $tabs.tabs('destroy');
                $tabs = $($(el).find('.tabs')).tabs();

                //may or may not be neccessary
                setTimeout(function () {
                    $tabs.find('.tab-headers').sortable('refresh');
                });

                /* activates the appropriate tab */
                $tabs.tabs("option", "active", active || $tabs.tabs("option", "active"));
                data.active($tabs.tabs("option", "active"));

                /* fixes the height of the tabs content */
                $tabs.find('.ui-tabs-panel').each(function () {
                    var tabsHeight = $tabs.height(),
                        headersHeight = $tabs.find('.tab-headers').height();
                    $(this).height(tabsHeight - headersHeight);
                });

                /* binds click handler to more menu item */
                $menu.more.find('.tabs-menu-item').each(function (i, el) {
                    $(el).unbind().click(function () {
                        //$tabs.tabs("option", "active", i);
                        $menu.more.bPopup({ opacity: 0 }).close();
                        refreshTabs(i);
                    });
                });

                createAddTab();
                calculateWidth();
            }

            /*
             * calculateWidth: determines if tabs fit within window
             */
            function calculateWidth() {
                var tabsContainerWidth = $tabs.outerWidth(),
                    $headers = $tabs.find('ul.tab-headers'),
                    $tabItems = $headers.find('li').show(),
                    tabsWidth = $tabItems.get().reduce(function (acc, el) {
                        acc += $(el).outerWidth();
                        return acc;
                    }, 0) + 20;

                data.more(false);
                if (tabsWidth > tabsContainerWidth) {
                    $tabItems.hide();
                    data.more(true);
                    $headers.find('.ui-state-active').show();
                }
                createAddTab();
            }

            /*
             * createAddTab: creates the tab which opens the add tab menu
             */
            function createAddTab() {
                var $tab;
                $tabs.find('li.add').remove();
                $headers = $tabs.find('ul.tab-headers');
                $headers.append('<li class="unsortable add"><a href="#tabs-add">+</a></li>');
                $tab = $tabs.find('[href="#tabs-add"]');
                $tab.unbind().click(function (e) {
                    e.preventDefault();
                    $menu.add.bPopup({
                        follow: [false, false],
                        position: [$tab.offset().left + $tabs.find('li.add').width(), $tab.offset().top],
                        opacity: 0,
                        speed: 0
                    });
                });
            }


            data.sortOptions = {
                items: "li:not(.unsortable)",
                axis: "x",
                start: function () {
                    //remove add tab
                    //$tabs.find('li.unsortable').remove();
                },
                stop: function (args) {
                    active = args.targetIndex;
                }
            };

            data.menuItems = observableArray(toEnumerable(unwrap(data.defaultItems)).select(function (item) {
                var menuItem = merge(item, {
                    addTab: function () {
                        $menu.add.bPopup({ opacity: 0 }).close();
                        data.itemsSource.push(item.create());
                        refreshTabs(data.itemsSource().length - 1);
                    }
                });
                return menuItem;
            }).toArray());

            data.afterMove = function () {
                console.log('sort complete');
                refreshTabs();
            }
            data.refreshTabs = refreshTabs;

            data.more = ko.observable(false);

            data.active = ko.observable(1);

            data.openMore = function () {
                var $tab = $($tabs.find('li').get(1));
                $menu.more.bPopup({
                    follow: [false, false],
                    position: [$tab.offset().left + 10, $tab.offset().top + $tab.outerHeight() + 10],
                    opacity: 0,
                    speed: 0
                });
            }

            return {
                data: data,
                name: "tabs_template",
                afterRender: function () {
                    setupTabs();
                    refreshTabs();
                }
            };
        };
    }

    function init(
		element,
		valueAccessor,
		allBindingsAccessor,
		viewModel,
		bindingContext
	) {
        ko.bindingHandlers.template.update(
            element,
            wrapValueAccessor(valueAccessor, element),
            allBindingsAccessor,
            viewModel,
            bindingContext
        );

        return { 'controlsDescendantBindings': true };
    }

    ko.bindingHandlers.tabs = {
        init: init
    };

    ko.virtualElements.allowedBindings.tabs = true;
    ko.virtualElements.allowedBindings.sortable = true;
});

