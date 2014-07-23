var require = {
    "baseUrl":  ".",
    "config":  {
        "scalejs.statechart-scion":  {
            "logStatesEnteredAndExited":  true
        }
    },
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "jQuery":  "Scripts/jquery-1.9.1.min",
        "jQuery-Migrate":  "Scripts/jquery-migrate-1.1.1.min",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "less":  "Scripts/less",
        "less-builder":  "Scripts/less-builder",
        "lessc":  "Scripts/lessc",
        "linqjs":  "Scripts/linq.min",
        "normalize":  "Scripts/normalize",
        "sandbox":  "Scripts/scalejs.sandbox",
        "scalejs":  "Scripts/scalejs-0.3.3",
        "scalejs.autocomplete-select2":  "Scripts/scalejs.autocomplete-select2-0.1.1.4",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9.8",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.4",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.0",
        "scion":  "Scripts/scion",
        "select2":  "Scripts/select2",
        "styles":  "Scripts/scalejs.styles",
        "text":  "Scripts/text",
        "views":  "Scripts/scalejs.mvvm.views"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.autocomplete-select2",
            "scalejs.functional",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.statechart-scion"
        ]
    },
    "shim":  {
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
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        },
        "select2":  {
            "deps":  [
                "jQuery"
            ]
        }
    }
};
