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
            error = observable(),
            renderableTiles,
            tiles,
            message = spec.main.message;

        function generateTiles(n) {
            var summaries = [
                    'Will show warning dialog',
                    'Will show error dialog',
                    'Will show info dialog',
                    'Will show error bar'
                ],
                cs = enumerable
                    .range(1, n)
                    .select(function (i) {
                        return {
                            tileText: 'Child tile text ' + i,
                            name: 'Name ' + i,
                            summary: summaries[i % 3],
                            count: i
                        };
                    })
                    .toArray();

            return cs;
        }

        selectedTile.subscribe(function (newTile) {
            sandbox.log.debug('--->selectedTile: ', newTile);
            if (newTile) {
                message({
                    critical: newTile.count % 2 === 0, 
                    buttons: [
                        { 
                            content: 'Do Something',
                            action: function () { console.log('-->did something'); } 
                        },
                        { 
                            content: 'Ignore',
                            action: function () { console.log('-->did something'); } 
                        },
                    ],
                    title: 'Don\'t click on this tile ' + newTile.count,
                    content: 'It\'s a very dangerous tile - consequences are unknown.'
                });
            }
        });

        renderableTiles = generateTiles(spec.tilesCount).map(renderable('child_tile_template'));
        tiles = selectableArray(renderableTiles, {
            selectedItem: selectedTile,
            selectionPolicy: 'deselect'
        });

        return {
            title: spec.title,
            content: tiles,
            error: error
        };
    };
});
