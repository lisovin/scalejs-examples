﻿/*global define */
/*jslint sloppy: true*/
define(function () {
    return {
        'main-panorama': function () {
            return {
                panorama: {
                    title: 'Modern UI Sample',
                    pages: this.pages,
                    selectedPage: this.selectedPage,
                    canBack: false,
                    message: this.message
                }
            };
        },
        'child-tile': function () {
            return {
                tile: {
                    width: 2,
                    height: 1,
                    selectionVisible: false,
                    bgColor: 'blueDark',
                    contentTemplate: 'child_tile_content_template',
                    content: this,
                    showBrand: true,
                    //brandIcon: 'foo.png',
                    //brandName: this.name,
                    brandHtml: this.summary,
                    brandBadge: this.count,
                    brandBgColor: 'orange'
                }
            };
        }
    };
});
