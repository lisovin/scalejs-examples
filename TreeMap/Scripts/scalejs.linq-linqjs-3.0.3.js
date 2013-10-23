
/*global define*/
define('scalejs.linq-linqjs',[
    'scalejs!core',
    'linqjs'
], function (
    core,
    Enumerable
) {
    

    core.registerExtension({
        linq: {
            enumerable: Enumerable
        }
    });
});

