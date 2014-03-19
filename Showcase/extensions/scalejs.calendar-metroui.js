/*global define */
define('scalejs.calendar-metroui', [
    'scalejs!core',
    'knockout',
    'text!extensions/panorama.html',
    'scalejs.mvvm',
	'metro-global',
	'metro-locale',
	'metro-calendar'
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
				data: pages,
				name: 'calendar_template',
				afterRender:  function() {
					$(element).calendar(value);
				}
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
			ko.bindingHandlers.template.update(
                element,
                wrapValueAccessor(valueAccessor(), element),
                allBindingsAccessor,
                viewModel,
                bindingContext
			);
		});

		return { controlsDescendantBindings: true };
	}

	ko.bindingHandlers.calendar = {
		init: init
	}

	ko.virtualElements.allowedBindings.calendar = true;
});

