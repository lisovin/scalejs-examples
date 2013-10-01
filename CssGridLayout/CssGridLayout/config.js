var require = {
    "baseUrl":  ".",
    "paths":  {
        "CSS.supports":  "Scripts/CSS.supports",
        "cssparser":  "Scripts/cssparser",
        "domReady":  "Scripts/domReady",
        "hammer":  "Scripts/hammer",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "knockout":  "Scripts/knockout-2.3.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "linqjs":  "Scripts/linq.min",
        "rx.experimental":  "Scripts/rx.experimental",
        "scalejs":  "Scripts/scalejs-0.3.0.1",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9",
        "scalejs.layout-cssgrid":  "Scripts/scalejs.layout-cssgrid-0.2.6.3",
        "scalejs.layout-cssgrid-splitter":  "Scripts/scalejs.layout-cssgrid-splitter-0.2.5",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.0.0",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.2.1.30",
        "scion":  "Scripts/scion",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.functional",
            "scalejs.layout-cssgrid",
            //"scalejs.layout-cssgrid-splitter",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
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
