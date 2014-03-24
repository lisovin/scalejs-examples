/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            range = sandbox.linq.enumerable.range,
            observableArray = sandbox.mvvm.observableArray,
            // vars
            columns = ['Id', 'Name', 'Age'].select(function (x) {
                return {
                    id: x,
                    name: x,
                    field: x
                }
            }).toArray(),
            itemsSource = observableArray(['Erica', 'Peter', 'Conor', 'Dillon']
                .select(function (x, index) {
                    return {
                        index: index,
                        Id: index,
                        Name: x,
                        Age: Math.random() * 70 | 0
                    };
                }).toArray());

        window.is = itemsSource;

        return {
            columns: columns,
            itemsSource: itemsSource
        };
    };
});
