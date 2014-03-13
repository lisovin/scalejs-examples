/*global define */
define('scalejs.panorama',[
    'scalejs!core',
    'knockout',
    'text!extensions/panorama.html',
    'extensions/panoramaBindings.js',
    'scalejs.layout-cssgrid',
    'scalejs.mvvm'
], function (
    core,
    ko,
    panoramaTemplate,
    panoramaBindings
) {
    var registerTemplates = core.mvvm.registerTemplates,
        registerBindings = core.mvvm.registerBindings,
        safeSetStyle = core.layout.utils.safeSetStyle,
        copy = core.array.copy;

    registerTemplates(panoramaTemplate);
    registerBindings(panoramaBindings);

    function wrapValueAccessor(value, element) {
        return function () {
            var pages = value.pages;
            return {
                foreach: pages,
                name: 'panorama_render_template'
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
        ko.computed(function () {
            var value = valueAccessor(),
                pages = value.pages();

            safeSetStyle(element, '-ms-grid-columns', pages.map(function (page) {
                ko.unwrap(page);
                return 'auto'
            }).join(" "));

            ko.bindingHandlers.template.update(
                element,
                wrapValueAccessor(valueAccessor(), element),
                allBindingsAccessor,
                viewModel,
                bindingContext
            );

            window.requestAnimationFrame(function () {
                copy(element.children).forEach(function (el, i) {
                    safeSetStyle(el, '-ms-grid-column', i + 1);
                });

                core.layout.invalidate({ reparse: true });
            });
        });

        return { controlsDescendantBindings: true };
    }

    ko.bindingHandlers.panorama = {
        init: init
    }

    ko.virtualElements.allowedBindings.panorama = true;
});

