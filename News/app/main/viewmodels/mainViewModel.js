/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            observableArray = sandbox.mvvm.observableArray,
            observable = sandbox.mvvm.observable,
            // properties
            headerHeight = observable('25px'),
            pages = observableArray(),
            red = observable(),
            orange = observable(),
            yellow = observable(),
            green = observable();

        return {
            headerHeight: headerHeight,
            pages: pages,
            red: red,
            orange: orange,
            yellow: yellow,
            green: green
        };
    };
});
