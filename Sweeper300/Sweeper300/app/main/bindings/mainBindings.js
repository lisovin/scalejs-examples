/*global define */
/*jslint sloppy: true*/
define({
    'cell': function () {
        return {
            click: this.open,
            text: this.text,
            //this.closed() ? '' : this.adjMines,
            event: {
                contextmenu: this.flag
            },
            css: this.css
        };
    }
});
