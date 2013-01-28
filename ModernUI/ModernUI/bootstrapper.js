/*global require*/
require({
    "baseUrl":  ".",
    "paths":  {
        "jQuery":  "Scripts/jQuery-1.9.0.min",
        "knockout":  "Scripts/knockout-2.2.1.debug",
        "knockout-classBindingProvider":  "Scripts/knockout-classBindingProvider",
        "knockout.mapping":  "Scripts/knockout.mapping-latest",
        "scalejs":  "Scripts/scalejs-0.1.13",
        "scalejs.modernui":  "Scripts/scalejs.modernui-0.1.0",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.1.2",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.modernui",
            "scalejs.mvvm"
        ]
    },
    "shim":  {
        "jQuery":  {
            "exports":  "jQuery"
        }
    }
}, ['app/app']);
