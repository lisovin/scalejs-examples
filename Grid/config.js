var require = {
    "baseUrl":  ".",
    "config":  {
        "scalejs.statechart-scion":  {
            "logStatesEnteredAndExited":  true
        },
        "scalejs.mvvm": {
            "root": "grid1"
        }
    },
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "bPopup":  "Scripts/jquery.bpopup.min",
        "CSS.supports":  "Scripts/CSS.supports",
        "cssparser":  "Scripts/cssparser",
        "domReady":  "Scripts/domReady",
        "formdata":  "Scripts/formdata",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "jQuery":  "Scripts/jquery-1.9.1.min",
        "jQuery-Migrate":  "Scripts/jquery-migrate-1.1.1.min",
        "jquery.event.drag":  "Scripts/jquery.event.drag",
        "jquery.event.drag.live":  "Scripts/jquery.event.drag",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "less":  "Scripts/less",
        "less-builder":  "Scripts/less-builder",
        "lessc":  "Scripts/lessc",
        "linqjs":  "Scripts/linq.min",
        "normalize":  "Scripts/normalize",
        "rx":  "Scripts/rx",
        "rx.binding":  "Scripts/rx.binding",
        "rx.coincidence":  "Scripts/rx.coincidence",
        "rx.experimental":  "Scripts/rx.experimental",
        "rx.joinpatterns":  "Scripts/rx.joinpatterns",
        "rx.time":  "Scripts/rx.time",
        "sandbox":  "Scripts/scalejs.sandbox",
        "scalejs":  "Scripts/scalejs-0.3.3",
        "scalejs.ajax-jquery":  "Scripts/scalejs.ajax-jquery-0.3.0.0",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.10",
        "scalejs.grid-slick":  "Scripts/scalejs.grid-slick-0.2.2.9",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.6",
        "scalejs.reactive":  "Scripts/scalejs.reactive-2.1.20.1",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.1",
        "scion":  "Scripts/scion",
        "slick.core":  "Scripts/slick.core",
        "slick.dataview":  "Scripts/slick.dataview",
        "slick.grid":  "Scripts/slick.grid",
        "slick.rowselectionmodel":  "Scripts/slick.rowselectionmodel",
        "styles":  "Scripts/scalejs.styles",
        "text":  "Scripts/text",
        "views":  "Scripts/scalejs.mvvm.views"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.ajax-jquery",
            "scalejs.functional",
            "scalejs.grid-slick",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.reactive",
            "scalejs.statechart-scion"
        ]
    },
    "shim":  {
        "bPopup":  {
            "deps":  [
                "jQuery"
            ]
        },
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
        "jquery.event.drag":  {
            "deps":  [
                "jQuery"
            ]
        },
        "jquery.event.drag.live":  {
            "deps":  [
                "jquery.event.drag"
            ]
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        },
        "slick.core":  {
            "deps":  [
                "jQuery"
            ],
            "exports":  "Slick"
        },
        "slick.dataview":  {
            "deps":  [
                "slick.core"
            ]
        },
        "slick.grid":  {
            "deps":  [
                "slick.core",
                "slick.dataview",
                "slick.rowselectionmodel",
                "jquery.event.drag"
            ],
            "exports":  "Slick"
        },
        "slick.rowselectionmodel":  {
            "deps":  [
                "slick.core"
            ]
        }
    }
};
