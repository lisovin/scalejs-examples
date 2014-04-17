/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            observableArray = sandbox.mvvm.observableArray,
            ajaxGet = sandbox.ajax.jsonpGet,
            // vars
            columns,
            itemsSource = observableArray();

        function moneyFormatter(m) {
            return parseFloat(m).toFixed(2);
        }

        columns = [
            { id: "Symbol", field: "Symbol", name: "Symbol", minWidth: 75, filter: { type: 'string' } },
            { id: "Name", field: "Name", name: "Name", minWidth: 300, filter: { type: 'string', quickFilterOp: 'Contains' } },
            { id: "LastSale", field: "LastSale", name: "Last Sale", cssClass: "money", minWidth: 100, filter: { type: 'number' } },
            { id: "MarketCap", field: "MarketCap", name: "Market Cap", cssClass: "money", minWidth: 150, filter: { type: 'mumber' } },
            { id: "Sector", field: "Sector", name: "Sector", minWidth: 150, filter: { type: 'string' } },
            { id: "Industry", field: "industry", name: "Industry", minWidth: 350, filter: { type: 'string', quickFilterOp: 'Contains' } }];

        ajaxGet('./companylist.txt', {}).subscribe(function (data) {
            itemsSource(JSON.parse(data).map(function (company) {
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
