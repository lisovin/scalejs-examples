var require = {
    "baseUrl":  ".",
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "darkTheme":  "Scripts/highstockThemes/dark",
        "formdata":  "Scripts/formdata",
        "highstock":  "Scripts/highstock.src",
        "jQuery":  "Scripts/jquery-1.9.1.min",
        "jQuery-Migrate":  "Scripts/jquery-migrate-1.1.1.min",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "lightTheme":  "Scripts/highstockThemes/light",
        "linq":  "Scripts/linq",
        "linqjs":  "Scripts/linq.min",
        "rx":  "Scripts/rx",
        "rx.binding":  "Scripts/rx.binding",
        "rx.coincidence":  "Scripts/rx.coincidence",
        "rx.experimental":  "Scripts/rx.experimental",
        "rx.joinpatterns":  "Scripts/rx.joinpatterns",
        "rx.time":  "Scripts/rx.time",
        "scalejs":  "Scripts/scalejs-0.3.0.1",
        "scalejs.ajax-jquery":  "Scripts/scalejs.ajax-jquery-0.3.0.0",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.10",
        "scalejs.highstock":  "Scripts/scalejs.highstock-2.0.3.22",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.8",
        "scalejs.reactive":  "Scripts/scalejs.reactive-2.1.20.1",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.0",
        "scion":  "Scripts/scion",
        "text":  "Scripts/text",
        "views":  "Scripts/scalejs.mvvm.views"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.ajax-jquery",
            "scalejs.functional",
            "scalejs.highstock",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.reactive",
            "scalejs.statechart-scion"
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
        "jQuery-Migrate":  {
            "deps":  [
                "jQuery"
            ]
        },
        "linq":  {
            "exports":  "Enumerable"
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        }
    }
};
