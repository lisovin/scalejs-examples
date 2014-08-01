/*global define*/
define([
    'scalejs.highstock/highstock',
    'knockout',
    'knockout.mapping'
], function (
    highstock,
    ko
) {
    'use strict';

    ko.bindingHandlers.highstock = highstock;
});

