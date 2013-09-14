/*global define */
define([
    'scalejs!sandbox/main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observable = sandbox.mvvm.observable,
            messageBus = sandbox.reactive.messageBus,
            text = observable('Hello World'),
            columns = observable('400px 1fr 1fr');

        setTimeout(function () {
            columns("200px 1fr 1fr");
        }, 3000);

        return {
            text: text,
            columns: columns
        };
    };
});
