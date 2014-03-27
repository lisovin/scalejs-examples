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
            // vars
            columns,
            itemsSource = observableArray();

        columns = [
            { id: "Symbol", field: "Symbol", name: "Symbol" },
            { id: "Name", field: "Name", name: "Name", minWidth: 300 },
            { id: "LastSale", field: "LastSale", name: "Last Sale" },
            { id: "MarketCap", field: "MarketCap", name: "Market Cap", minWidth: 150 },
            { id: "Sector", field: "Sector", name: "Sector", minWidth: 150 },
            { id: "Industry", field: "industry", name: "Industry", minWidth: 200}];

        ajaxGet('./companylist.txt', {}).subscribe(function (data) {
            itemsSource(JSON.parse(data).map(function(company, index) {
                company.index = index
                return company;
            }));
        });

        return {
            columns: columns,
            itemsSource: itemsSource
        };
    };
});
