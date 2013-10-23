
/*global define*/
define('scalejs.color-scheme',[
    'scalejs!core',
    'color-scheme'
], function (
    core,
    ColorScheme
) {
    

    var scheme = new ColorScheme;

    function generateGradient(hue) {
        hue = hue || Math.random() * 360;
        scheme.from_hue(hue);
        return scheme.colors();
    }

    core.registerExtension({
        color: {
            generateGradient: generateGradient
        }
    });
});

