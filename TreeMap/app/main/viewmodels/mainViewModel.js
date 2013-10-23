/*global define */
define([
    'scalejs!sandbox/main'
], function (
    sandbox
) {
    'use strict';

    return function () {
        var // imports
            observable = sandbox.mvvm.observable,
            observableArray = sandbox.mvvm.observableArray,
            // properties
            counter = 0,
            data = {
                name: 'Favorite Music',
                artists: [{
                    name: 'Pink Floyd',
                    albums: [{
                        name: 'The Dark Side of the Moon',
                        songs: [{
                            name: 'Time',
                            x: observable(1),
                            y: 3
                        }, {
                            name: 'Brain Damage',
                            x: 2,
                            y: 2
                        }, {
                            name: 'Eclipse',
                            x: 3,
                            y: 1
                        }]
                    }, {
                        name: 'The Wall',
                        songs: [{
                            name: 'Comfortably numb',
                            x: 1,
                            y: 3
                        }, {
                            name: 'Hey You',
                            x: 2,
                            y: 2
                        }, {
                            name: 'In the Flesh?',
                            x: 3,
                            y: 1
                        }]
                    }]
                }, {
                    name: 'The Beatles',
                    albums: [{
                        name: 'Abbey Road',
                        songs: observableArray([{
                            name: 'Come Together',
                            x: 1,
                            y: 3
                        }, {
                            name: 'Something',
                            x: 2,
                            y: 2
                        }, {
                            name: 'I Want You',
                            x: 3,
                            y: 1
                        }])
                    }, {
                        name: 'Magical Mystery Tour',
                        songs: [{
                            name: 'The Fool on the Hill',
                            x: 1,
                            y: 3
                        }, {
                            name: 'Strawberry Fields Forever',
                            x: 2,
                            y: 2
                        }, {
                            name: 'All You Need is Love',
                            x: 3,
                            y: 1
                        }]
                    }]
                }]
            };

        return {
            data: data,
            addNode: function () {
                var newSong = {
                    name: 'Carry that Weight',
                    x: 4,
                    y: 5
                };
                data.artists[1].albums[0].songs.push(newSong);
            },
            removeNode: function () {
                data.artists[1].albums[0].songs.pop();
            },
            addTime: function () {
                data.artists[0].albums[0].songs[0].x(data.artists[0].albums[0].songs[0].x() + 1);
            }
        };
    };
});
