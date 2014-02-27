/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observable = sandbox.mvvm.observable,
            //messageBus = sandbox.reactive.messageBus,
            text = observable('Hello World'),
            width = observable(300);

        /*
        function dec() {
            if (width() > 100) {
                width(width() - 20);
                setTimeout(dec, 0);
            }
        }

        etTimeout(dec, 1000);
        */
        return {
            text: text,
            width: width
        };
    };
});
