﻿/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            observableArray = sandbox.mvvm.observableArray,
            observable = sandbox.mvvm.observable,
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
            date = observable(),
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
                percentage =  Math.round(randNum * 200),
                ryg = ['darkGreen', 'darkRed'],
                color = ryg[randNum * ryg.length | 0];

            return merge({
                contentTemplate: 'showcase_tile_template',
                showBrand: true,
                brandDarken: true,
                darkenColor: ['green','red'][randNum * ryg.length | 0],
                brandBar: true,
                size: size,
                content: {
                    size: size,
                    percentage: percentage
                }
            }, tileGen[size](color));
        }


        function createOrderedTiles() {
            tiles([
                mediumTile('amber'), mediumTile('lightBlue'), squareTile('lightPink'), squareTile('violet'), mediumTile('green'),
                squareTile('darkOrange'), squareTile('darkOrange'), largeTile('lime'), mediumTile('teal'),
                 squareTile('lightTeal'), squareTile('cobolt'), mediumTile('indigo'), mediumTile('cyan'), squareTile('violet'), squareTile('lightRed'),
                 largeTile('steel'), squareTile('magenta'), squareTile('yellow'), mediumTile('red'),
                mediumTile('lightGreen'), squareTile('lightBlue')
                
            ])
        }
        
        function createNumberedTiles() {
            tiles([
                numTile('medium'), numTile('large'),numTile('square') , numTile('square'), numTile('medium'), numTile('large'), numTile('medium') /*,
                numTile('medium'), numTile('medium'), numTile('square'), numTile('square'), numTile('square'),
                numTile('square'), numTile('square'), numTile('large'), numTile('medium'), numTile('square'), numTile('medium'),
                numTile('medium'), numTile('square'), numTile('square'), numTile('medium'), numTile('square'), numTile('square') */
            ])

        }

        function _createRandomNumberTiles(n) {
            var t = [],
                randNum;

            for (var i = 0; i < n; i++) {
                randNum = Math.random();

                if (randNum < 0.8) {
                    t.push(numTile('medium'));
                } else if (randNum < 0.9) {
                    t.push(numTile('square'));
                    t.push(numTile('square'));
                } else {
                    t.push(numTile('large'));
                }
            }
            tiles(t);
        }


        function createRandomNumberTiles(n) {
            var t = [];
            for (var i = 0; i < n; i++) {
                t.push(numTile('medium'));
            }
            tiles(t);
        }


        //createNumberedTiles();
        //createRandomTiles(10);
        createRandomNumberTiles(10);
        //createOrderedTiles();

        date.subscribe(function (d) {
            console.log(d);
        });

        return {
            pages: pages,
            tiles: tiles,
            date: date
        };
    };
});
