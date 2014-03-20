var require = {
    "baseUrl":  ".",
    "config":  {
        "scalejs.statechart-scion":  {
            "logStatesEnteredAndExited":  true
        }
    },
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "CSS.supports":  "Scripts/CSS.supports",
        "cssparser":  "Scripts/cssparser",
        "domReady":  "Scripts/domReady",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "jQuery":  "Scripts/jquery-1.9.1.min",
        "jQuery-Migrate":  "Scripts/jquery-migrate-1.1.1.min",
        "jquery-ui":  "Scripts/jquery-ui-1.10.3",
        "jQuery-ui-effects":  "Scripts/jquery-ui-1.10.0.effects",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "less":  "Scripts/less",
        "less-builder":  "Scripts/less-builder",
        "lessc":  "Scripts/lessc",
        "linqjs":  "Scripts/linq.min",
        "metro":  "Scripts/metro.min",
        "normalize":  "Scripts/normalize",
        "sandbox":  "Scripts/scalejs.sandbox",
        "scalejs":  "Scripts/scalejs-0.3.3",
        "scalejs.calendar-metro":  "extensions/scalejs.calendar-metro",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9.8",
        "scalejs.layout-cssgrid":  "Scripts/scalejs.layout-cssgrid-0.2.7.66",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.4",
        "scalejs.panorama":  "extensions/scalejs.panorama",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.0",
        "scalejs.tiles":  "extensions/scalejs.tiles",
        "scalejs.transitions":  "Scripts/scalejs.transitions-0.2.12",
        "scion":  "Scripts/scion",
        "styles":  "Scripts/scalejs.styles",
        "text":  "Scripts/text",
        "views":  "Scripts/scalejs.mvvm.views"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.calendar-metro",
            "scalejs.functional",
            "scalejs.layout-cssgrid",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.panorama",
            "scalejs.statechart-scion",
            "scalejs.tiles",
            "scalejs.transitions"
        ]
    },
    "shim":  {
        "CSS.supports":  {
            "exports":  "CSS"
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
        "jQuery-ui-effects":  {
            "deps":  [
                "jQuery"
            ]
        },
        "jquery-widget":  {
            "deps":  [
                "jQuery"
            ]
        },
        "metro":  {
            "deps":  [
                "jquery-ui"
            ]
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        }
    }
};
