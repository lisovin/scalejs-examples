
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

