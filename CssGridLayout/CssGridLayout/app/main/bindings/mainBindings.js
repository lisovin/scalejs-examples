/*global define */
/*jslint sloppy: true*/
define(function () {
    return function (sandbox) {
        var messageBus = sandbox.reactive.messageBus;

        return {
            'main': function () {
                return {
                    template: 'main_template',
                    afterRender: function () {
                        console.log('main rendered');
                        messageBus.notify('css-grid-layout');
                    }
                };
            }
        };
    };
});
