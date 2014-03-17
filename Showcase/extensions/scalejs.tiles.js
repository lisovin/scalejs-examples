/// <reference path="../scripts/_references.js" />
/*global define,console,window*/
/*jslint unparam: true*/
define('scalejs.tiles', [
    'scalejs!core',
    './extensions/tileBindings',
    'text!extensions/tile.html',
    'jQuery',
    'knockout',
    './extensions/tileLayout',
    'scalejs.mvvm'
], function (
    core,
    tileBindings,
    tileTemplate,
    $,
    ko,
    tileLayout
) {
    /// <param name="ko" value="window.ko"/>
    'use strict';

    //  aliases
    var registerBindings = core.mvvm.registerBindings,
        registerTemplates = core.mvvm.registerTemplates,
        unwrap = ko.utils.unwrapObservable;


    function getPageWidth(tiles) {
        return tiles.reduce(function (acc, tile) {
            var rightEdge = tileLayout.getDimension(tile, 'width') + tile.left;
            return Math.max(rightEdge, acc);
        }, 0);
    }

    // transforms css of tiles
    function updateTilePositions(tiles, element) {
        $(element).parent().find('.tile').each(function (index, tileElement) {
            var tileContext, tileData;
            tileContext = ko.contextFor(tileElement);
            tileData = tileContext.$data;

            $(tileElement).css({
                '-webkit-transform': 'translate(' + (tileData.left) + 'px, ' + (tileData.top) + 'px)',
                '-ms-transform': 'translate(' + (tileData.left) + 'px, ' + (tileData.top) + 'px)',
                '-moz-transform': 'translate(' + (tileData.left) + 'px, ' + (tileData.top) + 'px)',
                'transform:': 'translate(' + (tileData.left) + 'px, ' + (tileData.top) + 'px)'
            });
        });

        return getPageWidth(tiles);
    }

    /* --- layout -- */

    function layout(tiles, element, unitWidth, pageHeight) {
        var pageWidth;

        tileLayout.calculate(tiles, unitWidth, pageHeight, element);

        pageWidth = updateTilePositions(tiles, element);

        return pageWidth;
    }

    function wrapValueAccessor(valueAccessor, element, allBindingsAccessor) {
        return function () {
            var value = valueAccessor(),
                tiles = unwrap(value.tiles),
                unitWidth = value.unitWidth,
                b = allBindingsAccessor(),
                width = ko.observable(0);

            return {
                name: 'sj_tiles_container',
                data: {
                    tiles: tiles,
                    unitWidth: unitWidth,
                    width: width,
                    layout: function (unitWidth) { return layout(tiles, element, unitWidth, b.pageHeight); }
                },
                afterRender: function () {
                    if (tiles)
                        core.layout.invalidate({ reparse: true });
                        $(element).width(layout(tiles, element, b.unitWidth, b.pageHeight));
                        $(window).resize(function () {
                            $(element).width(layout(tiles, element, b.unitWidth, b.pageHeight));
                            core.layout.invalidate({ reparse: true });
                        });
                   
                }
            };
        };
    }

    /*jslint unparam: true*/
    function init(
        element,
        valueAccessor,
        allBindingsAccessor,
        viewModel,
        bindingContext
    ) {
        ko.bindingHandlers.template.update(
            element,
            wrapValueAccessor(valueAccessor, element, allBindingsAccessor),
            allBindingsAccessor,
            viewModel,
            bindingContext
        );

        return { controlsDescendantBindings: true };
    }
    /*jslint unparam: false*/

    registerBindings(tileBindings);
    registerTemplates(tileTemplate);

    ko.bindingHandlers.tiles = {
        init: init
    };

});
/*jslint unparam: false*/
