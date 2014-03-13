
/*global define,window*/
define('scalejs.routing-historyjs/history',[
    'scalejs!core',
    'history',
    'scalejs.reactive'
], function (
    core,
    History
) {
    

    function add(state) {
        return History.pushState(state.data, state.title, state.url);
    }

    function get() {
        return History.getState();
    }

    function replace(state) {
        return History.replaceState(state.data, state.title, state.url);
    }

    function observe() {
        var observable = core.reactive.Observable,
            disposable = core.reactive.Disposable;

        return observable.createWithDisposable(function (observer) {
            var subId = History.Adapter.bind(window, 'statechange', function () {
                observer.onNext(get());
            });

            return disposable.create(function () {
                window.onstatechange = null;
            });
        }).publishValue(get())
            .refCount();
    }

    return {
        add: add,
        get: get,
        replace: replace,
        observe: observe
    };
});


/*global define,window,document*/
/*jslint todo:true*/
define('scalejs.routing-historyjs/routing',[
    'scalejs!core',
    './history',
    'scalejs.statechart-scion',
    'scalejs.reactive'
], function (
    core,
    history
) {
    

    var has = core.object.has,
        is = core.type.is,
        merge = core.object.merge,
        toArray = core.array.toArray,
        on = core.state.builder.on,
        gotoInternally = core.state.builder.gotoInternally,
        onEntry = core.state.builder.onEntry,
        state = core.state.builder.state,
        raise = core.state.raise,
        $yield = core.functional.builder.$yield,
        observeState = core.state.observe,
        routedStates = {},
        routerTransitions = [],
        first = true,
        baseUrl;

    function observeHistory() {
        return history
            .observe()
            .select(convertHistoryEventToNavigatonEvent);
    }

    function isBlank(url) {
        return url === '/' || url === '?' || url === '';
    }

    function serialize(data) {
        var url = "?" + data.path.join("/");

        if (has(data.parameters)) {
            url += "?" + Object.keys(data.parameters).map(function (k) {
                return k + "=" + data.parameters[k];
            }).join("&");
        }

        return url;
    }

    function deserialize(url) {
        var data = isBlank(url) ? [['']] : url.split("?")
            .filter(function (p) { return p !== "" })
            .map(function (d, i) {
                if (i === 0) {
                    return d.split("/");
                }
                return d.split("&");
            });

        return {
            path: data[0],
            parameters: has(data[1]) ? data[1].reduce(function (acc, x) {
                var pair = x.split("=");
                acc[pair[0]] = pair[1];
                return acc;
            }, {}) : undefined
        };
    }

    function convertHistoryEventToNavigatonEvent(evt) {
        var url = evt.hash.replace(baseUrl, ""),
            data = deserialize(url);

        return merge(data, {
            url: serialize(data),
            timestamp: new Date().getTime()
        })
    }

    function removeBrackets(x) {
        return is(x, 'string') ? x.replace("{", "").replace("}", "") : x;
    }

    function route(r) {
        var data = deserialize(r);


        return $yield(function (s) {
            routedStates[s.id] = data;

            routerTransitions.push(
                on('routed', function (e) {
                    if (e.data.path[0] === data.path[0]) {
                        data.path.slice(1).forEach(function (p, i) {
                            e.data[removeBrackets(p)] = e.data.path[i + 1]
                        });
                        e.data = merge(e.data, e.data.parameters);
                        return true;
                    }
                    return false;
                }, gotoInternally(s.id))
            );
        });
    }

    function navigate(data) {
        if (first) {
            first = false;
            history.replace({ url: serialize(data) });
        } else {
            history.add({ url: serialize(data) });
        }
    }

    function routerState(sid, optsOrBuilders) {
        var disposable = new core.reactive.CompositeDisposable(),
            router,
            builders;

        if (has(optsOrBuilders, 'baseUrl')) {
            baseUrl = optsOrBuilders.baseUrl;
            builders = toArray(arguments).slice(2, arguments.length);
        } else {
            builders = toArray(arguments).slice(1, arguments.length);
        }

        function subscribeRouter() {
            var curr;

            function isCurrent(url) {
                return url === curr;
            }

            disposable.add(observeState().subscribe(function (e) {
                var data;

                if (has(routedStates, e.state) && e.event === 'entry') {
                    data = routedStates[e.state];

                    data.path = data.path.map(function (p) {
                        var pkey = p.match(/[^{}]+(?=\})/);
                        if (has(pkey)) {
                            return e.currentEvent.data[pkey[0]]
                        }
                        return p;
                    });

                    if (has(data.parameters)) {
                        Object.keys(data.parameters).forEach(function (p) {
                            data.parameters[p] = e.currentEvent.data[removeBrackets(data.parameters[p])];
                        });
                    }

                    navigate(data);
                }
            }));

            disposable.add(observeHistory().subscribe(function (e) {
                if (isCurrent(e.url)) { return; } //do not cause statechange if url is the same!
                curr = e.url;

                // needs a delay of 0 so that the transition is defined on the parent state
                raise('routed', { path: e.path, parameters: e.parameters }, 0);
            }));
        }

        router = state.apply(null, [
            sid,
            on('router.disposing', gotoInternally('router.disposed')),
            state('router.waiting', onEntry(subscribeRouter)),
            state('router.disposed', onEntry(function () {
                disposable.dispose();
                routedStates = {};
                routerTransitions = [];
            }))
        ].concat(routerTransitions)
            .concat(builders));

        return router;
    }

    return {
        //back: back,
        route: route,
        routerState: routerState
    };
});

/*global define*/
define('scalejs.routing-historyjs',[
    'scalejs!core',
    './scalejs.routing-historyjs/routing'
], function (
    core,
    routing
) {
    

    core.registerExtension({ routing: routing });
});

