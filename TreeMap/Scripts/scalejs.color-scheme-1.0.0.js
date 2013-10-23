
/*global define*/
define('scalejs.color-scheme',[
    'scalejs!core',
    'color-scheme'
], function (
    core,
    ColorScheme
) {
    

    var scheme = new ColorScheme,
        merge = core.object.merge;

    function generateGradient(options) {
        options = merge({
            hue: Math.random() * 360,
            variation: 'default'
        }, options)
        scheme.from_hue(options.hue).variation(options.variation);
        return scheme.colors();
    }

    function generateVariedGradient() {
        var numerator = 1,
            denominator = 2,
            colors;

        return function (options) {
            options = options || {};
            if(numerator > denominator) {
                numerator = 1;
                denominator = denominator * 2;
            }
            
            options.hue = 360 * numerator / denominator;
            options.hue = options.hue > 80 && options.hue < 160 ? options.hue + 100 : options.hue;
            colors = generateGradient(options);
            numerator += 2;
            return colors;
        }
    }

    core.registerExtension({
        color: {
            generateGradient: generateGradient,
            generateVariedGradient: generateVariedGradient,
        }
    });
});

