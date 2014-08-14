/*global define, console*/
define('map-items',[
    'scalejs!core'
], function (
    core
) {
    

    var // Imports
        is = core.type.is;

    // Gets the property for the current level from a path.
    function getProperty(path) {
        if (is(path, 'string')) {
            return path;
        }
        if (is(path, 'array') && path.length > 0) {
            return path[0];
        }
        return undefined;
    }

    // Change the path so that it is correct for the next level of data.
    function getNextProperty(path) {
        var newPath;

        if (is(path, 'string')) {
            return path;
        }
        if (is(path, 'array') && path.length > 1) {
            newPath = path.slice();
            // give tail of array as the path for next level of data
            newPath.shift(1);

            return (newPath.length === 1)
                    ? newPath[0]
                    : newPath;
        }
        console.error('malformed data when advancing property', path);
        return undefined;
    }

    // Take an array and return an array compatible with select2
    function mapItems(items, idPath, textPath, childPath, selectGroupNodes) {
        return items.map(function (item) {
            var children,
                id,
                text,
                currentChildPath = getProperty(childPath),
                currentIDPath = getProperty(idPath),
                currentTextPath = getProperty(textPath);

            // ----Proccess text field----
            if (currentTextPath) {
                text = item[currentTextPath];
            } else if (is(item, 'string')) {
                text = item;
            } else {// Not fatal since formatting will make this field useless
                text = "No Text Specified";
            }

            // ----Deal with nodes with children----
            if (item.hasOwnProperty(currentChildPath)) {
                children = mapItems(item[currentChildPath], getNextProperty(idPath), getNextProperty(textPath), getNextProperty(childPath), selectGroupNodes);
                if (!selectGroupNodes) {
                    return { text: text, children: children, original: item };
                }
            }

            // ----Deal with selectable nodes----
            id = currentIDPath ? item[currentIDPath] : item;

            if (selectGroupNodes) {
                return { text: text, id: id, children: children, original: item };
            }
            return { text: text, id: id, original: item };
        });
    }

    return mapItems;
});
/*global define, console, document*/
define('template',[
    'knockout',
    'jQuery'
], function (
    ko,
    $
) {
    

    var // Imports
        cleanNode = ko.cleanNode,
        applyBindings = ko.applyBindings,
        // Variables
        dummyDiv;

    // Create div to render templates inside to get the html to pass to select2, then hide it
    function createDummyDiv() {
        if (dummyDiv === undefined) {
            dummyDiv = document.createElement('div');
            $(dummyDiv).hide();
            dummyDiv.setAttribute("data-bind", "template: { name: template, data: data }");
        }
    }

    function createFormatFunction(templateString) {
        createDummyDiv();
        return function (d) {

            cleanNode(dummyDiv);

            // Clear Dummy Div html node
            while (dummyDiv.firstChild) {
                dummyDiv.removeChild(dummyDiv.firstChild);
            }

            // render template with (d)
            applyBindings({ template: templateString, data: d.original }, dummyDiv);

            // give rendered data to select2
            return dummyDiv.innerHTML;
        };
    }

    return createFormatFunction;
});
/*global define, console*/
define('query',[
    'scalejs!core',
    'knockout',
    'map-items'
], function (
    core,
    ko,
    mapItems
) {
    

    var // Imports
        computed = ko.computed,
        is = core.type.is,
        // Variables
        data,
        queryComputed;

    function createQueryFunction(itemsSource, idpath, textpath, childpath, selectGroupNodes) {
        return function (query) {
            if (queryComputed) {
                queryComputed.dispose();
            }
            queryComputed = computed(function () {
                data = { results: mapItems(itemsSource(), idpath, textpath, childpath, selectGroupNodes) };
                if (!is(data.results, 'array')) {
                    console.warn('itemsToShow must return an array');
                    data.results = [];
                }
                query.callback(data);
            });
        };
    }

    return createQueryFunction;
});
/*global define, console, document*/
define('scalejs.autocomplete-select2/autocomplete',[
    'knockout',
    'map-items',
    'template',
    'query',
    'jQuery',
    'select2',
    'scalejs.mvvm'
], function (
    ko,
    mapItems,
    createFormatFunction,
    createQueryFunction,
    $
) {
    

    var // Imports
        unwrap = ko.unwrap,
        isObservable = ko.isObservable;

    function subscribeToSelectedItem(selectedItem, element) {
        if (isObservable(selectedItem)) {
            $(element).on('select2-selected', function (eventData) {
                selectedItem(eventData.choice.id);
            });

            selectedItem.subscribe(function (newItem) {
                var oldItem = $(element).select2('data');
                if (oldItem) {
                    oldItem = oldItem.id;
                }

                if (newItem !== oldItem) {
                    $(element).select2('data', mapItems([newItem])[0]);
                }
            });
        } else {
            console.error('selectedItem must be an observable');
        }
    }

    function subscribeToUserInput(userInput, element) {
        var container = $(element).select2("container"),
            input = $(container).find(".select2-drop .select2-search .select2-input");

        if (isObservable(userInput)) {
            // Push the user input to the viewmodel
            $(input).on("keyup", function () {
                userInput($(input).val());
            });

            // Make sure that the last user input repopulates the input box when reopened
            $(element).on("select2-open", function () {
                $(input).val(userInput());
            });
        } else {
            console.error('userInput must be an observable');
        }
    }

    function subscribeToReadOnly(readOnly, element) {
        if (isObservable(readOnly)) {
            readOnly.subscribe(function () {
                $(element).select2("readonly", unwrap(readOnly));
            });
        }

        $(element).select2("readonly", unwrap(readOnly));
    }

    function init(element, valueAccessor) {

        var // Scope variables
            value = valueAccessor(),
            select2 = value.select2,
            // Important Values from accessor
            itemsSource =           value.itemsSource,
            itemTemplate =          value.itemTemplate,
            selectedItemTemplate =  value.selectedItemTemplate,
            idpath =                value.idPath,
            textpath =              value.textPath,
            childpath =             value.childPath,
            userInput =             value.queryText,
            selectedItem =          value.selectedItem,
            selectGroupNodes =      value.selectGroupNodes,
            customFiltering =       value.customFiltering,
            readOnly =              value.disabled;

        // ----Set up object to pass to select2 with all it's configuration properties----
        if (select2 === undefined || select2 === null) {
            select2 = {};
        }

        // If customFiltering is enabled, display all of them, else let select2 handle the search
        if (customFiltering) {
            select2.query = createQueryFunction(itemsSource, idpath, textpath, childpath, selectGroupNodes);
        } else {
            if (isObservable(itemsSource)) {
                // Select2 will execute a function passed as a data paramater, and this is the best way to push data through an observable to select2
                select2.data = function () {
                    var results = mapItems(itemsSource(), idpath, textpath, childpath, selectGroupNodes);
                    return { results: results }; // this has to be an object due to this being an undocumented select2 feature
                };
            } else if (itemsSource) {// its just a plain array
                select2.data = mapItems(itemsSource, idpath, textpath, childpath, selectGroupNodes);
            }
        }

        // ----handle templating----
        if (itemTemplate) {

            // Make select2 apply this template to all items
            select2.formatResult = createFormatFunction(itemTemplate);
            select2.formatSelection = select2.formatResult;

            // If the user gave a more specific template for seletcted item, use that instead
            if (selectedItemTemplate) {
                select2.formatSelection = createFormatFunction(selectedItemTemplate);
            }
            // This function is run on the data, and by default removes HTML, so we override it to render our templated HTML
            if (!select2.hasOwnProperty('escapeMarkup')) {
                select2.escapeMarkup = function (m) { return m; };
            }
        }

        // Pass all the set up properties to the select2 constructor and instantiate the select2 box
        $(element).select2(select2);

        if (readOnly !== undefined) {
            subscribeToReadOnly(readOnly, element);
        }

        // Push item selections to viewmodel
        if (selectedItem) {
            subscribeToSelectedItem(selectedItem, element);
        }

        // ----Handle the user text input----
        if (userInput) {
            subscribeToUserInput(userInput, element);
        }

        // ----Set up the disposal of select2----
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).select2('destroy');
        });
    }

    return {
        init: init
    };
});
/*global define*/
define('scalejs.autocomplete-select2',[
    'knockout',
    './scalejs.autocomplete-select2/autocomplete'
], function (
    ko,
    autocomplete
) {
    

    ko.bindingHandlers.autocomplete = autocomplete;
});


