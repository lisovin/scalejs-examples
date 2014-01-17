
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
 + '    <div class="tabs-menu">'
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
 + ''
 + '<div id="tabs_header_item_template">'
 + '    <li>'
 + '        <a data-class="tabs-header">'
 + '            <div class="tabs-header-text" data-class="tabs-header-text"></div>'
 + '        </a>'
 + '        <div class="iconClose" data-class="tab-close"></div>'
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
    'knockout-sortable'
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
                tabs,
			    $menu,
			    $addTab,
                $headers;

            /*
             * setupTabs: creates tabs control with edittable headers
             */
            function setupTabs() {
                var el = $(ko.virtualElements.firstChild(element)).parent();        
                $menu = $($(el).find('.tabs-menu'));
                tabs = $($(el).find('.tabs')).tabs();
                $menu.hide();

                /*
                 * Remove keyboard navigation from tabs so that editable can work.
                 */
                $.widget("ui.tabs", $.ui.tabs, { options: { keyboard: true  },
                    _tabKeydown: function (e) {
                        if (this.options.keyboard) { this._super('_tabKeydown'); }
                        else { return false; }
                    }
                });

                /*
                 * Make tabs edittable.
                 */
                tabs.delegate("a.ui-tabs-anchor", "dblclick", function () {
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
            }

            /*
             * refreshTabs: updates tabs and creates add tab open menu
             */
            function refreshTabs() {
                tabs.tabs('refresh');

                /*
                 * Fix height of tab content.
                 */
                tabs.find('.ui-tabs-panel').each(function () {
                    var tabsHeight = tabs.height(),
                        headersHeight = tabs.find('.tab-headers').height();
                    $(this).height(tabsHeight - headersHeight);
                });

                /*
                 * create add tab.
                 */
                tabs.find('li.unsortable').remove();
                $headers = tabs.find('ul.tab-headers');
                $headers.append('<li class="unsortable"><a href="#tabs-add">+</a></li>');
                bindAddTabHandler(openPopup);
            }

            function bindAddTabHandler(handler) {
                 $addTab = tabs.find("[href='#tabs-add']");
                 $addTab.unbind().click(handler);
            }

            function openPopup(e) {
                e.preventDefault();
                $menu.bPopup({
                    follow: [false, false],
                    position: [$addTab.offset().left + tabs.find('li.unsortable').width(), $addTab.offset().top],
                    opacity: 0,
                    speed: 0
                });
            };

            data.sortOptions = {
                items: "li:not(.unsortable)",
                axis: "x",
                start: function () {
                    //remove add tab
                    tabs.find('li.unsortable').remove();
                },
                stop: function () {
                    refreshTabs();
                }
            };

	        data.menuItems = observableArray(toEnumerable(unwrap(data.defaultItems)).select(function (item) {
	            var menuItem = merge(item, {
	                addTab: function () {
	                    $menu.bPopup({ opacity: 0 }).close();                           // close menu
	                    data.itemsSource.push(item.create());                           // add item
	                    tabs.tabs("option", "active", data.itemsSource.length - 2);     // activate new tab
	                    refreshTabs();
	                }
	            });
	            return menuItem;
	        }).toArray());

	        data.refreshTabs = refreshTabs;

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
