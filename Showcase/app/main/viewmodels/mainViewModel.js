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
            merge = sandbox.object.merge,
            // properties
            pages = observableArray(),
            tiles = observableArray(),
            tileGen = {
                large: largeTile,
                medium: mediumTile,
                mini: miniTile,
                square: squareTile
            },
            colors = ['lime','green','emerald','teal','cyan','colbalt','indigo','violet','pink','magenta','crimson','red','orange','amber','yellow','lightBlue','lightTeal','lightOlive','lightPink','lightRed','lightGreen']


        function createRandomTiles(n) {

            for (var i = 0; i < n; i++) {
                var width = 1 + Math.random() * 4 | 0;

                tiles.push({
                    width: width,
                    height: 1 + Math.random() * width | 0,
                    bgColor: colors[Math.random() * colors.length | 0]
                });
            }
        }

        function mediumTile(color) {
            return {
                height: 1,
                width: 2,
                bgColor: color
            };
        }

        function squareTile(color) {
            return {
                height: 1,
                width: 1,
                bgColor: color
            };
        }

        function miniTile(color) {
            return {
                height: .5,
                width: .5,
                bgColor: color,
                brandDarken: false
            };
        }
        function largeTile(color) {
            return {
                height: 2,
                width: 2,
                bgColor: color,
            };
        }



        function numTile(size) {
            var randNum = Math.random(),
                percentage =  Math.round(randNum * 100),
                ryg = ['darkRed', 'crimson', 'red', 'lightRed', 'orange', 'amber', 'lime', 'lightGreen', 'green', 'emerald', 'darkGreen'],
                color = ryg[randNum * ryg.length | 0];

            return merge({
                contentTemplate: 'showcase_tile_template',
                showBrand: true,
                brandDarken: true,
                brandBar: true,
                content: {
                    size: size,
                    percentage: percentage
                }
            }, tileGen[size](color));
        }

        console.log(numTile('medium'));


        function createOrderedTiles() {
            tiles([
                mediumTile('amber'), miniTile('magenta'), miniTile('orange'), squareTile('darkOrange'), mediumTile('indigo'), largeTile('lime'), mediumTile('cyan'),
                miniTile('green'), miniTile('violet'),
                mediumTile('lightBlue'), mediumTile('teal'), squareTile('lightPink'), squareTile('violet'), squareTile('lightBlue'),
                squareTile('lightTeal'), squareTile('cobolt'), largeTile('steel'), mediumTile('red'), squareTile('steel'), mediumTile('gray'),
                mediumTile('green'), squareTile('violet'), squareTile('lightRed'), mediumTile('lightGreen'), squareTile('magenta'), squareTile('yellow')
            ])
        }

        
        function createNumberedTiles() {
            tiles([
                mediumTile('amber'), miniTile('magenta'), miniTile('orange'), squareTile('darkOrange'), mediumTile('indigo'), largeTile('lime'), mediumTile('cyan'),
                miniTile('green'), miniTile('violet'),
                mediumTile('lightBlue'), mediumTile('teal'), squareTile('lightPink'), squareTile('violet'), squareTile('lightBlue'),
                squareTile('lightTeal'), squareTile('cobolt'), largeTile('steel'), mediumTile('red'), squareTile('steel'), mediumTile('gray'),
                mediumTile('green'), squareTile('violet'), squareTile('lightRed'), mediumTile('lightGreen'), squareTile('magenta'), squareTile('yellow')
            ])
        }


        function createNumberedTiles() {
            tiles([
                numTile('medium'), numTile('mini'), numTile('mini'), numTile('square'), numTile('medium'), numTile('large'), numTile('medium'),
                numTile('mini'), numTile('mini'),
                numTile('medium'), numTile('medium'), numTile('square'), numTile('square'), numTile('square'),
                numTile('square'), numTile('square'), numTile('large'), numTile('medium'), numTile('square'), numTile('medium'),
                numTile('medium'), numTile('square'), numTile('square'), numTile('medium'), numTile('square'), numTile('square')
            ])

        }

        createNumberedTiles();
        //createRandomTiles(10);
        //createOrderedTiles();
        console.log(tiles());

        return {
            pages: pages,
            tiles: tiles
        };
    };
});
