/*global require*/
/// <reference path="Scripts/require.js"/>
/// <reference path="Scripts/jasmine.js"/>
require({
    "paths":  {
        "highstock":  "Scripts/highstock.src",
        "jQuery":  "Scripts/jQuery-1.9.0",
        "knockout":  "Scripts/knockout-2.2.1",
        "knockout.mapping":  "Scripts/knockout.mapping-latest",
        "scalejs":  "Scripts/scalejs-0.1.12",
        "scalejs.highstock":  "Scripts/scalejs.highstock-0.1.0"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.highstock"
        ]
    },
    "shim":  {
        "highstock":  {
            "deps":  [
                "jQuery"
            ],
            "exports":  "Highcharts"
        },
        "jQuery":  {
            "exports":  "jQuery"
        }
    }
}, ['tests/all.tests']);
