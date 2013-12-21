/*global define */
define([
    'sandbox!main',
    'app/main/model/mainModel',
    'app/main/viewmodels/cellViewModel'
], function (
    sandbox,
    mainModel,
    cellViewModel
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable,
            observableArray = sandbox.mvvm.observableArray,
            computed = sandbox.mvvm.computed,
            enumerable = sandbox.linq.enumerable,
            // properties
            model = mainModel(),
            rows = observable(10),
            cols = observable(30),
            totalMines = observable(8),
            mines = observable(totalMines()),
            boardCells = [],
            blewUp = observable(false),
            result = observable(''),
            board = observableArray();

        function openAll() {
            boardCells.forEach(function (cell) {
                cell.closed(false);
            });
        }

        function blowUp() {
            blewUp(true);
            openAll();
        }

        function checkWon() {
            var allOpenOrFlagged = boardCells.all(function (cell) {
                return !cell.closed() || cell.isFlag();
            });

            if (allOpenOrFlagged) {
                result('You won!');
            }
        }

        function open(row, col) {
            function loop(row, col) {
                var index,
                    notMines;

                index = cols() * row + col;

                notMines = model.neighbours(rows(), cols(), index)
                    .map(function (i) {
                        return boardCells[i];
                    })
                    .filter(function (cell) {
                        return cell.closed() && !cell.isFlag() && !cell.isMine;
                    });

                notMines.forEach(function (cell) {
                    cell.closed(false);
                    if (cell.adjMines === 0) {
                        loop(cell.row, cell.col);
                    }
                });
            }

            loop(row, col);
            checkWon();
        }

        function createBoard() {
            boardCells = model
                .board(rows(), cols(), mines())
                .map(function (cell) {
                    return cellViewModel(cell, {
                        mines: mines,
                        blowUp: blowUp,
                        open: open,
                        checkWon: checkWon
                    });
                });

            var newBoard = boardCells
                .groupBy('$.row')
                .select(function (g) {
                    return g.toArray();
                })
                .toArray();

            board(newBoard);
        }

        function reset() {
            result('');
            mines(totalMines());
            blewUp(false);
            createBoard();
        }

        reset();

        return {
            rows: rows,
            cols: cols,
            board: board,
            mines: mines,
            totalMines: totalMines,
            reset: reset,
            result: result
        };
    };
});
