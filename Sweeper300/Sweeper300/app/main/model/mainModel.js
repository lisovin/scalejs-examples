/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            enumerable = sandbox.linq.enumerable;

        function mines(rows, cols, minesNumber) {
            var minesIndexes = enumerable
                .generate(function () {
                    // random 0 - inclusive, 1 - exclusive
                    return Math.floor(Math.random() * rows * cols);
                })
                .distinct()
                .take(minesNumber)
                .toArray();

            return minesIndexes;
        }

        function cells(rows, cols) {
            var cells = enumerable
                .range(0, rows)
                .selectMany(function (row) {
                    return enumerable
                        .range(0, cols)
                        .select(function (col) {
                            return {
                                row: row,
                                col: col,
                                adjMines: 0
                            }
                        });
                })
                .toArray();

            return cells;
        }

        function cellsAsGrid(cells) {
            var grid = cells
                .groupBy('$.row')
                .select(function (g) {
                    return g.toArray();
                })
                .toArray();

            return grid;
        }

        function neighbours(rows, cols, index) {
            var row,
                col, 
                indexes;

            row = Math.floor(index / cols);
            col = index % cols;
            indexes = [
                    // above
                    { row: row - 1, col: col - 1 },
                    { row: row - 1, col: col },
                    { row: row - 1, col: col + 1 },
                    // same row
                    { row: row, col: col - 1 },
                    { row: row, col: col + 1 },
                    // below
                    { row: row + 1, col: col - 1 },
                    { row: row + 1, col: col },
                    { row: row + 1, col: col + 1 },
                ].filter(function (c) {
                    return c.row >= 0 && c.row < rows &&
                           c.col >= 0 && c.col < cols;
                }).map(function (c) {
                    return c.row * cols + c.col;
                });
            
            return indexes;
        }

        function board(rows, cols, minesNumber) {
            var minesIndexes,
                boardCells;

            minesIndexes = mines(rows, cols, minesNumber);
            boardCells = cells(rows, cols);

            minesIndexes.forEach(function (index) {
                neighbours(rows, cols, index).forEach(function (i) {
                    boardCells[i].adjMines += 1;
                });
                
                boardCells[index].isMine = true;
            });

            return boardCells;
        }

        return {
            board: board,
            neighbours: neighbours
        };
    };
});
