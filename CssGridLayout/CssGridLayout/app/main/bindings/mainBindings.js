/*global define, console, setTimeout */
/*jslint sloppy: true*/
define([
    'sandbox!main',
    'knockout'
], function (
    sandbox,
    ko
) {
    var layout = sandbox.layout.doLayout,
        unwrap = ko.utils.unwrapObservable;

    return {
        'main': function () {
            return {
                template: {
                    name: 'main_template',
                    data: this,
                    afterRender: function () {
                        console.log('main rendered');
                        //layout('css-grid-layout');
                    }
                }
            };
        },
        'main-columns': function () {
            return {
                attr: {
                    style: '-ms-grid-columns: ' + unwrap(this.columns)
                }
            };
        },
        'left-width': function () {
            setTimeout(function () {
                layout();
            });
            return {
                style: {
                    width: unwrap(this.width) + 'px'
                }
                /*
                attr: {
                    style: 'width: ' + unwrap(this.width) + 'px'
                }*/
            };
        }
    };
});
