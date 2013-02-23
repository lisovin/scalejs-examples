/*global define */
define([
    'scalejs!module',
    './viewmodels/mainViewModel',
    'text!./views/main.html',
    './viewmodels/pageViewModel',
    'text!./views/page.html',
    './bindings/mainBindings.js'
], function (
    module,
    mainViewModel,
    mainTemplate,
    pageViewModel,
    pageTemplate,
    mainBindings
) {
    'use strict';

    function create(sandbox) {
        var // imports
            root = sandbox.mvvm.root,
            renderable = sandbox.mvvm.renderable,
            registerBindings = sandbox.mvvm.registerBindings,
            registerTemplates = sandbox.mvvm.registerTemplates,
            // vars
            main = mainViewModel(sandbox),
            page1 = pageViewModel({title: 'Page 1', tilesCount: 5}, sandbox),
            page2 = pageViewModel({title: 'Page 2', tilesCount: 8}, sandbox);

        // Register module bindings
        registerBindings(mainBindings);

        // Register module templates
        registerTemplates(mainTemplate, pageTemplate);

        // Render viewModel using 'main_template' and show it set root view
        root(renderable('main_template', main));

        main.pages([page1, page2]);
    }

    return module('main', create);
});
