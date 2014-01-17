/*global define */
/*jslint sloppy: true*/
define({
    'main-tabs': function () {
        return {
            tabs: {
                itemsSource: this.tabs,
                defaultItems: this.defaultTabs,
                contentTemplate: 'tabs_content_template'
            }
        };
    }
});
