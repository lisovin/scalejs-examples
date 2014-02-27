/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable,
            // properties
            foo = observable(),
            bar = observable();

        return {
            foo: foo,
            bar: bar
        };
    };
});
