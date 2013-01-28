/*global define */
/*jslint sloppy: true*/
define(function () {
    return function (sandbox) {
        var observableArray = sandbox.mvvm.observableArray,
            observable = sandbox.mvvm.observable,
            computed = sandbox.mvvm.computed,
            page1pages = observableArray(),
            isPage1Selected = observable(false),
            pages = [
                {
                    title: 'Page 1',
                    template: 'main_panorama_page1_template',
                    isSelected: isPage1Selected,
                    isSelectable: true,
                    pages: page1pages
                },
                {
                    title: 'Page 2',
                    isSelectable: true,
                    template: 'main_panorama_page2_template'
                },
                {
                    title: 'Page 3',
                    template: 'main_panorama_page3_template'
                }
            ],
            panorama = {
                title: 'My Title',
                pages: pages
            };
        computed(function () {
            if (isPage1Selected()) {
                page1pages([
                    {
                        title: 'Page1 section',
                        template: 'main_panorama_page1_page1_template'
                    },
                    {
                        title: 'Page1 another section',
                        template: 'main_panorama_page1_page2_template'
                    }
                ]);
            }
        });

        return {
            'main': function () {
                return {
                    template: {
                        name: 'main_panorama_template'
                    }
                };
            },
            'main-panorama': function () {
                return {
                    panorama: panorama
                };
            }
        };
    };
});
