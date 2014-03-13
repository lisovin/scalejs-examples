/*global define */
define([
    'sandbox!red',
    'app/red/viewmodels/redViewModel',
    'bindings!red',
    'views!red',
    'styles!red'
], function (
    sandbox,
    redViewModel
) {
    'use strict';

    return function redModule() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            red = redViewModel(sandbox);

        // Register application state for the module.
        registerStates('summary',
            state('red',
                onEntry(function () {
                    this.red(template('red_template', red));
                })));
    };
});
