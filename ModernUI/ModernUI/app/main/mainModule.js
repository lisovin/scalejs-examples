/*global define */
define([
    'scalejs!module',
    './viewmodels/mainViewModel',
    'text!./views/main.html',
    'text!./views/page1.html',
    './bindings/mainBindings.js'
], function (
    module,
    mainViewModel,
    mainTemplate,
    page1Template,
    mainBindings
) {
    'use strict';

    function create(sandbox) {
        var createView = sandbox.mvvm.createView;

        function start() {
            var viewModel = mainViewModel(sandbox);

            createView({
                dataContext: viewModel,
                templates: [mainTemplate, page1Template],
                bindings: [mainBindings]
            });
        }

        return {
            start: start
        };
    }

    return module('main', create);
});
