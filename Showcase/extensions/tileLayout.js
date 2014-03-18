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

    //  a useful function for debugging which shows
    //  all the points of the front on the screen (single page)
    function showFrontInDOM() {
        $('.frontPoint').remove();
        front.all().forEach(function (point, index) {
            $('<div/>', {
                'class': 'frontPoint'
            }).css('-webkit-transform', 'translate(' + point.x + 'px, ' + point.y + 'px)')
                .html(String(index))
                .appendTo('.tiles-container');
        });
    }

    //  tiles are inserted right-to-left and then top-to-bottom, so once a tile
    //  is inserted below an insertion point, the insertion point is updated
    function updateAbovePoints(insertionPoint, tileWidth) {
        front.findAbovePoints(insertionPoint, tileWidth).forEach(function (point) {
            front.update(point, {
                x: insertionPoint.x + tileWidth,
                y: point.y,
                width: (point.x + point.width) - (insertionPoint.x + tileWidth)
            });
        });
    }

    //  inserting a tile has three consequences for the each of the points to the left (and above its bottom edge):
    //      1: A new insertion point may be created to the right of the tile
    //      2: A new insertion point may be created to the left of the tile
    //      3: The inserted tile may cause the left point's width to be updated
    function updateLeftPoints(insertionPoint, tileWidth, tileHeight) {
        //  creates a point (rightPoint) to the right of the inserted tile
        //  on the same x-axis as the point to the left
        function createPointToRight(point) {
            var pointRight,
                pointAbove;

            pointRight = {
                x: insertionPoint.x + tileWidth,
                y: point.y,
                width: (point.x + point.width) - (insertionPoint.x + tileWidth)
            };
            
            pointAbove = front.firstAbovePoint(pointRight);

            //  Do NOT add right point if there exists a point above it with same `x`
            if (!pointAbove) {
                front.add(pointRight);
            }
        }

        //  creates a point to the left of the inserted tile
        //  on the same y-axis as its bottom edge
        //  and the same x-axis as the point above it
        function createPointBelow(point) {
            var belowPoint,
                leftPoint;

            belowPoint = {
                x: point.x,
                y: insertionPoint.y + tileHeight,
                width: point.width
            };

            leftPoint = front.firstLeftPoint(belowPoint);

            //  Do NOT add below point if there exists an "affected" point on the left with same `y` 
            if (!leftPoint) {
                front.add(belowPoint);
            }
        }

        front.findLeftPoints({ x: insertionPoint.x, y: insertionPoint.y + tileHeight, width: insertionPoint.width })
            .forEach(function (point, index, arr) {
                // step 1: always try to make point to right
                createPointToRight(point);

                // step 2: if this is the last point then more work is needed
                if (index === arr.length - 1) {
                    createPointBelow(point);
                }

                // step 3: if insertion point affects the current point then do more work
                if (point.x + point.width >= insertionPoint.x &&
                        point.y < insertionPoint.y + tileHeight) {
                    front.update(point, { width: insertionPoint.x - point.x });
                }
            });
    }

    //  Does a masonry layout for tiles based on a width given to it
    function doMasonry(maxWidth, tiles) {
        var masonryHeight = 0;

        front = createFront();

        front.add({ x: 0, y: 0, width: maxWidth });

        masonryHeight = tiles.reduce(function (totalHeight, tile) {
            var tileWidth = getDimension(tile, 'width'),
                tileHeight = getDimension(tile, 'height'),
                insertionPoint = front.first(tileWidth);

            //its possible that there is no point which fits the tile, so insert it at the last point
            insertionPoint = insertionPoint || front.last();

            tile.left = insertionPoint.x;
            tile.top = insertionPoint.y;

            updateLeftPoints(insertionPoint, tileWidth, tileHeight);

            updateAbovePoints(insertionPoint, tileWidth);

            if (isDebug) {
                showFrontInDOM();
            }

            return Math.max(totalHeight, tile.top + tileHeight);
        }, 0);

        return masonryHeight;
    }

    function getPageHeight(element) {
        /*
        var pageHeight = $(element).outerHeight();
        yOffset = $(element).offset().top;
        if (window.innerHeight < yOffset + pageHeight) {
            pageHeight = window.innerHeight - yOffset - 44; //accounts for *page* header (this obviously should be done better)
        }*/

        var pageHeight = parseInt(element.parentNode.style.height, 10);

        return pageHeight;
    }

    //  Finds the optimal Tile Placement which will fit in the screen
    function calculate(tiles, u, pageHeight, element) {
        var masonryWidth;

        unitWidth = u || unitWidth;

        function findMasonryWidth(l, r) {
            var m = Math.floor((l + r) / 2),
                masonryHeight = doMasonry(m, tiles);

            if (r - l < unitWidth) {
                //findMasonryWidth could doMasonry and return height which is greater than pageHeight
                //if it does, doMasonry needs to be done again with a width + one unit width
                if (masonryHeight > pageHeight) {
                    doMasonry(m + unitWidth, tiles);
                    return m + unitWidth;
                }
                return m;
            }

            return masonryHeight > pageHeight
                ? findMasonryWidth(m, r)
                : findMasonryWidth(l, m);
        }

        // calculate initial masonry width which is the sum of all tiles widths
        masonryWidth = tiles.reduce(function (acc, tile) {
            return acc + getDimension(tile, "width");
        }, 0);

        pageHeight = pageHeight || getPageHeight(element);

        // find the most optimal width (e.g. so that all tiles fit to pageHeight)
        masonryWidth = findMasonryWidth(0, masonryWidth);

        return masonryWidth;
    }

    return {
        calculate: calculate,
        getDimension: getDimension
    };
});
/*jslint unparam: false*/
