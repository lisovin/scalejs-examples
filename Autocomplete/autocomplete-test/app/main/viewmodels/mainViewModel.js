/*global define */
define([
    'sandbox!main',
    '../models/flare'
], function (
    sandbox,
    flare
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable,
            computed = sandbox.mvvm.computed,
            // properties
            names = ['Nick', 'Nissam', 'Conor', 'Serge', 'Jeremy', 'Peter'],
            groupedNames = [
                {
                    name: "Group 1",
                    members: [
                        {
                            name: "Team 1",
                            members: [
                                { id: 'Nick' },
                                { id: 'Connor' },
                                { id: 'Vinnie' }
                            ]
                        },
                        {
                            name: "Team Awesome",
                            members: [
                                { id: 'Terrence' },
                                { id: 'Jose' }
                            ]
                        }

                    ]
                },
                {
                    name: "Group2",
                    members: [
                        {
                            name: "Team 1",
                            members: [
                                { id: 'Ernie' },
                                { id: 'Dan' },
                                { id: 'Nissam' }
                            ]
                        },
                        {
                            name: "Team 2",
                            members: [
                                { id: 'Greg' }
                            ]
                        }
                            
                    ]
                },
            ],
            namesObservable = observable(names),
            namesInObjs = names.map(function (d) {
                return { id: d, text: d };
            }),
            itemsToShow,
            itemsSource = observable(namesInObjs),
            selectedItem = observable(""),
            selectedItem1 = observable(""),
            selectedItem2 = observable(""),
            selectedItem3 = observable(""),
            selectedItem4 = observable(""),
            selectedItem5 = observable(""),
            userInput2 = observable(""),
            userInput3 = observable(""),
            userInput4 = observable(""),
            userInput5 = observable(""),
            flareData = [flare];

        // Returns all items that have the same first character as the user input
        itemsToShow = computed(function () {
            if (userInput2() !== "") {
                var itemsToShow = names
                    .filter(function (d) {
                        return (d.indexOf(userInput1()[0]) === 0);
                    }).map( function (d) {
                        return { id: d, text: d };
                    });
                return itemsToShow;
            } else {
                return names.map(function (d) {
                    return { id: d, text: d };
                });
            }
        });

        return {
            names: names,
            selectedItem1: selectedItem1,
            selectedItem2: selectedItem2,
            selectedItem3: selectedItem3,
            selectedItem4: selectedItem4,
            selectedItem5: selectedItem5,
            userInput2: userInput2,
            userInput3: userInput3,
            userInput4: userInput4,
            userInput5: userInput5,
            itemsSource: itemsSource,
            itemsToShow: itemsToShow,
            namesObservable: namesObservable,
            groupedNames: groupedNames,
            flareData: flareData
        };
    };
});
