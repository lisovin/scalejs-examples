/*global define */
/*jslint sloppy: true*/
define({
    'main-grid': function () {
        return {
            slickGrid: {
                columns: this.columns,
                itemsSource: this.itemsSource,
                enableColumnReorder: false,
                forceFitColumns: true,
                rowHeight: 40,
                showHeaderRow: true,
                sorting: this.sorting,
                multiColumnSort: true
            }
        };
    }
});

