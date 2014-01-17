/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observableArray = sandbox.mvvm.observableArray,
            observable = sandbox.mvvm.observable,
            tabs = observableArray([]),
            defaultTabs = observableArray([]);

        function createTab(x) {
            return {
                header: observable("Tab " + (x || tabs().length + 1)),
                content: {
                    text: "Content for Tab " + (x || tabs().length + 1)
                }
            };
        }

        defaultTabs([{ header: 'New Tab', create: createTab }])
        
        tabs([1, 2, 3, 4, 5].map(createTab));

        return {
            tabs: tabs,
            defaultTabs: defaultTabs
        };
    };
});
