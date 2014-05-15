/*global define */
define([
    'sandbox!main',
    '../models/data'
], function (
    sandbox,
    model
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable;

        return {
            model: model
        };
    };
});
