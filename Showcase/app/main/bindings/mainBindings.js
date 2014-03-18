﻿/*global define */
/*jslint sloppy: true*/
define({
    'main-panorama': function () {
        return {
            panorama: {
                pages: this.pages
            }
        };
    },
    'main-home': function () {
        return {
            tiles: {
                tiles: this.tiles
            }
        }
    },
    'showcase-tile': function () {
        return {
            attr: {
                'class': this.size
            },
            text: this.percentage + '%'
        }
    }
});
