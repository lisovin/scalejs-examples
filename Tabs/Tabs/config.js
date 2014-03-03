var require = {
    "baseUrl":  ".",
    "config":  {
        "scalejs.statechart-scion":  {
            "logStatesEnteredAndExited":  true
        }
    },
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "bPopup":  "Scripts/jquery.bpopup.min",
        "css":  "Scripts/css",
        "css-builder":  "Scripts/css-builder",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "jQuery":  "Scripts/jquery-1.9.1.min",
        "jQuery-Migrate":  "Scripts/jquery-migrate-1.1.1.min",
        "jquery-ui":  "Scripts/jquery-ui-1.10.3",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout-sortable":  "Scripts/knockout-sortable",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "linqjs":  "Scripts/linq.min",
        "normalize":  "Scripts/normalize",
        "sandbox":  "Scripts/scalejs.sandbox",
        "scalejs":  "Scripts/scalejs-0.3.3",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9.8",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.4",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.0",
        "scalejs.tabs-jqueryui":  "Scripts/scalejs.tabs-jqueryui-1.1.0",
        "scion":  "Scripts/scion",
        "styles":  "Scripts/scalejs.styles",
        "text":  "Scripts/text",
        "views": "Scripts/scalejs.mvvm.views",
        "tabs-paging": "Scripts/ui.tabs.paging"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.functional",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.statechart-scion",
            "scalejs.tabs-jqueryui"
        ]
    },
    "shim": {
        "bPopup":  {
            "deps":  [
                "jQuery"
            ]
        },
        "jasmine":  {
            "exports":  "jasmine"
        },
        "jasmine-html":  {
            "deps":  [
                "jasmine"
            ]
        },
        "jQuery":  {
            "exports":  "jQuery"
        },
        "jQuery-Migrate":  {
            "deps":  [
                "jQuery"
            ]
        },
        "jquery-ui": {
            "deps": [
                "jQuery"
            ]
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        },
        "tabs-paging": {
            "deps": [
                "jQuery", "jquery-ui"
            ]
        }
    }
};
