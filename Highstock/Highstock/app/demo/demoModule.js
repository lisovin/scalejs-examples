/*global define */
define([
    'scalejs!module',
    './viewmodels/demoViewModel',
    'text!./views/demo.html',
    './bindings/demoBindings'
], function (
    module,
    demoViewModel,
    demoTemplate,
    demoBindings
) {
    'use strict';

    function create(sandbox) {
        var createView = sandbox.mvvm.createView;

        function start() {
            var demo = demoViewModel(sandbox);

            createView({
                dataContext: demo,
                templates: [demoTemplate],
                bindings: [demoBindings]
            });
            demo.load();
        }

        return {
            start: start
        };
    }

    return module('demo', create);
});
