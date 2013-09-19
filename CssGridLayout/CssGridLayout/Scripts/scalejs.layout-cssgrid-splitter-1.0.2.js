
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
        var dragStartColumns;

        return function (e) {
            var dx = e.gesture.deltaX,
                //dy = e.gesture.deltaY,
                msGridColumn = (element.currentStyle && element.currentStyle['-ms-grid-column']) || element.getAttribute('data-ms-grid-column'),
                msGridColumnIndex,
                parent = element.parentNode,
                msGridColumns = (parent.currentStyle && parent.currentStyle['-ms-grid-columns']) || parent.getAttribute('data-ms-grid-columns'),
                columns;

            function updateColumns() {
                var left = dragStartColumns[msGridColumnIndex - 1],
                    right = dragStartColumns[msGridColumnIndex + 1];

                function resize(measure, delta) {
                    //console.log('--->resize: ' + left + ' by ' + delta);
                    var value = /(\d+)/.exec(measure);
                    if (value) {
                        return (Math.max(parseInt(value, 10) + delta, 0)) + 'px';
                    }

                    return measure;
                }

                if (!left.match(/fr/i)) {
                    columns[msGridColumnIndex - 1] = resize(left, dx);
                    return true;
                }

                if (!right.match(/fr/i)) {
                    columns[msGridColumnIndex + 1] = resize(left, -dx);
                    return true;
                }

                return false;
            }

            if (!msGridColumns) {
                return;
            }

            try {
                msGridColumnIndex = parseInt(msGridColumn, 10) - 1;
            } catch (ex) {
                return;
            }

            columns = msGridColumns.match(/\S+/g);
            //console.log(type, dx, dy, parent.id, parent.getAttribute('style'), columns);

            switch (e.type) {
            case 'dragstart':
                dragStartColumns = columns;
                break;
            case 'drag':
                if (updateColumns()) {
                    element.parentNode.setAttribute('style', '-ms-grid-columns: ' + columns.join(' '));
                    core.reactive.messageBus.notify('css-grid-layout');
                }
                break;
            case 'dragend':
                if (updateColumns()) {
                    //console.log('--->resized: ' + columns);
                    element.parentNode.setAttribute('style', '-ms-grid-columns: ' + columns.join(' '));
                    core.reactive.messageBus.notify('css-grid-layout');
                }
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

