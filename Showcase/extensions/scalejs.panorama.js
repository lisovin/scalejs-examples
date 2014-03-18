/*global define */
define('scalejs.panorama', [
    'scalejs!core',
    'knockout',
    'text!extensions/panorama.html',
    'scalejs.layout-cssgrid',
    'scalejs.mvvm'
], function (
    core,
    ko,
    panoramaTemplate
) {
    var registerTemplates = core.mvvm.registerTemplates,
        safeSetStyle = core.layout.utils.safeSetStyle,
        copy = core.array.copy;

    registerTemplates(panoramaTemplate);

    function wrapValueAccessor(value, element) {
        return function () {
            return {
                name: 'panorama_content_template',
                data: value
            };
        };
    }

    function setPagesGridColumns(element, pages) {
        var pages,
            columnStyle;
        
        pages = ko.unwrap(pages)
            .filter(function (p) { 
                return ko.unwrap(p); 
            }),

        columnStyle = pages
            .map(function (p) {
                return 'auto';
            }).join(' ');

        if (columnStyle.length !== 0)
        {
            safeSetStyle(element, '-ms-grid-columns', columnStyle);
        }
    }

    function init(
        element, 
        valueAccessor, 
        allBindingsAccessor, 
        viewModel, 
        bindingContext
    ) {
        element.addEventListener('mousewheel', function (e) {

            var e = window.event || e; // old IE support
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

            element.scrollLeft -= delta * 120;
        });

        return { controlsDescendantBindings: true };
    }



    function update(
        element,
        valueAccessor,
        allBindingsAccessor,
        viewModel,
        bindingContext
    ) {
        var binding = valueAccessor(),
            contentHeight;

        setPagesGridColumns(element, binding.pages);

        core.layout.invalidate({ reparse: true });

        ko.bindingHandlers.template.update(
            element,
            wrapValueAccessor(valueAccessor(), element),
            allBindingsAccessor,
            viewModel,
            bindingContext
        );

        return { controlsDescendantBindings: true };
    }

    ko.bindingHandlers.panorama = {
        init: init,
        update: update
    }

    ko.virtualElements.allowedBindings.panorama = true;
});

