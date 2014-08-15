/*global define */
define([
    'sandbox!main',
    '../models/flare',
    '../models/half-flare'
], function (
    sandbox,
    flare,
    halfFlare
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable,
            // properties
            text = observable('Hello World');

        return {
            flare: flare,
            halfFlare: halfFlare
        };
    };
});
