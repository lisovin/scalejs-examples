var require = {
    "baseUrl":  ".",
    "paths":  {
        "CSS.supports":  "Scripts/CSS.supports",
        "cssParser":  "Scripts/cssParser",
        "domReady":  "Scripts/domReady",
        "es5-shim":  "Scripts/es5-shim",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "json2":  "Scripts/json2",
        "knockout":  "Scripts/knockout-2.2.1",
        "knockout.mapping":  "Scripts/knockout.mapping-latest",
        "linqjs":  "Scripts/linq.min",
        "rx":  "Scripts/rx",
        "rx.binding":  "Scripts/rx.binding",
        "rx.experimental":  "Scripts/rx.experimental",
        "rx.time":  "Scripts/rx.time",
        "scalejs":  "Scripts/scalejs-0.2.7.30",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9",
        "scalejs.layout-cssgrid":  "Scripts/scalejs.layout-cssgrid-0.2.4.5",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.2.3.35",
        "scalejs.reactive":  "Scripts/scalejs.reactive-2.0.20921.2",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.2.1.30",
        "scion":  "Scripts/scion",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.functional",
            "scalejs.layout-cssgrid",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.reactive",
            "scalejs.statechart-scion"
        ]
    },
    "shim":  {
        "CSS.supports":  {
            "exports":  "CSS"
        },
        "cssParser":  {
            "exports":  "cssParser"
        },
        "jasmine":  {
            "exports":  "jasmine"
        },
        "jasmine-html":  {
            "deps":  [
                "jasmine"
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
