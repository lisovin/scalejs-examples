/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function (config) {
        var column = config.filteredColumn,
            colFilter = column.filter,
            originalItems = config.originalItems,
            itemsSource = config.itemsSource,
            itemsCount = config.itemsCount,
            // comparison functions needed for string filter
            // s is the 'source' items and v are the 'values' in the expression
            comparisons = {
                In: function (s, v) { return v.indexOf(s) !== -1; },
                Contains: function (s, v) { return s.indexOf(v[0]) !== -1; },
                StartsWith: function (s, v) { return s.indexOf(v[0]) === 0; },
                EndsWith: function (s, v) { return s.indexOf(v[0], s.length - v.length) !== -1; },
                NotEmpty: function (s) { return s !== "" }
            };


        // helper function to convert an array of strings to uppercase
        function arrayToUpperCase(value) {
            return value.map(function (v) {
                return v.toUpperCase();
            });
        }

        // filterExpression contains the operation (e.g. 'StartsWith') and values
        // returns a function which can be used to filter items
        function evaluate(filterExpression) {
            var evaluateOperation = comparisons[filterExpression.op],
                values = arrayToUpperCase(filterExpression.values);

            return function(item) {
                return evaluateOperation(item[column.field], values);
            }
        }

        // value is the filter expression(s) defined by user
        // subscribe to value to respond to user input
        colFilter.value.subscribe(function (expressions) {
            var filteredItems;

            // iterate through all expressions, filtering the items each item
            filteredItems = expressions.reduce(function (items, filterExpression) {
                return items.filter(evaluate(filterExpression));
            }, originalItems);

            // need to set new index on the filtered items
            filteredItems = filteredItems.map(function (item, index) {
                item.index = index;
                return item;
            });

            // finally, update the itemsSource and itemsCount with the new items
            itemsCount(filteredItems.length);
            itemsSource(filteredItems);
        });

        // need to also set the list items by subscribing to quickSearch
        colFilter.quickSearch.subscribe(function (quickSearchExpression) {
            var listItems = originalItems
                .filter(evaluate(quickSearchExpression))
                .map(function (c) { return c[column.field] }); // only need the values in the column
            
            // update the list values (filter.values observableArray) with the new list items
            // take 50 for optimization
            colFilter.values(listItems.take(50).toArray());
        });
    };
});
