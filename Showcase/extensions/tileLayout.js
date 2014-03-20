/// <reference path="../scripts/_references.js" />
/*global define,console,window*/
/*jslint unparam: true*/
define([
    'scalejs!core',
    'jQuery',
    'knockout',
    './front',
    'scalejs.mvvm'
], function (
    core,
    $,
    ko,
    createFront
) {
    /// <param name="ko" value="window.ko"/>
    'use strict';

    //  aliases
    var//  variables
        unitWidth = 140,
        isDebug = false,
        yOffset,
        front;

    //  returns the actual tile width or height in pixels
    function getDimension(tile, dimension) {
        return tile[dimension] * unitWidth;
    }
     
    function getPageHeight(element) {
        var pageHeight = $(element).outerHeight();
        yOffset = $(element).offset().top;
        if (window.innerHeight < yOffset + pageHeight) {
            pageHeight = window.innerHeight - yOffset - 44; //accounts for *page* header (this obviously should be done better)
        }
        return pageHeight;
    }

    //  Finds the optimal Tile Placement which will fit in the screen
    function calculate(tiles, u, pageHeight, element) {
        unitWidth = u || unitWidth;
        pageHeight = pageHeight || getPageHeight(element);
        var point = {
            x: 0,
            y: 0,
            width: 2 * unitWidth,
            height: pageHeight
        };

        return tiles.reduce(function (width, tile, i) {
            var tileWidth = getDimension(tile, 'width'),
                tileHeight = getDimension(tile, 'height');
            
            if (tileWidth > point.width) {
                point.y += unitWidth;
                point.x += point.width - 2 * unitWidth;
                point.width = 2 * unitWidth;
                point.height = pageHeight - (point.y + unitWidth);
            } else if (tileHeight > point.height) {
                point.y = 0;
                point.x = point.x + point.width;
                point.width = 2 * unitWidth;
                point.height = pageHeight;
            }

            tile.top = point.y;
            tile.left = point.x;

            if (point.width > tileWidth) {
                point.x += tileWidth;
                point.width -= tileWidth;
            } else if (point.width === tileWidth && point.height - 2 * unitWidth > 0) {
                point.x = point.x + point.width - 2 * unitWidth;
                point.y += tileHeight;
                point.width = 2 * unitWidth;
                point.height -= tileHeight;
            } else {
                point.x += point.width;
                point.width = unitWidth * 2;
                point.y = 0;
                point.height = pageHeight;
            }

            return Math.max(width, tile.left + tileWidth);
        }, 0);
    }


    return {
        calculate: calculate,
        getDimension: getDimension
    };
});
/*jslint unparam: false*/
