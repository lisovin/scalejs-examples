/*global define,describe,expect,it*/
/*jslint sloppy: true*/
/// <reference path="../Scripts/jasmine.js"/>
define([
    'scalejs!core',
    'knockout',
    'scalejs!application'
], function (core, ko) {
    describe('scalejs.highstock extension', function () {
        it('knockout binding is defined', function () {
            expect(ko.bindingHandlers.highstock).toBeDefined();
        });
    });
});