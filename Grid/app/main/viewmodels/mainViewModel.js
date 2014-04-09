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

        function moneyFormatter(m) {
            return parseFloat(m).toFixed(2);
        }

        columns = [
            { id: "Symbol", field: "Symbol", name: "Symbol", minWidth: 100, filter: { type: 'string' }, sortable: true, defaultSort: 'asc' },
            { id: "Name", field: "Name", name: "Name", minWidth: 300, filter: { type: 'string' }, sortable: true },
            { id: "LastSale", field: "LastSale", name: "Last Sale", cssClass: "money", minWidth: 100, filter: { type: 'number' }, sortable: true },
            { id: "MarketCap", field: "MarketCap", name: "Market Cap", cssClass: "money", minWidth: 150, filter: { type: 'mumber' }, sortable: true },
            { id: "Sector", field: "Sector", name: "Sector", minWidth: 150, filter: { type: 'string' }, sortable: true },
            { id: "Industry", field: "industry", name: "Industry", minWidth: 350, filter: { type: 'string' }, sortable: true }];

        ajaxGet('./companylist.txt', {}).subscribe(function (data) {
            itemsSource(JSON.parse(data).map(function (company, index) {
                // each item in itemsSource needs an index
                company.index = index
                // money formatter
                company.LastSale = moneyFormatter(company.LastSale);
                company.MarketCap = moneyFormatter(company.MarketCap);
                return company;
            }));
        });

        return {
            columns: columns,
            itemsSource: itemsSource
        };
    };
});
