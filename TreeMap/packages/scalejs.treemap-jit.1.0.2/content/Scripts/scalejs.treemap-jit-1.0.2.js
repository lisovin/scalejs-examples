
/*global define*/
define('scalejs.treemap-jit',[
    'scalejs!core',
    'knockout',
    'jit',
    'scalejs.mvvm'
], function (
    core,
    ko,
    $jit
) {
    

    var merge = core.object.merge,
        has = core.object.has;
    /*jslint unparam:true*/

    function getUniqueId() {
        var id = 'scalejs_treemap_' + ko.bindingHandlers.treemap.currentIndex;
        ko.bindingHandlers.treemap += 1;
        return id;
    }

    function init(
        element,
        valueAccessor,
        allBindingsAccessor
    ) {
        var tm,
            options,
            treemap = valueAccessor();

        element.id = element.id || getUniqueId();

        options = merge({
            injectInto: element,
            titleHeight: 15,
            animate: true,
            offset: 1,
            Events: {
                enable: true,
                onClick: function (node) {
                    if (node) {
                        tm.enter(node);
                    }
                },
                onRightClick: function (node) {
                    tm.out();
                }
            },
            duration: 1000,
            Tips: {
                enable: has(treemap.nodeTipTemplate),
                offsetX: 20,
                offsetY: 20,
                onShow: function (tip, node, isLeaf, domElement) {
                    ko.applyBindings({
                        template: {
                            name: treemap.nodeTipTemplate,
                            data: node
                        }
                    }, tip);
                }
            },
            onCreateLabel: function (domElement, node) {
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
            }
        }, treemap.options);

        tm = new $jit.TM.Squarified(options);
        tm.loadJSON(treemap.data);
        tm.refresh();
    }
    /*jslint unparam:false*/

    ko.bindingHandlers.treemap = {
        init: init
    };

    ko.bindingHandlers.treemap.currentIndex = 0;
});

