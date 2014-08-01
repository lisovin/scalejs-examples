/*global define */
define(function () {
    'use strict';

    return {
        'demo-bbands-toggle': function () {
            return {
                click: this.toggleBBands,
                text: this.bbandsToggleText
            };
        },
        'demo-addPoint-button': function () {
            return {
                click: this.toggleAddingPoints,
                text: this.addPointsToggleText
            };
        },
        'demo-pricesType-toggle': function () {
            return {
                click: this.togglePriceSeriesType,
                text: this.priceSeriesTypeToggleText
            };
        },
        'demo-highstock': function () {
            return {
                highstock: {
                    title: {
                        text: 'Highstock Demo',
                        spacingBottom: 30
                    },
                    navigator: {
                        adaptToUpdatedData: true
                    },
                    plotOptions: {
                        area: {
                            fillOpacity: 75
                        },
                        series: {
                            animation: false
                        }
                    },
                    tooltip: {
                        valueDecimals: 2
                    },
                    series: this.data
                }
            };
        }
    };
});
