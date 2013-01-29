/*global define, setTimeout */
define([
], function (
) {
    'use strict';

    return function (sandbox) {
        function loadPage1Pages(pages) {
            // Normally pages would be updated as the result of ajax request
            setTimeout(function () {
                pages([
                    {
                        title: 'Section of Page 1',
                        template: 'main_panorama_page1_page1_template'
                    },
                    {
                        title: 'Another section of Page 1',
                        template: 'main_panorama_page1_page2_template'
                    }
                ]);
            }, 1);
        }

        var pages = [
            {
                title: 'Page 1',
                template: 'main_panorama_page1_template',
                pages: loadPage1Pages
            },
            {
                title: 'Page 2',
                template: 'main_panorama_page2_template'
            },
            {
                title: 'Page 3',
                template: 'main_panorama_page3_template'
            }
        ];

        return {
            title: 'My Title',
            pages: pages
        };
    };
});
