/*global define */
define([
    'sandbox!main',
    './filtering'
], function (
    sandbox,
    setupFilter
) {
    'use strict';

    return function () {
        var // imports
            observableArray = sandbox.mvvm.observableArray,
            ajaxGet = sandbox.ajax.jsonpGet,
            observable = sandbox.mvvm.observable,
            // vars
            columns,
            itemsSource = observableArray(),
            itemsCount = observable();
   
        function moneyFormatter(m) {
            return parseFloat(m).toFixed(2);
        }

        columns = [
            {
                id: "Symbol", field: "Symbol", name: "Symbol", minWidth: 75,
                filter: {
                    type: 'string',
                    value: observable(), // contains the value of the filter
                    quickSearch: observable(), // contains the value of the quickSearch
                    values: observableArray() // displays the result of the quickSearch
                }
            },
            { id: "Name", field: "Name", name: "Name", minWidth: 300 },
            { id: "LastSale", field: "LastSale", name: "Last Sale", cssClass: "money", minWidth: 100 },
            { id: "MarketCap", field: "MarketCap", name: "Market Cap", cssClass: "money", minWidth: 150 },
            { id: "Sector", field: "Sector", name: "Sector", minWidth: 150 },
            { id: "Industry", field: "industry", name: "Industry", minWidth: 350 }];

        ajaxGet('./companylist.txt', {}).subscribe(function (data) {
            // maintain original companies for filtering
            var companies = JSON.parse(data).map(function (company, index) {
                // each item in itemsSource needs an index
                company.index = index;
                // money formatter
                company.LastSale = moneyFormatter(company.LastSale);
                company.MarketCap = moneyFormatter(company.MarketCap);
                return company;
            });

            itemsCount(companies.length);
            itemsSource(companies);

            // enable filtering using filtering.js
            setupFilter({
                filteredColumn: columns[0],
                originalItems: companies,
                itemsSource: itemsSource,
                itemsCount: itemsCount
            })
        });

        return {
            columns: columns,
            itemsSource: itemsSource,
            itemsCount: itemsCount
        };
    };
});
