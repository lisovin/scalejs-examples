/*global define */
/*jslint sloppy: true*/
define({
    'main-panorama': function () {
        return {
            panorama: {
                title: 'My Title',
                pages: [
                    {
                        title: 'Page 1',
                        template: 'main_panorama_page1_template'
                    },
                    {
                        title: 'Page 2',
                        route: {
                            view: 'page',
                            params: '2'
                        },
                        template: 'main_panorama_page2_template'
                    },
                    {
                        title: 'Page 3',
                        template: 'main_panorama_page3_template'
                    }
                ]
            }
        };
    }
});
