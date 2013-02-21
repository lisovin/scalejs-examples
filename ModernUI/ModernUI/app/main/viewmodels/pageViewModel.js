/*global define, setTimeout */
define([
    './childViewModel'        
], function (
    childViewModel
) {
    'use strict';

    return function (spec, sandbox) {
        var // imports
            observable = sandbox.mvvm.observable,
            observableArray = sandbox.mvvm.observableArray,
            computed = sandbox.mvvm.computed,
            renderable = sandbox.mvvm.renderable,
            enumerable = sandbox.linq.enumerable,
            // properties
            children = observableArray([]),
            tiles = computed(function () { 
                return children().map(function (c) {
                    return renderable('child_tile_template', c);
                });
            });


        function createChildren(n) {
            var cs = enumerable
                .range(1, n)
                .select(function (i) { return childViewModel({index: i}, sandbox); })
                .toArray();

            children(cs);
        }

        return {
            title: spec.title,
            content: tiles,
            createChildren: createChildren
        };
    };
});
