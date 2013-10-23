/*global define,console */
define([
    'scalejs!sandbox/demo',
    '../models/calcs'
], function (
    sandbox,
    calcs
) {
    'use strict';

    return function () {
        var ajaxGet = sandbox.ajax.get,
            observableArray = sandbox.mvvm.observableArray,
            observable = sandbox.mvvm.observable,
            //arrayCopy = sandbox.array.copy,
            //has = sandbox.has,
            merge = sandbox.object.merge,
            toEnumerable = sandbox.linq.enumerable.from,
            interval = sandbox.reactive.Observable.interval,
            // properties
            model = calcs(sandbox),
            priceSeries,
            mavgSeries,
            lowerBBSeries,
            upperBBSeries,
            chartSeries = observableArray([]),
            bbandsToggleText = observable('Hide Bollinger Bands'),
            priceSeriesTypeToggleText = observable('Show Candlesticks'),
            addPointsToggleText = observable('Start Adding Points'),
            addingPointsSub;

        function series(name, data, type) {
            return {
                name: name,
                data: observableArray(data),
                type : type
            };
        }

        /*jslint unparam: true*/
        function togglePriceSeriesType() {
            var currentSeries = chartSeries(),
                currentPriceSeries = priceSeries,
                newSeries;

            priceSeriesTypeToggleText(priceSeriesTypeToggleText() === 'Show Candlesticks' ? 'Show Lines' : 'Show Candlesticks');
            // create new price series with toggled type
            priceSeries = merge(priceSeries, {
                type: priceSeries.type === 'candlestick' ? 'line' : 'candlestick'
            });

            // update priceSeries
            newSeries = toEnumerable(currentSeries)
                .select(function (s) {
                    return s === currentPriceSeries ? priceSeries : s;
                })
                .toArray();

            chartSeries(newSeries);
        }
        /*jslint unparam: false*/

        function toggleBBands() {
            bbandsToggleText(bbandsToggleText() === 'Show Bollinger Bands' ? 'Hide Bollinger Bands' : 'Show Bollinger Bands');

            if (chartSeries().length !== 1) {
                chartSeries([
                    priceSeries
                ]);
            } else {
                chartSeries([
                    priceSeries,
                    mavgSeries,
                    lowerBBSeries,
                    upperBBSeries
                ]);
            }
        }

        function load() {
            ajaxGet('data.csv', 'text')
                .subscribe(function (response) {
                    var prices = model.parsePrices(response),
                        bbands = model.bbands(prices);

                    priceSeries = series('AAPL', prices);
                    mavgSeries = series('Moving Average', bbands.mavg);
                    lowerBBSeries = series('Lower Band', bbands.lower);
                    upperBBSeries = series('Upper Band', bbands.upper);

                    toggleBBands();
                });
        }

        function addPoint() {
            //console.log('--->addPoint: ' + (sandbox.date().getTime()));
            var points = priceSeries.data(),
                index = Math.floor(Math.random() * points.length),
                lastPoint = points[points.length - 1],
                newClose = lastPoint[4] * (points[index][1] / points[index][4]),
                newDate = sandbox.date(lastPoint[0]).addDays(1).getTime(),
                newPoint = [
                    newDate,
                    lastPoint[4],
                    newClose,
                    lastPoint[4],
                    newClose
                ];
            priceSeries.data.push(newPoint);
        }

        function toggleAddingPoints() {
            if (addPointsToggleText() === 'Start Adding Points') {
                addingPointsSub = interval(300).subscribe(addPoint);
                addPointsToggleText('Stop Adding Points');
            } else {
                addingPointsSub.dispose();
                addingPointsSub = null;
                addPointsToggleText('Start Adding Points');
            }
        }

        return {
            data: chartSeries,
            bbandsToggleText : bbandsToggleText,
            priceSeriesTypeToggleText: priceSeriesTypeToggleText,
            toggleBBands: toggleBBands,
            togglePriceSeriesType: togglePriceSeriesType,
            toggleAddingPoints : toggleAddingPoints,
            addPointsToggleText: addPointsToggleText,
            load: load
        };
    };
});
