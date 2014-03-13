/*global define */
define([
    'sandbox!green',
    'app/green/viewmodels/greenViewModel',
    'bindings!green',
    'views!green',
    'styles!green'
], function (
    sandbox,
    greenViewModel
) {
    'use strict';

    return function greenModule() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            green = greenViewModel(sandbox);

        // Register application state for the module.
        registerStates('summary',
            state('green',
                onEntry(function () {
                  this.green(template('green_template', green));
                })));
    };
});
