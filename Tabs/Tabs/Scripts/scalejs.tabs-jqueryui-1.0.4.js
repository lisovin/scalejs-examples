
define('text!scalejs.tabs-jqueryui/tabs.html', [], function () { return ''
 + '<div id="tabs_template">'
 + '    <div class="tabs" style="height:100%">'
 + '       '
 + '        <div data-class="tabs-header-right" style="position:absolute;right:0px;"></div>'
 + '        <ul class="tab-headers" data-class="tabs-sortable">'
 + '        </ul>'
 + '               '
 + '        <!-- ko class: tabs-items-source -->'
 + '        <div data-class="tabs-content-container">'
 + '            <!-- ko class:tabs-content-template -->'
 + '            <!-- /ko -->'
 + '        </div>'
 + '        <!-- /ko -->'
 + '    </div>'
 + '    <div class="tabs-more tabs-menu">'
 + '        <!-- ko foreach: itemsSource -->'
 + '            <div class="tabs-menu-item"><span data-class="tabs-more-item"></span><div class="iconClose" data-class="tab-close"></div></div>'
 + '        <!-- /ko -->'
 + '    </div> '
 + '    <div class="tabs-add tabs-menu">'
 + '        <!-- ko foreach: menuItems -->'
 + '            <div class="tabs-menu-item" data-bind="text: header, click: addTab"></div>'
 + '        <!-- /ko -->'
 + '    </div> '
 + '</div>'
 + ''
 + '<div id="tabs_content_default_template">'
 + '     <p data-bind="text: $data"></p>'
 + '</div>'
 + ''
 + '<div id="tabs_more_item_template"><li class="tabs-menu-item"><div class="tabs-header-text" data-class="tabs-header-text"></div><div class="iconClose" data-class="tab-close"></div></li></div>'
 + '<div id="tabs_header_item_template">'
 + '    <li>'
 + '        <a data-class="tabs-header">'
 + '            <div class="tabs-header-text" data-class="tabs-header-text"></div>'
 + '        </a>'
 + '        <div class="iconClose" data-class="tab-more-close"></div>'
 + '        <div  class="iconMore" data-class="tab-more"></div>'
 + '        <!--<div class="iconMax" data-class="tab-max"></div>-->'
 + '    </li>'
 + '</div>'
 + ''
 + '<div id ="tabs_menu_temp_template">'
 + '    <div class="tabs-menu">'
 + '        <!-- ko foreach: menuItems -->'
 + '            <div class="tabs-menu-item" data-bind="text: header, click: addTab"></div>'
 + '        <!-- /ko -->'
 + '    </div> '
 + '</div>'; });

/*global define */
/*jslint sloppy: true*/
define('scalejs.tabs-jqueryui/tabsBindings', {
    'tabs-header': function (ctx) {
        return {
            attr: {
                href: '#tabs-' + ctx.$index()
            },
            click: function (data, e) {
                e.preventDefault(); //stops hash
            }
        };
    },
    'tabs-header-text': function () {
        return {
            text: this.header
        };
    },
    'tabs-content-container': function (ctx) {
        return {
            attr: {
                id: 'tabs-' + ctx.$index()
            }
        };
    },
    'tabs-items-source': function () {
        return {
            foreach: {
                data: this.itemsSource
            }
        };
    },
    'tabs-header-edit': function () {
        return {
            value: this.header,
            valueUpdate: 'afterkeydown'
        };
    },
    'tabs-content-template': function (ctx) {
        var contentTemplate = this.contentTemplate || ctx.$parent.contentTemplate || "tabs_content_default_template";

        return {
            template: {
                name: contentTemplate,
                data: this.content
            }
        };
    },
    'tabs-header-right': function () {
        if (this.headerTemplate) {
            return {
                template: {
                    name: this.headerTemplate,
                    data: this.content
                }
            };
        }
        return {};
    },
    'tab-more-close': function (ctx) {
        var itemsSource = ctx.$parent.itemsSource,
            refreshTabs = ctx.$parent.refreshTabs;

        return {
            click: function () {
                itemsSource.remove(ctx.$data);
                refreshTabs();
            },
            visible: !ctx.$parent.more()
        };
    },
    'tab-close': function (ctx) {
        var itemsSource = ctx.$parent.itemsSource,
            refreshTabs = ctx.$parent.refreshTabs;

        return {
            click: function () {
                itemsSource.remove(ctx.$data);
                refreshTabs();
            }
        };
    },
    'tab-max': function () {
        return {
            click: function (data) {
                console.log("maximixing", data);
            }
        };
    },
    'tabs-sortable': function () {
        return {
            sortable: {
                template: "tabs_header_item_template",
                data: this.itemsSource,
                options: this.sortOptions,
                afterMove: this.afterMove
            }
        };
    },
    'tab-more': function (ctx) {
        return {
            visible: ctx.$parent.more,
            click: ctx.$parent.openMore
        }
    },
    'tabs-more-item': function (ctx) {
        return {
            style: {
                color: ctx.$parent.active() === ctx.$index() ? 'red' : 'white'
            },
            text: this.header
        };
    }
});

/*global define*/
define('scalejs.tabs-jqueryui', [
	'scalejs!core',
	'knockout',
	'jQuery',
	'text!./scalejs.tabs-jqueryui/tabs.html',
	'./scalejs.tabs-jqueryui/tabsBindings',
	'scalejs.mvvm',
    'bPopup',
    'knockout-sortable',
    'tabs-paging'
], function (
	core,
    ko,
    $,
	tabsTemplates,
	tabsBindings
) {


    var registerTemplates = core.mvvm.registerTemplates,
		registerBindings = core.mvvm.registerBindings,
		isObservable = ko.isObservable,
        observableArray = ko.observableArray,
        toEnumerable = core.linq.enumerable.from,
        unwrap = ko.unwrap,
        merge = core.object.merge;

    //TODO: update this
    registerTemplates(tabsTemplates);
    registerBindings(tabsBindings);

    function wrapValueAccessor(valueAccessor, element) {
        return function () {
            var data = valueAccessor(),
                $tabs,
                $menu = {};

            /*
             * setupTabs: creates tabs control with edittable headers
             */
            function setupTabs() {
                var el = $(ko.virtualElements.firstChild(element)).parent();

                /* finds and hides add and more menu */
                $menu.add = $($(el).find('.tabs-add')).hide();
                $menu.more = $($(el).find('.tabs-more')).hide();

                /* initializes jquery tabs */
                $tabs = $($(el).find('.tabs')).tabs();

                /* enables editable headers */
                $.widget("ui.tabs", $.ui.tabs, { options: { keyboard: true  },
                    _tabKeydown: function (e) {
                        if (this.options.keyboard) { this._super('_tabKeydown'); }
                        else { return false; }
                    }
                });
                $tabs.delegate("a.ui-tabs-anchor", "dblclick", function () {
                    var header = ko.dataFor(this).header,
					    $input,
					    el = this;

                    if (isObservable(header)) {
                        $(el).find("[data-class='tabs-header-text']").replaceWith("<input data-class='tabs-header-edit' />");
                        $input = $(el).find("input");

                        ko.applyBindings(ko.dataFor(this), $input.get(0));
                        $input.focus();
                        $input.bind('keyup', function (e) {
                            var code = e.keyCode || e.which;
                            if (code == 13) {
                                $input.replaceWith("<div class='tabs-header-text' data-class='tabs-header-text'></div>");
                                ko.applyBindings(ko.dataFor(el), $(el).find("[data-class='tabs-header-text']").get(0));
                            }
                        });

                        $input.bind('blur', function () {
                            $input.replaceWith("<div class='tabs-header-text' data-class='tabs-header-text'></div>");
                            ko.applyBindings(ko.dataFor(el), $(el).find("[data-class='tabs-header-text']").get(0));
                        });
                    }
                });

                /* binds width calculation on resize */
                $(window).resize(calculateWidth);
            }

            /*
             * refreshTabs: updates tabs whenever a significant change is made
             */
            function refreshTabs(active) {
                /* refreshes jqueryui tabs */
                $tabs.tabs('refresh');

                /* activates the appropriate tab */
                $tabs.tabs("option", "active", active || $tabs.tabs("option", "active"));
                data.active($tabs.tabs("option", "active"));

                /* fixes the height of the tabs content */
                $tabs.find('.ui-tabs-panel').each(function () {
                    var tabsHeight = $tabs.height(),
                        headersHeight = $tabs.find('.tab-headers').height();
                    $(this).height(tabsHeight - headersHeight);
                });

                /* binds click handler to more menu item */
                $menu.more.find('.tabs-menu-item').each(function (i, el) {
                    $(el).unbind().click(function () {
                        $tabs.tabs("option", "active", i);
                        $menu.more.bPopup({ opacity: 0 }).close();
                        refreshTabs();
                    });
                });
                
                createAddTab();
                calculateWidth();
            }

            /*
             * calculateWidth: determines if tabs fit within window
             */
            function calculateWidth() {
                var tabsContainerWidth = $tabs.outerWidth(),
                    $headers = $tabs.find('ul.tab-headers'),
                    $tabItems = $headers.find('li').show(),
                    tabsWidth = $tabItems.get().reduce(function (acc, el) {
                        acc += $(el).outerWidth();
                        return acc;
                    }, 0) + 20;
                
                data.more(false);
                if (tabsWidth > tabsContainerWidth) {
                    $tabItems.hide();
                    data.more(true);
                    $headers.find('.ui-state-active').show();
                }
                createAddTab();
            }

            /*
             * createAddTab: creates the tab which opens the add tab menu
             */
            function createAddTab() {
                var $tab;
                $tabs.find('li.add').remove();
                $headers = $tabs.find('ul.tab-headers');
                $headers.append('<li class="unsortable add"><a href="#tabs-add">+</a></li>');
                $tab = $tabs.find('[href="#tabs-add"]');
                $tab.unbind().click(function (e) {
                    e.preventDefault();
                    $menu[type].bPopup({
                        follow: [false, false],
                        position: [$tab.offset().left + $tabs.find('li.add').width(), $tab.offset().top],
                        opacity: 0,
                        speed: 0
                    });
                });
            }


            data.sortOptions = {
                items: "li:not(.unsortable)",
                axis: "x",
                start: function () {
                    //remove add tab
                    $tabs.find('li.unsortable').remove();
                },
                stop: function (args) {
                    refreshTabs(args.targetIndex);
                }
            };

	        data.menuItems = observableArray(toEnumerable(unwrap(data.defaultItems)).select(function (item) {
	            var menuItem = merge(item, {
	                addTab: function () {
	                    $menu.add.bPopup({ opacity: 0 }).close();                           
	                    data.itemsSource.push(item.create());                           
	                    refreshTabs(data.itemsSource().length-1);
	                }
	            });
	            return menuItem;
	        }).toArray());

	        data.refreshTabs = refreshTabs;

	        data.more = ko.observable(false);

	        data.active = ko.observable(1);

	        data.openMore = function () {
	            var $tab = $($tabs.find('li').get(1));
	            $menu.more.bPopup({
	                follow: [false, false],
	                position: [$tab.offset().left + 10, $tab.offset().top + $tab.outerHeight() + 10],
	                opacity: 0,
	                speed: 0
	            });
	        }

            return {
                data: data,
                name: "tabs_template",
                afterRender: function () {
                    setupTabs();
                    refreshTabs();
                }
            };
        };
    }

    function init(
		element,
		valueAccessor,
		allBindingsAccessor,
		viewModel,
		bindingContext
	) {
        ko.bindingHandlers.template.update(
            element,
            wrapValueAccessor(valueAccessor, element),
            allBindingsAccessor,
            viewModel,
            bindingContext
        );

        return { 'controlsDescendantBindings': true };
    }

    ko.bindingHandlers.tabs = {
        init: init
    };

    ko.virtualElements.allowedBindings.tabs = true;
    ko.virtualElements.allowedBindings.sortable = true;
});
