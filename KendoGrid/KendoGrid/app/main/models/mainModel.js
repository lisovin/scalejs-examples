/*global define, console */
define(function () {
    'use strict';
    return function (sandbox) {
        var//toEnumerable = sandbox.linq.enumerable.from,
            range = sandbox.linq.enumerable.range,
            observable = sandbox.mvvm.observable,
            columnsCount = 10,
            rowsCount = 10000,
            data,
            columns;

        function newRecord(n) {
            return range(1, columnsCount).toObject(function (i) {
                return 'name_' + i;
            }, function (i) {
                //return (n - 1) * columnsCount + i;
                return observable(Math.ceil(n / i));
            });
        }

        data = range(1, rowsCount)
            .select(newRecord)
            .shuffle()
            .toArray();

        columns = range(1, columnsCount).select('{field: "name_"+$, filterable: true, type: "number"}').toArray();


        return {
            data: data,
            columns: columns,
            newRecord: newRecord
        };
    };
});
