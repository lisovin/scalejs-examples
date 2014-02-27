/*global define */
define([
    'sandbox!foobar',
    'app/foobar/viewmodels/foobarViewModel',
    'bindings!foobar',
    'views!foobar',
    'styles!foobar'
], function (
    sandbox,
    foobarViewModel
) {
    'use strict';

    return function foobarModule() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            foobar = foobarViewModel(sandbox);

        // Register application state for the module.
        registerStates('main',
            state('foobar',
                onEntry(function () {
                    this.foo(template('foo_template', foobar));
                    this.bar(template('bar_template', foobar));
                })));
    };
});
