/*global define */
define([
    'sandbox!orange',
    'app/orange/viewmodels/orangeViewModel',
    'bindings!orange',
    'views!orange',
    'styles!orange'
], function (
    sandbox,
    orangeViewModel
) {
    'use strict';

    return function orangeModule() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            orange = orangeViewModel(sandbox);

        // Register application state for the module.
        registerStates('summary',
            state('orange',
                onEntry(function () {
                   this.orange(template('orange_template', orange));
                })));
    };
});
