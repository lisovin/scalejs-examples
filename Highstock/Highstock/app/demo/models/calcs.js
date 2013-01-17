/*global define,console*/
define(function () {
    'use strict';

    return function (sandbox) {
        var toEnumerable = sandbox.linq.enumerable.from;

        function parsePrices(csv) {
            return toEnumerable(csv.split('\n'))
                .skip(1)
                .select("$.split(',')")
                .where("$.length > 1")
                //parse text and create an enumerable which contains arrays [date, open, high, low, close]
                .select(function (dataPoint) {
                    dataPoint = [Date.parse(dataPoint[0]),
                        parseFloat(dataPoint[1]),
                        parseFloat(dataPoint[2]),
                        parseFloat(dataPoint[3]),
                        parseFloat(dataPoint[4])];
                    return dataPoint;
                })
                .where("$[1] > 0 && $[2] > 0 && $[3] > 0 && $[4] > 0")
                .orderBy("$[0]").toArray();
        }

        function bbands(ohlcData, period) {
            period = period || 30;
            var bands = toEnumerable(ohlcData)
                .scan({ sum: 0, sumsq: 0 }, function (acc, x) {
                    return {
                        date: x[0],
                        sum: x[4] + acc.sum,
                        sumsq: Math.pow(x[4], 2) + acc.sumsq
                    };
                }).letBind(function (x) {
                    return x.zip(x.skip(period), function (a, b) {
                        var std = Math.sqrt((1 / period) * (b.sumsq - a.sumsq - (1 / period) * Math.pow(b.sum - a.sum, 2))),
                            avg = (b.sum - a.sum) / period;
                        return {
                            date: b.date,
                            avg: avg,
                            upper: avg + 2 * std,
                            lower: avg - 2 * std
                        };
                    });
                }).toArray();

            return {
                mavg: toEnumerable(bands).select('[$.date, $.avg]').toArray(),
                lower: toEnumerable(bands).select('[$.date, $.lower]').toArray(),
                upper: toEnumerable(bands).select('[$.date, $.upper]').toArray()
            };
        }

        return {
            parsePrices: parsePrices,
            bbands: bbands
        };
    };
});