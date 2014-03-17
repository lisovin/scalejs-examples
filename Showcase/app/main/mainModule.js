﻿/*global define */
define([
    'sandbox!main',
    'app/main/viewmodels/mainViewModel',
    'views!main',
    'bindings!main',
    'styles!main'
], function (
    sandbox,
    mainViewModel
) {
    'use strict';

    return function main() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            invalidate = sandbox.layout.invalidate,
            // vars
            viewModel = mainViewModel();

        // Register application state for the module.
        registerStates('root',
            state('app',
                state('main',
                    onEntry(function () {
                        // Render viewModel using 'main_template' template 
                        // (defined in main.html) and show it in the `root` region.
                        root(template('main_template', viewModel));
                        viewModel.pages([template('red_template', viewModel)]);
                        invalidate({ reparse: true });
                    }))));
    };
});