/*! Hammer.JS - v1.0.6 - 2014-01-02
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function (window, undefined) {
    

    /**
     * Hammer
     * use this to create instances
     * @param   {HTMLElement}   element
     * @param   {Object}        options
     * @returns {Hammer.Instance}
     * @constructor
     */
    var Hammer = function (element, options) {
        return new Hammer.Instance(element, options || {});
    };

    // default settings
    Hammer.defaults = {
        // add styles and attributes to the element to prevent the browser from doing
        // its native behavior. this doesnt prevent the scrolling, but cancels
        // the contextmenu, tap highlighting etc
        // set to false to disable this
        stop_browser_behavior: {
            // this also triggers onselectstart=false for IE
            userSelect: 'none',
            // this makes the element blocking in IE10 >, you could experiment with the value
            // see for more options this issue; https://github.com/EightMedia/hammer.js/issues/241
            touchAction: 'none',
            touchCallout: 'none',
            contentZooming: 'none',
            userDrag: 'none',
            tapHighlightColor: 'rgba(0,0,0,0)'
        }

        //
        // more settings are defined per gesture at gestures.js
        //
    };

    // detect touchevents
    Hammer.HAS_POINTEREVENTS = window.navigator.pointerEnabled || window.navigator.msPointerEnabled;
    Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

    // dont use mouseevents on mobile devices
    Hammer.MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;
    Hammer.NO_MOUSEEVENTS = Hammer.HAS_TOUCHEVENTS && window.navigator.userAgent.match(Hammer.MOBILE_REGEX);

    // eventtypes per touchevent (start, move, end)
    // are filled by Hammer.event.determineEventTypes on setup
    Hammer.EVENT_TYPES = {};

    // direction defines
    Hammer.DIRECTION_DOWN = 'down';
    Hammer.DIRECTION_LEFT = 'left';
    Hammer.DIRECTION_UP = 'up';
    Hammer.DIRECTION_RIGHT = 'right';

    // pointer type
    Hammer.POINTER_MOUSE = 'mouse';
    Hammer.POINTER_TOUCH = 'touch';
    Hammer.POINTER_PEN = 'pen';

    // touch event defines
    Hammer.EVENT_START = 'start';
    Hammer.EVENT_MOVE = 'move';
    Hammer.EVENT_END = 'end';

    // hammer document where the base events are added at
    Hammer.DOCUMENT = window.document;

    // plugins and gestures namespaces
    Hammer.plugins = Hammer.plugins || {};
    Hammer.gestures = Hammer.gestures || {};

    // if the window events are set...
    Hammer.READY = false;

    /**
     * setup events to detect gestures on the document
     */
    function setup() {
        if (Hammer.READY) {
            return;
        }

        // find what eventtypes we add listeners to
        Hammer.event.determineEventTypes();

        // Register all gestures inside Hammer.gestures
        Hammer.utils.each(Hammer.gestures, function (gesture) {
            Hammer.detection.register(gesture);
        });

        // Add touch events on the document
        Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_MOVE, Hammer.detection.detect);
        Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_END, Hammer.detection.detect);

        // Hammer is ready...!
        Hammer.READY = true;
    }

    Hammer.utils = {
        /**
         * extend method,
         * also used for cloning when dest is an empty object
         * @param   {Object}    dest
         * @param   {Object}    src
         * @parm  {Boolean}  merge    do a merge
         * @returns {Object}    dest
         */
        extend: function extend(dest, src, merge) {
            for (var key in src) {
                if (dest[key] !== undefined && merge) {
                    continue;
                }
                dest[key] = src[key];
            }
            return dest;
        },


        /**
         * for each
         * @param obj
         * @param iterator
         */
        each: function (obj, iterator, context) {
            var i, length;
            // native forEach on arrays
            if ('forEach' in obj) {
                obj.forEach(iterator, context);
            }
                // arrays
            else if (obj.length !== undefined) {
                for (i = 0, length = obj.length; i < length; i++) {
                    if (iterator.call(context, obj[i], i, obj) === false) {
                        return;
                    }
                }
            }
                // objects
            else {
                for (i in obj) {
                    if (obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj) === false) {
                        return;
                    }
                }
            }
        },

        /**
         * find if a node is in the given parent
         * used for event delegation tricks
         * @param   {HTMLElement}   node
         * @param   {HTMLElement}   parent
         * @returns {boolean}       has_parent
         */
        hasParent: function (node, parent) {
            while (node) {
                if (node == parent) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
        },


        /**
         * get the center of all the touches
         * @param   {Array}     touches
         * @returns {Object}    center
         */
        getCenter: function getCenter(touches) {
            var valuesX = [], valuesY = [];

            Hammer.utils.each(touches, function (touch) {
                // I prefer clientX because it ignore the scrolling position
                valuesX.push(typeof touch.clientX !== 'undefined' ? touch.clientX : touch.pageX);
                valuesY.push(typeof touch.clientY !== 'undefined' ? touch.clientY : touch.pageY);
            });

            return {
                pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
                pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
            };
        },


        /**
         * calculate the velocity between two points
         * @param   {Number}    delta_time
         * @param   {Number}    delta_x
         * @param   {Number}    delta_y
         * @returns {Object}    velocity
         */
        getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
            return {
                x: Math.abs(delta_x / delta_time) || 0,
                y: Math.abs(delta_y / delta_time) || 0
            };
        },


        /**
         * calculate the angle between two coordinates
         * @param   {Touch}     touch1
         * @param   {Touch}     touch2
         * @returns {Number}    angle
         */
        getAngle: function getAngle(touch1, touch2) {
            var y = touch2.pageY - touch1.pageY,
              x = touch2.pageX - touch1.pageX;
            return Math.atan2(y, x) * 180 / Math.PI;
        },


        /**
         * angle to direction define
         * @param   {Touch}     touch1
         * @param   {Touch}     touch2
         * @returns {String}    direction constant, like Hammer.DIRECTION_LEFT
         */
        getDirection: function getDirection(touch1, touch2) {
            var x = Math.abs(touch1.pageX - touch2.pageX),
              y = Math.abs(touch1.pageY - touch2.pageY);

            if (x >= y) {
                return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
            }
            else {
                return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
            }
        },


        /**
         * calculate the distance between two touches
         * @param   {Touch}     touch1
         * @param   {Touch}     touch2
         * @returns {Number}    distance
         */
        getDistance: function getDistance(touch1, touch2) {
            var x = touch2.pageX - touch1.pageX,
              y = touch2.pageY - touch1.pageY;
            return Math.sqrt((x * x) + (y * y));
        },


        /**
         * calculate the scale factor between two touchLists (fingers)
         * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
         * @param   {Array}     start
         * @param   {Array}     end
         * @returns {Number}    scale
         */
        getScale: function getScale(start, end) {
            // need two fingers...
            if (start.length >= 2 && end.length >= 2) {
                return this.getDistance(end[0], end[1]) /
                  this.getDistance(start[0], start[1]);
            }
            return 1;
        },


        /**
         * calculate the rotation degrees between two touchLists (fingers)
         * @param   {Array}     start
         * @param   {Array}     end
         * @returns {Number}    rotation
         */
        getRotation: function getRotation(start, end) {
            // need two fingers
            if (start.length >= 2 && end.length >= 2) {
                return this.getAngle(end[1], end[0]) -
                  this.getAngle(start[1], start[0]);
            }
            return 0;
        },


        /**
         * boolean if the direction is vertical
         * @param    {String}    direction
         * @returns  {Boolean}   is_vertical
         */
        isVertical: function isVertical(direction) {
            return (direction == Hammer.DIRECTION_UP || direction == Hammer.DIRECTION_DOWN);
        },


        /**
         * stop browser default behavior with css props
         * @param   {HtmlElement}   element
         * @param   {Object}        css_props
         */
        stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_props) {
            if (!css_props || !element || !element.style) {
                return;
            }

            // with css properties for modern browsers
            Hammer.utils.each(['webkit', 'khtml', 'moz', 'Moz', 'ms', 'o', ''], function (vendor) {
                Hammer.utils.each(css_props, function (prop) {
                    // vender prefix at the property
                    if (vendor) {
                        prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    // set the style
                    if (prop in element.style) {
                        element.style[prop] = prop;
                    }
                });
            });

            // also the disable onselectstart
            if (css_props.userSelect == 'none') {
                element.onselectstart = function () {
                    return false;
                };
            }

            // and disable ondragstart
            if (css_props.userDrag == 'none') {
                element.ondragstart = function () {
                    return false;
                };
            }
        }
    };


    /**
     * create new hammer instance
     * all methods should return the instance itself, so it is chainable.
     * @param   {HTMLElement}       element
     * @param   {Object}            [options={}]
     * @returns {Hammer.Instance}
     * @constructor
     */
    Hammer.Instance = function (element, options) {
        var self = this;

        // setup HammerJS window events and register all gestures
        // this also sets up the default options
        setup();

        this.element = element;

        // start/stop detection option
        this.enabled = true;

        // merge options
        this.options = Hammer.utils.extend(
          Hammer.utils.extend({}, Hammer.defaults),
          options || {});

        // add some css to the element to prevent the browser from doing its native behavoir
        if (this.options.stop_browser_behavior) {
            Hammer.utils.stopDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
        }

        // start detection on touchstart
        Hammer.event.onTouch(element, Hammer.EVENT_START, function (ev) {
            if (self.enabled) {
                Hammer.detection.startDetect(self, ev);
            }
        });

        // return instance
        return this;
    };


    Hammer.Instance.prototype = {
        /**
         * bind events to the instance
         * @param   {String}      gesture
         * @param   {Function}    handler
         * @returns {Hammer.Instance}
         */
        on: function onEvent(gesture, handler) {
            var gestures = gesture.split(' ');
            Hammer.utils.each(gestures, function (gesture) {
                this.element.addEventListener(gesture, handler, false);
            }, this);
            return this;
        },


        /**
         * unbind events to the instance
         * @param   {String}      gesture
         * @param   {Function}    handler
         * @returns {Hammer.Instance}
         */
        off: function offEvent(gesture, handler) {
            var gestures = gesture.split(' ');
            Hammer.utils.each(gestures, function (gesture) {
                this.element.removeEventListener(gesture, handler, false);
            }, this);
            return this;
        },


        /**
         * trigger gesture event
         * @param   {String}      gesture
         * @param   {Object}      [eventData]
         * @returns {Hammer.Instance}
         */
        trigger: function triggerEvent(gesture, eventData) {
            // optional
            if (!eventData) {
                eventData = {};
            }

            // create DOM event
            var event = Hammer.DOCUMENT.createEvent('Event');
            event.initEvent(gesture, true, true);
            event.gesture = eventData;

            // trigger on the target if it is in the instance element,
            // this is for event delegation tricks
            var element = this.element;
            if (Hammer.utils.hasParent(eventData.target, element)) {
                element = eventData.target;
            }

            element.dispatchEvent(event);
            return this;
        },


        /**
         * enable of disable hammer.js detection
         * @param   {Boolean}   state
         * @returns {Hammer.Instance}
         */
        enable: function enable(state) {
            this.enabled = state;
            return this;
        }
    };


    /**
     * this holds the last move event,
     * used to fix empty touchend issue
     * see the onTouch event for an explanation
     * @type {Object}
     */
    var last_move_event = null;


    /**
     * when the mouse is hold down, this is true
     * @type {Boolean}
     */
    var enable_detect = false;


    /**
     * when touch events have been fired, this is true
     * @type {Boolean}
     */
    var touch_triggered = false;


    Hammer.event = {
        /**
         * simple addEventListener
         * @param   {HTMLElement}   element
         * @param   {String}        type
         * @param   {Function}      handler
         */
        bindDom: function (element, type, handler) {
            var types = type.split(' ');
            Hammer.utils.each(types, function (type) {
                element.addEventListener(type, handler, false);
            });
        },


        /**
         * touch events with mouse fallback
         * @param   {HTMLElement}   element
         * @param   {String}        eventType        like Hammer.EVENT_MOVE
         * @param   {Function}      handler
         */
        onTouch: function onTouch(element, eventType, handler) {
            var self = this;

            this.bindDom(element, Hammer.EVENT_TYPES[eventType], function bindDomOnTouch(ev) {
                var sourceEventType = ev.type.toLowerCase();

                // onmouseup, but when touchend has been fired we do nothing.
                // this is for touchdevices which also fire a mouseup on touchend
                if (sourceEventType.match(/mouse/) && touch_triggered) {
                    return;
                }

                    // mousebutton must be down or a touch event
                else if (sourceEventType.match(/touch/) ||   // touch events are always on screen
                  sourceEventType.match(/pointerdown/) || // pointerevents touch
                  (sourceEventType.match(/mouse/) && ev.which === 1)   // mouse is pressed
                  ) {
                    enable_detect = true;
                }

                    // mouse isn't pressed
                else if (sourceEventType.match(/mouse/) && !ev.which) {
                    enable_detect = false;
                }


                // we are in a touch event, set the touch triggered bool to true,
                // this for the conflicts that may occur on ios and android
                if (sourceEventType.match(/touch|pointer/)) {
                    touch_triggered = true;
                }

                // count the total touches on the screen
                var count_touches = 0;

                // when touch has been triggered in this detection session
                // and we are now handling a mouse event, we stop that to prevent conflicts
                if (enable_detect) {
                    // update pointerevent
                    if (Hammer.HAS_POINTEREVENTS && eventType != Hammer.EVENT_END) {
                        count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                    }
                        // touch
                    else if (sourceEventType.match(/touch/)) {
                        count_touches = ev.touches.length;
                    }
                        // mouse
                    else if (!touch_triggered) {
                        count_touches = sourceEventType.match(/up/) ? 0 : 1;
                    }

                    // if we are in a end event, but when we remove one touch and
                    // we still have enough, set eventType to move
                    if (count_touches > 0 && eventType == Hammer.EVENT_END) {
                        eventType = Hammer.EVENT_MOVE;
                    }
                        // no touches, force the end event
                    else if (!count_touches) {
                        eventType = Hammer.EVENT_END;
                    }

                    // store the last move event
                    if (count_touches || last_move_event === null) {
                        last_move_event = ev;
                    }

                    // trigger the handler
                    handler.call(Hammer.detection, self.collectEventData(element, eventType, self.getTouchList(last_move_event, eventType), ev));

                    // remove pointerevent from list
                    if (Hammer.HAS_POINTEREVENTS && eventType == Hammer.EVENT_END) {
                        count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                    }
                }

                // on the end we reset everything
                if (!count_touches) {
                    last_move_event = null;
                    enable_detect = false;
                    touch_triggered = false;
                    Hammer.PointerEvent.reset();
                }
            });
        },


        /**
         * we have different events for each device/browser
         * determine what we need and set them in the Hammer.EVENT_TYPES constant
         */
        determineEventTypes: function determineEventTypes() {
            // determine the eventtype we want to set
            var types;

            // pointerEvents magic
            if (Hammer.HAS_POINTEREVENTS) {
                types = Hammer.PointerEvent.getEvents();
            }
                // on Android, iOS, blackberry, windows mobile we dont want any mouseevents
            else if (Hammer.NO_MOUSEEVENTS) {
                types = [
                  'touchstart',
                  'touchmove',
                  'touchend touchcancel'];
            }
                // for non pointer events browsers and mixed browsers,
                // like chrome on windows8 touch laptop
            else {
                types = [
                  'touchstart mousedown',
                  'touchmove mousemove',
                  'touchend touchcancel mouseup'];
            }

            Hammer.EVENT_TYPES[Hammer.EVENT_START] = types[0];
            Hammer.EVENT_TYPES[Hammer.EVENT_MOVE] = types[1];
            Hammer.EVENT_TYPES[Hammer.EVENT_END] = types[2];
        },


        /**
         * create touchlist depending on the event
         * @param   {Object}    ev
         * @param   {String}    eventType   used by the fakemultitouch plugin
         */
        getTouchList: function getTouchList(ev/*, eventType*/) {
            // get the fake pointerEvent touchlist
            if (Hammer.HAS_POINTEREVENTS) {
                return Hammer.PointerEvent.getTouchList();
            }
                // get the touchlist
            else if (ev.touches) {
                return ev.touches;
            }
                // make fake touchlist from mouse position
            else {
                ev.identifier = 1;
                return [ev];
            }
        },


        /**
         * collect event data for Hammer js
         * @param   {HTMLElement}   element
         * @param   {String}        eventType        like Hammer.EVENT_MOVE
         * @param   {Object}        eventData
         */
        collectEventData: function collectEventData(element, eventType, touches, ev) {
            // find out pointerType
            var pointerType = Hammer.POINTER_TOUCH;
            if (ev.type.match(/mouse/) || Hammer.PointerEvent.matchType(Hammer.POINTER_MOUSE, ev)) {
                pointerType = Hammer.POINTER_MOUSE;
            }

            return {
                center: Hammer.utils.getCenter(touches),
                timeStamp: new Date().getTime(),
                target: ev.target,
                touches: touches,
                eventType: eventType,
                pointerType: pointerType,
                srcEvent: ev,

                /**
                 * prevent the browser default actions
                 * mostly used to disable scrolling of the browser
                 */
                preventDefault: function () {
                    if (this.srcEvent.preventManipulation) {
                        this.srcEvent.preventManipulation();
                    }

                    if (this.srcEvent.preventDefault) {
                        this.srcEvent.preventDefault();
                    }
                },

                /**
                 * stop bubbling the event up to its parents
                 */
                stopPropagation: function () {
                    this.srcEvent.stopPropagation();
                },

                /**
                 * immediately stop gesture detection
                 * might be useful after a swipe was detected
                 * @return {*}
                 */
                stopDetect: function () {
                    return Hammer.detection.stopDetect();
                }
            };
        }
    };

    Hammer.PointerEvent = {
        /**
         * holds all pointers
         * @type {Object}
         */
        pointers: {},

        /**
         * get a list of pointers
         * @returns {Array}     touchlist
         */
        getTouchList: function () {
            var self = this;
            var touchlist = [];

            // we can use forEach since pointerEvents only is in IE10
            Hammer.utils.each(self.pointers, function (pointer) {
                touchlist.push(pointer);
            });

            return touchlist;
        },

        /**
         * update the position of a pointer
         * @param   {String}   type             Hammer.EVENT_END
         * @param   {Object}   pointerEvent
         */
        updatePointer: function (type, pointerEvent) {
            if (type == Hammer.EVENT_END) {
                this.pointers = {};
            }
            else {
                pointerEvent.identifier = pointerEvent.pointerId;
                this.pointers[pointerEvent.pointerId] = pointerEvent;
            }

            return Object.keys(this.pointers).length;
        },

        /**
         * check if ev matches pointertype
         * @param   {String}        pointerType     Hammer.POINTER_MOUSE
         * @param   {PointerEvent}  ev
         */
        matchType: function (pointerType, ev) {
            if (!ev.pointerType) {
                return false;
            }

            var pt = ev.pointerType,
              types = {};
            types[Hammer.POINTER_MOUSE] = (pt === ev.MSPOINTER_TYPE_MOUSE || pt === Hammer.POINTER_MOUSE);
            types[Hammer.POINTER_TOUCH] = (pt === ev.MSPOINTER_TYPE_TOUCH || pt === Hammer.POINTER_TOUCH);
            types[Hammer.POINTER_PEN] = (pt === ev.MSPOINTER_TYPE_PEN || pt === Hammer.POINTER_PEN);
            return types[pointerType];
        },


        /**
         * get events
         */
        getEvents: function () {
            return [
              'pointerdown MSPointerDown',
              'pointermove MSPointerMove',
              'pointerup pointercancel MSPointerUp MSPointerCancel'
            ];
        },

        /**
         * reset the list
         */
        reset: function () {
            this.pointers = {};
        }
    };


    Hammer.detection = {
        // contains all registred Hammer.gestures in the correct order
        gestures: [],

        // data of the current Hammer.gesture detection session
        current: null,

        // the previous Hammer.gesture session data
        // is a full clone of the previous gesture.current object
        previous: null,

        // when this becomes true, no gestures are fired
        stopped: false,


        /**
         * start Hammer.gesture detection
         * @param   {Hammer.Instance}   inst
         * @param   {Object}            eventData
         */
        startDetect: function startDetect(inst, eventData) {
            // already busy with a Hammer.gesture detection on an element
            if (this.current) {
                return;
            }

            this.stopped = false;

            this.current = {
                inst: inst, // reference to HammerInstance we're working for
                startEvent: Hammer.utils.extend({}, eventData), // start eventData for distances, timing etc
                lastEvent: false, // last eventData
                name: '' // current gesture we're in/detected, can be 'tap', 'hold' etc
            };

            this.detect(eventData);
        },


        /**
         * Hammer.gesture detection
         * @param   {Object}    eventData
         */
        detect: function detect(eventData) {
            if (!this.current || this.stopped) {
                return;
            }

            // extend event data with calculations about scale, distance etc
            eventData = this.extendEventData(eventData);

            // instance options
            var inst_options = this.current.inst.options;

            // call Hammer.gesture handlers
            Hammer.utils.each(this.gestures, function (gesture) {
                // only when the instance options have enabled this gesture
                if (!this.stopped && inst_options[gesture.name] !== false) {
                    // if a handler returns false, we stop with the detection
                    if (gesture.handler.call(gesture, eventData, this.current.inst) === false) {
                        this.stopDetect();
                        return false;
                    }
                }
            }, this);

            // store as previous event event
            if (this.current) {
                this.current.lastEvent = eventData;
            }

            // endevent, but not the last touch, so dont stop
            if (eventData.eventType == Hammer.EVENT_END && !eventData.touches.length - 1) {
                this.stopDetect();
            }

            return eventData;
        },


        /**
         * clear the Hammer.gesture vars
         * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
         * to stop other Hammer.gestures from being fired
         */
        stopDetect: function stopDetect() {
            // clone current data to the store as the previous gesture
            // used for the double tap gesture, since this is an other gesture detect session
            this.previous = Hammer.utils.extend({}, this.current);

            // reset the current
            this.current = null;

            // stopped!
            this.stopped = true;
        },


        /**
         * extend eventData for Hammer.gestures
         * @param   {Object}   ev
         * @returns {Object}   ev
         */
        extendEventData: function extendEventData(ev) {
            var startEv = this.current.startEvent;

            // if the touches change, set the new touches over the startEvent touches
            // this because touchevents don't have all the touches on touchstart, or the
            // user must place his fingers at the EXACT same time on the screen, which is not realistic
            // but, sometimes it happens that both fingers are touching at the EXACT same time
            if (startEv && (ev.touches.length != startEv.touches.length || ev.touches === startEv.touches)) {
                // extend 1 level deep to get the touchlist with the touch objects
                startEv.touches = [];
                Hammer.utils.each(ev.touches, function (touch) {
                    startEv.touches.push(Hammer.utils.extend({}, touch));
                });
            }

            var delta_time = ev.timeStamp - startEv.timeStamp
              , delta_x = ev.center.pageX - startEv.center.pageX
              , delta_y = ev.center.pageY - startEv.center.pageY
              , velocity = Hammer.utils.getVelocity(delta_time, delta_x, delta_y)
              , interimAngle
              , interimDirection;

            // end events (e.g. dragend) don't have useful values for interimDirection & interimAngle
            // because the previous event has exactly the same coordinates
            // so for end events, take the previous values of interimDirection & interimAngle
            // instead of recalculating them and getting a spurious '0'
            if (ev.eventType === 'end') {
                interimAngle = this.current.lastEvent && this.current.lastEvent.interimAngle;
                interimDirection = this.current.lastEvent && this.current.lastEvent.interimDirection;
            }
            else {
                interimAngle = this.current.lastEvent && Hammer.utils.getAngle(this.current.lastEvent.center, ev.center);
                interimDirection = this.current.lastEvent && Hammer.utils.getDirection(this.current.lastEvent.center, ev.center);
            }

            Hammer.utils.extend(ev, {
                deltaTime: delta_time,

                deltaX: delta_x,
                deltaY: delta_y,

                velocityX: velocity.x,
                velocityY: velocity.y,

                distance: Hammer.utils.getDistance(startEv.center, ev.center),

                angle: Hammer.utils.getAngle(startEv.center, ev.center),
                interimAngle: interimAngle,

                direction: Hammer.utils.getDirection(startEv.center, ev.center),
                interimDirection: interimDirection,

                scale: Hammer.utils.getScale(startEv.touches, ev.touches),
                rotation: Hammer.utils.getRotation(startEv.touches, ev.touches),

                startEvent: startEv
            });

            return ev;
        },


        /**
         * register new gesture
         * @param   {Object}    gesture object, see gestures.js for documentation
         * @returns {Array}     gestures
         */
        register: function register(gesture) {
            // add an enable gesture options if there is no given
            var options = gesture.defaults || {};
            if (options[gesture.name] === undefined) {
                options[gesture.name] = true;
            }

            // extend Hammer default options with the Hammer.gesture options
            Hammer.utils.extend(Hammer.defaults, options, true);

            // set its index
            gesture.index = gesture.index || 1000;

            // add Hammer.gesture to the list
            this.gestures.push(gesture);

            // sort the list by index
            this.gestures.sort(function (a, b) {
                if (a.index < b.index) { return -1; }
                if (a.index > b.index) { return 1; }
                return 0;
            });

            return this.gestures;
        }
    };


    /**
     * Drag
     * Move with x fingers (default 1) around on the page. Blocking the scrolling when
     * moving left and right is a good practice. When all the drag events are blocking
     * you disable scrolling on that area.
     * @events  drag, drapleft, dragright, dragup, dragdown
     */
    Hammer.gestures.Drag = {
        name: 'drag',
        index: 50,
        defaults: {
            drag_min_distance: 10,

            // Set correct_for_drag_min_distance to true to make the starting point of the drag
            // be calculated from where the drag was triggered, not from where the touch started.
            // Useful to avoid a jerk-starting drag, which can make fine-adjustments
            // through dragging difficult, and be visually unappealing.
            correct_for_drag_min_distance: true,

            // set 0 for unlimited, but this can conflict with transform
            drag_max_touches: 1,

            // prevent default browser behavior when dragging occurs
            // be careful with it, it makes the element a blocking element
            // when you are using the drag gesture, it is a good practice to set this true
            drag_block_horizontal: false,
            drag_block_vertical: false,

            // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
            // It disallows vertical directions if the initial direction was horizontal, and vice versa.
            drag_lock_to_axis: false,

            // drag lock only kicks in when distance > drag_lock_min_distance
            // This way, locking occurs only when the distance has become large enough to reliably determine the direction
            drag_lock_min_distance: 25
        },

        triggered: false,
        handler: function dragGesture(ev, inst) {
            // current gesture isnt drag, but dragged is true
            // this means an other gesture is busy. now call dragend
            if (Hammer.detection.current.name != this.name && this.triggered) {
                inst.trigger(this.name + 'end', ev);
                this.triggered = false;
                return;
            }

            // max touches
            if (inst.options.drag_max_touches > 0 &&
              ev.touches.length > inst.options.drag_max_touches) {
                return;
            }

            switch (ev.eventType) {
                case Hammer.EVENT_START:
                    this.triggered = false;
                    break;

                case Hammer.EVENT_MOVE:
                    // when the distance we moved is too small we skip this gesture
                    // or we can be already in dragging
                    if (ev.distance < inst.options.drag_min_distance &&
                      Hammer.detection.current.name != this.name) {
                        return;
                    }

                    // we are dragging!
                    if (Hammer.detection.current.name != this.name) {
                        Hammer.detection.current.name = this.name;
                        if (inst.options.correct_for_drag_min_distance && ev.distance > 0) {
                            // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
                            // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
                            // It might be useful to save the original start point somewhere
                            var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
                            Hammer.detection.current.startEvent.center.pageX += ev.deltaX * factor;
                            Hammer.detection.current.startEvent.center.pageY += ev.deltaY * factor;

                            // recalculate event data using new start point
                            ev = Hammer.detection.extendEventData(ev);
                        }
                    }

                    // lock drag to axis?
                    if (Hammer.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance <= ev.distance)) {
                        ev.drag_locked_to_axis = true;
                    }
                    var last_direction = Hammer.detection.current.lastEvent.direction;
                    if (ev.drag_locked_to_axis && last_direction !== ev.direction) {
                        // keep direction on the axis that the drag gesture started on
                        if (Hammer.utils.isVertical(last_direction)) {
                            ev.direction = (ev.deltaY < 0) ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
                        }
                        else {
                            ev.direction = (ev.deltaX < 0) ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
                        }
                    }

                    // first time, trigger dragstart event
                    if (!this.triggered) {
                        inst.trigger(this.name + 'start', ev);
                        this.triggered = true;
                    }

                    // trigger normal event
                    inst.trigger(this.name, ev);

                    // direction event, like dragdown
                    inst.trigger(this.name + ev.direction, ev);

                    // block the browser events
                    if ((inst.options.drag_block_vertical && Hammer.utils.isVertical(ev.direction)) ||
                      (inst.options.drag_block_horizontal && !Hammer.utils.isVertical(ev.direction))) {
                        ev.preventDefault();
                    }
                    break;

                case Hammer.EVENT_END:
                    // trigger dragend
                    if (this.triggered) {
                        inst.trigger(this.name + 'end', ev);
                    }

                    this.triggered = false;
                    break;
            }
        }
    };

    /**
     * Hold
     * Touch stays at the same place for x time
     * @events  hold
     */
    Hammer.gestures.Hold = {
        name: 'hold',
        index: 10,
        defaults: {
            hold_timeout: 500,
            hold_threshold: 1
        },
        timer: null,
        handler: function holdGesture(ev, inst) {
            switch (ev.eventType) {
                case Hammer.EVENT_START:
                    // clear any running timers
                    clearTimeout(this.timer);

                    // set the gesture so we can check in the timeout if it still is
                    Hammer.detection.current.name = this.name;

                    // set timer and if after the timeout it still is hold,
                    // we trigger the hold event
                    this.timer = setTimeout(function () {
                        if (Hammer.detection.current.name == 'hold') {
                            inst.trigger('hold', ev);
                        }
                    }, inst.options.hold_timeout);
                    break;

                    // when you move or end we clear the timer
                case Hammer.EVENT_MOVE:
                    if (ev.distance > inst.options.hold_threshold) {
                        clearTimeout(this.timer);
                    }
                    break;

                case Hammer.EVENT_END:
                    clearTimeout(this.timer);
                    break;
            }
        }
    };

    /**
     * Release
     * Called as last, tells the user has released the screen
     * @events  release
     */
    Hammer.gestures.Release = {
        name: 'release',
        index: Infinity,
        handler: function releaseGesture(ev, inst) {
            if (ev.eventType == Hammer.EVENT_END) {
                inst.trigger(this.name, ev);
            }
        }
    };

    /**
     * Swipe
     * triggers swipe events when the end velocity is above the threshold
     * @events  swipe, swipeleft, swiperight, swipeup, swipedown
     */
    Hammer.gestures.Swipe = {
        name: 'swipe',
        index: 40,
        defaults: {
            // set 0 for unlimited, but this can conflict with transform
            swipe_min_touches: 1,
            swipe_max_touches: 1,
            swipe_velocity: 0.7
        },
        handler: function swipeGesture(ev, inst) {
            if (ev.eventType == Hammer.EVENT_END) {
                // max touches
                if (inst.options.swipe_max_touches > 0 &&
                  ev.touches.length < inst.options.swipe_min_touches &&
                  ev.touches.length > inst.options.swipe_max_touches) {
                    return;
                }

                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if (ev.velocityX > inst.options.swipe_velocity ||
                  ev.velocityY > inst.options.swipe_velocity) {
                    // trigger swipe events
                    inst.trigger(this.name, ev);
                    inst.trigger(this.name + ev.direction, ev);
                }
            }
        }
    };

    /**
     * Tap/DoubleTap
     * Quick touch at a place or double at the same place
     * @events  tap, doubletap
     */
    Hammer.gestures.Tap = {
        name: 'tap',
        index: 100,
        defaults: {
            tap_max_touchtime: 250,
            tap_max_distance: 10,
            tap_always: true,
            doubletap_distance: 20,
            doubletap_interval: 300
        },
        handler: function tapGesture(ev, inst) {
            if (ev.eventType == Hammer.EVENT_END && ev.srcEvent.type != 'touchcancel') {
                // previous gesture, for the double tap since these are two different gesture detections
                var prev = Hammer.detection.previous,
                  did_doubletap = false;

                // when the touchtime is higher then the max touch time
                // or when the moving distance is too much
                if (ev.deltaTime > inst.options.tap_max_touchtime ||
                  ev.distance > inst.options.tap_max_distance) {
                    return;
                }

                // check if double tap
                if (prev && prev.name == 'tap' &&
                  (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
                  ev.distance < inst.options.doubletap_distance) {
                    inst.trigger('doubletap', ev);
                    did_doubletap = true;
                }

                // do a single tap
                if (!did_doubletap || inst.options.tap_always) {
                    Hammer.detection.current.name = 'tap';
                    inst.trigger(Hammer.detection.current.name, ev);
                }
            }
        }
    };

    /**
     * Touch
     * Called as first, tells the user has touched the screen
     * @events  touch
     */
    Hammer.gestures.Touch = {
        name: 'touch',
        index: -Infinity,
        defaults: {
            // call preventDefault at touchstart, and makes the element blocking by
            // disabling the scrolling of the page, but it improves gestures like
            // transforming and dragging.
            // be careful with using this, it can be very annoying for users to be stuck
            // on the page
            prevent_default: false,

            // disable mouse events, so only touch (or pen!) input triggers events
            prevent_mouseevents: false
        },
        handler: function touchGesture(ev, inst) {
            if (inst.options.prevent_mouseevents && ev.pointerType == Hammer.POINTER_MOUSE) {
                ev.stopDetect();
                return;
            }

            if (inst.options.prevent_default) {
                ev.preventDefault();
            }

            if (ev.eventType == Hammer.EVENT_START) {
                inst.trigger(this.name, ev);
            }
        }
    };

    /**
     * Transform
     * User want to scale or rotate with 2 fingers
     * @events  transform, pinch, pinchin, pinchout, rotate
     */
    Hammer.gestures.Transform = {
        name: 'transform',
        index: 45,
        defaults: {
            // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
            transform_min_scale: 0.01,
            // rotation in degrees
            transform_min_rotation: 1,
            // prevent default browser behavior when two touches are on the screen
            // but it makes the element a blocking element
            // when you are using the transform gesture, it is a good practice to set this true
            transform_always_block: false
        },
        triggered: false,
        handler: function transformGesture(ev, inst) {
            // current gesture isnt drag, but dragged is true
            // this means an other gesture is busy. now call dragend
            if (Hammer.detection.current.name != this.name && this.triggered) {
                inst.trigger(this.name + 'end', ev);
                this.triggered = false;
                return;
            }

            // atleast multitouch
            if (ev.touches.length < 2) {
                return;
            }

            // prevent default when two fingers are on the screen
            if (inst.options.transform_always_block) {
                ev.preventDefault();
            }

            switch (ev.eventType) {
                case Hammer.EVENT_START:
                    this.triggered = false;
                    break;

                case Hammer.EVENT_MOVE:
                    var scale_threshold = Math.abs(1 - ev.scale);
                    var rotation_threshold = Math.abs(ev.rotation);

                    // when the distance we moved is too small we skip this gesture
                    // or we can be already in dragging
                    if (scale_threshold < inst.options.transform_min_scale &&
                      rotation_threshold < inst.options.transform_min_rotation) {
                        return;
                    }

                    // we are transforming!
                    Hammer.detection.current.name = this.name;

                    // first time, trigger dragstart event
                    if (!this.triggered) {
                        inst.trigger(this.name + 'start', ev);
                        this.triggered = true;
                    }

                    inst.trigger(this.name, ev); // basic transform event

                    // trigger rotate event
                    if (rotation_threshold > inst.options.transform_min_rotation) {
                        inst.trigger('rotate', ev);
                    }

                    // trigger pinch event
                    if (scale_threshold > inst.options.transform_min_scale) {
                        inst.trigger('pinch', ev);
                        inst.trigger('pinch' + ((ev.scale < 1) ? 'in' : 'out'), ev);
                    }
                    break;

                case Hammer.EVENT_END:
                    // trigger dragend
                    if (this.triggered) {
                        inst.trigger(this.name + 'end', ev);
                    }

                    this.triggered = false;
                    break;
            }
        }
    };


    /**
     * enable multitouch on the desktop by pressing the shiftkey
     * the other touch goes in the opposite direction so the center keeps at its place
     * it's recommended to enable Hammer.debug.showTouches for this one
     */
    Hammer.plugins.fakeMultitouch = function () {
        // keeps the start position to keep it centered
        var start_pos = false;

        // test for msMaxTouchPoints to enable this for IE10 with only one pointer (a mouse in all/most cases)
        Hammer.HAS_POINTEREVENTS = navigator.msPointerEnabled &&
          navigator.msMaxTouchPoints && navigator.msMaxTouchPoints >= 1;

        /**
         * overwrites Hammer.event.getTouchList.
         * @param   {Event}     ev
         * @param   TOUCHTYPE   type
         * @return  {Array}     Touches
         */
        Hammer.event.getTouchList = function (ev, eventType) {
            // get the fake pointerEvent touchlist
            if (Hammer.HAS_POINTEREVENTS) {
                return Hammer.PointerEvent.getTouchList();
            }
                // get the touchlist
            else if (ev.touches) {
                return ev.touches;
            }

            // reset on start of a new touch
            if (eventType == Hammer.EVENT_START) {
                start_pos = false;
            }

            // when the shift key is pressed, multitouch is possible on desktop
            // why shift? because ctrl and alt are taken by osx and linux
            if (ev.shiftKey) {
                // on touchstart we store the position of the mouse for multitouch
                if (!start_pos) {
                    start_pos = {
                        pageX: ev.pageX,
                        pageY: ev.pageY
                    };
                }

                var distance_x = start_pos.pageX - ev.pageX;
                var distance_y = start_pos.pageY - ev.pageY;

                // fake second touch in the opposite direction
                return [
                  {
                      identifier: 1,
                      pageX: start_pos.pageX - distance_x - 50,
                      pageY: start_pos.pageY - distance_y + 50,
                      target: ev.target
                  },
                  {
                      identifier: 2,
                      pageX: start_pos.pageX + distance_x + 50,
                      pageY: start_pos.pageY + distance_y - 50,
                      target: ev.target
                  }
                ];
            }
                // normal single touch
            else {
                start_pos = false;
                return [
                  {
                      identifier: 1,
                      pageX: ev.pageX,
                      pageY: ev.pageY,
                      target: ev.target
                  }
                ];
            }
        };
    };

    /**
        * ShowTouches gesture
        * show all touch on the screen by placing elements at there pageX and pageY
        * @param   {Boolean}   [force]
        */
    Hammer.plugins.showTouches = function (force) {
        // the circles under your fingers
        var template_style = 'position:absolute;z-index:9999;left:0;top:0;height:14px;width:14px;border:solid 2px #777;' +
            'background:rgba(255,255,255,.7);border-radius:20px;pointer-events:none;' +
            'margin-top:-9px;margin-left:-9px;';

        // elements by identifier
        var touch_elements = {};
        var touches_index = {};

        /**
            * remove unused touch elements
            */
        function removeUnusedElements() {
            // remove unused touch elements
            for (var key in touch_elements) {
                if (touch_elements.hasOwnProperty(key) && !touches_index[key]) {
                    document.body.removeChild(touch_elements[key]);
                    delete touch_elements[key];
                }
            }
        }

        Hammer.detection.register({
            name: 'show_touches',
            priority: 0,
            handler: function (ev, inst) {
                touches_index = {};

                // clear old elements when not using a mouse
                if (ev.pointerType != Hammer.POINTER_MOUSE && !force) {
                    removeUnusedElements();
                    return;
                }

                // place touches by index
                for (var t = 0, total_touches = ev.touches.length; t < total_touches; t++) {
                    var touch = ev.touches[t];

                    var id = touch.identifier;
                    touches_index[id] = touch;

                    // new touch element
                    if (!touch_elements[id]) {
                        // create new element and attach base styles
                        var template = document.createElement('div');
                        template.setAttribute('style', template_style);

                        // append element to body
                        document.body.appendChild(template);

                        touch_elements[id] = template;
                    }

                    // Paul Irish says that translate is faster then left/top
                    touch_elements[id].style.left = touch.pageX + 'px';
                    touch_elements[id].style.top = touch.pageY + 'px';
                }

                removeUnusedElements();
            }
        });
    };




    // Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
    // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        // define as an anonymous module
        define('hammer',[],function () {
            return Hammer;
        });
        // check for `exports` after `define` in case a build optimizer adds an `exports` object
    }
    else if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = Hammer;
    }
    else {
        window.Hammer = Hammer;
    }
})(this);

/*global define*/
define('scalejs.canvas/utils',[],function () {
    

    var // Object that holds the offset based on size:
        getOffset = {
            left: function (size) {
                return 0;
            },
            top: function (size) {
                return 0;
            },
            center: function (size) {
                return -size / 2;
            },
            right: function (size) {
                return -size;
            },
            bottom: function (size) {
                return -size;
            }
        },
        // Object that holds offset+position data:
        applyOffset = {
            left: function (pos, size) {
                return pos;
            },
            top: function (pos, size) {
                return pos;
            },
            center: function (pos, size) {
                return pos - size / 2;
            },
            right: function (pos, size) {
                return pos - size;
            },
            bottom: function (pos, size) {
                return pos - size;
            }
        };

    return {
        getOffset: getOffset,
        applyOffset: applyOffset
    };
});
/*global define*/
define('scalejs.canvas/group',[
    './utils'
], function (utils) {
    

    return function (canvasObj) {
        function Group(opts) {
            this.type = "group";
            this.className = "group";
            this.parent = opts.parent || canvasObj;
            this.id = opts.id || opts.parent.children.length;
            this.data = opts.data || {};
            this.fontFamily = opts.fontFamily || "";
            this.fontSize = opts.fontSize || 0;
            this.originX = opts.originX || "left";
            this.originY = opts.originY || "top";
            this.left = opts.left || 0;
            this.top = opts.top || 0;
            this.width = opts.width || 0;
            this.height = opts.height || 0;
            this.angle = opts.angle || 0;
            this.scaleX = opts.scaleX || 1;
            this.scaleY = opts.scaleY || 1;
            this.backFill = opts.backFill || "";
            this.opacity = opts.opacity || 1;
            this.offset = { left: 0, top: 0 };
            this.pos = { left: 0, top: 0 };
            this.extents = { left: 0, top: 0, right: 0, bottom: 0 };
            this.children = [];
        }

        Group.prototype.getExtents = function () {
            return this.extents;
        };

        Group.prototype.calcBounds = function () {
            var pFont, pSize;
            // Check if font is set on group:
            if (this.fontFamily && this.fontSize) {
                // Compile font:
                this.font = this.fontSize + "px " + this.fontFamily;
                if (this.font !== canvasObj.curFont) {
                    pFont = canvasObj.curFont;
                    pSize = canvasObj.curFontSize;
                    canvasObj.context.save();
                    canvasObj.context.font = this.font;
                    canvasObj.curFont = this.font;
                    canvasObj.curFontSize = this.fontSize;
                } 
            } else {
                this.font = undefined;
            }

            // Calculate children's boundaries and parameters:
            for (var i = 0; i < this.children.length; i++) this.children[i].calcBounds();

            if (pFont) {
                canvasObj.curFont = pFont;
                canvasObj.curFontSize = pSize;
                canvasObj.context.restore();
            }

            this.offset.left = utils.getOffset[this.originX](this.width);
            this.offset.top = utils.getOffset[this.originY](this.height);
            this.pos.left = this.left + this.offset.left;
            this.pos.top = this.top + this.offset.top;
            this.radianAngle = this.angle * Math.PI / 180;
        };

        Group.prototype.render = function () {
            if (this.opacity <= 0) return;
            canvasObj.context.save();   // Required to restore transform matrix after the following render:
            this.opacity < 1 && (canvasObj.context.globalAlpha *= this.opacity);
            canvasObj.context.translate(this.pos.left, this.pos.top);   // Set group center.
            canvasObj.context.scale(this.scaleX, this.scaleY);  // Scale group at center.
            canvasObj.context.rotate(this.radianAngle);   // Rotate group at center.
            if (this.backFill && this.width > 0 && this.height > 0) {
                canvasObj.context.fillStyle = this.backFill;
                canvasObj.context.fillRect(0, 0, this.width, this.height);
            }
            if (this.font && this.font !== canvasObj.curFont) {    // Set font if a global font is set.
                // Save previous family and size:
                var pFont = canvasObj.curFont,
                    pFontSize = canvasObj.curFontSize;
                // Set font and family and size:
                canvasObj.context.font = this.font;
                //canvasObj.context.fontFamily = this.fontFamily;
                canvasObj.curFont = this.font;
                canvasObj.curFontSize = this.fontSize;
                // Render children:
                for (var i = 0; i < this.children.length; i++) this.children[i].render();
                // Restore family and size:
                canvasObj.curFont = pFont;
                canvasObj.curFontSize = pFontSize;
            } else {
                // Render children:
                for (var i = 0; i < this.children.length; i++) this.children[i].render();
            }
            canvasObj.context.restore();
        };

        Group.prototype.isPointIn = function (posX, posY, event) {
            // Remove translate:
            posX -= this.pos.left;
            posY -= this.pos.top;
            // Remove scale:
            posX /= this.scaleX;
            posY /= this.scaleY;
            // Remove rotate:
            var sin = Math.sin(-this.radianAngle),
                cos = Math.cos(-this.radianAngle),
                tposX = posX;
            posX = posX * cos - posY * sin;
            posY = tposX * sin + posY * cos;
            // Loop through all children and check if the point is in:
            if (this.backFill) {
                return posX >= 0 && posY >= 0 && posX <= this.width && posY <= this.height;
            }
            // Check if point in children:
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].isPointIn(posX, posY, event)) return true;
            }
            return false;
            // Use the last extents (as it was last visible to user for click event):
            //return posX >= this.extents.left && posY >= this.extents.top && posX <= this.extents.right && posY <= this.extents.bottom;
        };

        Group.prototype.touchEventHandler = function (posX, posY, event) {
            // Translate position:
            //canvasObj.context.translate(this.pos.left, this.pos.top);
            posX -= this.pos.left;
            posY -= this.pos.top;
            // Scale Position:
            //canvasObj.context.scale(1 / this.scaleX, 1 / this.scaleY);
            posX /= this.scaleX;
            posY /= this.scaleY;
            // Rotate position:
            //canvasObj.context.rotate(-this.radianAngle);
            var sin = Math.sin(-this.radianAngle),
                cos = Math.cos(-this.radianAngle),
                tposX = posX;
            posX = posX * cos - posY * sin;
            posY = tposX * sin + posY * cos;
            // Loop through all children and check if they have been clicked:
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].isPointIn(posX, posY, event)) {
                    this.children[i].touchEventHandler(posX, posY, event);
                }
            }
            this[event.name] && this[event.name](this.data.data);
        };

        Group.prototype.remove = function () {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        };

        return Group;
    };
});
/*global define*/
define('scalejs.canvas/rect',[
    './utils'
], function (utils) {
    

    return function (canvasObj) {
        function Rect(opts) {
            this.type = "obj";
            this.className = "rect";
            this.parent = opts.parent || canvasObj;
            this.id = opts.id || opts.parent.children.length;
            this.data = opts.data || {};
            this.originX = opts.originX || "left";
            this.originY = opts.originY || "top";
            this.left = opts.left || 0;
            this.top = opts.top || 0;
            this.width = opts.width || 0;
            this.height = opts.height || 0;
            this.fill = opts.fill || "#000";
            this.offset = { left: 0, top: 0 };
            this.pos = { left: 0, top: 0 };
            this.extents = { left: 0, top: 0, right: 0, bottom: 0 };
        }

        Rect.prototype.getExtents = function () {
            return this.extents;
        };

        Rect.prototype.calcBounds = function () {
            // Calculate boundaries and additional parameters:
            this.offset.left = utils.getOffset[this.originX](this.width);
            this.offset.top = utils.getOffset[this.originY](this.height);
            this.pos.left = this.left + this.offset.left;
            this.pos.top = this.top + this.offset.top;
            this.extents.left = this.pos.left;
            this.extents.top = this.pos.top;
            this.extents.right = this.pos.left + this.width;
            this.extents.bottom = this.pos.top + this.height;
        };

        Rect.prototype.render = function () {
            if (this.width > 0 && this.height > 0) {
                //canvasObj.context.save();
                canvasObj.context.fillStyle = this.fill;
                canvasObj.context.fillRect(this.pos.left, this.pos.top, this.width, this.height);
                //canvasObj.context.restore();
            }
        };

        Rect.prototype.isPointIn = function (posX, posY, event) {
            // Use the last extents (as it was last visible to user for click event):
            return posX >= this.extents.left && posY >= this.extents.top && posX <= this.extents.right && posY <= this.extents.bottom;
        };

        Rect.prototype.touchEventHandler = function (posX, posY, event) {
            this[event.name] && this[event.name](this.data.data);
        };

        Rect.prototype.remove = function () {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        };

        return Rect;
    };
});
/*global define*/
define('scalejs.canvas/text',[
    './utils'
], function (utils) {
    

    return function (canvasObj) {
        function Text(opts) {
            this.type = "obj";
            this.className = "text";
            this.parent = opts.parent || canvasObj;
            this.id = opts.id || opts.parent.children.length;
            this.data = opts.data || {};
            this.fontFamily = opts.fontFamily || "";//"Times New Roman";
            this.fontSize = opts.fontSize || 0;//40;
            this.text = opts.text || "";
            this.originX = opts.originX || "left";
            this.originY = opts.originY || "top";
            this.left = opts.left || 0;
            this.top = opts.top || 0;
            this.width = opts.width || 0;
            this.height = opts.height || 0;
            this.angle = opts.angle || 0;
            this.fill = opts.fill || "#000";
           // this.opacity = opts.opacity || 1;
            this.offset = { left: 0, top: 0 };
            this.pos = { left: 0, top: 0 };
            this.extents = { left: 0, top: 0, right: 0, bottom: 0 };
        }

        Text.prototype.opacity = 1;

        Text.prototype.setText = function (text) {
            // Compile font:
            if (this.fontFamily && this.fontSize) {
                this.font = this.fontSize + "px " + this.fontFamily;
                this.height = this.fontSize;
            } else {
                this.font = undefined;
                this.height = canvasObj.curFontSize;
            }
            // Check if text or font has changed, if so get width:
            if (this.font && (this.font !== this.calcFont || this.calcText !== this.text)) {
                canvasObj.context.save();
                canvasObj.context.font = this.font;
                this.text = text;
                this.width = canvasObj.context.measureText(text || "").width;
                canvasObj.context.restore();
                this.calcText = this.text;
                this.calcFont = this.font;
            } else if (!this.font && (canvasObj.curFont !== this.calcFont || this.calcText !== this.text)) {
                this.text = text;
                this.width = canvasObj.context.measureText(text || "").width;
                this.calcText = this.text;
                this.calcFont = canvasObj.curFont;
            }
        };

        Text.prototype.getExtents = function () {
            return this.extents;
        };

        Text.prototype.calcBounds = function () {
            // Calculate boundaries and additional parameters:
            this.setText(this.text);
            this.offset.left = utils.getOffset[this.originX](this.width);
            this.offset.top = utils.getOffset[this.originY](this.height) + this.height;
            this.pos.left = this.left + this.offset.left;
            this.pos.top = this.top + this.offset.top;
            this.extents.left = this.pos.left;
            this.extents.right = this.pos.left;
            this.extents.top = this.pos.top + this.width;
            this.extents.bottom = this.pos.top + this.height;
        };

        Text.prototype.render = function () {
            // Only render if text is visible (saves time):
            if (this.opacity > 0 && this.text.length > 0) {
                canvasObj.context.save();   // Required to restore transform matrix after the following render:
                this.font && this.font !== canvasObj.curFont && (canvasObj.context.font = this.font);
                this.fill && (canvasObj.context.fillStyle = this.fill);
                this.opacity < 1 && (canvasObj.context.globalAlpha *= this.opacity);
                canvasObj.context.translate(this.left, this.top);   // Set center.
                this.angle && canvasObj.context.rotate(this.angle * Math.PI / 180);   // Rotate text around center.
                canvasObj.context.fillText(this.text, this.offset.left, this.offset.top);   // Draw text at offset pos.
                canvasObj.context.restore();
            }
        };

        Text.prototype.isPointIn = function (posX, posY, event) {
            // Use the last extents (as it was last visible to user for click event):
            return posX >= this.extents.left && posY >= this.extents.top && posX <= this.extents.right && posY <= this.extents.bottom;
        };

        Text.prototype.touchEventHandler = function (posX, posY, event) {
            this[event.name] && this[event.name](this.data.data);
        };

        Text.prototype.remove = function () {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        };

        return Text;
    };
});
/*global define*/
define('scalejs.canvas/arc',[
    './utils'
], function (utils) {
    

    var deg90InRad = Math.PI * 0.5; // 90 degrees in radians.

    return function (canvasObj) {
        function Arc(opts) {
            this.type = "obj";
            this.className = "arc";
            this.parent = opts.parent || canvasObj;
            this.id = opts.id || opts.parent.children.length;
            this.data = opts.data || {};
            this.originX = opts.originX || "center";
            this.originY = opts.originY || "center";
            this.left = opts.left || 0;
            this.top = opts.top || 0;
            this.width = opts.width || 0;
            this.height = opts.height || 0;
            this.radius = 0;
            this.innerRadius = opts.innerRadius || 0;
            this.outerRadius = opts.outerRadius || 0;
            this.thickness = 0;
            this.startAngle = opts.startAngle || 0;
            this.endAngle = opts.endAngle || 0;
            this.fill = opts.fill || "#000";
            this.opacity = opts.opacity || 1;
            this.offset = { left: 0, top: 0 };
            this.pos = { left: 0, top: 0 };
            this.extents = { left: 0, top: 0, right: 0, bottom: 0 };
        }

        Arc.prototype.getExtents = function () {
            return this.extents;
        };

        Arc.prototype.calcBounds = function () {
            // Calculate boundaries and additional parameters:
            this.width = this.height = this.outerRadius * 2;
            this.offset.left = this.left;//utils.applyOffset[this.originX](this.left, this.width) + this.width;
            this.offset.top = this.top;//utils.applyOffset[this.originY](this.top, this.height) + this.height;
            this.extents.left = this.offset.left - this.outerRadius;
            this.extents.right = this.offset.left + this.outerRadius;
            this.extents.top = this.offset.top - this.outerRadius;
            this.extents.bottom = this.offset.top + this.outerRadius;
            this.thickness = this.outerRadius - this.innerRadius;
            this.radius = this.thickness / 2 + this.innerRadius;
        };

        Arc.prototype.render = function () {
            if (this.opacity > 0 && this.thickness !== 0 && this.endAngle !== this.startAngle) {
                //canvasObj.context.save();
                canvasObj.context.beginPath();
                this.fill && (canvasObj.context.strokeStyle = this.fill);
                this.opacity < 1 && (canvasObj.context.globalAlpha *= this.opacity);
                canvasObj.context.lineWidth = this.thickness;
                canvasObj.context.arc(this.offset.left, this.offset.top, this.radius, this.startAngle - deg90InRad, this.endAngle - deg90InRad);
                canvasObj.context.stroke();
                //canvasObj.context.restore();
            }
        };

        Arc.prototype.isPointIn = function (posX, posY, event) {
            // Use the last extents (as it was last visible to user for click event):
            var distance = (posX - this.offset.left) * (posX - this.offset.left) + (posY - this.offset.top) * (posY - this.offset.top), // Distance from point to arc center.
                angle = Math.atan2(posY - this.offset.top, posX - this.offset.left) + deg90InRad;   // Angle from +x axis to arc center to pointer.
            if (angle < 0) {
                angle += 2 * Math.PI;   // This is to fix the differences in d3 start/end angle and canvas's.
                // d3 has: [0, 2 * Math.PI], which starts from and goes to (+)y-axis.
                // canvas has: [-Math.PI, Math.PI], which starts from and goes to (-)x-axis.
            }
            return distance <= this.outerRadius * this.outerRadius && distance >= this.innerRadius * this.innerRadius && angle >= this.startAngle && angle <= this.endAngle;
        };

        Arc.prototype.touchEventHandler = function (posX, posY, event) {
            this[event.name] && this[event.name](this.data.data);
        };

        Arc.prototype.remove = function () {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        };

        return Arc;
    };
});
/*global define*/
define('scalejs.canvas/selector',[
    './group',
    './rect',
    './text',
    './arc'
], function (
    Group,
    Rect,
    Text,
    Arc
) {
    

    // Get requestAnimationFrame function based on which browser:
    var requestAnimFrame = window.requestAnimationFrame ||
                           window.webkitRequestAnimationFrame ||
                           window.mozRequestAnimationFrame ||
                           function (callback) {
                               window.setTimeout(callback, 1000 / 60);
                               return true; // return something for requestFrameID
                           };

    return function (canvasObj) {
        // Object that holds all object type constructors:
        var createObject = {
                group: Group(canvasObj),
                rect: Rect(canvasObj),
                text: Text(canvasObj),
                arc: Arc(canvasObj)
            },
            canvasSelector;

        function Selector(opts) {
            this.isTransition = opts.isTransition || false;
            this.durationTime = opts.durationTime || 250;
            this.easeFunc = opts.easeFunc || function (t) { return t; };
            this.endFunc = undefined;
            this.object = opts.object || canvasObj;
            this.objects = opts.objects || [];
            this.enterObjects = opts.enterObjects || [];
            this.updateObjects = opts.updateObjects || [];
            this.exitObjects = opts.exitObjects || [];
        }

        Selector.prototype.select = function (objectClassName) {
            var firstObj = [],
                object,
                i, j;
            // Get first object with the class that matches objectClassName, from each object in objects:
            for (i = 0; i < this.objects.length; i++) {
                object = this.objects[i];
                // Check to see if object has children:
                if (object.children !== undefined && object.children.length > 0) {
                    // Look for first child with the specified class:
                    for (j = 0; j < object.children.length; j++) {
                        if (object.children[j].className === objectClassName) {
                            firstObj.push(object.children[j]);
                            break;
                        }
                    }
                }
            }
            // Return a new selector with the first matching class in each object:
            return new Selector({
                isTransition: this.isTransition,
                durationTime: this.durationTime,
                easeFunc: this.easeFunc,
                object: firstObj.length > 0 ? firstObj[0].parent : (this.objects.length > 0 ? this.objects[0] : this.object), //Should rework this to accept more than one parent...
                objects: firstObj
            });
        };

        Selector.prototype.selectAll = function (objectClassName) {
            var objs = [],
                object,
                i, j;
            // Get all objects with class name as objectClassName:
            for (i = 0; i < this.objects.length; i++) {
                object = this.objects[i];
                // Check to see if object has children:
                if (object.children !== undefined && object.children.length > 0) {
                    // Loop through object's children:
                    for (j = 0; j < object.children.length; j++) {
                        if (object.children[j].className === objectClassName) {
                            objs.push(object.children[j]);  // Found, append to objs.
                        }
                    }
                }
            }
            // Return a new selector with all objects matching objectClassName:
            return new Selector({
                isTransition: this.isTransition,
                durationTime: this.durationTime,
                easeFunc: this.easeFunc,
                object: objs.length > 0 ? objs[0].parent : (this.objects.length > 0 ? this.objects[0] : this.object), //Should rework this to accept more than one parent...
                objects: objs
            });
        };

        Selector.prototype.filter = function (filterFunc) {
            var objs = [];
            // Get all objects where filterFunc returns true:
            for (var i = 0; i < this.objects.length; i++) {
                // Check if object should be added to new selector:
                if (filterFunc.call(this.objects[i], this.objects[i].data.data)) {
                    objs.push(this.objects[i]);
                }
            }
            // Return a new selector with all objects matching objectClassName:
            return new Selector({
                isTransition: this.isTransition,
                durationTime: this.durationTime,
                easeFunc: this.easeFunc,
                object: objs.length > 0 ? objs[0].parent : (this.objects.length > 0 ? this.objects[0] : this.object), //Should rework this to accept more than one parent...
                objects: objs
            });
        };

        Selector.prototype.data = function (nodes, keyFunc) {
            // TODO FINISH
            // Data is applied to those objects within the selection only!
            // Each time this is called, it checks against the objects var.
            //   If object with datakey exists in dataArray, it is kept in objects var.
            //   If a data's key doesn't have an object associated with it, the data is added in enterObjects var.
            //   If object's datakey isn't in dataArray, then the object is added to exitObjects var.
            // If nodes is a function, each object retrieves its data from nodes(curData)!
            // Else nodes contains the array of data for the objects.
            // TEMP FIX:
            // Generate a table filled with the nodes:
            var nodeTable = {};
            for (var i = 0; i < nodes.length; i++) {
                var key = keyFunc(nodes[i]);
                nodes[i] = {
                    id: key,
                    data: nodes[i]
                };
                nodeTable[key] = nodes[i];
            }
            // Populate the objects, updateObjects and exitObjects arrays:
            this.exitObjects = [];
            this.updateObjects = this.objects;
            this.objects = [];
            for (var i = 0; i < this.updateObjects.length; i++) {
                if (nodeTable[this.updateObjects[i].data.id]) {
                    this.updateObjects[i].data.data = nodeTable[this.updateObjects[i].data.id].data;
                    nodeTable[this.updateObjects[i].data.id] = undefined;
                    this.objects.push(this.updateObjects[i]);
                } else {
                    this.exitObjects.push(this.updateObjects[i]);
                    this.updateObjects.splice(i, 1);
                    i--;
                }
            }
            // Populate enterObjects array:
            for (var i = 0; i < nodes.length; i++) {
                if (!nodeTable[nodes[i].id]) {
                    nodes.splice(i, 1);
                    i--;
                }
            }
            this.enterObjects = nodes;
            // Return current selection (update selection):
            // TODO: Return new selection.
            return this;
        };

        Selector.prototype.enter = function () {
            // TODO FINISH
            // Returns enterObjects custom selector, with it's parent as this selector.
            // The selector adds exitObjects to the objects list of this selector when it appends (only function supported with this yet).
            return {
                parentSelector: this,
                append: function (objectClassName, opts) {
                    opts = opts || {};
                    return new Selector({
                        isTransition: this.parentSelector.isTransition,
                        durationTime: this.parentSelector.durationTime,
                        easeFunc: this.parentSelector.easeFunc,
                        objects: this.parentSelector.enterObjects.map(function (object) {
                            opts.parent = this.parentSelector.object;  // Set parent of child to object.
                            opts.data = object;    // Pass data to child!
                            var newObj = new createObject[objectClassName](opts);   // Create child.
                            this.parentSelector.object.children.push(newObj);  // Add child to object.
                            return newObj;  // Add child to new selector.
                        }, this)
                    });
                }
            };
            // Rethink selectors in order to properly append items into the right parents!
        };

        Selector.prototype.update = function () {
            // Returns selector with updateObjects as objects:
            var newSelector = new Selector(this);
            newSelector.objects = this.updateObjects;
            return newSelector;
        }

        Selector.prototype.exit = function () {
            // TODO FINISH
            // Returns exitObjects custom selector, with it's parent as this selector.
            // The selector removes exitObjects from the objects list of this selector when it removes (only function supported with this yet).
            var newSelector = new Selector(this);
            newSelector.objects = this.exitObjects;
            return newSelector;
        };

        Selector.prototype.on = function (eventName, eventFunc) {
            // Map given name to internal property:
            eventName = "on" + eventName;
            // Add property to every object in selector:
            this.objects.forEach(function (object) {
                object[eventName] = eventFunc;
            });
            return this;
        };

        Selector.prototype.append = function (objectClassName, opts) {
            opts = opts || {};  // Make sure opts exists.
            // Return a new selector of all appended objects:
            var newSelector = new Selector(this);
            newSelector.objects = this.objects.map(function (object) { // For each object in selector, append a new object:
                opts.parent = object;       // Set parent of child to object.
                opts.data = object.data;    // Pass data to child!
                var newObj = new createObject[objectClassName](opts);   // Create child.
                object.children.push(newObj);   // Add child to object.
                return newObj;  // Add child to new selector.
            });
            return newSelector;
        };

        Selector.prototype.remove = function () {
            // Loop through all objects, and remove them from their individual parent:
            this.objects.forEach(function (object) {
                object.parent.children.splice(object.parent.children.indexOf(object), 1);
            });
            // Reset selector's objects list:
            this.objects = [];
            return this;
            // TODO: Read d3 docs on what to return!
        };

        Selector.prototype.attr = function (attrName, attrVal) {
            this.objects.forEach(function (object) {
                if (attrVal instanceof Function) {
                    attrVal = attrVal.call(object, object.data.data);
                }
                if (object["set" + attrName] instanceof Function) {
                    object["set" + attrName](attrVal);
                } else {
                    object[attrName] = attrVal;
                }
            });
            return this;
        };

        Selector.prototype.sort = function (compFunc) {
            // Sort objects in selection:
            this.objects.sort(function (a, b) {
                return compFunc(a.data.data, b.data.data);
            });
            return this;
        };

        Selector.prototype.order = function () {
            // Apply object order in selection to render scene:
            this.objects.forEach(function (object) {
                // First start by removing the objects:
                object.parent.children.splice(object.parent.children.indexOf(object), 1);
                // Then put it back at the end:
                object.parent.children.push(object);
            });
            return this;
        };

        Selector.prototype.each = function (func, listener) {
            // Execute a given function for each object:
            if (listener === undefined || listener === "start") {
                this.objects.forEach(function (object) { func.call(object, object.data.data); });
            } else if (listener === "end") {
                this.objects.forEach(function (object) { object.tweenEndFunc = func; });
                //this.endFunc = func;
            }
            return this;
        };

        Selector.prototype.transition = function () {
            // Return a new selector with the first matching class in each object:
            var newSelector = new Selector(this);
            newSelector.isTransition = true;
            newSelector.objects.forEach(function (object) { object.tweenEndFunc = undefined; });
            return newSelector;
        };

        Selector.prototype.duration = function (ms) {
            // Set selector's duration of a transition:
            this.durationTime = ms;
            return this;
        };

        Selector.prototype.ease = function (type) {
            // Set selector's ease function:
            this.easeFunc = type;
            return this;
        };

        Selector.prototype.tween = function (tweenName, tweenFunc) {
            // TODO: Register tweenFunc for all objects in this selector.
            // Setup timeout:
            var timeStart = new Date().getTime(),
                timeEnd = timeStart + this.durationTime,
                object,
                i;
            // Register object on canvas's animation array. If object already is there, then replace the current tween.
            for (i = 0; i < this.objects.length; i++) {
                object = this.objects[i];
                // TODO: Make animation's ID based to test speed.
                if (!(object.animationIndex >= 0)) {
                    object.animationIndex = canvasObj.animations.length;
                    canvasObj.animations[object.animationIndex] = object;
                }
                object.tweenFunc = tweenFunc.call(object, object.data.data);
                object.easeFunc = this.easeFunc;
                object.timeStart = timeStart;
                object.timeEnd = timeEnd;
                object.duration = this.durationTime;
            }
            if (canvasObj.requestFrameID === undefined && canvasObj.animations.length > 0) {
                canvasObj.requestFrameID = requestAnimFrame(function () { canvasObj.onAnimationFrame(); });
            }
            return this;
        };

        Selector.prototype.startRender = function () { }; // This function is a temp fix to render the canvas!

        Selector.prototype.pumpRender = function () {
            // This function is a temp fix to render the canvas!
            canvasObj.pumpRender();
            return canvasSelector;
        };

        canvasSelector = new Selector({
            objects: [canvasObj]
        });
        canvasSelector[0] = [canvasObj.element]; // Temp Fix to access element!

        return canvasSelector;
    };
});
/*global define*/
define('scalejs.canvas/canvas',[
    'hammer',
    './selector'
], function (
    hammer,
    selector
) {
    

    // Get requestAnimationFrame function based on which browser:
    var requestAnimFrame = window.requestAnimationFrame ||
                           window.webkitRequestAnimationFrame ||
                           window.mozRequestAnimationFrame ||
                           function (callback) {
                               window.setTimeout(callback, 1000 / 60);
                               return true; // return something for requestFrameID
                           };

    function canvas(element) {
        this.type = "canvas";
        this.className = "canvas";
        this.element = element;
        this.context = element.getContext("2d");
        this.parent = this;
        this.width = element.width;
        this.height = element.height;
        this.children = [];
        this.animations = [];
        this.requestFrameID = undefined;
        this.curFont = "";
        this.curFontSize = 0;
    }

    canvas.prototype.setwidth = function (width) {
        this.element.width = width;
        this.width = width;
    };

    canvas.prototype.setheight = function (height) {
        this.element.height = height;
        this.height = height;
    };

    canvas.prototype.onAnimationFrame = function () {
        // Check if there is anything to animate:
        if (this.animations.length <= 0 || this.width <= 0 || this.height <= 0) {   // Width and height check can be removed if animations MUST be called. This was originally added since d3 had issues.
            this.requestFrameID = undefined;
            return;
        }
        // Request to call this function on next frame (done before rendering to make animations smoother):
        var thisCanvas = this;
        this.requestFrameID = requestAnimFrame(function () { thisCanvas.onAnimationFrame(); }); // Encapsulate onAnimationFrame to preserve context.
        // Get current time to test if animations are over:
        var curTime = new Date().getTime(),
            animation;
        // Execute all animations, filter out any that are finished:
        for (var i = 0; i < this.animations.length; i++) {
            animation = this.animations[i];
            // Call tween function for object:
            var timeRatio = Math.min((curTime - animation.timeStart) / animation.duration, 1);  // Get the current animation frame which is can be [0, 1].
            animation.tweenFunc(animation.easeFunc(timeRatio)); // Call animation tween function.
            // Filter out animations which exceeded the time:
            if (curTime >= animation.timeEnd) {
                animation.animationIndex = undefined;
                animation.tweenEndFunc && animation.tweenEndFunc(animation.data.data);
                this.animations.splice(i, 1);
                i--;
            } else {
                // Update index:
                animation.animationIndex = i;
            }
        }
        // Render objects:
        this.render();
    };

    canvas.prototype.render = canvas.prototype.pumpRender = function () {
        if (this.width <= 0 || this.height <= 0) return;
        // Reset transform:
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        // Clear globals:
        this.context.font = "40px Times New Roman";
        this.curFont = "40px Times New Roman";
        //this.curFontFamily = "Times New Roman";
        this.curFontSize = 40;

        // Calculate children's boundaries and parameters:
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].calcBounds();
        }

        // Clear canvas:
        this.context.clearRect(0, 0, this.element.width, this.element.height);
        // Render children:
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].render();
        }
    };

    canvas.prototype.startRender = function () {
        console.warn("canvas.startRender is deprecated!");
    };

    function select(canvasElement) {
        var // Canvas object (unique to each canvas):
            canvasObj = new canvas(canvasElement);

        function touchEventHandler(event) {
            // Ignore event with no gesture:
            if (!event.gesture) {
                return;
            }
            event.gesture.preventDefault();

            // Ignore events with more than one touch.
            if (event.gesture.touches.length === 1) {
                // Calculate offset from target's top-left corner:
                var touch = event.gesture.touches[0],       // Get touch location on page.
                    display = touch.target.style.display,   // Save display property.
                    pagePos;                                // Get target position on page.
                touch.target.style.display = "";    // Make visible
                pagePos = touch.target.getBoundingClientRect(); // Get visible coords.
                touch.target.style.display = display;   // Restore display property.
                event.offsetX = touch.pageX - pagePos.left;
                event.offsetY = touch.pageY - pagePos.top;
                event.name = "on" + event.type;

                // Loop through every child object on canvas and check if they have been clicked:
                for (var i = 0; i < canvasObj.children.length; i++) {
                    // Check if mouse is in child:
                    if (canvasObj.children[i].isPointIn(event.offsetX, event.offsetY, event)) {
                        // If so, propagate event down to child.
                        canvasObj.children[i].touchEventHandler(event.offsetX, event.offsetY, event);
                    }
                }
            }
        }

        var hammerObj = hammer(canvasObj.element, {
            prevent_default: true,
            drag_min_distance: 10,
            hold_threshold: 10
        });
        hammerObj.on("hold tap doubletap touch release", touchEventHandler);

        // Return the canvas selector:
        return selector(canvasObj);
    }

    return {
        select: select
    };
});
/*global define*/
define('scalejs.canvas',[
    'scalejs!core',
    './scalejs.canvas/canvas'
], function (
    core,
    canvas
) {
    

    // There are few ways you can register an extension.
    // 1. Core and Sandbox are extended in the same way:
    //      core.registerExtension({ part1: part1 });
    //
    // 2. Core and Sandbox are extended differently:
    //      core.registerExtension({
    //          core: {corePart: corePart},
    //          sandbox: {sandboxPart: sandboxPart}
    //      });
    //
    // 3. Core and Sandbox are extended dynamically:
    //      core.registerExtension({
    //          buildCore: buildCore,
    //          buildSandbox: buildSandbox
    //      });
    core.registerExtension({
        canvas: canvas
    });

    return canvas;
});



/*global define*/
define('scalejs.visualization-d3/treemap',[
    'd3'
], function (
    d3
) {
    

    function mapValue() {
        var domain = [0, 1], range = [0, 1],
            domain_length = 1, range_length = 1;

        function scale(x) {
            return (x - domain[0]) / domain_length * range_length + range[0];
        }

        scale.domain = function (d) {
            if (!arguments.length) { return domain; }
            domain = d;
            domain_length = domain[1] - domain[0];
            return scale;
        };
        scale.range = function (r) {
            if (!arguments.length) { return range; }
            range = r;
            range_length = range[1] - range[0];
            return scale;
        };

        return scale;
    }

    return function () {
        var //Treemap variables
            visualization,
            canvasElement,
            json,
            touchFunc,
            zoomFunc,
            heldFunc,
            releaseFunc,
            canvasWidth,
            canvasHeight,
            x,
            y,
            root,
            treemapLayout,
            canvasArea,
            spacing = 3,
            borderColor = d3.interpolate("#888", "#fff"),
            kx, ky;

        function getNodeTreePath(node) {
            var path = [];
            while (node !== root) {
                path.push(node);
                node = node.parent;
            }
            path.push(node);
            return path;
        }
        function getDistanceToTreePath(node, treePath) {
            var distance = 0;
            while (treePath.indexOf(node) < 0) {
                distance += 1;
                node = node.parent;
            }
            return distance;
        }

        function getNodeSpaced(d, origD) {
            if (!d.parent) {
                // Don't add margin to root nodes:
                return {
                    x: d.x,
                    y: d.y,
                    dx: d.dx,
                    dy: d.dy
                };
            }
            var spx = spacing / kx,
                spy = spacing / ky,
                p = getNodeSpaced(d.parent);
            if (origD) {
                // If original node, halve the spacing to match the spacing between parent and children:
                return {
                    x: p.dx / d.parent.dx * (d.x - d.parent.x) + p.x + spx / 2,
                    y: p.dy / d.parent.dy * (d.y - d.parent.y) + p.y + spy / 2,
                    dx: p.dx / d.parent.dx * d.dx - spx,
                    dy: p.dy / d.parent.dy * d.dy - spy
                };
            }
            return {
                x: p.dx / d.parent.dx * (d.x - d.parent.x) + p.x + spx,
                y: p.dy / d.parent.dy * (d.y - d.parent.y) + p.y + spy,
                dx: p.dx / d.parent.dx * d.dx - spx * 2,
                dy: p.dy / d.parent.dy * d.dy - spy * 2
            };
        }

        function parseColor(color) {
            var rgba, opacity = 1;
            if (color.indexOf("rgba") === 0) {
                rgba = color.substring(5, color.length - 1)
                     .replace(/ /g, '')
                     .split(',');
                opacity = Number(rgba.pop());
                color = "rgb(" + rgba.join(",") + ")";
            }
            return {
                color: color,
                opacity: opacity
            };
        }

        function groupTween(opacity) {
            return function (d) {
                // Create interpolations used for a nice slide:
                var nodeSpaced = getNodeSpaced(d, d),
                    interpX, interpY,
                    interpWidth, interpHeight,
                    newFill = (d.children && d.lvl < root.curMaxLevel ? borderColor(d.lvl / (root.maxlvl - 1)) : d.color),
                    newColor = parseColor(newFill),
                    interpFill = d3.interpolate(this.backFill, newColor.color),
                    interpOpacity = d3.interpolate(this.opacity, opacity * newColor.opacity),
                    element = this;
                d.sx = x(nodeSpaced.x);
                d.sy = y(nodeSpaced.y);
                d.sdx = Math.max(kx * nodeSpaced.dx, 0);
                d.sdy = Math.max(ky * nodeSpaced.dy, 0);
                interpX = d3.interpolate(this.left, d.sx);
                interpY = d3.interpolate(this.top, d.sy);
                interpWidth = d3.interpolate(this.width, d.sdx);
                interpHeight = d3.interpolate(this.height, d.sdy);
                // Performance optimization (d3 is slow at interpolating colors):
                // NOTE from d3 docs: The returned function below is executed once per frame during animation. This current function is executed only one per animation!
                if (newFill !== this.backFill) {
                    return function (t) {
                        element.left = interpX(t);
                        element.top = interpY(t);
                        element.width = interpWidth(t);
                        element.height = interpHeight(t);
                        element.backFill = interpFill(t);
                        element.opacity = interpOpacity(t);
                    };
                }
                return function (t) {
                    element.left = interpX(t);
                    element.top = interpY(t);
                    element.width = interpWidth(t);
                    element.height = interpHeight(t);
                    element.opacity = interpOpacity(t);
                };
            };
        }
        function textTween() {
            return function (d) {
                // Create interpolations used for a nice slide:
                var interpX = d3.interpolate(this.left, d.sdx / 2),
                    interpY = d3.interpolate(this.top, d.sdy / 2),
                    newColor = parseColor(d.fontColor),
                    interpFill = d3.interpolate(this.fill, newColor.color),
                    interpOpacity,
                    element = this;
                if (visualization.allowTextOverflow) {
                    interpOpacity = d3.interpolate(this.opacity, !(d.children && d.lvl < root.curMaxLevel) ? newColor.opacity : 0);
                } else {
                    interpOpacity = d3.interpolate(this.opacity, !(d.children && d.lvl < root.curMaxLevel) && (d.sdx - 1 >= this.width) && (d.sdy - 1 >= this.height) ? newColor.opacity : 0);
                }
                this.fontFamily = d.fontFamily;
                this.fontSize = d.fontSize;
                return function (t) {
                    element.left = interpX(t);
                    element.top = interpY(t);
                    element.opacity = interpOpacity(t);
                    element.fill = interpFill(t);
                };
            };
        }

        function applyTouchTween(nodes, textNodes, targetZoomedNode, duration) {
            nodes.filter(function (d) { return !(d.children && d.lvl < root.curMaxLevel); })
                .on("touch", touchFunc).on("hold", heldFunc).on("release", releaseFunc)
                .on("tap", function (d) { zoomFunc(d.parent || d); });

            nodes.transition().duration(duration).tween("groupTween", groupTween(1));
            textNodes.transition().duration(duration).tween("textTween", textTween(targetZoomedNode));
        }

        function update(p, duration) {
            duration = duration !== undefined ? duration : 1000;
            root = json();

            var nodes, groupNodes, newGroupNodes, removeGroupNodes, textNodes, newTextNodes, removeTextNodes,
                zoomTreePath = getNodeTreePath(p);

            // Filter out nodes with children:
            nodes = treemapLayout.size([canvasWidth, canvasHeight]).sort(root.sortBy).nodes(root)
                .filter(function (d) {
                    return getDistanceToTreePath(d, zoomTreePath) < root.maxVisibleLevels;
                })
                .sort(function (a, b) {
                    return a.depth === b.depth ? b.value - a.value : a.depth - b.depth;
                });

            groupNodes = canvasArea.selectAll("group").data(nodes, function (d) { return d.id; });

            // Add new nodes to Canvas:
            newGroupNodes = groupNodes.enter().append("group").each(function (d) {
                var dNode = d.parent || d;
                this.left = x(dNode.x) + kx * dNode.dx / 2;
                this.top = y(dNode.y) + ky * dNode.dy / 2;
                var newColor = parseColor(d.children && d.lvl < root.curMaxLevel ? borderColor(d.lvl / (root.maxlvl - 1)) : d.color);
                this.backFill = newColor.color;
                this.opacity = 0;
            });
            newTextNodes = newGroupNodes.append("text").each(function (d) {
                this.originX = "center";
                this.originY = "center";
                this.left = 0;
                this.top = 0;
                this.fontFamily = d.fontFamily;
                this.fontSize = d.fontSize;
                var newColor = parseColor(d.fontColor);
                this.fill = newColor.color;
                this.setText(d.name);
                if (visualization.allowTextOverflow) {
                    this.opacity = (d.parent && d.parent.children && d.parent.lvl < root.curMaxLevel) ? newColor.opacity : 0;
                } else {
                    this.opacity = (d.parent && d.parent.children && d.parent.lvl < root.curMaxLevel) && (kx * d.dx - spacing * 2 >= this.width) && (ky * d.dy - spacing * 2 >= this.height) ? newColor.opacity : 0;
                }
            });

            // Set zoom domain to d's area:
            kx = canvasWidth / p.dx;
            ky = canvasHeight / p.dy;
            x.domain([p.x, p.x + p.dx]);
            y.domain([p.y, p.y + p.dy]);

            applyTouchTween(newGroupNodes, newTextNodes, p, duration);
            applyTouchTween(groupNodes, groupNodes.select("text"), p, duration);

            //reset group nodes which arent visible
            groupNodes.filter(function (d) { return d.children && d.lvl < root.curMaxLevel; }).on("touch", null).on("tap", null).on("hold", null);

            // Remove missing nodes:
            removeGroupNodes = groupNodes.exit().transition().duration(duration)
                .tween("groupTween", function (d) {
                    var nodeSpaced = getNodeSpaced(d.parent || d, d.parent || d),
                        interpX = d3.interpolate(this.left, x(nodeSpaced.x + nodeSpaced.dx / 2)),
                        interpY = d3.interpolate(this.top, y(nodeSpaced.y + nodeSpaced.dy / 2)),
                        interpWidth = d3.interpolate(this.width, 0),
                        interpHeight = d3.interpolate(this.height, 0),
                        interpOpacity = d3.interpolate(this.opacity, 0),
                        element = this;
                    return function (t) {
                        element.left = interpX(t);
                        element.top = interpY(t);
                        element.width = interpWidth(t);
                        element.height = interpHeight(t);
                        element.opacity = interpOpacity(t);
                    };
                }).each(function () { this.remove(); }, "end");
            removeTextNodes = removeGroupNodes.select("text").each(function (d) {
                d.sdx = 0;
                d.sdy = 0;
            }).tween("textTween", textTween(p));

            // Prevent event from firing more than once:
            if (d3.event) d3.event.stopPropagation();
        }

        function init(
            parameters,
            element,
            width,
            height,
            jsonObservable,
            selectTouchFunction,
            selectZoomFunction,
            selectHeldFunction,
            selectReleaseFunction,
            nodeSelected//,
            //trueElement
        ) {
            // Setup variables:
            canvasElement = element;
            json = jsonObservable;
            canvasWidth = width;
            canvasHeight = height;
            x = mapValue().range([0, canvasWidth]);
            y = mapValue().range([0, canvasHeight]);
            touchFunc = selectTouchFunction;
            zoomFunc = selectZoomFunction;
            heldFunc = selectHeldFunction;
            releaseFunc = selectReleaseFunction;

            // Define temp vars:
            var zoomTreePath = getNodeTreePath(nodeSelected),
                nodes;

            // Get treemap data:
            root = json();

            // This is a new treemap:
            // Setup treemap and SVG:
            treemapLayout = d3.layout.treemap()
                            .round(false)
                            .sort(root.sortBy)
                            .size([canvasWidth, canvasHeight])
                            .sticky(false)
                            .mode('squarify')
                            .value(function (d) { return d.size; })
                            .children(function (d) { return d.children; });

            canvasArea = canvasElement.append("group").each(function () {
                this.fontFamily = "Times New Roman";
                this.fontSize = 11;
            });

            // Filter out nodes with children (need to do this before we set the data up):
            nodes = treemapLayout.nodes(root)
                .filter(function (d) {
                    return getDistanceToTreePath(d, zoomTreePath) < root.maxVisibleLevels;
                })
                .sort(function (a, b) {
                    return a.depth === b.depth ? b.value - a.value : a.depth - b.depth;
                });

            // Join data with selection (may not be needed):
            canvasArea.selectAll("group")
                    .data(nodes, function (d) { return d.id; });

            // Add nodes to Canvas:
            kx = canvasWidth / nodeSelected.dx;
            ky = canvasHeight / nodeSelected.dy;
            x.domain([nodeSelected.x, nodeSelected.x + nodeSelected.dx]);
            y.domain([nodeSelected.y, nodeSelected.y + nodeSelected.dy]);
            update(nodeSelected, 0);
        }

        function resize(width, height) {
            canvasWidth = width;
            canvasHeight = height;

            x.range([0, canvasWidth]);
            y.range([0, canvasHeight]);
        }

        function remove() {
            canvasArea.remove();
        }

        // Return treemap object:
        visualization = {
            init: init,
            update: update,
            resize: resize,
            remove: remove,
            enableRotate: false,
            enableRotateDefault: false,
            enableRootZoom: true,
            fontSize: 11,
            fontFamily: "Times New Roman",
            allowTextOverflow: false
        };
        return visualization;
    };
});
/*global define*/
define('scalejs.visualization-d3/sunburst',[
    'knockout',
    'd3'
], function (
    ko,
    d3
) {
    
    var unwrap = ko.utils.unwrapObservable;
    
    return function () {
        var //Sunburst variables
            visualization,
            canvasElement,
            json,
            touchFunc,
            zoomFunc,
            heldFunc,
            releaseFunc,
            canvasWidth,
            canvasHeight,
            radius,
            x,
            y,
            root,
            sunburstLayout,
            canvasZoom,
            canvasArea,
            params;

        function getNodeTreePath(node) {
            var path = [];
            while (node !== root) {
                path.push(node);
                node = node.parent;
            }
            path.push(node);
            return path;
        }
        function getDistanceToTreePath(node, treePath) {
            var distance = 0;
            while (treePath.indexOf(node) < 0) {
                distance += 1;
                node = node.parent;
            }
            return distance;
        }

        function parseColor(color) {
            var rgba, opacity = 1;
            if (color.indexOf("rgba") === 0) {
                rgba = color.substring(5, color.length - 1)
                     .replace(/ /g, '')
                     .split(',');
                opacity = Number(rgba.pop());
                color = "rgb(" + rgba.join(",") + ")";
            }
            return {
                color: color,
                opacity: opacity
            };
        }

        function startAngle(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); }
        function endAngle(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); }
        function innerRadius(d) { return Math.max(0, y(d.y)); }
        function outerRadius(d) { return Math.max(0, y(d.y + d.dy)); }

        function repeat(n, r) {
            var a = [], i;
            for (i = 0; i < n; i += 1) {
                a[i] = r;
            }
            return a;
        }

        function mapFrToPx(params, p) {
            var sum = 0,
                a = params.levelsFr,
                fr = params.fr || 1,
                parentFr = params.parentFr || 1;

            if (a.length < root.maxlvl + 1) {
                a = a.concat(repeat(root.maxlvl - a.length + 1, fr));
            }
            a = a.map(function (x, i) {
                if (i === p.lvl - 1) {
                    return sum += parentFr;
                }
                if (i > p.lvl - 1 && i <= root.curMaxLevel) {
                    return sum += x;
                }
                return sum;
            }).map(function (x, i, arr) {
                return x / arr[arr.length - 1] * radius;
            });
            a.unshift(0);
            return a;
        }
        function mapRangeToDomain(a, p) {
            var arr = [], i;
            for (i = 0; i < a.length; i++) {
                arr.push(i / (a.length - 1));
            }
            return arr;
        }

        // The order the following tweens appear MUST be called in the same order!
        function zoomTween(p) {
            var override = params && params.levelsFr,
                range = override ? mapFrToPx(params, p)
                        : [p.y ? p.dy * radius / 2 : 0, radius],
                domain = override ? mapRangeToDomain(range, p) : [p.y, (root.curMaxLevel + 1) / (root.maxlvl + 1)];

            return function () {
                // Create interpolations used for clamping all arcs to ranges:
                var interpXD = d3.interpolate(x.domain(), [p.x, p.x + p.dx]),
                    // GLITCH: when previous domain/range is not the same length as new domain/range. It works when all levels are visible, but not with only some.
                    interpYD = d3.interpolate(y.domain(), domain),
                    interpYR = d3.interpolate(y.range(), range); //checks if its the root (or has no parent)
                return function (t) {
                    // Set clamps for arcs:
                    x.domain(interpXD(t));
                    y.domain(interpYD(t)).range(interpYR(t));
                };
            };
        }
        function groupTween(opacity) {
            return function (d) {
                // Create interpolations used for a nice slide:
                var interpOldX = d3.interpolate(this.old.x, d.x),
                    interpOldY = d3.interpolate(this.old.y, d.y),
                    interpOldDX = d3.interpolate(this.old.dx, d.dx),
                    interpOldDY = d3.interpolate(this.old.dy, d.dy),
                    interpX = d3.interpolate(this.left, canvasWidth / 2),
                    interpY = d3.interpolate(this.top, canvasHeight / 2),
                    newColor = parseColor(d.color),
                    interpOpacity = d3.interpolate(this.opacity, opacity * newColor.opacity);
                return function (t) {
                    // Store new data in the old property:
                    this.old.x = interpOldX(t);
                    this.old.y = interpOldY(t);
                    this.old.dx = interpOldDX(t);
                    this.old.dy = interpOldDY(t);

                    this.left = interpX(t);
                    this.top = interpY(t);
                    this.opacity = interpOpacity(t);
                };
            };
        }
        function arcTween() {
            return function (d) {
                // Create interpolations used for a nice slide around the parent:
                var newColor = parseColor(d.color),
                    interpFill = d3.interpolate(this.fill, newColor.color),
                    interpOpacity = d3.interpolate(this.opacity, newColor.opacity);
                return function (t) { // Interpolate arc:
                    // Store new data in the old property:
                    this.fill = interpFill(t);
                    this.opacity = interpOpacity(t);
                    this.innerRadius = innerRadius(this.old);
                    this.outerRadius = outerRadius(this.old);
                    this.startAngle = startAngle(this.old);
                    this.endAngle = endAngle(this.old);
                };
            };
        }
        function textTween(p) {
            return function (d) {
                // Create interpolations used for a nice slide around the parent:
                var newColor = parseColor(d.fontColor),
                    interpFill = d3.interpolate(this.fill, newColor.color),
                    interpOpacity = d3.interpolate(this.opacity, newColor.opacity),
                    // Interpolate attributes:
                    rad, radless, offsety, angle,
                    outerRad, innerRad, arcStartAngle, arcEndAngle, arcWidth;
                return function (t) {
                    // Setup variables for opacity:
                    outerRad = outerRadius(this.old);
                    innerRad = innerRadius(this.old);
                    arcStartAngle = startAngle(this.old);
                    arcEndAngle = endAngle(this.old);
                    arcWidth = (arcEndAngle - arcStartAngle) * innerRad;

                    // Calculate color:
                    this.fill = interpFill(t);

                    // Calculate text angle:
                    rad = x(this.old.x + this.old.dx / 2);
                    radless = rad - Math.PI / 2;
                    offsety = y(d.y) + 2;
                    angle = rad * 180 / Math.PI - 90;
                    this.left = offsety * Math.cos(radless);
                    this.top = offsety * Math.sin(radless);
                    if (p !== d) {
                        // Flip text right side up:
                        if (angle > 90) {
                            angle = (angle + 180) % 360;
                        }
                        // Change anchor based on side of Sunburst the text is on:
                        this.originX = rad > Math.PI ? "right" : "left";

                        // Change opacity:
                        if (visualization.allowTextOverflow) {
                            this.opacity = interpOpacity(t);
                        } else {
                            this.opacity = (outerRad - innerRad - 4 >= this.width) && ((arcWidth - 2 >= this.height) || (p === d && innerRad < 1)) ? interpOpacity(t) : 0;
                        }
                    } else {
                        angle -= 90;
                        // Change anchor based on side of Sunburst the text is on:
                        this.originX = "center";
                        this.originY = "top";

                        // Change opacity:
                        if (visualization.allowTextOverflow) {
                            this.opacity = interpOpacity(t);
                        } else {
                            this.opacity = (outerRad - innerRad - 4 >= this.height) && ((arcWidth - 2 >= this.width) || (p === d && innerRad < 1)) ? interpOpacity(t) : 0;
                        }
                    }

                    // Rotate text angle:
                    this.angle = (params && params.enableRotatedText != null) ? (params.enableRotatedText ? angle : 0) : angle;
                };
            };
        }

        function update(p, duration) {
            // Get sunburst specific parameters:
            params = unwrap(visualization.parameters);

            // Get transition duration parameter:
            duration = duration !== undefined ? duration : 1000;

            // Get treemap data:
            root = json();

            // Define temp vars:
            var nodes, groupNodes, newGroupNodes, removeGroupNodes, arcNodes, newArcNodes, removeArcNodes, textNodes, newTextNodes, removeTextNodes,
                zoomTreePath = getNodeTreePath(p);

            // This is a sunburst being updated:
            // Filter out nodes with children:
            nodes = sunburstLayout.sort(root.sortBy).nodes(root)
                .filter(function (d) {
                    return getDistanceToTreePath(d, zoomTreePath) < root.maxVisibleLevels;
                });

            // Select all nodes in Canvas, and apply data:
            groupNodes = canvasArea.selectAll("group")
                .data(nodes, function (d) { return d.id; });

            // Add new nodes to Canvas:
            newGroupNodes = groupNodes.enter().append("group")
                .each(function (d) {
                    this.left = canvasWidth / 2;
                    this.top = canvasHeight / 2;
                    this.opacity = 0;
                    this.old = {
                        x: d.x,
                        y: d.y,
                        dx: d.dx,
                        dy: d.dy
                    };
                });

            // Add arc to each node:
            newArcNodes = newGroupNodes.append("arc")
                .each(function (d) {
                    this.fill = d.color;
                    this.outerRadius = this.innerRadius = innerRadius(d);
                    //innerRadius(d);//outerRadius(d);
                    this.endAngle = this.startAngle = (endAngle(d) - startAngle(d)) / 2;//startAngle(d);
                    //this.endAngle = endAngle(d);
                    this.old = this.parent.old;
                })
                .on("touch", touchFunc)
                .on("tap", zoomFunc)
                .on("hold", heldFunc)
                .on("release", releaseFunc);

            // Add text to each node:
            newTextNodes = newGroupNodes.append("text")
                .each(function (d) {
                    if (root !== d) {
                        // Change anchor based on side of Sunburst the text is on:
                        this.originX = (x(d.x + d.dx / 2) > Math.PI) ? "right" : "left";
                        this.originY = "center";
                    } else {
                        // Change anchor based on side of Sunburst the text is on:
                        this.originX = "center";
                        this.originY = "top";
                    }
                    //this.fontSize = 11;
                    var newColor = parseColor(d.fontColor),
                        ang = x(d.x + d.dx / 2) * 180 / Math.PI - 90;
                    this.fill = newColor.color;
                    this.setText(d.name);
                    d.bw = y(d.y + d.dy) - y(d.y);
                    d.bh = (x(d.x + d.dx) - x(d.x)) * y(d.y);
                    if (root !== d) {
                        // Flip text right side up:
                        if (ang > 90) {
                            ang = (ang + 180) % 360;
                        }

                        // Change opacity:
                        if (visualization.allowTextOverflow) {
                            this.opacity = newColor.opacity;
                        } else {
                            this.opacity = (d.bw - 4 >= this.height) && ((d.bh - 2 >= this.width) || (root === d && y(d.y) < 1)) ? newColor.opacity : 0;
                        }
                    } else {
                        ang -= 90;

                        // Change opacity:
                        if (visualization.allowTextOverflow) {
                            this.opacity = newColor.opacity;
                        } else {
                            this.opacity = (d.bw - 4 >= this.width) && ((d.bh - 2 >= this.height) || (root === d && y(d.y) < 1)) ? newColor.opacity : 0;
                        }
                    }
                    this.angle = ang;
                    this.left = (Math.max(y(d.y), 0) + 2) * Math.cos(x(d.x + d.dx / 2) - Math.PI / 2);
                    this.top = (Math.max(y(d.y), 0) + 2) * Math.sin(x(d.x + d.dx / 2) - Math.PI / 2);
                    this.old = this.parent.old;
                });

            // Add tween to Canvas:
            canvasArea.transition().duration(duration)
                .tween("zoomTween", zoomTween(p));

            // Add tween to new nodes:
            newGroupNodes.transition().duration(duration)
                .tween("groupTween", groupTween(1));
            // Add tween to new arcs:
            newArcNodes.transition().duration(duration)
                .tween("arcTween", arcTween(p));
            // Add tween to new text:
            newTextNodes.transition().duration(duration)
                .tween("textTween", textTween(p));

            // Add tween to current nodes:
            groupNodes.transition().duration(duration)
                .tween("groupTween", groupTween(1));
            // Add tween to current arcs:
            arcNodes = groupNodes.select("arc").transition().duration(duration)
                .tween("arcTween", arcTween(p));
            // Add tween to current text:
            textNodes = groupNodes.select("text").transition().duration(duration)
                .tween("textTween", textTween(p));

            // Remove missing nodes:
            removeGroupNodes = groupNodes.exit().transition().duration(duration)
                .tween("groupTween", groupTween(0))
                .each(function () {
                    this.remove();
                }, "end");
            removeArcNodes = removeGroupNodes.select("arc").tween("arcTween", arcTween(p));
            removeTextNodes = removeGroupNodes.select("text").tween("textTween", textTween(p));

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }

        function init(
            parameters,
            element,
            width,
            height,
            jsonObservable,
            selectTouchFunction,
            selectZoomFunction,
            selectHeldFunction,
            selectReleaseFunction,
            nodeSelected
        ) {
            canvasElement = element;
            json = jsonObservable;
            canvasWidth = width;
            canvasHeight = height;
            radius = Math.min(canvasWidth, canvasHeight) / 2;
            x = d3.scale.linear().range([0, 2 * Math.PI]);
            y = d3.scale.linear().range([0, radius]);
            touchFunc = selectTouchFunction;
            zoomFunc = selectZoomFunction;
            heldFunc = selectHeldFunction;
            releaseFunc = selectReleaseFunction;

            // Define temp vars:
            var zoomTreePath = getNodeTreePath(nodeSelected),
                nodes;

            // Get sunburst data:
            root = json();

            // This is a new sunburst:
            // Setup sunburst and Canvas:
            sunburstLayout = d3.layout.partition()
                            .sort(root.sortBy)
                            .value(function (d) { return d.size; })
                            .children(function (d) { return d.children; });

            canvasZoom = canvasElement.append("group");
            canvasArea = canvasZoom.append("group").each(function () {
                this.fontFamily = "Times New Roman";
                this.fontSize = 11;
            });

            // Filter out nodes with children:
            nodes = sunburstLayout.nodes(root)
                .filter(function (d) {
                    return getDistanceToTreePath(d, zoomTreePath) < root.maxVisibleLevels;
                });

            // Join data with selection (may not be needed):
            canvasArea.selectAll("group")
                .data(nodes, function (d) { return d.id; });

            // Add nodes to Canvas:
            x.domain([nodeSelected.x, nodeSelected.x + nodeSelected.dx]);
            y.domain([nodeSelected.y, (root.curMaxLevel + 1) / (root.maxlvl + 1)]).range([nodeSelected.y ? nodeSelected.dy * radius / 2 : 0, radius]);
            update(nodeSelected, 0);
        }

        function resize(width, height) {
            canvasWidth = width;
            canvasHeight = height;

            radius = Math.min(canvasWidth, canvasHeight) / 2;
            y.range([0, radius]);
        }

        function remove() {
            if (canvasArea !== undefined) {
                canvasZoom.remove();
                canvasZoom = undefined;
                canvasArea = undefined;
            }
        }

        // Return sunburst object:
        visualization = {
            init: init,
            update: update,
            resize: resize,
            remove: remove,
            enableRotate: true,
            enableRotateDefault: true,
            enableRootZoom: false,
            fontSize: 11,
            fontFamily: "Times New Roman",
            allowTextOverflow: false
        };
        return visualization;
    };
});

/*global define*/
/*jslint devel: true */
/*jslint browser: true */
define('scalejs.visualization-d3/visualization',[
    'scalejs!core',
    'knockout',
    'd3',
    'd3.colorbrewer',
    'scalejs.canvas',
    'scalejs.visualization-d3/treemap',
    'scalejs.visualization-d3/sunburst'
], function (
    core,
    ko,
    d3,
    colorbrewer,
    canvasRender,
    treemap,
    sunburst
) {
    
    var //imports
        observable = ko.observable,
        computed = ko.computed,
        unwrap = ko.utils.unwrapObservable,
        isObservable = ko.isObservable,
        visualizations = {
            treemap: treemap,
            sunburst: sunburst
        },
        sortByFuncs = {
            unordered: function (a, b) { return a.index - b.index; },
            ascendingSize: function (a, b) { return a.size - b.size; },
            descendingSize: function (a, b) { return b.size - a.size; }
        };

    function blankVisualization(type) {
        // Generate error function:
        function visualizationError(func) {
            var strFuncError = "Calling " + func + " function of undefined visualization. Visualization (" + type + ") doesn't exist!";
            return function () { console.error(strFuncError); };
        }

        // Return blank visualization with errors as functions:
        return {
            init: visualizationError("init"),
            update: visualizationError("update"),
            resize: visualizationError("resize"),
            remove: visualizationError("remove")
        };
    }

    function init(
        element,
        valueAccessor
    ) {
        var parameters = valueAccessor(),
            triggerTime = parameters.triggerTime == null || 10,
            enableRotate = parameters.enableRotate,
            enableZoom = parameters.enableZoom || false,
            enableTouch = parameters.enableTouch || false,
            allowTextOverflow = parameters.allowTextOverflow || false,
            visualization,
            visualizationType = isObservable(parameters.visualization) ? parameters.visualization : observable(parameters.visualization),
            visualizationParams, // visualization specific parameters may be passed
            json,
            globals = {},
            zoomedItemPath = isObservable(parameters.zoomedItemPath) ? parameters.zoomedItemPath : observable(parameters.zoomedItemPath),
            selectedItemPath = isObservable(parameters.selectedItemPath) ? parameters.selectedItemPath : observable(parameters.selectedItemPath),
            heldItemPath = isObservable(parameters.heldItemPath) ? parameters.heldItemPath : observable(parameters.heldItemPath),
            nodeScale = d3.scale.linear(),
            canvasElement,
            canvas,
            elementStyle,
            canvasWidth,
            canvasHeight,
            root,
            zoomedNode = {
                id: null
            },
            transform = {
                left: 0,
                top: 0,
                rotate: 0,
                scale: 1
            },
            touchHandler,
            zoomOutScale = 0.8,
            disposeLayout;

        // Attempts to find a node when given a path
        // 1. If the Path is found, it returns the node
        // 2. If the Path does not exist, it returns undefined
        // 3. If the Path has a length of 0, it returns the root node
        // 4. If the Path is not an array, it returns undefined
        function getNode(path) {
            var curNode = json();
            if (path instanceof Array) {
                for (var i = 0; i < path.length; i += 1) {
                    if (curNode.childrenReference[path[i]] === undefined) {
                        return;
                    }
                    curNode = curNode.childrenReference[path[i]];
                }
                return curNode;
            }
            return;
        }

        // Subscribe to zoomedItemPath changes, verify path and then zoom:
        zoomedItemPath.subscribe(function (path) {
            var node = getNode(path);
            // even if there is no node, the zoom must still be set to something
            if (!node) {
                zoomedItemPath([]);
                // if there is no node, that means our zoomed node is the root
                node = json();
            }
            if (node) {
                zoomedNode = node;
                root.curLevel = zoomedNode.lvl;
                root.curMaxLevel = zoomedNode.lvl + root.maxVisibleLevels - 1;
                visualization.update(zoomedNode);    // Animate zoom effect
            }
        });

        // Subscribe to selectedItemPath changes from outside:
        selectedItemPath.subscribe(function (path) {
            // if there is no node, there is no path
            if (!getNode(path)) {
                selectedItemPath(undefined);
            }
        });

        // Get element's width and height:
        elementStyle = window.getComputedStyle(element);
        // Get width and height. Must be >= 1 pixel in order for d3 to calculate layouts properly:
        canvasWidth = parseInt(elementStyle.width, 10);
        canvasWidth = canvasWidth >= 1 ? canvasWidth : 1;
        canvasHeight = parseInt(elementStyle.height, 10);
        canvasHeight = canvasHeight >= 1 ? canvasHeight : 1;

        canvasElement = d3.select(element)
                        .style('overflow', 'hidden')
                        .append("canvas")
                            .attr("width", canvasWidth)
                            .attr("height", canvasHeight)
                            .node();

        // Clear the canvas's transform and animate from current to cleared state:
        function resetTransformAnimation() {
            // Reset target transform:
            transform.left = 0;
            transform.top = 0;
            transform.rotate = 0;
            transform.scale = 1;
            canvas.select("group").transition().duration(1000)
                .tween("canvasTween", function () {
                    // Create interpolations used for a nice slide around the parent:
                    var interpLeft = d3.interpolate(this.left, 0),
                        interpTop = d3.interpolate(this.top, 0),
                        interpAngle = d3.interpolate(this.angle, 0),
                        interpScaleX = d3.interpolate(this.scaleX, 1),
                        interpScaleY = d3.interpolate(this.scaleY, 1),
                        el = this;
                    return function (t) {
                        el.left = interpLeft(t);
                        el.top = interpTop(t);
                        el.angle = interpAngle(t);
                        el.scaleX = interpScaleX(t);
                        el.scaleY = interpScaleY(t);
                    };
                });
        }

        // This function resets the selected node:
        function selectRelease() {
            // Reset selectedItemPath:
            heldItemPath(undefined);
        }

        // This function sets the selected node:
        function selectTouch(node) {
            var path = [],
                tmpNode = node;
            // Set selectedItemPath:
            while (tmpNode.parent !== undefined) {
                path.unshift(tmpNode.index);
                tmpNode = tmpNode.parent;
            }
            selectedItemPath(path);
        }

        // This function sets the held node:
        function selectHeld(node) {
            var path = [],
                tmpNode = node;
            // Set heldItemPath:
            while (tmpNode.parent !== undefined) {
                path.unshift(tmpNode.index);
                tmpNode = tmpNode.parent;
            }
            heldItemPath(path);
        }

        // Zoom after click, and set the path:
        function selectZoom(node) {
            var path = [],
                tmpNode,
                curZoomedNode = zoomedNode;

            // Only zoom if enabled:
            if (unwrap(enableZoom)) {
                if (visualization.enableRootZoom && node === curZoomedNode) {    // Reset path since item was already selected.
                    node = root;
                }

                if (node !== curZoomedNode) {
                    // Reset transform:
                    resetTransformAnimation();
                }

                zoomedNode = tmpNode = node;
                // Set selected node for use in calculating the max depth.
                root.curLevel = zoomedNode.lvl;
                root.curMaxLevel = zoomedNode.lvl + root.maxVisibleLevels - 1;

                // Set zoomedItemPath:
                while (tmpNode.parent !== undefined) {
                    path.unshift(tmpNode.index);
                    tmpNode = tmpNode.parent;
                }
                zoomedItemPath(path);
            }

            // Prevent event from firing more than once:
            if (d3.event) {
                d3.event.stopPropagation();
            }
        }

        // The following set of callbacks are for the pinch&zoom touch handler:
        function renderCallback(left, top, rotate, scale) { // Called on beginning and end of touch gestures:
            // Update transform:
            transform.left = left;
            transform.top = top;
            transform.rotate = rotate;
            transform.scale = scale;
            canvas.select("group")
                .attr("scaleX", transform.scale)
                .attr("scaleY", transform.scale)
                .attr("angle", transform.rotate)
                .attr("left", transform.left)
                .attr("top", transform.top);
            canvas.pumpRender();
        }
        
        function startCallback() {  // Called when user initiates a touch gesture:
            // Set Rotate State:
            visualization.enableRotate = unwrap(enableRotate) !== undefined ? unwrap(enableRotate) : visualization.enableRotateDefault;
            touchHandler.setRotateState(visualization.enableRotate);

            return transform;
        }

        function transformCallback(zoomOutHandler) {   // Called for every update to a touch gesture's transform (end and step):
            return function (left, top, rotate, scale) {
                // If rotate is not enabled on visualization, lock the visualization to not go off of the screen:
                if (!visualization.enableRotate) {
                    left > 0 && (left = 0);
                    top > 0 && (top = 0);
                    var right = left + scale * canvasWidth,
                        bottom = top + scale * canvasHeight;
                    right < canvasWidth && (left += canvasWidth - right);
                    bottom < canvasHeight && (top += canvasHeight - bottom);
                }
                if (scale < 1) {   // scaling is handled differently for step and end
                    zoomOutHandler(left, top, rotate, scale);
                } else {
                    // Update transform:
                    transform.left = left;
                    transform.top = top;
                    transform.rotate = rotate;
                    transform.scale = scale;
                }
                // Return updated transform to canvas-touch:
                return transform;
            }
        }

        // passed to transformCallback to create step-specific transform callback function
        function stepZoomOutHandler(left, top, rotate, scale) {
            scale = Math.max(zoomOutScale, scale);
            // Reset transform:
            transform.left = (1 - scale) / 2 * canvasWidth;
            transform.top = (1 - scale) / 2 * canvasHeight;
            transform.rotate = 0;
            transform.scale = scale;
        };

        // passed to transformCallback to create end-specific transform callback function
        function endZoomOutHandler(left, top, rotate, scale) {
            // Bounce back
            transform.left = 0;
            transform.top = 0;
            transform.rotate = 0;
            transform.scale = 1;
            if (scale < zoomOutScale + (1 - zoomOutScale) / 4) {
                // zoom to parent
                selectZoom(zoomedNode.parent || zoomedNode);
            }
        }

        function registerTouchHandler() {
            // Check if a canvas touch plugin exists (register before initializing visualization to avoid event handler conflicts):
            if (core.canvas.touch && unwrap(enableTouch)) {
                touchHandler = core.canvas.touch({
                    canvas: canvasElement,
                    renderCallback: renderCallback,
                    startCallback: startCallback,
                    stepCallback: transformCallback(stepZoomOutHandler),
                    endCallback: transformCallback(endZoomOutHandler)
                });
            } else {
                touchHandler = {
                    setRotateState: function () { return; },
                    remove: function () { return; }
                };
            }
        }

        // Register pinch&zoom extension to canvas:
        registerTouchHandler();
        if (isObservable(enableTouch)) {
            // Subscribe to changes in enableTouch to dynamically enable and disable the pinch&zoom touch handler:
            enableTouch.subscribe(function () {
                touchHandler.remove();
                registerTouchHandler();
            });
        }

        // Select canvas and set default ease function:
        // This is done after the touch handler, because select registers touch events on top of the touch handler.
        canvas = canvasRender.select(canvasElement).ease(d3.ease("cubic-in-out"));

        // Sets each parameter in globals to the parameter or to a default value:
        function setGlobalParameters() {
            globals.idPath = unwrap(parameters.idPath) || 'id';
            globals.namePath = unwrap(parameters.namePath) || globals.idPath;
            globals.childrenPath = unwrap(parameters.childrenPath) || 'children';
            globals.areaPath = unwrap(parameters.areaPath) || 'area';
            globals.colorPath = unwrap(parameters.colorPath) || 'color';
            globals.colorPalette = unwrap(parameters.colorPalette) || 'PuBu';
            globals.fontSize = unwrap(parameters.fontSize) || 11;
            globals.fontFamily = unwrap(parameters.fontFamily) || "Times New Roman";
            globals.fontColor = unwrap(parameters.fontColor) || "#000";

            // Set global colorPalette (array, undefined or string) parameters:
            if (globals.colorPalette instanceof Array) {
                if (globals.colorPalette.length === 1) globals.colorPalette[1] = globals.colorPalette[0];
            } else {
                globals.colorPalette = colorbrewer[globals.colorPalette][3];
            }
        }

        // Loop through levels to parse parameters:
        function parseLevelParameters(lvls) {
            // Clear levels:
            var levels = [];

            // Loop through all levels and parse the parameters:
            for (var i = 0; i < lvls.length; i += 1) {
                var l = lvls[i];
                if (l instanceof Object) {
                    // Level has parameters, or use globals
                    levels[i] = {   
                        idPath:         unwrap(l.idPath)                || globals.idPath,
                        namePath:       unwrap(l.namePath || l.idPath)  || globals.namePath,
                        childrenPath:   unwrap(l.childrenPath)          || globals.childrenPath,
                        areaPath:       unwrap(l.areaPath)              || globals.areaPath,
                        colorPath:      unwrap(l.colorPath)             || globals.colorPath,                        
                        fontSize:       unwrap(l.fontSize)              || globals.fontSize,
                        fontFamily:     unwrap(l.fontFamily)            || globals.fontFamily,
                        fontColor:      unwrap(l.fontColor)             || globals.fontColor,
                        colorPalette:   unwrap(l.colorPalette)          // more processing below
                    };

                    // Set level's colorPalette (array, undefined or string) and colorScale parameters:
                    // A new scale must be created for every new colorPalette, eg array or string.
                    if (levels[i].colorPalette instanceof Array) {
                        if (levels[i].colorPalette.length === 1) levels[i].colorPalette[1] = levels[i].colorPalette[0];
                    } else if (levels[i].colorPalette == null) {    // Catch if null or undefined
                        levels[i].colorPalette = globals.colorPalette;
                    } else {
                        levels[i].colorPalette = colorbrewer[levels[i].colorPalette][3];
                    }
                } else {
                    levels[i] = {   // l defines the childrenPath, use global parameters for the rest:
                        childrenPath:   l || globals.childrenPath,
                        idPath:         globals.idPath,
                        namePath:       globals.namePath,
                        areaPath:       globals.areaPath,
                        colorPath:      globals.colorPath,
                        colorPalette:   globals.colorPalette,
                        fontSize:       globals.fontSize,
                        fontFamily:     globals.fontFamily,
                        fontColor:      globals.fontColor
                    };
                }
            }
            return levels;
        }
        
        // Recursively traverse json data, and build it for rendering:
        function createNodeJson(node, levelConfig, index, maxlvl) {
            var childNode, children, stepSize, color,
                lvl = levelConfig[index] || globals, 
                newNode = {
                    id:         node[lvl.idPath] || '',
                    name:       node[lvl.namePath] || '',
                    lvl:        index,
                    size:       node[lvl.areaPath] !== undefined ? node[lvl.areaPath] : 1,
                    colorSize:  node[lvl.colorPath] || 0,
                    fontSize:   lvl.fontSize,
                    fontFamily: lvl.fontFamily,
                    fontColor:  lvl.fontColor
                };

            if (newNode.id === zoomedNode.id) zoomedNode = newNode; // If node is the current zoomed node, update the zoomed node reference:

            // Check if leaf node:
            if (!node[lvl.childrenPath]) {
                if (maxlvl.value < index) maxlvl.value = index; // Update the max depth to the leaf's depth (if deeper than maxlvl's value):
                return newNode;
            }

            // Set default properties of node with children:
            newNode.children = [];
            newNode.childrenReference = [];

            // Node has children, so set them up first:
            children = node[lvl.childrenPath];
            for (var i = 0; i < children.length; i += 1) {
                childNode = createNodeJson(children[i], levelConfig, index + 1, maxlvl); //recursion
                childNode.parent = newNode;
                childNode.index = i;    // Set node's index to match the index it appears in the original dataset.

                if (node[lvl.areaPath] === undefined) newNode.size += childNode.size; // If parent has no size, default to adding child colors.

                if (node[lvl.colorPath] === undefined) newNode.colorSize += childNode.colorSize;   // If parent has no color, default to adding child colors.

                newNode.minSize = Math.min(newNode.minSize || childNode.size, childNode.size);
                newNode.maxSize = Math.max(newNode.maxSize || childNode.size + 1, childNode.size);
                newNode.minColor = Math.min(newNode.minColor || childNode.colorSize, childNode.colorSize);
                newNode.maxColor = Math.max(newNode.maxColor || childNode.colorSize + 1, childNode.colorSize);

                // d3 reorganizes the children later in the code, so the following array is used to preserve children order for indexing:
                newNode.children[i] = newNode.childrenReference[i] = childNode;
            }

            nodeScale.range(levelConfig.length <= index + 1 ? globals.colorPalette : levelConfig[index + 1].colorPalette);
            // Set domain of color values:
            stepSize = (newNode.maxColor - newNode.minColor) / Math.max(nodeScale.range().length - 1, 1);
            nodeScale.domain(d3.range(newNode.minColor, newNode.maxColor + stepSize, stepSize));

            for (var i = 0; i < children.length; i += 1) newNode.children[i].color = nodeScale(newNode.children[i].colorSize);

            return newNode;
        }
        json = ko.computed(function () {
            var maxlvl = { value: 0 }, stepSize,
                // Get parameters (or defaults values):
                sortByParam = unwrap(parameters.sortBy) || "unordered",
                maxVisibleLevels = unwrap(parameters.maxVisibleLevels || 2),
                dataSource = unwrap(parameters.data) || { name: "Empty" },
                levelsSource = unwrap(parameters.levels) || [{}],
                levels;

            setGlobalParameters();

            // Create copy of data in a easy structure for d3:
            levels = parseLevelParameters(levelsSource);
            // Generate Json:
            root = createNodeJson(dataSource, levels, 0, maxlvl, 0);
            // No node is zoomed to, so zoom to root:
            if (zoomedNode.id == null) zoomedNode = root;

            // Set root-specific properties:
            root.curLevel = zoomedNode.lvl;
            root.curMaxLevel = zoomedNode.lvl + maxVisibleLevels - 1;
            root.maxlvl = maxlvl.value;
            root.maxVisibleLevels = maxVisibleLevels;
            root.levels = levels;
            root.index = 0;

            // Set root's sortBy function used to sort nodes.
            if (sortByParam instanceof Function) {
                root.sortBy = sortByParam;
            } else if (sortByFuncs[sortByParam]) {
                root.sortBy = sortByFuncs[sortByParam];
            } else {
                root.sortBy = sortByParam.unordered;
            }

            // Setup colorscale for the root:
            nodeScale.range(levels[0].colorPalette);
            stepSize = 2 / Math.max(nodeScale.range().length - 1, 1);
            nodeScale.domain(d3.range(root.colorSize - stepSize / 2, root.colorSize + stepSize / 2, stepSize));

            // Set root's color:
            root.color = nodeScale(root.colorSize);

            visualizationParams = unwrap(parameters[visualizationType.peek()]);

            // Return the new json data:
            return root;
        }).extend({ throttle: triggerTime });;

        // Change/Set visualization:
        function setVisualization(type) {
            // Retrieve new visualization type, and fail gracefully:
            if (visualizations[type] != null) visualization = visualizations[type]();
            else visualization = blankVisualization(type);

            // Reset transform:
            transform.left = 0;
            transform.top = 0;
            transform.rotate = 0;
            transform.scale = 1;

            // Run visualization's initialize code:
            visualization.allowTextOverflow = unwrap(allowTextOverflow);
            visualization.parameters = computed(function () {
                return unwrap(parameters[type]);
            });//visualizationParams;
            visualization.init(parameters, canvas, canvasWidth, canvasHeight, json, selectTouch, selectZoom, selectHeld, selectRelease, zoomedNode, element);
        }

        // Initialize visualization:
        setVisualization(visualizationType());

        // Subscribe to allowTextOverflow changes:
        if (isObservable(allowTextOverflow)) {
            allowTextOverflow.subscribe(function () {
                visualization.allowTextOverflow = unwrap(allowTextOverflow);
                visualization.update(zoomedNode);
            });
        }

        // Subscribe to visualization type changes:
        visualizationType.subscribe(function (type) {
            visualization.remove();
            setVisualization(type);
        });
        
        // Subscribe to data changes:
        json.subscribe(function () {
            //visualization.parameters = visualizationParams;
            visualization.update(zoomedNode);
        });

        // Check if a layout plugin exists:
        if (core.layout) {
            // Add event listener for on layout change:
            disposeLayout = core.layout.onLayoutDone(function () {
                var lastWidth = canvasWidth,
                    lastHeight = canvasHeight;
                elementStyle = window.getComputedStyle(element);
                // Get width and height. Must be >= 1 pixel in order for d3 to calculate layouts properly:
                canvasWidth = parseInt(elementStyle.width, 10);
                canvasWidth = canvasWidth >= 1 ? canvasWidth : 1;
                canvasHeight = parseInt(elementStyle.height, 10);
                canvasHeight = canvasHeight >= 1 ? canvasHeight : 1;
                if (canvasWidth === lastWidth && canvasHeight === lastHeight) return;

                canvas.attr('width', canvasWidth);
                canvas.attr('height', canvasHeight);
                visualization.resize(canvasWidth, canvasHeight);
                // Must set width and height before doing any animation (to calculate layouts properly):
                resetTransformAnimation();
                visualization.update(zoomedNode);
            });
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                disposeLayout();
                disposeLayout = undefined;
            });
        }
    }

    return {
        init: init
    };
});

/*global define*/
/*jslint devel: true */
define('scalejs.visualization-d3',[
    'scalejs!core',
    'knockout',
    'scalejs.visualization-d3/visualization'
], function (
    core,
    ko,
    visualization
) {
    
    if (ko.bindingHandlers.d3) {
        console.error("visualization-d3 is already setup");
        return false;
    }

    ko.bindingHandlers.d3 = visualization;
    ko.virtualElements.allowedBindings.d3 = true;

    core.registerExtension({
        d3: visualization
    });
});


