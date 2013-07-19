/*global define */
define([
    'scalejs!module',
    './viewmodels/mainViewModel',
    'text!./views/main.html',
    './bindings/mainBindings.js'
], function (
    module,
    mainViewModel,
    mainTemplate,
    mainBindings
) {
    'use strict';

    function create(sandbox) {
        var // imports
            root = sandbox.mvvm.root,
            renderable = sandbox.mvvm.renderable,
            registerBindings = sandbox.mvvm.registerBindings,
            registerTemplates = sandbox.mvvm.registerTemplates,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            viewModel = mainViewModel(sandbox);

        // Register module bindings
        registerBindings(mainBindings(sandbox));

        // Register module templates
        registerTemplates(mainTemplate);

        // Register application state for the module.
        registerStates('root',
            state('app',
                state('main',
                    onEntry(function () {
                        // Render viewModel using 'main-text' binding 
                        // and show it set root view
                        root(renderable('main', viewModel));
                    }))));
    }

    return module('main', create);
});
