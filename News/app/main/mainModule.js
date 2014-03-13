/*global define */
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
            parallel = sandbox.state.builder.parallel,
            onEntry = sandbox.state.builder.onEntry,
            invalidate = sandbox.layout.invalidate,
            observable = sandbox.mvvm.observable,
            // vars
            main = mainViewModel();

        // Register application state for the module.
        registerStates('root',
            state('app',
                parallel('summary',
                    onEntry(function () {
                        root(template('main_template', main));

                        this.pages = main.pages;
                        this.red = main.red;
                        this.orange = main.orange;
                        this.yellow = main.yellow;
                        this.green = main.green;

                        main.pages([main.red, main.orange, main.yellow, main.green]);

                        invalidate({ reparse: true });
                    }))));
    };
});
