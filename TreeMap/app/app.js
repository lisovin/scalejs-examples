/*global require*/
require([
    'scalejs!application',
    'app/main/mainModule'
], function (
    application,
    main
) {
    'use strict';

    application.registerModules(main);

    application.run();
});

