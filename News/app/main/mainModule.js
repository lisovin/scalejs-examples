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
            onExit = sandbox.state.builder.onExit,
            invalidate = sandbox.layout.invalidate,
            observable = sandbox.mvvm.observable,
            on = sandbox.state.builder.on,
            goto = sandbox.state.builder.goto,
            routerState = sandbox.routing.routerState,
            route = sandbox.routing.route,
            // vars
            main = mainViewModel();

        // Register application state for the module.
        registerStates('root',
            routerState('app',
                onEntry(function () {
                    root(template('main_template', main));
                    this.pages = main.pages;
                    this.red = main.red;
                    this.orange = main.orange;
                    this.yellow = main.yellow;
                    this.green = main.green;
                }),
                parallel('summary',
                    route('/'),
                    onEntry(function () {
                        main.pages([main.red, main.orange, main.yellow, main.green]);
                        main.headerHeight('30px');
                        invalidate({ reparse: true });
                    }),
                    onExit(function () {
                        main.headerHeight('0px');
                    })
                ),
                state('main',
                    on('goto.summary', goto('summary')))
                ));
    };
});
