/*global define*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/observableDataview',[
    //'scalejs!core',
    'knockout',
    'slick.grid'
], function (
    //core, 
    ko,
    Slick
) {
    /// <param name="ko" value="window.ko" />
    


    var isObservable = ko.isObservable,
        computed = ko.computed;

    return function (opts) {
        var onRowCountChanged = new Slick.Event(),
            onRowsChanged = new Slick.Event(),
            items = {};

        function getLength() {
            if (isObservable(opts.itemsCount)) {
                return opts.itemsCount();
            }

            return opts.itemsSource().length;
        }

        function getItems() {
            return items;
        }

        function getItem(index) {
            return items ? items[index] : null;
        }

        function getItemMetadata(index) {
            var item = items[index];
            return item ? item.metadata : null;
        }

        function subscribeToItemsCount() {
            var oldCount = 0;

            if (isObservable(opts.itemsCount)) {
                opts.itemsCount.subscribe(function (newCount) {
                    onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                    oldCount = newCount;
                });
            } else {
                computed({
                    read: function () {
                        var newItems = opts.itemsSource() || [],
                            newCount = newItems.length;

                        if (newCount !== oldCount) {
                            onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                            oldCount = newCount;
                        }
                    }
                });
            }
        }

        function subscribeToItemsSource() {
            computed({
                read: function () {
                    var newItems = opts.itemsSource() || [],
                        rows = [],
                        oldIndexes,
                        newIndexes,
                        deletedIndexes;

                    oldIndexes = Object.keys(items).map(function (key) { return parseInt(key, 10); });
                    newIndexes = newItems.map(function (newItem) { return newItem.index; });

                    deletedIndexes = oldIndexes.except(newIndexes).toArray();
                    deletedIndexes.forEach(function (index) { delete items[index]; });

                    rows = newItems
                        .filter(function (newItem) {
                            return items[newItem.index] !== newItem;
                        })
                        .map(function (newItem) {
                            //var oldItem
                            items[newItem.index] = newItem;
                            return newItem.index;
                        });

                    if (rows.length > 0) {
                        onRowsChanged.notify({ rows: rows }, null, null);
                    }
                }
            });
        }

        function subscribe() {
            subscribeToItemsSource();
            subscribeToItemsCount();
        }

        if (!isObservable(opts.itemsSource)) {
            throw new Error('`itemsSource` must be an observableArray.');
        }

        return {
            // data provider interface
            getLength: getLength,
            getItem: getItem,
            getItemMetadata: getItemMetadata,
            getItems: getItems,
            // additional funcitonality
            subscribe: subscribe,
            // events
            onRowCountChanged: onRowCountChanged,
            onRowsChanged: onRowsChanged
        };
    };
});


define('text!scalejs.grid-slick/filters.html',[],function () { return '<div id="number_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div> \r\n        <div class="numberFilter">\r\n            Select Value: \r\n               <div>Quick Search: <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'" /></div> \r\n               <div class="listFilterBox">\r\n                   <div data-bind="visible: loading" style="width:100%;height:200px;background:black;opacity:.2;position:absolute"></div> \r\n                    <div>\r\n                        <input type="checkbox" data-bind="checked: all" /> \r\n                        <span>Select All</span> \r\n                    </div> \r\n                    <!-- ko foreach: options --> \r\n                    <div>\r\n                        <input type="checkbox" data-bind="checked: selected" /> \r\n                        <span data-bind="text: value"></span> \r\n                    </div> \r\n                    <!-- /ko --> \r\n               </div> \r\n               Show rows with values that: \r\n            <div class="numberFilterBox">\r\n                <div> \r\n                <input type="checkbox" data-bind="checked: notEmpty" />\r\n                <span>Are Not Empty</span> \r\n                </div>\r\n                <div>and</div> \r\n                <div>\r\n                    <select data-bind="value: comparisonA">\r\n                        <option value="EqualTo">Is Equal To</option> \r\n                        <option value="LessThan">Is Less Than</option> \r\n                        <option value="NotEqualTo">Is Not Equal To</option> \r\n                        <option value="GreaterThan">Is Greater Than</option>         \r\n                    </select>\r\n                </div> \r\n                <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'" /> \r\n                <div>and</div> \r\n                <div>\r\n                    <select data-bind="value: comparisonB">\r\n                        <option value="EqualTo">Is Equal To</option> \r\n                        <option value="LessThan">Is Less Than</option>\r\n                        <option value="NotEqualTo">Is Not Equal To</option>\r\n                        <option value="GreaterThan">Is Greater Than</option> \r\n                    </select>\r\n                </div> \r\n                <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'" /> \r\n            </div> \r\n    </div>  \r\n</div> \r\n \r\n<div id="string_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div> \r\n    <div class="numberFilter">\r\n        Select Value: \r\n        <div>Quick Search:  <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'" /></div> \r\n        <div class="listFilterBox">\r\n            <div data-bind="visible: loading" style="width:100%;height:200px;background:black;opacity:.2;position:absolute"></div> \r\n            <div>\r\n                <input type="checkbox" data-bind="checked: all" /> \r\n                <span>Select All</span> \r\n            </div> \r\n            <!-- ko foreach: options --> \r\n            <div>\r\n                <input type="checkbox" data-bind="checked: selected" /> \r\n                <span data-bind="text: value"></span> \r\n            </div> \r\n            <!-- /ko --> \r\n        </div> \r\n        Show rows with values that: \r\n        <div class="numberFilterBox">\r\n            <div>\r\n                <input type="checkbox" data-bind="checked: notEmpty" />\r\n                <span>Are Not Empty</span> \r\n            </div>\r\n            <div>and</div> \r\n            <div>\r\n                <select data-bind="value: comparisonA">\r\n                    <option value="Contains">Contains</option> \r\n                    <option value="StartsWith">Starts With</option> \r\n                    <option value="EndsWith">Ends</option>  \r\n                </select>\r\n            </div> \r\n            <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'" /> \r\n            <div>and</div> \r\n            <div>\r\n                <select data-bind="value: comparisonB">\r\n                    <option value="Contains">Contains</option> \r\n                    <option value="StartsWith">Starts With</option>\r\n                    <option value="EndsWith">Ends</option>\r\n                </select>\r\n            </div> \r\n            <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'" />\r\n        </div> \r\n    </div>  \r\n</div>  \r\n\r\n';});

/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/observableFilters',[
    'scalejs!core',
    'jQuery',
    'knockout',
    'text!./filters.html',
    'bPopup',
    'scalejs.statechart-scion',
    'scalejs.mvvm'
], function (
    core,
    $,
    ko,
    filterTemplates
) {
    'use strict;'
    /// <param name="ko" value="window.ko" />

    var statechart = core.state.builder.statechart,
          state = core.state.builder.state,
          parallel = core.state.builder.parallel,
          on = core.state.builder.on,
          whenIn = core.state.builder.whenInStates,
          onEntry = core.state.builder.onEntry,
          onExit = core.state.builder.onExit,
          goto = core.state.builder.goto,
          gotoInternally = core.state.builder.gotoInternally,
          observable = ko.observable,
          computed = ko.computed,
          observableArray = ko.observableArray,
          unwrap = ko.utils.unwrapObservable,
          registerTemplates = core.mvvm.registerTemplates,
          has = core.object.has;

    registerTemplates(filterTemplates);

    function setupFilter(fieldFilter, column) {
        var filter = observable([]),
            quickSearch = observable(), //fieldFilter.quickSearch || observable(),
            quickOp = fieldFilter.quickFilterOp || "StartsWith",
            comp = {
                a: observable(),
                valA: observable(),
                b: observable(),
                valB: observable()
            },
            notEmpty = observable(false),
            allCheckbox = observable(true),
            loading = observable(false),
            listItems = fieldFilter.values,
            quickFilter = observable(""),
            selectableListItems = observableArray([]),
            valExpression,
            listExpression,
            quickExpression,
            filterOn,
            flipped = observable(false),
            subscription = {},
            bindings,
            $filter,
            $popup,
            bindings,
            send;

        // Update from fieldFilter.quickSearch:
        function updateQuickSearch(value) {
            // Unsubscribe from quickSearch to avoid calling updateQuickSearch:
            subscription.quickSearch.dispose();

            // Update quickFilter and quickSearch:
            if (!value || !value.values || !value.values.length) {
                quickFilter("");
                quickSearch("");
            } else {
                quickFilter(value.values[0]);
                quickSearch(value.values[0]);
            }

            // Subscribe updateFieldQuickSearch to external observable again:
            subscription.quickSearch = quickSearch.subscribe(updateFieldQuickSearch);
        }
        subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(updateQuickSearch);
        //send QuickSearch expression whenever quickSearch is changed.
        function updateFieldQuickSearch(value) {
            // Unsubscribe from fieldQuickSearch to avoid calling updateFieldQuickSearch:
            subscription.fieldQuickSearch.dispose();

            // Update external observable:
            fieldFilter.quickSearch(has(value)
                ? { op: quickOp, values: [value] }
                : undefined
            );

            // Subscribe updateFieldQuickSearch to external observable again:
            subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(updateQuickSearch);
        }
        subscription.quickSearch = quickSearch.subscribe(updateFieldQuickSearch);

        //we only want to send the expression if it is a new expression
        //therefore, we check equality based on the stringified expression
        filter.equalityComparer = function (oldValue, newValue) {
            return JSON.stringify(oldValue) === JSON.stringify(newValue);
        }
        // Update from fieldFilter:
        function updateFilter(v) {
            // Unsubscribe from value to avoid calling updateFilter:
            subscription.filter.dispose();

            var value = fieldFilter.value.peek() || [], // Get copy of value.
                comps = fieldFilter.type === "string" ? ["Contains", "StartsWith", "EndsWith"] : ["EqualTo", "LessThan", "NotEqualTo", "GreaterThan"],
                val;

            // all, list, or val

            /*
            // If no "In" operation, then check all:
            if (v) {
                if (value.indexOf("In") === -1) {
                    uncheckAll();
                }
            } else {
                checkAll();
            }*/

            // Set NotEmpty to false if not in list:
            if (value.indexOf("NotEmpty") === -1) {
                notEmpty(false);
            }

            // Set comparison1 to nothing if not a filter:
            if (value[0] === undefined || comps.indexOf(value[0].op) === -1) {
                comp.a(comps[0]);
                comp.valA(undefined);
            }
            // Set comparison2 to nothing if not a filter:
            if (value[1] === undefined || comps.indexOf(value[1].op) === -1) {
                comp.b(comps[0]);
                comp.valB(undefined);
            }

            value.forEach(function (filter, index) {
                if (filter.op === "In") {
                    // Apply In to all list items:
                    selectableListItems().forEach(function (item) {
                        item.selected(filter.values.indexOf(item.value) > -1);
                    });
                } else if (filter.op === "NotEmpty") {
                    // Apply notEmpty:
                    notEmpty(true);
                } else {
                    if (index === 0) {
                        comp.a(filter.op);
                        comp.valA(filter.values[0]);
                    } else {
                        comp.b(filter.op);
                        comp.valB(filter.values[0])
                    }
                }
            });

            // Push filters to
            filter(value);

            // Subscribe updateFilters to external observable again:
            subscription.filter = filter.subscribe(updateFieldFilter);
        }
        subscription.fieldValue = fieldFilter.value.subscribe(updateFilter);
        //we created our own filter observable
        //so that we can initialize it before grid is initialized.
        function updateFieldFilter(f) {
            // Unsubscribe from value to avoid calling updateFilters:
            subscription.fieldValue.dispose();
            // Update external observable:
            fieldFilter.value(f);
            // Subscribe updateFilters to external observable again:
            subscription.fieldValue = fieldFilter.value.subscribe(updateFilter);
        }
        subscription.filter = filter.subscribe(updateFieldFilter);

        //converts a list item to a selectable list item
        function option(value, selected) {
            return {
                selected: observable(has(selected) ? selected : allCheckbox()),
                value: has(value) ? value.toString() : ""
            };
        }

        //converts new listItems to selectableListItems
        listItems.subscribe(function (newItems) {
            //item selection persists when the list items are changed
            var filterValues = filter().length === 1 && filter()[0].op === 'In' ? filter()[0].values : [],
                items;

            if (filterValues.length > 0) {
                items = newItems.map(function (item) {
                    return option(item, filterValues.indexOf(item.toString()) > -1);
                });
            } else {
                items = newItems.groupJoin(selectableListItems(), "$.toString()", "$.value", function (o, i) {
                    return i.elementAtOrDefault(0, option(o));
                }).toArray();
            }

            selectableListItems(items);
        });

        //creates expression based on values
        valExpression = computed(function () {
            var expression = [];
            if (comp.valA()) {
                expression.push({
                    op: comp.a(),
                    values: [comp.valA()]
                });
            }

            if (comp.valB()) {
                expression.push({
                    op: comp.b(),
                    values: [comp.valB()]
                });
            }

            if (notEmpty()) {
                expression.push({
                    op: "NotEmpty",
                    values: []
                })
            }

            return expression.length > 0 ? expression : undefined;
        });

        //creates expression based on list items
        listExpression = computed(function () {
            var list = selectableListItems().filter(function (v) {
                return v.selected();
            });

            //if there is at least one list item checked and if all the items in the list are not selected 
            //then, there is a list expression
            //(but if all items are selected, it is a quick expression)
            if (list.length > 0 && list.length < selectableListItems().length) {
                return [{
                    op: 'In',
                    values: list.map(function (v) { return v.value })
                }];
            } else {
                return undefined;
            }
        });

        quickExpression = computed(function () {
            if (quickFilter()) {
                return [{
                    op: quickOp,
                    values: [quickFilter()]
                }];
            }
            //When all checkbox is true, quickSearch behaves like Quick Filter
            //when filter is closed quickSearch becomes undefined
            if (allCheckbox() && quickSearch()) {
                return [{
                    op: quickOp,
                    values: [quickSearch()]
                }];
            }

            return [];
        });


        filterOn = computed(function () {
            return filter().length > 0;
        });

        bindings = {
            comparisonA: comp.a,
            comparisonB: comp.b,
            valueA: comp.valA,
            valueB: comp.valB,
            quickSearch: quickSearch,
            all: allCheckbox,
            options: selectableListItems,
            popupTemplate: fieldFilter.type === "string" ? "string_filter_template" : "number_filter_template",
            value: quickFilter,
            filterOn: filterOn,
            flipped: flipped,
            notEmpty: notEmpty,
            loading: loading
        };


        function sendExpression(expression) {
            filter(expression || []);
        }

        function checkAll() {
            allCheckbox(true);
            selectableListItems().forEach(function (v) {
                v.selected(true);
            });
        }

        function uncheckAll() {
            allCheckbox(false);
            selectableListItems().forEach(function (v) {
                v.selected(false);
            });
        }

        function getSelectedItems() {
            return selectableListItems().filter(function (v) {
                return v.selected();
            });
        }

        function clearValue() {
            comp.valA(undefined);
            comp.valB(undefined);
            notEmpty(false);
        }

        function initializeFilter($node) {
            //using jQuery instead of knockout because bindings have already been applied to the filter,
            //however we need to add a click event to the filter button so that when it is clicked
            //'filter.shown' state is entered.
            $filter = $($node.find('.slick-filter')[0]);
            $filter.click(function () {
                //creates the popup div lazily, but only once
                if (!$popup) {
                    $popup = $('<div class="slick-filter-popup" data-bind="template: { name: popupTemplate, data: $data}"></div>').appendTo('body');
                    ko.applyBindings(bindings, $popup.get()[0]);
                }

                //flip is boolean; sets 'flipped' observable in order to show the correct ui if filter is flipped (left/right)
                //also returns the offset which needs to be applied to the popup if it is flipped
                function flipFilter(flip) {
                    flipped(flip);
                    if (flip) {
                        return $filter.offset().left - $popup.width() - column.width + 10;
                    }
                    return $filter.offset().left + 20;
                }

                //calculates the offset of the filter from the top/left corner of the window
                var offsetX = flipFilter($filter.offset().left + 10 + $popup.width() > window.innerWidth),
                    offsetY = $filter.offset().top + $popup.height() > window.innerHeight ? window.innerHeight - $popup.height() : $filter.offset().top - 10;

                send('filter.open');

                //creates the popup which is the filter
                $popup.bPopup({
                    follow: [false, false],
                    position: [offsetX, offsetY],
                    opacity: 0,
                    speed: 0,
                    onClose: function () {
                        send('filter.close');
                    }
                });

                //sets the correct position of the arrow on the filter
                var arrow = $popup.find('div')[0];
                $(arrow).css("top", $filter.offset().top - offsetY);
            });
        }

        /*
        removed filter.loading stage and filter.ready stage 
        because quick search now is updated continuously when quick filter changes
        moved subs to list and value outside of the hidden substate in the logical states 
        because now we must react to changes when its closed due to saving
        */

        function createStatechart() {

            return statechart(
                parallel('filter',
                onEntry(function () {
                    send = this.send;
                    this.initial = true;
                }),
                state('filter.view',
                    state('filter.hidden',
                            onEntry(function (e, isIn) {
                                var stateProp = this,
                                    sub;

                                subscription.quickSearchSub = quickSearch.subscribe(function (v) {
                                    quickFilter(v);
                                });

                                subscription.quickSub = quickFilter.subscribe(function (v) {
                                    // Prevent circular dependency by disposing quickSearch subscription:
                                    subscription.quickSearchSub.dispose();
                                    // Update quickSearch:
                                    quickSearch(v);
                                    // Resubscribe to quickSearch:
                                    subscription.quickSearchSub = quickSearch.subscribe(function (v) {
                                        quickFilter(v);
                                    });
                                    if (!isIn('filter.model.all')) {
                                        send('filter.all');
                                    }
                                });

                                if (this.initial) {
                                    updateFilter(fieldFilter.value());
                                    updateQuickSearch(fieldFilter.quickSearch());
                                    this.initial = false;
                                }
                            }),
                        onExit(function () {
                            subscription.quickSearchSub.dispose();
                            subscription.quickSub.dispose();
                        }),
                            on('filter.open', goto('filter.shown'))
                        ),
                    state('filter.shown',
                           onEntry(function () {
                               //move open logic here

                               // Initialize list:
                               quickSearch.valueHasMutated();
                           }),
                            on('filter.close', goto('filter.hidden')))
                ),
                state('filter.model',
                /*
                    state('filer.model.initial', 
                        onEntry(function () {
                            // 1. move updateFilter, updateQuickSearch here
                            // 2. do dispatch
                            send('filter.lis', { internal: true });

                        })),*/
                    state('filter.model.all',
                        onEntry(function (e) {
                            //update ui
                            checkAll();
                            clearValue();

                            sendExpression(quickExpression());

                            subscription.list = listExpression.subscribe(function (expression) {
                                if (expression) {
                                    //if there is an expression, go to list
                                    send('filter.list');
                                } else if (getSelectedItems().length === 0) {
                                    //if there are selected items and no expression, go to value
                                    send('filter.value');
                                }
                            });
                            subscription.value = valExpression.subscribe(function () {
                                send('filter.value');
                            });
                        }),
                        onExit(function () {
                            subscription.list.dispose();
                            subscription.value.dispose();
                        }),
                        state('filter.all.hidden',
                            onEntry(function () {
                                this.quickSubAll = quickFilter.subscribe(function (v) {
                                    sendExpression(quickExpression());
                                });
                            }),
                            onExit(function () {
                                this.quickSubAll.dispose();
                            }),
                            whenIn('filter.shown', goto('filter.all.shown'))),
                        state('filter.all.shown',
                            onEntry(function () {
                                quickFilter(quickSearch());
                                //subscribe to changes in the ui
                                subscription.all = allCheckbox.subscribe(function (isChecked) {
                                    if (!isChecked) {
                                        send('filter.value');
                                    }
                                });
                                subscription.quick = quickSearch.subscribe(function (v) {
                                    if (v !== undefined) {
                                        quickFilter(quickSearch());
                                        sendExpression(quickExpression());
                                    }
                                });
                            }),
                            onExit(function () {
                                //change this to unsubscribe or composite disposable
                                subscription.all.dispose();
                                subscription.quick.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.all.hidden')))
                    ),
                    state('filter.model.list',
                        onEntry(function () {
                            //update ui
                            allCheckbox(false);
                            clearValue();

                            sendExpression(listExpression());

                            subscription.list = listExpression.subscribe(function (expression) {
                                if (expression) {
                                    // if there is an expression, send it
                                    sendExpression(expression);
                                } else if (getSelectedItems().length === 0) {
                                    // if its empty, go to value
                                    send('filter.value');
                                } else {
                                    // else, all are selected
                                    send('filter.all');
                                }
                            });
                            subscription.value = valExpression.subscribe(function (v) {
                                send('filter.value');
                            });
                        }),
                            onExit(function () {
                                subscription.list.dispose();
                                subscription.value.dispose();
                            }),
                        state('filter.list.hidden', whenIn('filter.shown', goto('filter.list.shown'))),
                        state('filter.list.shown',
                            onEntry(function () {
                                quickFilter("");
                                subscription.all = allCheckbox.subscribe(function () {
                                    send('filter.all');
                                });
                            }),
                            onExit(function () {
                                subscription.all.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.list.hidden')))
                    ),
                    state('filter.model.value',
                            onEntry(function (e) {
                                //update ui
                                uncheckAll();
                                quickFilter("");

                                sendExpression(valExpression());

                                subscription.list = listExpression.subscribe(function (expression) {
                                    if (expression) {
                                        // if there is an expression, go to list
                                        send('filter.list');
                                    } else if (getSelectedItems().length > 0) {
                                        // if there are items, go to all
                                        send('filter.all');
                                    }
                                });
                                subscription.value = valExpression.subscribe(function (expression) {
                                    sendExpression(expression);
                                });
                            }),
                            onExit(function () {
                                subscription.list.dispose();
                                subscription.value.dispose();
                            }),
                        state('filter.value.hidden', whenIn('filter.shown', goto('filter.value.shown'))),
                        state('filter.value.shown',
                            onEntry(function (e) {
                                //subscribe to changes in ui
                                subscription.all = allCheckbox.subscribe(function (v) {
                                    send('filter.all');
                                });
                            }),
                            onExit(function () {
                                subscription.all.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.value.hidden')))
                    ),
                    on('filter.all', gotoInternally('filter.model.all')),
                    on('filter.list', gotoInternally('filter.model.list')),
                    on('filter.value', gotoInternally('filter.model.value'))
                )));
        }

        filterStatechart = createStatechart();

        var initalized = false;
        function start() {
            filterStatechart.start();
        }

        return {
            bindings: bindings,
            start: start,
            initalized: initalized,
            init: initializeFilter
        }
    }

    /*jslint unparam: true*/
    return function observableFilters(opts) {
        function init(grid) {
            grid.onHeaderRowCellRendered.subscribe(function (e, args) {
                var $node = $(args.node),
                    node = $node[0],
                    fieldFilter = args.column.filter,
                    filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/>'
                    + '<div class="slick-filter" data-bind="css: { iconFilterOff: !filterOn(), iconFilterOn: filterOn }"></div>';

                if (fieldFilter) {
                    if (!fieldFilter.state) {
                        fieldFilter.state = setupFilter(fieldFilter, args.column)
                    }
                    $node.html(filterHtml);
                    ko.applyBindings(fieldFilter.state.bindings, node);
                    fieldFilter.state.init($node);
                    if (!fieldFilter.state.initalized) {
                        fieldFilter.state.start();
                        fieldFilter.state.initialized = true;
                    }
                }
            });
        }

        function destroy() {
        }

        return {
            init: init,
            destroy: destroy
        };
    };
});
/*global define, console, setTimeout*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/changesFlasher',[
    'scalejs!core'
], function (
    core
) {
    /// <param name="ko" value="window.ko" />


    /*jslint unparam: true*/
    return function changesFlasher(opts) {
        var clone = core.object.clone,
            has = core.object.has,
            diff = core.object.diff,
            merge = core.object.merge;

        opts = merge({
            speed: 1000,
            key: 'id'
        }, opts);

        function init(grid) {
            var oldItems = {};

            opts.fields = has(opts.fields) ? opts.fields : grid.getColumns().map(function (c) { return c.field; });

            function keySelector(item) {
                if (typeof (opts.key) === 'string') {
                    return item[opts.key]
                }
                var key = opts.key.map(function (k) { return item[k] }).join('_');
                return key;
            }

            function cacheData() {
                var item, i;

                for (i = 0; i < grid.getDataLength() ; i += 1) {
                    item = grid.getDataItem(i);
                    if (has(item)) {
                        oldItems[keySelector(item)] = item;
                    }
                }
            }

            grid.getData().onRowsChanged.subscribe(function (e, args) {
                var rows = args.rows,
                    timestamp = new Date().getTime().toString(),
                    cssKeyChanged = 'flash_chaged_' + timestamp,
                    cssKeyChanges = 'flash_changes_' + timestamp,
                    stylesChanged = clone(has(grid.getCellCssStyles(cssKeyChanged)) || {}),
                    stylesChanges = clone(has(grid.getCellCssStyles(cssKeyChanges)) || {});

                rows.forEach(function (row) {
                    var newItem,
                        oldItem,
                        d,
                        cssChanged,
                        cssChanges;

                    newItem = grid.getDataItem(row);
                    if (!has(newItem)) { return; }

                    oldItem = oldItems[keySelector(newItem)];

                    if (!has(oldItem)) { return; }


                    if (has(oldItem) && oldItem !== newItem) {
                        d = diff(oldItem, newItem, opts.fields);
                        //console.timeEnd('diff');
                        cssChanged = {};
                        cssChanges = {};

                        Object.keys(d).forEach(function (dp) {
                            var oldValue = d[dp][0],
                                newValue = d[dp][1];
                            if (newValue > oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-up';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                            if (newValue < oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-down';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                        });

                        stylesChanged[row] = cssChanged;
                        stylesChanges[row] = cssChanges;
                    }
                });

                grid.setCellCssStyles(cssKeyChanged, stylesChanged);
                grid.setCellCssStyles(cssKeyChanges, stylesChanges);

                cacheData();

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanges);
                }, 100);

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanged);
                }, opts.speed);
            });
        }

        function destroy() {

        }

        return {
            init: init,
            destroy: destroy
        };
    };
});

/*global define*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/slickGrid',[
    'scalejs!core',
    'require',
    'knockout',
    'jQuery',
    'slick.grid',
    './observableDataview',
    './observableFilters',
    './changesFlasher'
], function (
    core,
    require,
    ko,
    $,
    Slick,
    observableDataView
) {


    /// <param name="ko" value="window.ko" />
    var isObservable = ko.isObservable,
        merge = core.object.merge,
        has = core.object.has,
        toEnumerable = core.linq.enumerable.from,
        observable = ko.observable,
        observableArray = ko.observableArray,
        computed = ko.computed,
        valueOrDefault = core.object.valueOrDefault;

    function slickGrid(element, options) {
        var dataView,
            grid,
            sortBy = ko.observable(),
            internalItemsSource,
            itemsSource = options.itemsSource,
            filterableColumns,
            operations;

        function createDataView() {
            //dataView = new Slick.Data.DataView({ inlineFilters: true });

            dataView = observableDataView(merge(options, { itemsSource: internalItemsSource }));

            /*jslint unparam: true*/
            dataView.onRowCountChanged.subscribe(function (e, args) {
                grid.updateRowCount();
                grid.render();
            });
            /*jslint unparam: false*/

            /*jslint unparam: true*/
            dataView.onRowsChanged.subscribe(function (e, args) {
                var range, invalidated;

                range = grid.getRenderedRange();

                invalidated = args.rows.filter(function (r, i) {
                    return r >= range.top && r <= range.bottom;
                });

                if (invalidated.length > 0) {
                    grid.invalidateRows(invalidated);
                    grid.render();
                }
            });
            /*jslint unparam: false*/
        }

        /*jslint unparam: true*/
        function subscribeToOnSort() {
            if (options.customSort && isObservable(options.sorting)) {
                grid.onSort.subscribe(function (e, args) {
                    if (args.multiColumnSort) {
                        throw new Error('Multi column sort is not implemented');
                    }

                    var sort = {};
                    sort[args.sortCol.field] = args.sortAsc;

                    options.sorting(sort);
                });

                function newSorting(newSort) {
                    var sorts = Object.keys(newSort),
                        sort = sorts[0];

                    grid.setSortColumn(sort, newSort[sort]);
                }
                newSorting(options.sorting());
                options.sorting.subscribe(newSorting);
                options.sorting.valueHasMutated();
            } else if (isObservable(options.sorting)) {
                grid.onSort.subscribe(function (e, args) {
                    var sort = args.multiColumnSort ? args.sortCols : [args],
                        sortOpt = {};
                    sort.forEach(function (col) {
                        sortOpt[col.sortCol.field] = col.sortAsc;
                    });
                    options.sorting(sortOpt);

                    sortBy(sort);
                });
            } else if (options.sorting) {
                grid.onSort.subscribe(function (e, args) {
                    sortBy(args.multiColumnSort ?
                        args.sortCols :
                        [args]);
                });
            }
        }
        /*jslint unparam: false*/

        function lower(x) {
            if (typeof x === "string") {
                return x.toLowerCase();
            }
            return x;
        }

        function comparer(on) {
            return function (x) {
                return has(x, on) ? lower(x[on]) : -Number.MAX_VALUE;
            };
        }

        function sortItems(items, args) {
            var ordered;

            if (!args) {
                return items;
            }
            

            function thenBy(source, a) {
                return a.sortAsc
                    ? source.thenBy(comparer(a.sortCol.field))
                    : source.thenByDescending(comparer(a.sortCol.field));
            }

            function orderBy(source, a) {
                return a.sortAsc
                    ? source.orderBy(comparer(a.sortCol.field))
                    : source.orderByDescending(comparer(a.sortCol.field));
            }

            ordered = orderBy(toEnumerable(items), args[0]);
            ordered = toEnumerable(args)
                     .skip(1)
                     .aggregate(ordered, thenBy);
            grid.setSortColumns(args.map(function(a) { return { columnId: a.sortCol.field, sortAsc: a.sortAsc }; }));

            items = ordered.toArray();

            return items;
        }



        function createGrid() {
            var plugins,
                initial;

            options.explicitInitialization = true;
            grid = new Slick.Grid(element, dataView, options.columns, options);
            $(element).data('slickgrid', grid);

            if (isObservable(options.update)) {
                options.update.subscribe(function () {
                    grid.setColumns(options.columns);
                });
            }

            initial = options.columns.filter(function (c) {
                return c.defaultSort;
            });
            if (initial) {
                var sort = initial.map(function (col) {
                    return {
                        sortAsc: col.defaultSort === 'asc',
                        sortCol: col
                    };
                }),
                    sortOpt = {};
                if (isObservable(options.sorting)) {
                    sort.forEach(function (col) {
                        sortOpt[col.sortCol.field] = col.sortAsc;
                    });
                    options.sorting(sortOpt);

                    options.sorting.subscribe(function (sorts) {
                        sortBy(options.columns.reduce(function (cols, col) {
                            if (sorts[col.field] !== undefined) {
                                cols.push({
                                    sortAsc: sorts[col.field],
                                    sortCol: col
                                });
                            }
                            return cols;
                        }, []));
                    });
                }

                sortBy(sort);
            }

            grid.setSelectionModel(new Slick.RowSelectionModel());

            if (options.plugins) {
                plugins = Object.keys(options.plugins).map(function (p) {
                    // if one of the included plugins then prefix with ./ 
                    return [
                        'observableFilters',
                        'changesFlasher'
                    ].indexOf(p) >= 0 ? './' + p : p;
                });

                require(plugins, function () {
                    var i,
                        plugin,
                        createPlugin;
                    for (i = 0; i < arguments.length; i += 1) {
                        createPlugin = arguments[i];
                        plugin = createPlugin(options.plugins[createPlugin.name]);

                        grid.registerPlugin(plugin);
                    }
                    grid.init();
                });
            } else {
                grid.init();
            }
        }

        function subscribeToDataView() {
            dataView.subscribe();
        }

        function subscribeToSelection() {
            if (isObservable(options.selectedItem)) {
                /*jslint unparam:true*/
                grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                    var rows, item;

                    rows = grid.getSelectedRows();
                    item = grid.getDataItem(rows[0]);

                    options.selectedItem(item);
                });
                /*jslint unparam:false*/
            }
        }

        function subscribeToViewport() {
            var top;
            if (isObservable(options.viewport)) {
                grid.onViewportChanged.subscribe(function () {
                    var vp = grid.getViewport();
                    options.viewport(vp);
                });

                options.viewport.subscribe(function (vp) {
                    // stop stack overflow due to unknown issue with slickgrid
                    if (vp.top > top + 2 || vp.top < top -2) {
                        grid.scrollRowIntoView(vp.top);
                        top = vp.top;
                    }
                });
            }
        }

        function subscribeToLayout() {
            if (core.layout && core.layout.onLayoutDone) {
                core.layout.onLayoutDone(function () {
                    grid.resizeCanvas();
                    if (isObservable(options.viewport)) {
                        var vp = grid.getViewport();
                        options.viewport(vp);
                    }
                });
            }
        }

        function createFilter() {
            var evaluateFunc = {
                EqualTo: function(s, v) { return parseFloat(s) === parseFloat(v) },
                GreaterThan: function(s, v) { return parseFloat(s) > parseFloat(v) },
                LessThan: function(s, v) { return parseFloat(s) < parseFloat(v) },
                NotEqualTo: function (s, v) { return parseFloat(s) !== parseFloat(v) },
                In: function (s, v) {
                    s = valueOrDefault(s, "").toString();
                    return v.contains(s);
                },
                Contains: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v) !== -1
                },
                StartsWith: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v) === 0
                },
                EndsWith: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v, s.length - v.length) !== -1
                },
                NotEmpty: function (s) {
                    return has(s) && s !== ""
                }
            }


            function evaluateOperation(e, v) {
                var isValid;
                evaluate = evaluateFunc[e.op];

                if (e.op === "In" || e.op === "NotEmpty") {
                    isValid = evaluate(v, e.values);
                } else {
                    for (var i = 0; i < e.values.length; i += 1) {
                        isValid = evaluate(v, valueOrDefault(e.values[i], "").toString());
                        if (!isValid) break;
                    }
                }

                return isValid;
            }

            filterableColumns.forEach(function (c) {
                var quickSearch = observable();
                c.filter = {
                    type: c.filter.type,
                    quickFilterOp: c.quickFilterOp,
                    value: observable(),
                    quickSearch: quickSearch,
                    values: observable([])
                }
                
                quickSearch.subscribe(function () {
                    //gets the initial list values based on current filters
                    var listValues = options.itemsSource()
                          .where(function (v) {
                              var keep = true;
                              ops = operations.filter(function (o) {
                                  return o.id !== c.id
                              });

                              for (var i = 0; i < ops.length; i++) {
                                  keep = evaluateOperation(ops[i], v[ops[i].id])
                                  if (!keep) break;
                              }
                              return keep;
                          })
                        .distinct(function (r) { if (has(r[c.id])) return r[c.id] })                      
                        .orderBy(comparer(c.id))
                        .select(function (r) {
                            return valueOrDefault(r[c.id], "").toString();
                        });

                    if (quickSearch().values[0]) {
                        s = quickSearch().values[0].toLowerCase();
                        listValues = listValues.where(function (v) {
                            v = v.toLowerCase();

                            if (quickSearch.op === "Contains") {
                                return v.indexOf(s) !== -1;
                            }
                            return v.indexOf(s) === 0
                        });
                    }
                    c.filter.values(listValues.take(50).toArray());
                })
            });
            itemsSource = computed(function () {
                operations = filterableColumns.selectMany(function (c) { return c.filter.value() }, function (c, v) {
                    return {
                        id: c.id,
                        op: v.op,
                        values: v.values
                    };
                }).toArray();
                if (operations.length > 0) {
                    var newItems = options.itemsSource().filter(function (v) {
                        var keep;
                        for (var i = 0; i < operations.length; i++) {
                            keep = evaluateOperation(operations[i], v[operations[i].id])
                            if (!keep) break;
                        }
                        return keep;
                    });
                    return options.sorting ? newItems : newItems.map(function (e, i) {
                        e.index = i;
                        return e;
                    });
                }
                return options.itemsSource();
            });     
        }



        filterableColumns = options.columns.filter(function (c) {
            return c.filter && !isObservable(c.filter.value);
        });

        if (filterableColumns.length > 0) {
            createFilter();
        }

        if (options.sorting === true || (isObservable(options.sorting) && !options.customSort)) {
            internalItemsSource = ko.computed(function () {
                var orderedItems = sortItems(itemsSource(), sortBy());
                orderedItems.forEach(function (o, i) {
                    o.index = i;
                });
                return orderedItems;
            });
        } else {
            internalItemsSource = itemsSource;
        }

        createDataView();
        createGrid();

        subscribeToDataView();
        subscribeToSelection();
        subscribeToOnSort();
        subscribeToViewport();
        subscribeToLayout();
    }

    /*jslint unparam:true*/
    function init(
        element,
        valueAccessor,
        allBindingsAccessor
    ) {
        var b = allBindingsAccessor(),
            options = b.slickGrid;

        slickGrid(element, options);

        return { controlsDescendantBindings: true };
    }
    /*jslint unparam:false*/

    return {
        init: init
    };
});

/*global define*/
define('scalejs.grid-slick',[
    './scalejs.grid-slick/slickGrid',
    'knockout',
    'scalejs.linq-linqjs'
], function (
    slickGrid,
    ko
) {
    

    ko.bindingHandlers.slickGrid = slickGrid;
});


