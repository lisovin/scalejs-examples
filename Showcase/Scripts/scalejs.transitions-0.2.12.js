
/*global define*/
define('scalejs.transitions/activate',[
    //'scalejs!core'
], function (
    //core
) {
    

    return function activate() {
        return function (complete) {
            this.raise('activating', 0);
            complete();
        };
    };
});


/*global define*/
define('scalejs.transitions/animate',[
    'scalejs!core',
    'jQuery'
], function (
    core,
    $
) {
    

    var merge = core.object.merge;


    return function animate(properties, options) {
        return function (complete) {
            var element = this.getElement();

            $(element).animate(properties, merge(options, { complete: complete }));
        };
    };
});


/*global define, console, setTimeout*/
/*jslint unparam:true*/
define('scalejs.transitions/busy',[
    'scalejs!core',
    'jQuery',
    './activate'
], function (
    core,
    $,
    activate
) {
    

    function busy() {
        var complete = core.functional.builders.complete,
            $DO = core.functional.builder.$DO,
            operations = core.array.copy(arguments),
            popup,
            busyCompletable,
            renderElement;

        function showBusy(complete) {
            if (popup) {
                complete();
                return;
            }

            if ($('#panorama-loading').length === 0) {
                $('body').append('<div id="panorama-loading" style="display:none">' +
                    '<img src="images/Loading.png" />' +
                    '<h2 style="margin-left:8px;">LOADING</h2>' +
                    '</div>');
            }

            popup = $('#panorama-loading').bPopup({
                positionStyle: 'fixed',
                speed: 0,
                modal: true,
                modalClose: false,
                opacity: 0,
                onOpen: function () {
                    // onOpen fires right begore popup is open so schedule complete on after it's actually open 
                    setTimeout(function () {
                        complete();
                    }, 0);
                }
            });
        }

        function closeBusy(complete) {
            // Since rendering can take a long time - render it before closing popup
            renderElement();

            // schedule popup close on after the child is rendered
            setTimeout(function () {
                if (popup) {
                    popup.close();
                    popup = null;
                }
            }, 0);

            // call complete when popup is closed
            setTimeout(function () {
                complete();
            }, 0);
        }

        operations.unshift(showBusy, activate());
        operations.push(closeBusy);

        operations.forEach(function (op, i) {
            operations[i] = $DO(op);
        });

        busyCompletable = complete.apply(null, operations);

        return function (complete) {
            renderElement = this.renderElement;
            return busyCompletable.bind(this)(complete);
        };
    }

    function busyUntilInState(state) {
        var waitForState = core.state.onState;
        return busy(activate(), waitForState(state));
    }

    return {
        busy: busy,
        busyUntilInState: busyUntilInState
    };

});
/*jslint unparam:false*/
;
/*global define*/
define('scalejs.transitions/fade',[
    'scalejs!core',
    'jQuery'
], function (
    core,
    $
) {
    

    var merge = core.object.merge,
        get = core.object.get;

    function fadeOut(opts) {
        return function (complete) {
            var element = this.getElement();

            opts = merge(opts, {
                duration: 300,
                effect: 'fade',
                complete: function () {
                    if (get(opts, 'visibility') === 'hidden') {
                        $(element).css('visibility', 'hidden');
                        $(element).show();
                    }

                    complete();
                },
                visibility: 'hidden'
            });

            $(element).hide(opts);
        };
    }

    return {
        fadeOut: fadeOut
    };
});


/*global define*/
define('scalejs.transitions/slide',[
    'scalejs!core',
    'jQuery',
    './animate'
], function (
    core,
    jQuery,
    animate
) {
    

    function slideIn(opts) {
        var complete = core.functional.builders.complete,
            $DO = core.functional.builder.$DO,
            $do = core.functional.builder.$do;

        opts = opts || {};

        return complete(
            $DO(animate({
                opacity: 0,
                left: opts.left || 300
            }, {
                duration: 0
            })),

            $do(function () {
                jQuery(this.getElement()).css('visibility', 'visible');
            }),

            $DO(animate({
                opacity: 1,
                left: 0
            }, {
                duration: 400
            }))
        );
    }

    return {
        slideIn: slideIn
    };
});


/*global define*/
define('scalejs.transitions',[
    'scalejs!core',
    'scalejs.transitions/activate',
    'scalejs.transitions/animate',
    'scalejs.transitions/busy',
    'scalejs.transitions/fade',
    'scalejs.transitions/slide',
    'jQuery',
    'jQuery-ui-effects'
], function (
    core,
    activate,
    animate,
    busy,
    fade,
    slide
) {
    

    core.registerExtension({
        transitions: {
            animate: animate,
            activate: activate,
            busy: busy.busy,
            busyUntilInState: busy.busyUntilInState,
            fadeOut: fade.fadeOut,
            slideIn: slide.slideIn
        }
    });
});

