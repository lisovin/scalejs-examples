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
            ajaxGet = sandbox.ajax.jsonpGet,
            observable = sandbox.mvvm.observable,
            // vars
            columns,
            itemsSource = observableArray(),
            itemsCount = observable(),
            evaluate,
            companies;
   
        // creates observables needed for filter
        function createFilter(type) {
            return {
                type: type,
                value: observable(),
                quickSearch: observable(),
                values: observableArray()
            };
        }

        function moneyFormatter(m) {
            return parseFloat(m).toFixed(2);
        }

        columns = [
            { id: "Symbol", field: "Symbol", name: "Symbol", minWidth: 75, filter: createFilter('string') },
            { id: "Name", field: "Name", name: "Name", minWidth: 300 },
            { id: "LastSale", field: "LastSale", name: "Last Sale", cssClass: "money", minWidth: 100 },
            { id: "MarketCap", field: "MarketCap", name: "Market Cap", cssClass: "money", minWidth: 150 },
            { id: "Sector", field: "Sector", name: "Sector", minWidth: 150 },
            { id: "Industry", field: "industry", name: "Industry", minWidth: 350 }];

        ajaxGet('./companylist.txt', {}).subscribe(function (data) {
            // maintain original companies for filtering
            companies = JSON.parse(data).map(function (company, index) {
                // each item in itemsSource needs an index
                company.index = index;
                // money formatter
                company.LastSale = moneyFormatter(company.LastSale);
                company.MarketCap = moneyFormatter(company.MarketCap);
                return company;
            });

            itemsCount(companies.length);
            itemsSource(companies);
        });

        // functions needed for string filter
        evaluate = {
            In: function (s, v) { return v.indexOf(s) !== -1; },
            Contains: function (s, v) { return s.indexOf(v[0]) !== -1; },
            StartsWith: function (s, v) { return s.indexOf(v[0]) === 0; },
            EndsWith: function (s, v) { return s.indexOf(v[0], s.length - v.length) !== -1; },
            NotEmpty: function(s) { return s !== ""}
        }

        function upperCase(value) {
            return value.map(function (v) {
                return v.toUpperCase();
            });
        }
        // filter is defined on the first column
        columns[0].filter.value.subscribe(function (v) {
            // v is an array with objects { op: <filterOperation>, values: [<valuesArray>] }
            if (v.length === 0) {
                // there are no filters
                itemsCount(companies.length);
                itemsSource(companies);
                return;
            }

            // filtering
            var filteredItems = v.reduce(function (items, filter) {
                return items.filter(function (item) {
                    return evaluate[filter.op](item.Symbol, upperCase(filter.values))
                });
            }, companies).map(function(item, index) {
                // need to set new index
                item.index = index;
                return item;
            });
            itemsCount(filteredItems.length);
            itemsSource(filteredItems);
        });

        // need to also set the list items
        columns[0].filter.quickSearch.subscribe(function (q) {
            if (q.length === 0) {
                columns[0].filter.values(companies.take(50).toArray());
            } else {
                columns[0].filter.values(companies
                    .map(function(c) { return c.Symbol; })
                    .where(function (c) { return evaluate.StartsWith(c, upperCase(q.values)); })
                    .take(50).toArray());
            }
        });

        return {
            columns: columns,
            itemsSource: itemsSource,
            itemsCount: itemsCount
        };
    };
});
