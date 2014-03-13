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
            on = sandbox.state.builder.on,
            goto = sandbox.state.builder.goto,
            route = sandbox.routing.route,
            // vars
            red = redViewModel();

        // Register application state for the module.
        registerStates('summary',
            state('red.summary',
                onEntry(function () {
                    this.red(template('red_template', red));
                }),
                on('goto.red.detail', goto('red.detail'))));

        
        registerStates('main',
            state('red.detail',
                route('red'),
                onEntry(function () {
                    red.detail1();
                    red.detail2(template('red_detail2_template'));
                    red.detail3(template('red_detail3_template'));
                    red.detail4(template('red_detail4_template'));

                    this.pages([template('red_detail1_template'), red.detail2, red.detail3, red.detail4]);
                })));
        

    };
});
