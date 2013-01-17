/*global require*/
require({
    "baseUrl":  ".",
    "paths":  {
        "highstock":  "Scripts/highstock.src",
        "jQuery":  "Scripts/jQuery-1.9.0",
        "json2":  "Scripts/json2",
        "knockout":  "Scripts/knockout-2.2.1",
        "knockout-classBindingProvider":  "Scripts/knockout-classBindingProvider.min",
        "knockout.mapping":  "Scripts/knockout.mapping-latest",
        "linq":  "Scripts/linq",
        "rx":  "Scripts/rx",
        "rx.binding":  "Scripts/rx.binding",
        "rx.time":  "Scripts/rx.time",
        "scalejs":  "Scripts/scalejs-0.1.12",
        "scalejs.ajax-jquery":  "Scripts/scalejs.ajax-jquery-0.1.7",
        "scalejs.highstock":  "Scripts/scalejs.highstock-0.1.4",
        "scalejs.linq":  "Scripts/scalejs.linq-0.1.0",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.1.2",
        "scalejs.reactive":  "Scripts/scalejs.reactive-0.1.0",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.ajax-jquery",
            "scalejs.highstock",
            "scalejs.linq",
            "scalejs.mvvm",
            "scalejs.reactive"
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
        },
        "json2":  {
            "exports":  "JSON"
        },
        "linq":  {
            "exports":  "Enumerable"
        }
    }
}, ['app/app']);
