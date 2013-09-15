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
            columns = observable('auto auto 1fr 1fr'),
            width = observable(300);

        function dec() {
            if (width() > 100) {
                width(width() - 20);
                setTimeout(dec, 0);
            }
        }

        //setTimeout(dec, 1000);

        return {
            text: text,
            columns: columns,
            width: width
        };
    };
});
