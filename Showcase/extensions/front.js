/*global console,define,setTimeout*/
define(['scalejs!core'], function (
    core
) {
    'use strict';
    var has = core.object.has;

    function front() {
        var yxss = [];

        /* --- helper functions --- */
        
        //returns x's for a y value
        function xs(y) {
            return yxss[y].xs;
        }

        //checks if an array is empty
        function isEmpty(arr) {
            return arr.length === 0;
        }

        //gets the last element of the array
        function last() {
            var y = yxss[yxss.length - 1];
            return y.xs[y.xs.length - 1];
        }
        
        /* --- finding keys --- */
        
        //does a binary search on a given array for an x or y value
        //returns an object with a bool indicating if it was found and the index.
        function findKey(allValues, xory, v) {
            var l = 0,
                u = allValues.length - 1,
                m,
                vs;

            while (u >= l) {
                m = (l + u) / 2 | 0;
                vs = allValues[m][xory];
                if (vs > v) u = m - 1;
                else if (vs < v) l = m + 1;
                else return { found: true, index: m };
            }

            return { found: false, index: u };
        }

        //calls findKey on the y then the x in order to get the keys for a point
        function findKeys(point) {
            var key = {};

            key.y = findKey(yxss, 'y', point.y);
            key.x = key.y.found ? findKey(yxss[key.y.index].xs, 'x', point.x) : -1;

            return key;
        }
        
        /* --- add, remove, and update operations --- */
        
        //adding a new value to our y's
        function addY(index, y) {
            yxss.splice(index, 0, { y: y, xs: [] });
        }

        //adding a new value to our x's
        function addX(yIndex, xIndex, point) {
            yxss[yIndex].xs.splice(xIndex, 0, point);
        }

        //adding a point to yxss
        function add(point) {
            var key = {};

            //width must be  > than zero
            if (point.width <= 0) return;

            //first point!
            if (isEmpty(yxss)) {
                addY(0, point.y);
                addX(0, 0, point);
                return;
            };

            //add new (x, y) if y is not found
            key.y = findKey(yxss, 'y', point.y);
            if (!key.y.found) {
                addY(key.y.index + 1, point.y);
                addX(key.y.index + 1, 0, point);
                return;
            }

            //add new (x, y) if x is not found
            key.x = findKey(xs(key.y.index), 'x', point.x);
            if (!key.x.found) {
                addX(key.y.index, key.x.index + 1, point);
            }
        }

        //remove
        function remove(yIndex, xIndex) {
            yxss[yIndex].xs.splice(xIndex, 1);
            if (yxss[yIndex].xs.length === 0) {
                yxss.splice(yIndex, 1);
            }
        }

        //update width
        function updateWidth(yIndex, xIndex, width) {
            yxss[yIndex].xs[xIndex].width = width;
        }

        //updates values 
        function update(point, v) {
            var key = findKeys(point);

            if (v.width <= 0) { remove(key.y.index, key.x.index); return; }

            if (has(v.x)) {
                remove(key.y.index, key.x.index);
                add(v);
            } else {
                updateWidth(key.y.index, key.x.index, v.width);
            }
        }

        /* --- finding points --- */
        
        //find left points with the following conditions
        // --> x <= point.x
        // --> y < point.y
        // --> x + width >= point.x
        function findLeftPoints(point) {
            var key = {},
                numYs,
                left = [];

            key.y = findKey(yxss, 'y', point.y);

            numYs = key.y.found ? key.y.index : key.y.index + 1;

            for (var i = 0; i < numYs; i += 1) {
                var allXs = xs(i);
                key.x = findKey(allXs, 'x', point.x);
                for (var j = 0; j < key.x.index + 1; j += 1) {
                    if (allXs[j].x + allXs[j].width >= point.x) {
                        left.push(allXs[j]);
                    }
                }
            }

            return left;
        }

        //find above points with the following conditions
        // --> x > point.x,
        // --> x < point.x + tileWidth,
        // --> y <= point.y
        function findAbovePoints(point, tileWidth) {
            var key = {},
                allXs,
                numYs,
                above = [],
                l,
                u;

            key.y = findKey(yxss, 'y', point.y);

            numYs = key.y.index + 1;

            for (var i = 0; i < numYs; i += 1) {
                allXs = xs(i);
                key.xLower = findKey(allXs, 'x', point.x);
                key.xUpper = findKey(allXs, 'x', point.x + tileWidth);

                l = key.xLower.index + 1;
                u = key.xUpper.found ? key.xUpper.index : key.xUpper.index + 1;

                for (var j = l; j < u; j++) {
                    above.push(allXs[j]);
                }
            }

            return above;
        }

        //"first" element with width >= tileWidth
        function first(width) {
            var ylength = yxss.length,
                allXs,
                xLength;

            for (var i = 0; i < ylength; i += 1) {
                allXs = xs(i);
                xLength = allXs.length;

                for (var j = 0; j < xLength; j++) {
                    if (allXs[j].width >= width) {
                        return allXs[j];
                    }
                }
            }

            return undefined;
        }
        
        // finds the first above point which satsifies the following conditons
        // --> y < point.y
        // --> x === point.x
        // --> width >= point.width
        function firstAbovePoint(point) {
            var ykey = findKey(yxss, 'y', point),
                numYs = ykey.found ? ykey.index : ykey.index + 1,
                above;

            for (var i = numYs - 1; i >= 0; i -= 1) {
                var points = xs(i),
                    xkey = findKey(points, 'x', point.x);
                if (xkey.found) {
                    above = points[xkey.index];
                    if (above.width >= point.width)
                        return true;
                }
            }

            return false;
        }

        // finds the first left point which satsifies the following conditons
        // --> x < point.x
        // --> y === point.y
        // --> x + width >= point.x
        function firstLeftPoint(point) {
            var key = findKeys(point),
                leftPoint,
                allXs,
                leftEdge;

            if (!key.y.found) return false;

            allXs = xs(key.y.index);
            leftEdge = key.x.found ? key.x.index - 1 : key.x.index;

            for (var i = leftEdge; i >= 0; i -= 1) {
                leftPoint = allXs[i];
                if (leftPoint.x + leftPoint.width >= point.x) return true;
            }

            return false;
        }

        /* -- for debugging -- */
        
        //prints the points in the front of the array to the console
        function print() {
            var str = "",
                i = 0;

            yxss.selectMany("$.xs").forEach(function (point) {
                str += "Point " + i + ": (" + point.x / 150 + "," + point.y / 150 + ") width: " + point.width + "\n";
                i++;
            });
            console.log(str);
        }

        //returns all the points as a sorted array in order to be rendered on the dom
        function all() {
            return yxss.selectMany("$.xs").toArray();
        }
        
        return {
            add: add,
            first: first,
            firstAbovePoint: firstAbovePoint,
            firstLeftPoint: firstLeftPoint,
            findLeftPoints: findLeftPoints,
            findAbovePoints: findAbovePoints,
            update: update,
            last: last,
            print: print,
            all: all
        };
    }

    return front;
});