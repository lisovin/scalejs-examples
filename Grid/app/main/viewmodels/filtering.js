/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function (column, originalItems, itemsSource) {
        var colFilter = column.filter,
            // comparison functions needed for string filter
            // s is the 'source' items and v are the 'values' in the expression
            comparisons = {
                In: function (s, v) { return v.some(function (x) { return s.match(new RegExp('^' + x + '$', 'i')); }); },
                Contains: function (s, v) { return s.match(new RegExp(v[0], 'i')); },
                StartsWith: function (s, v) { return s.match(new RegExp('^' + v[0], 'i')); },
                EndsWith: function (s, v) { return s.match(new RegExp(v[0] + '$', 'i')); },
                NotEmpty: function (s) { return s !== "" }
            };

        // filterExpression contains the operation (e.g. 'StartsWith') and values
        // returns a function which can be used to filter items
        function evaluate(filterExpression) {
            var evaluateOperation = comparisons[filterExpression.op];

            return function(item) {
                return evaluateOperation(item[column.field], filterExpression.values);
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

            // finally, update the itemsSource with the new items
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
