/*global define, console */
/*jslint sloppy: true*/
define([
    'scalejs!sandbox',
    'knockout'
], function (
    sandbox,
    ko
) {
    var messageBus = sandbox.reactive.messageBus,
        unwrap = ko.utils.unwrapObservable;

    return {
        'main': function () {
            return {
                template: {
                    name: 'main_template',
                    data: this,
                    afterRender: function () {
                        console.log('main rendered');
                        messageBus.notify('css-grid-layout');
                    }
                }
            };
        },
        'main-columns': function (context) {
            setTimeout(function () {
                messageBus.notify('css-grid-layout');
            });

            return {
                attr: {
                    style: '-ms-grid-columns: ' + unwrap(this.columns)
                }
            };
        }
    };
});
