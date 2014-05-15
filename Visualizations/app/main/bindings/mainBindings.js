/*global define */
/*jslint sloppy: true*/
define({
    'main-viz': function () {
        return {
            d3: {
                visualization: 'treemap',
                data: this.model,
                idPath: 'name',
                areaPath: 'size',
                colorPath: 'x'
            }
        };
    }
});
