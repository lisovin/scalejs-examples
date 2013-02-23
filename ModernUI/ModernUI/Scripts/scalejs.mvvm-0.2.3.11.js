
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
        function defaultBindingRouter(className, bindings) {
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
                    bindingAccessor = bindingRouter(cp, bindings);
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
            nodeHasBindings: nodeHasBindings
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

/*global define,document*/
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
        });

        result.selectedItem = selectedItem;

        return result;
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
    './selectableArray'
], function (
    ko,
    mapping,
    core,
    createClassBindingProvider,
    htmlTemplateSource,
    selectableArray
) {
    

    var merge = core.object.merge,
        toArray = core.array.toArray,
        curry = core.functional.curry,
        classBindingProvider = createClassBindingProvider({
            log: core.log.warn,
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

    function renderable(templateId, viewmodel) {
        return merge(viewmodel, {template: templateId});
    }

    function init() {
        var body = document.getElementsByTagName('body')[0];

        body.innerHTML = '<!-- ko class: scalejs-shell --><!-- /ko -->';
        registerBindings({
            'scalejs-shell': function (context) {
                return {
                    render: context.$data
                };
            }
        });

        ko.applyBindings(root);
    }

    return {
        core: {
            mvvm: {
                toJson: toJson,
                registerBindings: registerBindings,
                registerTemplates: registerTemplates
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
                renderable: curry(renderable),
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
            currentValue,
            changeHandler;

        function bindPropertyChangeHandler(h) {
            return function (newValue) {
                if (newValue !== currentValue) {
                    currentValue = newValue;
                    h.call(viewModel, newValue, element);
                }
            };
        }

        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                handler = properties[property];
                if (is(handler.initial, 'function')) {
                    handler.initial.apply(viewModel, [unwrap(viewModel[property]), element]);
                }
                if (is(handler.update, 'function')) {
                    changeHandler = bindPropertyChangeHandler(handler.update);
                }
                if (is(handler, 'function')) {
                    changeHandler = bindPropertyChangeHandler(handler);
                }
                if (changeHandler) {
                    viewModel[property].subscribe(changeHandler);
                }
            }
        }
    }
    /*jslint unparam: false*/

    return {
        init: init
    };
});

/*global define*/
define('scalejs.bindings/render',[
    'knockout',
    'scalejs!core'
], function (
    ko,
    core
) {
    

    var is = core.type.is,
        has = core.object.has,
        unwrap = ko.utils.unwrapObservable;


    function wrapValueAccessor(valueAccessor) {
        return function () {
            var value = valueAccessor(),
                renderable = unwrap(value);

            function templateName(item) {
                return item.template;
            }

            if (is(renderable, 'array') || !has(renderable)) {
                return {
                    name: templateName,
                    foreach: renderable
                };
            }

            return {
                name: renderable.template,
                data: renderable
            };
        };
    }

    function init() {
        return { 'controlsDescendantBindings' : true };
    }

    /*jslint unparam: true*/
    function update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers.template.update(
            element,
            wrapValueAccessor(valueAccessor),
            allBindingsAccessor,
            viewModel,
            bindingContext
        );
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
    './scalejs.mvvm/mvvm',
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

    mvvm.init();

    core.registerExtension(mvvm);
});

