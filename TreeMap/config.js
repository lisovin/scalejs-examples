var require = {
    "baseUrl":  ".",
    "paths":  {
        "color-scheme":  "Scripts/color-scheme.min",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "jit":  "Scripts/jit",
        "knockout":  "Scripts/knockout-2.3.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "linqjs":  "Scripts/linq.min",
        "scalejs":  "Scripts/scalejs-0.3.0.0",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.0.0",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.2.1.34",
        "scalejs.treemap-jit":  "Scripts/scalejs.treemap-jit-1.0.4",
        "scion":  "Scripts/scion",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.functional",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.statechart-scion",
            "scalejs.treemap-jit"
        ]
    },
    "shim":  {
        "color-scheme":  {
            "exports":  "ColorScheme"
        },
        "jasmine":  {
            "exports":  "jasmine"
        },
        "jasmine-html":  {
            "deps":  [
                "jasmine"
            ]
        },
        "jit":  {
            "exports":  "$jit"
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        }
    }
};
