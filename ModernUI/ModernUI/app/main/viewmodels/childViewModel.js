/*global define, setTimeout */
define([
], function (
) {
    'use strict';

    return function childViewModel(spec, sandbox) {
        var // imports
            observable = sandbox.mvvm.observable,
            observableArray = sandbox.mvvm.observableArray,
            // properties
            pages = observableArray(),
            selectedPage = observable(),
            selectedTile = observable();

        return {
            pages: pages,
            selectedPage: selectedPage,
            selectedTile: selectedTile,
            tileText: 'Child tile text ' + spec.index,
            name: 'Name ' + spec.index,
            summary: 'Longer summary ' + spec.index,
            count: spec.index
        };
    }
});
