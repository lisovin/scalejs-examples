/// <reference path="../scripts/_references.js" />
/*global console,define*/
define(['scalejs!core', 'knockout'], function (core, ko) {
    'use strict';

    var get = core.object.get,
        unwrap = ko.utils.unwrapObservable,
        isObservable = ko.isObservable,
        computed = ko.computed;

    return {
        'panorama-tile': function (ctx) {
            var unitWidth = ctx.$parent.unitWidth || 140,
                selectedTile = ctx.$parent.selectedTile,
                tile = this,
                css;

            css = computed(function () {
                var selected = unwrap(tile.selected) || unwrap(selectedTile) === tile ? 'selected ' : '';
                return selected + 'bg-' + unwrap(tile.bgColor);
            });

            return {
                style: {
                    width: this.width * unitWidth - 10 + 'px',
                    height: this.height * unitWidth - 10 + 'px',
                    position: 'absolute',
                },
                attr: {
                    disabled: this.disabled
                },
                css: css,
                click: this.selectTile || function () {
                    if (isObservable(selectedTile)) {
                        if (unwrap(selectedTile) === this) {
                            selectedTile(undefined);
                        } else {
                            selectedTile(this);
                        }
                    }
                }
            };
        },

        'panorama-tile-content': function (context) {
            return {
                template: {
                    name: get(context,
                              '$data.contentTemplate',
                              'sj_panorama_tile_content_default_html_template'),
                    data: context.$data.content
                }
            };
        },

        'panorama-tile-content-default-html': function (context) {
            return {
                html: context.$data
            };
        },

        'panorama-tile-brand-css': function () {
            var css = this.brandBgColor ? 'bg-color-' + this.brandBgColor : undefined;

            return {
                css: css
            };
        },

        'panorama-tile-brand-icon': function () {
            return {
                attr: {
                    src: this.brandIcon
                }
            };
        },

        'panorama-tile-brand-name': function () {
            return {
                text: this.brandName
            };
        },

        'panorama-tile-brand-html': function () {
            return {
                html: this.brandHtml
            };
        },
        'panorama-tile-brand-badge': function () {
            return {
                html: this.brandBadge
            };
        },
        'panorama-tile-rating': function () {
            var up = this.rating.votesUp,
                down = this.rating.votesDown,
                sum = (up + down) || 1;

            return {
                text: ((up - down >= 0 ? up / sum : down / sum) * 100).toFixed(0) + "%"
            };
        },
        'panorama-tile-rating-icon': function () {
            var up = this.rating.votesUp,
                down = this.rating.votesDown

            return {
                css: (up - down >= 0 ? "icon-thumbs-up" : "icon-thumbs-down") + " fg-color-white",
            };
        },
        'panorama-tile-bar': function () {
            return {
                style: {
                    width: this.content.percentage + '%'
                }
            };
        }
    };
});

