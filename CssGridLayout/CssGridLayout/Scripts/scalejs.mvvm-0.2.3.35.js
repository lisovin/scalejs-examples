
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
    'knockout'
], function (
    ko
) {
    

    function cloneNodes(nodesArray, shouldCleanNodes) {
        return nodesArray.map(function (node) {
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
    './ko.utils'
], function (
    ko,
    mapping,
    core,
    createClassBindingProvider,
    htmlTemplateSource,
    selectableArray,
    koUtils
) {
    

    var merge = core.object.merge,
        toArray = core.array.toArray,
        is = core.type.is,
        //curry = core.functional.curry,
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

    function renderable(dataClassOrBinding, optionalViewModel) {
        if (is(dataClassOrBinding, 'string')) {
            return {
                dataClass: dataClassOrBinding,
                viewmodel: optionalViewModel
            };
        }

        if (is(dataClassOrBinding, 'function')) {
            return dataClassOrBinding.bind(optionalViewModel);
        }

        return dataClassOrBinding;
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
                renderable: renderable,
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
                renderable: renderable,
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

/*global define*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.bindings/render',[
    'scalejs!core',
    'knockout'
], function (
    core,
    ko
) {
    /// <param name="ko" value="window.ko" />
    

    var is = core.type.is,
        unwrap = ko.utils.unwrapObservable;


    function init() {
        return { 'controlsDescendantBindings' : true };
    }

    /*jslint unparam: true*/
    function update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = unwrap(valueAccessor()),
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

        result = ko.applyBindingsToNode(element, binding);

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

/// <reference path="../scripts/_references.js" />
/*global console,define,setTimeout*/
/*jslint unparam: true*/define('scalejs.bindings/transitionable',[
    'scalejs!core',
    'knockout',
    '../scalejs.mvvm/ko.utils',
    'scalejs.statechart-scion'
], function (
    core,
    ko,
    koUtils
) {
    /// <param name="ko" value="window.ko"/>
    

    var array = core.array,
        merge = core.object.merge,
        statechart = core.state.builder.builder({ logStatesEnteredAndExited: false }),
        state = core.state.builder.state,
        isObservable = ko.isObservable,
        unwrap = ko.utils.unwrapObservable,
        //observable = ko.observable,
        computed = ko.computed,
        cloneNodes = koUtils.cloneNodes;


    function transitionManager(element, viewModel, spec) {
        var transitionsStatechart,
            transitionableState = spec.transitionableState,
            savedNodes,
            model;

        function updatetransitionableState(newState) {
            // update visual state later (to make sure we are not in statechart step)
            if (isObservable(transitionableState)) {
                setTimeout(function () {
                    transitionableState(newState);
                }, 0);
            }
        }

        function renderChild() {
            ko.virtualElements.setDomNodeChildren(element, cloneNodes(savedNodes));
            ko.applyBindingsToDescendants(viewModel, element);
        }

        function clearChild() {
            savedNodes = cloneNodes(ko.virtualElements.childNodes(element), true);
            ko.virtualElements.emptyNode(element);
        }

        function runTransition(transitions) {
            var transition = transitions.shift(),
                child = ko.virtualElements.childNodes(element).filter(function (e) {
                    return e.nodeType === 1;
                })[0];

            if (transition) {
                setTimeout(function () {
                    var context = {
                        element: child,
                        viewModel: viewModel,
                        renderChild: renderChild
                    };

                    transition.call(context, function () {
                        transitionsStatechart.send('transition.finished', { transition: transition });
                    });
                }, 0);
            }
        }

        function start() {
            clearChild();

            computed({
                read: function () {
                    var state = unwrap(transitionableState);
                    if (state) {
                        setTimeout(function () {
                            transitionsStatechart.send(state);
                        }, 0);
                    }
                },
                disposeWhenNodeIsRemoved: element
            });

            transitionsStatechart.start();
        }

        model = merge({
            inTransitions: [],
            outTransitions: []
        }, spec);

        /*jslint white: true*/
        transitionsStatechart = statechart(
            // Initial
            state('in.started')
                .onEntry(function () {
                    this.transitions = array.copy(model.inTransitions);
                })
                .on(function () {
                    return this.transitions.length > 0;
                }).goto('in.transitioning')
                .goto('in.finished'),

            state('in.transitioning')
                .onEntry(function () {
                    runTransition(this.transitions);
                })
                .on('transition.finished', function () {
                    return this.transitions.length > 0;
                }).goto('in.transitioning')
                .on('transition.finished').goto('in.finished'),

            state('in.finished')
                .onEntry(function () {
                    updatetransitionableState('in.finished');
                })
                .on('out.started').goto('out.started'),

            state('out.started')
                .onEntry(function () {
                    this.transitions = array.copy(model.outTransitions);
                })
                .on(function () {
                    return this.transitions.length > 0;
                }).goto('out.transitioning')
                .goto('out.finished'),

            state('out.transitioning')
                .onEntry(function () {
                    runTransition(this.transitions);
                })
                .on('transition.finished', function () {
                    return this.transitions.length > 0;
                }).goto('out.transitioning')
                .on('transition.finished').goto('out.finished'),

            // Finished transitioning
            state('out.finished')
                .onEntry(function () {
                    updatetransitionableState('out.finished');
                })
                .on('in.transitioning').goto('in.started')
        );
        /*jslint white: false*/

        return {
            start: start
        };
    }

    function init(        element,        valueAccessor,        allBindingsAccessor,        viewModel,        bindingContext    ) {
        return { 'controlsDescendantBindings' : true };
    }

    function update(
        element,
        valueAccessor,
        allBindingsAccessor,
        viewModel,
        bindingContext
    ) {
        var options = valueAccessor(),
            tm = transitionManager(element, viewModel, options);

        tm.start();
    }

    return {
        init: init,
        update: update
    };
});
/*jslint unparam: false*/

;
/*global define*/
define('scalejs.mvvm',[
    'scalejs!core',
    'knockout',
    './scalejs.mvvm/mvvm',
    './scalejs.bindings/change',
    './scalejs.bindings/render',
    './scalejs.bindings/transitionable'
], function (
    core,
    ko,
    mvvm,
    changeBinding,
    renderBinding,
    transitionableBinding
) {
    

    ko.bindingHandlers.change = changeBinding;
    ko.bindingHandlers.render = renderBinding;
    ko.bindingHandlers.transitionable = transitionableBinding;

    ko.virtualElements.allowedBindings.change = true;
    ko.virtualElements.allowedBindings.render = true;
    ko.virtualElements.allowedBindings.transitionable = true;

    mvvm.init();

    core.registerExtension(mvvm);
});

