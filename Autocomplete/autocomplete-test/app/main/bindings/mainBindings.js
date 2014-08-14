/*global define */
/*jslint sloppy: true*/
define({
    'auto': function () {
        return {
            autocomplete: {
                itemsSource: this.names,
                selectedItem: this.selectedItem1
            }
        }
    },
    'auto1': function () {
        return {
            autocomplete: {
                select2: {
                    placeholder: 'Viewmodel Filtering',
                    allowClear: true
                },
                selectedItem: this.selectedItem2,
                queryText: this.userInput2,
                itemsSource: this.itemsToShow,
                textPath: 'text',
                idPath: 'id',
                customFiltering: true
            }
        }
    },
    'auto2': function () {
        return {
            autocomplete: {
                select2: {
                    placeholder: 'Placeholder Text',
                    allowClear: true
                },
                selectedItem: this.selectedItem3,
                queryText: this.userInput3,
                itemsSource: this.namesObservable,
                itemTemplate: "autocomplete_item_template"
            }
        }
    },
    'grouping': function () {
        return {
            autocomplete: {
                select2: {
                    placeholder: 'Grouping',
                    allowClear: true
                },
                itemsSource: this.groupedNames,
                queryText: this.userInput4,
                selectedItem: this.selectedItem4,
                textPath: ['name', 'name', 'id'],
                idPath: ['name', 'name', 'id'],
                childPath: 'members'
            }
        }
    },
    'flare': function () {
        return {
            autocomplete: {
                select2: {
                    placeholder: 'flare.js',
                    allowClear: true
                },
                itemsSource: this.flareData,
                textPath: 'name',
                idPath: 'name',
                childPath: 'children',
                selectedItem: this.selectedItem5,
                queryText: this.userInput5,
                selectGroupNodes: true

            }
        }
    }
});
