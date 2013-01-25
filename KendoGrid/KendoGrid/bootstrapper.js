/*global require*/
require({
    "baseUrl":  ".",
    "paths":  {
        "jQuery":  "Scripts/jquery-1.9.0.min",
        "jQuery-migrate":  "Scripts/jquery-migrate-1.0.0.min",
        "kendo.binder":  "Scripts/kendo.binder.min",
        "kendo.calendar":  "Scripts/kendo.calendar.min",
        "kendo.columnmenu":  "Scripts/kendo.columnmenu.min",
        "kendo.core":  "Scripts/kendo.core.min",
        "kendo.data":  "Scripts/kendo.data.min",
        "kendo.datepicker":  "Scripts/kendo.datepicker.min",
        "kendo.draganddrop":  "Scripts/kendo.draganddrop.min",
        "kendo.editable":  "Scripts/kendo.editable.min",
        "kendo.filtermenu":  "Scripts/kendo.filtermenu.min",
        "kendo.grid":  "Scripts/kendo.grid.min",
        "kendo.groupable":  "Scripts/kendo.groupable.min",
        "kendo.menu":  "Scripts/kendo.menu.min",
        "kendo.numerictextbox":  "Scripts/kendo.numerictextbox.min",
        "kendo.pager":  "Scripts/kendo.pager.min",
        "kendo.popup":  "Scripts/kendo.popup.min",
        "kendo.reorderable":  "Scripts/kendo.reorderable.min",
        "kendo.resizable":  "Scripts/kendo.resizable.min",
        "kendo.selectable":  "Scripts/kendo.selectable.min",
        "kendo.sortable":  "Scripts/kendo.sortable.min",
        "kendo.userevents":  "Scripts/kendo.userevents.min",
        "kendo.validator":  "Scripts/kendo.validator.min",
        "knockout":  "Scripts/knockout-2.2.1",
        "knockout-classBindingProvider":  "Scripts/knockout-classBindingProvider.min",
        "knockout.mapping":  "Scripts/knockout.mapping-latest",
        "linq":  "Scripts/linq",
        "scalejs":  "Scripts/scalejs-0.1.13",
        "scalejs.grid-kendoui":  "Scripts/scalejs.grid-kendoui-0.1.0",
        "scalejs.linq":  "Scripts/scalejs.linq-0.1.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.1.2",
        "text":  "Scripts/text"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.grid-kendoui",
            "scalejs.linq",
            "scalejs.mvvm"
        ]
    },
    "shim":  {
        "jQuery":  {
            "exports":  "jQuery"
        },
        "jQuery-migrate":  {
            "deps":  [
                "jQuery"
            ]
        },
        "kendo.binder":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.calendar":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.columnmenu":  {
            "deps":  [
                "kendo.core",
                "kendo.menu"
            ]
        },
        "kendo.core":  {
            "deps":  [
                "jQuery-migrate"
            ]
        },
        "kendo.data":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.datepicker":  {
            "deps":  [
                "kendo.core",
                "kendo.calendar"
            ]
        },
        "kendo.draganddrop":  {
            "deps":  [
                "kendo.core",
                "kendo.userevents"
            ]
        },
        "kendo.editable":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.filtermenu":  {
            "deps":  [
                "kendo.core",
                "kendo.popup",
                "kendo.datepicker",
                "kendo.numerictextbox",
                "kendo.binder"
            ]
        },
        "kendo.grid":  {
            "deps":  [
                "kendo.core",
                "kendo.data",
                "kendo.columnmenu",
                "kendo.editable",
                "kendo.filtermenu",
                "kendo.groupable",
                "kendo.pager",
                "kendo.reorderable",
                "kendo.resizable",
                "kendo.selectable",
                "kendo.sortable",
                "kendo.validator"
            ]
        },
        "kendo.groupable":  {
            "deps":  [
                "kendo.core",
                "kendo.draganddrop"
            ]
        },
        "kendo.menu":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.numerictextbox":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.pager":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.popup":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.reorderable":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.resizable":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.selectable":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.sortable":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.userevents":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "kendo.validator":  {
            "deps":  [
                "kendo.core"
            ]
        },
        "linq":  {
            "exports":  "Enumerable"
        }
    }
}, ['app/app']);
