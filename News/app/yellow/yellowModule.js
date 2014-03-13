/*global define */
define([
    'sandbox!yellow',
    'app/yellow/viewmodels/yellowViewModel',
    'bindings!yellow',
    'views!yellow',
    'styles!yellow'
], function (
    sandbox,
    yellowViewModel
) {
    'use strict';

    return function yellowModule() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            yellow = yellowViewModel();

        // Register application state for the module.
        registerStates('summary',
            state('yellow',
                onEntry(function () {
                    this.yellow(template('yellow_template', yellow));
                })));
    };
});
