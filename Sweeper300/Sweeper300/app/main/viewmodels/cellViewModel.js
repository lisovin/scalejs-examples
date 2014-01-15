/*global define */
define([
    'sandbox!main'
], function (
    sandbox
) {
    'use strict';

    return function (cell, main) {
        var // imports
            observable = sandbox.mvvm.observable,
            computed = sandbox.mvvm.computed,
            // properties
            isMine = cell.isMine === true,
            isFlag = observable(false),
            closed = observable(true),
            css,
            text;

        function open() {
            if (isFlag()) {
                return;
            }

            closed(false);
            if (isMine) {
                main.blowUp();
            }

            main.open(cell.row, cell.col);
        }

        function flag() {
            if (!closed()) {
                return;
            }

            if (isFlag()) {
                isFlag(false);
                main.mines(main.mines() + 1);
            } else {
                if (main.mines() > 0) {
                    isFlag(true);
                    main.mines(main.mines() - 1);
                    main.checkWon();
                }
            }
        }

        css = computed(function () {
            if (closed() && isFlag()) {
                return 'board__cell--closed board__cell--flag';
            }

            if (!closed() && isMine) {
                return 'board__cell--open board__cell--mine';
            }

            if (!closed()) {
                return 'board__cell--open';
            }

            return 'board__cell--closed';
        });
        
        text = computed(function () {
            if (closed() && isFlag()) {
                return '?';
            }

            if (!closed() && isMine) {
                return 'X';
            }

            if (closed() || cell.adjMines === 0) {
                return '';
            }

            return cell.adjMines;
        });

        return {
            row: cell.row,
            col: cell.col,
            isMine: isMine,
            adjMines: cell.adjMines,
            isFlag: isFlag,
            open: open,
            flag: flag,
            closed: closed,
            css: css,
            text: text
        };
    };
});
