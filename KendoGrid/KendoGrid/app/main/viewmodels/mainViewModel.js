/*global define, console, setTimeout*/
define([
    '../models/mainModel'
], function (model) {
    'use strict';

    return function (sandbox) {
        var observable = sandbox.mvvm.observable,
            observableArray = sandbox.mvvm.observableArray,
            toViewModel = sandbox.mvvm.toViewModel,
            computed = sandbox.mvvm.computed,
            toJson = sandbox.mvvm.toJson,
            fromViewModel = sandbox.mvvm.fromViewModel,
            toEnumerable = sandbox.linq.enumerable.from,
            items = observableArray([]),
            editItem = observable(),
            //selectedItem = observable(),
            initial,
            myModel,
            columns;
        function isDirty(root, isInitiallyDirty) {
            var result = function () {},
                initialState = observable(toJson(root));

            isInitiallyDirty = observable(isInitiallyDirty);

            result.isDirty = computed(function () {
                return isInitiallyDirty() || initialState() !== toJson(root);
            });

            result.reset = function () {
                initialState(toJson(root));
                isInitiallyDirty(false);
            };

            return result;
        }

        function itemViewModel(item) {
            var viewModel = toViewModel(item);
            //viewModel.isDirty = isDirty(viewModel);

            return viewModel;
        }

        function reset() {
            console.time('tovm');
            var vms = myModel.data;
            //var vms = toEnumerable(myModel.data).select(itemViewModel).toArray();
            console.timeEnd('tovm');
            /*itemsJson = computed(function() {
                if (toEnumerable(items()).any('$.isDirty()')) {
                    return toJson(items());
                }

                return toJson(items());
            });*/
            items(vms);
        }

        function addItem() {
            var record = myModel.newRecord(items().length),
                vm = itemViewModel(record);
            items.push(vm);
            editItem(vm);
        }

        function deleteSelectedItem() {
        }

        function saveItems() {
            myModel.data = toEnumerable(items()).select(fromViewModel).toArray();
            reset();

        }

        function cancelChanges() {
            reset();
        }

        // generate new records
        setTimeout(function () {
            console.time('model');
            myModel = model(sandbox);
            console.timeEnd('model');

            // reset viewmodel
            console.time('reset');
            reset();
            console.timeEnd('reset');
        }, 0);

        columns = sandbox.linq.enumerable.range(1, 10)
            .select('{field: "name_"+$, filterable: true, type: "number"}')
            .toArray();

        return {
            columns: columns,
            items: items,
            editItem: editItem,
            itemsJson: '',
            addItem: addItem,
            deleteItem: deleteSelectedItem,
            saveItems: saveItems,
            cancelChanges: cancelChanges
        };
    };
});
