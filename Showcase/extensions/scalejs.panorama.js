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

            ko.bindingHandlers.template.update(
                element,
                wrapValueAccessor(valueAccessor(), element),
                allBindingsAccessor,
                viewModel,
                bindingContext
            );

            safeSetStyle(element, '-ms-grid-columns', pages.filter(function(page) {
                return ko.unwrap(page);
            }).map(function (page) {
                ko.unwrap(page);
                return 'auto';
            }).join(" "));

            copy(element.children).forEach(function (el, i) {
                safeSetStyle(el, '-ms-grid-column', i + 1);
            });

            window.requestAnimationFrame(function () {    
                core.layout.invalidate({ reparse: true });
            });
        });

        element.addEventListener('mousewheel', function (e) {

            var e = window.event || e; // old IE support
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

            element.scrollLeft -= delta * 120;
        });

        return { controlsDescendantBindings: true };
    }

    ko.bindingHandlers.panorama = {
        init: init
    }

    ko.virtualElements.allowedBindings.panorama = true;
});

