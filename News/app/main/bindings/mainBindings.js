/*global define */
/*jslint sloppy: true*/
define({
    'main-panorama': function () {
        return {
            panorama: {
                pages: this.pages
            }
        };
    },
    'main-header': function () {
        return {
            style: {
                height: this.headerHeight
            }
        }
    }
});
