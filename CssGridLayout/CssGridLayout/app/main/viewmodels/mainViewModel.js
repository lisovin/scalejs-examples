/*global define */
define(function () {
    'use strict';

    return function (sandbox) {
        var observable = sandbox.mvvm.observable,
            text = observable('Hello World');

        return {
            text: text
        };
    };
});
