/*global define */
define([
    'sandbox!red',
], function (
    sandbox
) {
    'use strict';

    return function () {
        var observable = sandbox.mvvm.observable,
            raise = sandbox.state.raise,
            detail1 = observable(),
            detail2 = observable(),
            detail3 = observable(),
            detail4 = observable();

        function clicked() {
            console.log('red summary clicked');
            raise('goto.red.detail');
        };

        return {
            clicked: clicked,
            detail1: detail1,
            detail2: detail2,
            detail3: detail3,
            detail4: detail4
        };
    };
});
