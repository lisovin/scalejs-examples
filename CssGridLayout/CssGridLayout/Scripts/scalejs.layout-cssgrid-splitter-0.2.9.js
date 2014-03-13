
/*global define, document*/
define('scalejs.layout-cssgrid-splitter/splitter', [
    'scalejs!core',
    'hammer',
    'knockout'
], function (
    core,
    hammer
) {
    

    /* example template
    <div id="main_template">
        <div id="main">
            <div id="left" data-class="_left-width">Navigation</div>
            <div id="leftSplitter" data-bind="splitter: 'final'"></div>
            <div id="header">Header</div>
            <div id="headerSplitter" data-bind="splitter: ''"></div>
            <div id="content1">Content 1</div>
            <div id="footer">Footer</div>
        </div>
    </div>
    */

    function handleDrag(element, mode) {
        var resizer,
            bgCol;

        function createResizer(rowOrColumn, deltaProperty, e) {
            var position = (element.currentStyle && element.currentStyle['-ms-grid-' + rowOrColumn]) ||
                            core.layout.utils.safeGetStyle(element, '-ms-grid-' + rowOrColumn) ||
                            undefined, // splitter doesnt have defined row or column. splitter is not correctly placed in your grid.
                grid = element.parentNode,
                definition = (grid.currentStyle && grid.currentStyle['-ms-grid-' + rowOrColumn + 's']) ||
                              core.layout.utils.safeGetStyle(grid, '-ms-grid-' + rowOrColumn + 's') ||
                              undefined, // splitter doesnt have defined row or column. splitter is not correctly placed in your grid.
                index,
                dragStartDefinitions,
                dragSplitterPos,
                dragSplitterDiv;


            if (mode === 'final') {
                dragSplitterDiv = document.createElement("div");
                dragSplitterDiv.style.position = 'absolute';
                dragSplitterDiv.style.height = core.layout.utils.safeGetStyle(element, 'height');
                dragSplitterDiv.style.width = core.layout.utils.safeGetStyle(element, 'width');
                dragSplitterDiv.className = element.className;
                dragSplitterDiv.style.zIndex = 9999999;
                dragSplitterDiv.style.top = element.offsetTop + 'px';
                dragSplitterDiv.style.left = element.offsetLeft + 'px';
                dragSplitterPos = {
                    topPx: element.offsetTop + 'px',
                    leftPx: element.offsetLeft + 'px',
                    startTop: element.offsetTop,
                    startLeft: element.offsetLeft
                };
                dragSplitterDiv.style.backgroundColor = bgCol;
                document.body.appendChild(dragSplitterDiv);
            }



            function updateDefinitions(delta, deltaProperty) {
                var prev = dragStartDefinitions[index - 1],
                    next = dragStartDefinitions[index + 1],
                    definitions = dragStartDefinitions.slice();

                function resize(measure, delta) {
                    //console.log('--->resize: ' + left + ' by ' + delta);
                    var value = /(\d+)/.exec(measure),
                        changed_measure;
                    if (value) {
                        changed_measure = (Math.max(parseInt(value, 10) + delta, 0)) + 'px';

                        if (mode === 'final') {
                            if (deltaProperty === 'deltaX') {
                                dragSplitterPos.leftPx = (dragSplitterPos.startLeft + delta) + 'px';
                            }
                            if (deltaProperty === 'deltaY') {
                                dragSplitterPos.topPx = (dragSplitterPos.startTop + delta) + 'px';
                            }
                        }

                        return changed_measure;
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
                var newDefinitions = updateDefinitions(e.gesture[deltaProperty], deltaProperty),
                    newDef;
                if (newDefinitions) {
                    newDef = newDefinitions.join(' ');
                    core.layout.utils.safeSetStyle(element.parentNode, '-ms-grid-' + rowOrColumn + 's', newDef);
                    //element.parentNode.setAttribute('style', '-ms-grid-' + rowOrColumn + 's: ' + newDefinitions.join(' '));
                    if (core.layout && mode !== 'final') {
                        core.layout.invalidate();
                    }

                    if (mode === 'final') {
                        dragSplitterDiv.style.left = dragSplitterPos.leftPx;
                        dragSplitterDiv.style.top = dragSplitterPos.topPx;
                    }
                }
            }

            function stop(e) {
                if (mode === 'final') {
                    dragSplitterDiv.parentNode.removeChild(dragSplitterDiv);
                }
                core.layout.invalidate();
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
            case 'touch':
                bgCol = getComputedStyle(element).getPropertyValue('background-color');
                break;
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
        hammer(element).on('dragstart drag dragend touch', handleDrag(element, valueAccessor()));
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

