/// <reference path="../scripts/_references.js" />
/*global define,console,window*/
/*jslint unparam: true*/
define('scalejs.calendar-metro', [
    'scalejs!core',
    'jQuery',
    'knockout',
    'metro'
], function (
    core,
    $,
    ko
) {
    /// <param name="ko" value="window.ko"/>
    'use strict';

    function init(
        element,
        valueAccessor,
        allBindingsAccessor,
        viewModel,
        bindingContext
    ) {
        var value = valueAccessor(),
            $cal = $(element).calendar({
            click: function (d) {
                if (ko.isObservable(value)) {
                    value(d)
                }
            }
        });
        $cal.find(".calendar-actions").remove();

        return { controlsDescendantBindings: true };
    }
    /*jslint unparam: false*/
    
    ko.bindingHandlers.calendar = {
        init: init
    };

});
/*jslint unparam: false*/
