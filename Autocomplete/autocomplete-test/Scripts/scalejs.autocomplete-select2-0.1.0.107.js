/*global define, console, document*/
define('scalejs.autocomplete-select2/autocomplete',[
    'scalejs!core',
    'knockout',
    'jQuery',
    'select2',
    'scalejs.mvvm'
], function (
    core,
    ko,
    $
) {
    

    var // Imports
        observable = ko.observable,
        computed = ko.computed,
        unwrap = ko.unwrap,
        isObservable = ko.isObservable,
        merge = core.object.merge,
        is = core.type.is;

    function getProperty(path) {
        if (is(path, 'string')) {
            return path;
        }
        if (is(path, 'array') && path.length > 0) {
            return path[0];
        }
        return undefined;
    }

    // Get the childpath for the next level of heiarchical data
    function getNextProperty(path) {
        if (is(path, 'string')) {
            return path;
        }
        if (is(path, 'array') && path.length > 1) {
            return path.shift(1);
        }
        return undefined;
    }

    // Take an array and return an array compatible with select2
    function mapArray(array, idPath, textPath, childPath, selectGroupNodes) {
        return array.map(function (d) {
            var children,
                id,
                text,
                currentChildPath = getProperty(childPath),
                currentIDPath = getProperty(idPath),
                currentTextPath = getProperty(textPath);

            // ----Proccess text field----
            if (currentTextPath) {
                text = d[currentTextPath];
            } else if (is(d, 'string')) {
                text = d;
            } else { //TODO add isformatted boolean and base this off that
                console.warn('Input has not specified text field');
                text = "No Text Specified";
            }

            // ----Deal with nodes with children----
            if (d.hasOwnProperty(currentChildPath)) {
                children = mapArray(d[currentChildPath], getNextProperty(idPath), getNextProperty(textPath), getNextProperty(childPath), selectGroupNodes);
                if (!selectGroupNodes) {
                    return { text: text, children: children };
                }
            }

            // ----Deal with object nodes----
            id = currentIDPath ? d[currentIDPath] : d;
            if (selectGroupNodes) {
                return { text: text, id: id, children: children };
            }
            return { text: text, id: id };
            
        });
    }

    function initializeSelect2(element, valueAccessor) {

        var // Scope variables
            value = valueAccessor(),
            select2 = value.select2,
            userIsHandlingFormatting,
            createFormatFunction,
            container,
            input,
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
            // Temporary variables
            dummyDiv,
            queryComputed;

        // ----Set up object to pass to select2 with all it's configuration properties----
        if (select2 === undefined) {
            select2 = {};
        }
        // If they passed itemsToShow, display all of them, else let select2 handle the search
        if (customFiltering) {
            select2.query = function (query) {
                if (queryComputed) {
                    queryComputed.dispose();
                }
                queryComputed = computed(function () {
                    data = { results: mapArray(itemsSource(), idpath, textpath, childpath, selectGroupNodes) };
                    if (!is(data.results, 'array')) {
                        console.warn('itemsToShow must return an array');
                        data.results = [];
                    }
                    query.callback(data);
                });
            };
        } else {
            if (isObservable(itemsSource)) {
                select2.data = function () {
                    var results = mapArray(itemsSource(), idpath, textpath, childpath, selectGroupNodes);
                    return { results: results };
                };
            } else if (itemsSource) {// its just a plain array
                select2.data = mapArray(itemsSource, idpath, textpath, childpath, selectGroupNodes);
            }
        }

        // ----handle templating----
        if (itemTemplate) {

            // Create div to render templates inside to get the html to pass to select2
            $('body').append('<div id="dummy_div" data-bind="template: { name: template, data: data }"></div>');
            dummyDiv = document.getElementById("dummy_div");
            $(dummyDiv).hide();

            createFormatFunction = function (templateString) {
                return function (d) {
                    ko.cleanNode(dummyDiv);
                    // Clear Dummy Div html node
                    dummyDiv.innerText = '';
                    // render template with (d)
                    ko.applyBindings({ template: templateString, data: idpath ? d : d.id }, dummyDiv);

                    // give rendered data to select2
                    return dummyDiv.innerHTML;
                };
            };

            select2.formatResult = createFormatFunction(itemTemplate);
            select2.formatSelection = select2.formatResult;

            if (selectedItemTemplate) {
                select2.formatSelection = createFormatFunction(selectedItemTemplate);
            }
            if (!select2.hasOwnProperty('escapeMarkup')) {
                select2.escapeMarkup = function (m) { return m; };
            }
        }

        // Pass all the set up properties to the select2 constructor and instantiate the select2 box
        $(element).select2(select2);

        // Make sure knockout updates correctly
        $(element).on("change", function (o) {
            selectedItem(o.val);
        });

        // ----Handle the user text input----

        container = $(element).select2("container");
        input = $(container).find(".select2-drop .select2-search .select2-input");

        if (userInput) {
            // Push the user input to the viewmodel
            $(input).on("keyup", function () {
                userInput($(input).val());
            });

            // Make sure that the last user input repopulates the input box when reopened
            $(element).on("select2-open", function () {
                $(input).val(userInput());
            });
        }

        // ----Set up the disposal of select2----
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).select2('destroy');
        });
    }

    function init(element, valueAccessor, allBindingsAccessor, viewModel) {
        initializeSelect2(element, valueAccessor, allBindingsAccessor, viewModel);
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


