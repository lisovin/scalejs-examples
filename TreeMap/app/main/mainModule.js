/*global define */
define([
    'scalejs!sandbox/main',
    'app/main/viewmodels/mainViewModel',
    'text!app/main/views/main.html',
    'app/main/bindings/mainBindings.js'
], function (
    sandbox,
    mainViewModel,
    mainTemplate,
    mainBindings
) {
    'use strict';

    return function main() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerBindings = sandbox.mvvm.registerBindings,
            registerTemplates = sandbox.mvvm.registerTemplates,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            viewModel = mainViewModel();

        // Register module bindings
        registerBindings(mainBindings);

        // Register module templates
        registerTemplates(mainTemplate);

        // Register application state for the module.
        registerStates('root',
            state('app',
                state('main',
                    onEntry(function () {
                        // Render viewModel using 'main_template' template 
                        // (defined in main.html) and show it in the `root` region.
                        root(template('main_template', viewModel));
                    }))));
    };
});
