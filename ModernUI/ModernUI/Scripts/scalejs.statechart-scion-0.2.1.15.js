
/*global define,setTimeout,clearTimeout*/
define('scalejs.statechart-scion/state.builder',[
    'scalejs!core',
    'scion'
], function (
    core,
    scion
) {
    

    var toArray = core.array.toArray,
        defaultBuilder;

    function builder(options) {
        function stateBuilder(state) {
            var builder;

            function onEntry(f) {
                if (state.onEntry) {
                    throw new Error('Only one `onEntry` action is allowed.');
                }

                if (typeof f !== 'function') {
                    throw new Error('`onEntry` takes a function as a parameter.');
                }

                state.onEntry = f;

                return builder;
            }

            function onExit(f) {
                if (state.onExit) {
                    throw new Error('Only one `onExit` action is allowed.');
                }

                if (typeof f !== 'function') {
                    throw new Error('`onExit` takes a function as a parameter.');
                }

                state.onExit = f;

                return builder;
            }

            function startTransition(isInternal) {
                var transition = {};
                if (isInternal) {
                    transition.type = 'internal';
                }

                if (!state.transitions) {
                    state.transitions = [];
                }
                state.transitions.push(transition);

                return transition;
            }

            function transitionGoto(transition, stateOrAction, action) {
                if (!transition) {
                    throw new Error('`transition` is undefined.');
                }

                if (typeof stateOrAction === 'string') {
                    transition.target = stateOrAction.split(' ');
                    if (action) {
                        if (typeof action !== 'function') {
                            throw new Error('`action` must be an action.');
                        }
                        transition.onTransition = action;
                    }

                    return builder;
                }

                if (typeof stateOrAction === 'function') {
                    if (action) {
                        throw new Error('`goto` parameters should be either target id(s) or action function or both.');
                    }
                    transition.onTransition = stateOrAction;

                    return builder;
                }

                throw new Error('`goto` parameters should be either target id(s) or action function or both.');
            }

            function goto(stateOrAction, action) {
                return transitionGoto(startTransition(), stateOrAction, action);
            }

            function gotoInternally(stateOrAction, action) {
                return transitionGoto(startTransition(true), stateOrAction, action);
            }

            function on(eventOrCondition, condition) {
                var transition = startTransition(),
                    transitionBuilder = {
                        doNothing: builder,
                        goto: function (stateOrAction, action) {
                            return transitionGoto(transition, stateOrAction, action);
                        },
                        gotoInternally: function (stateOrAction, action) {
                            transition.type = 'internal';
                            return transitionGoto(transition, stateOrAction, action);
                        }
                    };

                if (typeof eventOrCondition === 'string') {
                    transition.event = eventOrCondition;
                    if (condition !== undefined) {
                        if (typeof condition !== 'function') {
                            throw new Error('`condition` must be a function.');
                        }
                        transition.cond = condition;
                    }

                    return transitionBuilder;
                }

                if (typeof eventOrCondition === 'function') {
                    if (condition !== undefined) {
                        throw new Error('`on` parameters should be either an event name or condition function or both.');
                    }
                    transition.cond = eventOrCondition;

                    return transitionBuilder;
                }

                throw new Error('`on` parameters should be either an event name or condition function or both.');
            }

            function toSpec() {
                return state;
            }

            builder = {
                isBuilder: true,
                onEntry: onEntry,
                onExit: onExit,
                on: on,
                goto: goto,
                gotoInternally: gotoInternally,
                toSpec: toSpec
            };

            return builder;
        }

        function withState(s, opts) {
            var builderArgsStart = 1;

            if (arguments.length > 1) {
                if (!opts.isBuilder) {
                    builderArgsStart = 2;
                    if (opts.initial) {
                        if (s.parallel) {
                            return new Error('`initial` shouldn\'t be specified on parallel region.');
                        }
                        s.initial = opts.initial;
                    }
                    if (opts.parallel) {
                        s.parallel = opts.parallel;
                    }
                }

                if (arguments.length > builderArgsStart) {
                    s.states = toArray(arguments, builderArgsStart).map(function (sb) {
                        return sb.toSpec();
                    });
                } else {
                    s.states = [];
                }
            }

            return stateBuilder(s);
        }

        function state(id) {
            // if first argument is a string then it's an id
            if (typeof id === 'string') {
                return withState.apply(null, [{id: id}].concat(toArray(arguments, 1)));
            }
            // otherwise it's a builder (e.g. state being created doesn't have an id)
            return withState.apply(null, [{}].concat(toArray(arguments, 0)));
        }

        function parallel(id) {
            // if first argument is a string then it's an id
            if (typeof id === 'string') {
                return withState.apply(null, [{id: id, type: 'parallel'}].concat(toArray(arguments, 1)));
            }
            // otherwise it's a builder (e.g. state being created doesn't have an id)
            return withState.apply(null, [{parallel: true}].concat(toArray(arguments)));
        }

        function statechart() {
            var builder = state.apply(null, arguments);

            //console.log(JSON.stringify(builder.toSpec()));

            return new scion.Statechart(builder.toSpec(), options);
        }

        return {
            state: state,
            parallel: parallel,
            statechart: statechart
        };
    }

    defaultBuilder = builder({
        logStatesEnteredAndExited: true
    });

    return {
        builder: builder,
        state: defaultBuilder.state,
        parallel: defaultBuilder.parallel,
        statechart: defaultBuilder.statechart
    };
});


/*global define*/
/*jslint nomen:true*/
define('scalejs.statechart-scion/state',[
    'scalejs!core',
    './state.builder',
    'scion'
], function (
    core,
    builder,
    scion
) {
    

    var // imports
        enumerable = core.linq.enumerable,
        toArray = core.array.toArray,
        removeOne = core.array.removeOne,
        has = core.object.has,
        is = core.type.is,
        curry = core.functional.curry,
        state = builder.state,
        parallel = builder.parallel,
        // members
        applicationStatechartSpec,
        applicationStatechart;

    function allStates(current) {
        if (has(current, 'states')) {
            return enumerable
                .make(current)
                .concat(enumerable
                    .from(current.states)
                    .selectMany(allStates));
        }

        return enumerable.make(current);
    }

    function findState(root, stateId) {
        var found = allStates(root).firstOrDefault(function (s) { return s.id === stateId; });

        return found;
    }

    function findStateParent(root, stateId) {
        var found = allStates(root).firstOrDefault(function (s) {
            return s.states && s.states.some(function (s) { return s.id === stateId; });
        });

        return found;
    }


    function registerState() {
        return curry(function (parentStateId, stateBuilder) {
            var state = stateBuilder.toSpec(),
                parent,
                existing;

            parent = findState(applicationStatechartSpec, parentStateId);
            if (!parent) {
                throw new Error('Parent state "' + parentStateId + '" doesn\'t exist');
            }

            if (has(state, 'id')) {
                existing = findState(applicationStatechartSpec, state.id);
                if (existing) {
                    throw new Error('State "' + state.id + '" already exists.');
                }
            }

            if (!has(parent, 'states')) {
                parent.states = [];
            }
            parent.states.push(state);
        }).apply(null, arguments);
    }

    function registerStates(parentStateId) {
        if (core.isApplicationRunning()) {
            throw new Error('Can\'t register a state while application is running.');
        }

        toArray(arguments, 1).forEach(registerState(parentStateId));
    }

    function unregisterStates() {
        if (core.isApplicationRunning()) {
            throw new Error('Can\'t unregister a state while application is running.');
        }

        toArray(arguments).forEach(function (stateId) {
            var parent = findStateParent(applicationStatechartSpec, stateId),
                state = enumerable.from(parent.states).first(function (s) { return s.id === stateId; });
            removeOne(parent.states, state);
        });
    }

    function raise(eventOrName, eventDataOrDelay, delay) {
        var e;
        if (is(eventOrName, 'string')) {
            e = {name: eventOrName};
        } else {
            if (!is(eventOrName, 'name')) {
                throw new Error('event object should have `name` property.');
            }
            e = eventOrName;
        }

        if (!has(delay) && is(eventDataOrDelay, 'number')) {
            delay = eventDataOrDelay;
        } else {
            e.data = eventDataOrDelay;
        }

        applicationStatechart.send(e, {delay: delay});
    }

    applicationStatechartSpec = state('scalejs-app', parallel('root', state('ui'))).toSpec();

    core.onApplicationEvent(function (event) {
        switch (event) {
        case 'started':
            applicationStatechart = new scion.Statechart(applicationStatechartSpec, {
                logStatesEnteredAndExited: false
            });
            applicationStatechart.start();
            break;
        case 'stopped':
            break;
        }
    });

    return {
        registerStates: registerStates,
        unregisterStates: unregisterStates,
        raise: raise,
        builder: builder
    };
});



/*global define*/
define('scalejs.statechart-scion',[
    'scalejs!core',
    './scalejs.statechart-scion/state'
], function (
    core,
    state
) {
    

    core.registerExtension({ state: state });
});


