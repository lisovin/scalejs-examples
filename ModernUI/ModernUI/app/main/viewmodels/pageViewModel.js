/*global define, setTimeout */
define([
], function (
) {
    'use strict';


    return function (spec, sandbox) {
        var // imports
            observable = sandbox.mvvm.observable,
            //observableArray = sandbox.mvvm.observableArray,
            //computed = sandbox.mvvm.computed,
            renderable = sandbox.mvvm.renderable,
            enumerable = sandbox.linq.enumerable,
            selectableArray = sandbox.mvvm.selectableArray,
            // properties
            selectedTile = observable(),
            renderableTiles,
            tiles;

        function generateTiles(n) {
            var cs = enumerable
                .range(1, n)
                .select(function (i) {
                    return {
                        tileText: 'Child tile text ' + i,
                        name: 'Name ' + i,
                        summary: 'Longer summary ' + i,
                        count: spec.index
                    };
                })
                .toArray();

            return cs;
        }

        selectedTile.subscribe(function (newTile) {
            sandbox.log.debug('--->selectedTile: ', newTile);
        });

        renderableTiles = generateTiles(spec.tilesCount).map(renderable('child_tile_template'));
        tiles = selectableArray(renderableTiles, { 
            selectedItem: selectedTile,
            selectionPolicy: 'deselect'
        });

        return {
            title: spec.title,
            content: tiles
        };
    };
});
