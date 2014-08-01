/*global define */
define([
    'scalejs!sandbox/demo',
    'app/demo/viewmodels/demoViewModel',
    'text!app/demo/views/demo.html',
    'app/demo/bindings/demoBindings'
], function (
    sandbox,
    demoViewModel,
    demoTemplate,
    demoBindings
) {
    'use strict';

    return function demo() {
        var // imports
            root = sandbox.mvvm.root,
            template = sandbox.mvvm.template,
            registerBindings = sandbox.mvvm.registerBindings,
            registerTemplates = sandbox.mvvm.registerTemplates,
            registerStates = sandbox.state.registerStates,
            state = sandbox.state.builder.state,
            onEntry = sandbox.state.builder.onEntry,
            // vars
            viewModel = demoViewModel();

        // Register module bindings
        registerBindings(demoBindings);

        // Register module templates
        registerTemplates(demoTemplate);

        // Register application state for the module.
        registerStates('root',
            state('app',
                state('test',
                    onEntry(function () {
                        // Render viewModel using 'main_template' template 
                        // (defined in main.html) and show it in the `root` region.
                        //viewModel.text('Hello World from test!');
                        viewModel.load();
                        root(template('demo_template', viewModel));
                    }))));

    };
});
