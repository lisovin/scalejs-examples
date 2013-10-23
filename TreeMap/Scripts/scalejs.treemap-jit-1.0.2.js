
/*global define*/
define('scalejs.treemap-jit',[
    'scalejs!core',
    'knockout',
    'jit',
    'scalejs.mvvm',
    'scalejs.color-scheme'
], function (
    core,
    ko,
    $jit
) {
    

    var //imports
        merge = core.object.merge,
        has = core.object.has,
        unwrap = ko.utils.unwrapObservable,
        //vars
        idCounter = 0,
        generateGradient = core.color.generateVariedGradient();
    
    /*jslint unparam:true*/

    //Creates unique Ids for elements and nodes.
    function getUniqueId() {
        var id = 'scalejs_treemap_' + idCounter;
        idCounter += 1;
        return id;
    }

    //Wraps node so we can apply bindings to a node with a provided template.
    function wrapNode(node, template){
        return function() {
            return {
                name: template,
                data: node
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
        var treemap = valueAccessor(),
            colors = generateGradient(),
            selectedItem = treemap.selectedItem || ko.observable(),
            tm,
            options,
            json;
        
        json = ko.computed(function() {
            return createTreemapJson(treemap.data, treemap.levels);
        });

        //Recursively traverses treemap data and builds json structure for TreeMap
        function createTreemapJson(data, levels) {
            if (levels.length === 0) {
                data.children = [];
                data.data = {
                    $area: unwrap(data[treemap.areaPath])
                };
                data.id = data.id || getUniqueId();
                return data;
            } else {
                data.id = data.id || getUniqueId();
                return unwrap(data[levels[0]]).reduce(function (acc, level) {
                    var node = createTreemapJson(level, levels.slice(1));
                    acc.children.push(node);
                    acc.data.$area += node.data.$area;
                    return acc;
                }, merge(data, { children: [], data: { $area: 0 } }));
            }
        }

        selectedItem.enterParent = function () {
            tm.out();
            selectedItem($jit.json.getParent(json(), selectedItem().id));
        }
        
      
        function setNode(node) {
            selectedItem(node);
        }

        function setParentNode() {
            selectedItem.enterParent();
        }

        function showTip(tip, node, isLeaf, domElement) {
            ko.cleanNode(tip);
            ko.bindingHandlers.template.update(
                tip,
                wrapNode(node, treemap.nodeTipTemplate),
                allBindingsAccessor,
                viewModel,
                bindingContext
            );
        }

        function createLabel(domElement, node) {
            domElement.innerHTML = node.name;
            var style = domElement.style;
            style.display = '';
            style.border = '1px solid transparent';
            domElement.onmouseover = function () {
                style.border = '1px solid #9FD4FF';
            };
            domElement.onmouseout = function () {
                style.border = '1px solid transparent';
            };

            //TODO: cleanup color logic
            if (node._depth > treemap.levels.length - 1) {
                if (treemap.itemTemplate) {                    
                    ko.cleanNode(domElement);
                    ko.bindingHandlers.template.update(
                        domElement,
                        wrapNode(node, treemap.itemTemplate),
                        allBindingsAccessor,
                        viewModel,
                        bindingContext
                    );
                }

                colors = $jit.json.getParent(json(), node.id).colors;
                if (!colors) {
                    colors = generateGradient();
                    $jit.json.getParent(json(), node.id).colors = colors;
                }
                colors = $jit.json.getParent(json(), node.id).colors;
                node.data.$color = '#' + colors[[0,1,3][Math.random() * 3 | 0]];
            }
        }       

        element.id = element.id || getUniqueId();

        options = merge({
            injectInto: element,
            titleHeight: 15,
            animate: true,
            offset: 1,
            Events: {
                enable: true,
                onClick: setNode,
                onRightClick: setParentNode
            },
            duration: 1000,
            Tips: {
                enable: has(treemap.nodeTipTemplate),
                offsetX: 20,
                offsetY: 20,
                onShow: showTip
            },
            onCreateLabel: createLabel
        }, treemap.options);

        tm = new $jit.TM.Squarified(options);

        tm.loadJSON(json());
        tm.refresh();

        selectedItem(tm.graph.getNode(json.id));

        if (treemap.zoomOnClick) {
            selectedItem.subscribe(function (node) {
                if (node) {
                    tm.enter(tm.graph.getNode(node.id));
                }
            });
        }

        json.subscribe(function(value) {
            tm.op.morph(value, {
                type: 'fade',
                duration: 1500,
                type: 'replot'
            });
        });
    }
    /*jslint unparam:false*/

    ko.bindingHandlers.treemap = {
        init: init
    };

    ko.bindingHandlers.treemap.currentIndex = 0;
});

