/*global define */
define([
    'sandbox!yellow',
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observable = sandbox.mvvm.observable,
            text = observable();

        return {
            text: text
        };
    };
});
