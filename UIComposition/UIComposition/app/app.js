/*global require*/
require([
    'scalejs!application/main,foobar'
], function (
    application
) {
    'use strict';

    application.run();
});

