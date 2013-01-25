/*global define */
/*jslint sloppy: true*/
define({
    'main-grid': function (a) {
        return {
            kendoGrid: {
                //height: 400,
                sortable: true,
                groupable: false, // doesn't work with virtual scrolling
                pageable: false,
                pageSize: 50,
                reorderable: true,
                filterable: true,
                navigatable: true,
                resizable: true,
                columnMenu: true,
                editable: true,
                selectable: 'row',
                //toolbar: 'main_toolbar_template',
                columns: this.columns,
                itemsSource: this.items,
                editItem: this.editItem,
                selectedItem: this.selectedItem,
                scrollable: { virtual: true }
            }
        };
    }
});
