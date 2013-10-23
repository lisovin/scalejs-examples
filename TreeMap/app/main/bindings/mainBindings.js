/*global define */
/*jslint sloppy: true*/
define({
    'main-treemap': function () {
        return {
            treemap: {
                data: this.data,
                itemTemplate: 'song_template',
                levels: ['artists', 'albums', 'songs'],
                areaPath: 'x',
                colorPath: 'y',
                colorPallete: 'random',
                nodeTipTemplate: 'node_tip_template'
            }
        };
    }
});
