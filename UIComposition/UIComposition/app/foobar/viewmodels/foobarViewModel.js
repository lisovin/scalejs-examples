/*global define */
define([
    'sandbox!foobar',
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observable = sandbox.mvvm.observable,
            fooText = observable('Foo text'),
            barText = observable('Bar text');

        return {
            fooText: fooText,
            barText: barText
        };
    };
});
