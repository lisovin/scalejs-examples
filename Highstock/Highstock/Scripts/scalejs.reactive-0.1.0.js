
/*global define*/
define('scalejs.reactive/reactive',[
    'require',
    'rx',
    'rx.binding',
    'rx.time'
], function (
    require,
    rx
) {
    

    rx.Observable.fromRequire = function (dependencies) {
        return rx.Observable.create(function (observer) {
            require(dependencies, function () {
                observer.onNext(arguments);
                observer.onCompleted();
            });
        });
    };

    rx.Observable.fromEnumerable = function (source) {
        return rx.Observable.createWithDisposable(function (observer) {
            var disposable = rx.Disposable.create(function () {
            }),
                enumerator = source.GetEnumerator();

            rx.Scheduler.currentThread.scheduleRecursive(function (self) {
                try {
                    if (!disposable.isDisposed && enumerator.MoveNext()) {
                        observer.onNext(enumerator.Current());
                        self();
                    } else {
                        enumerator.Dispose();
                        observer.onCompleted();
                    }
                } catch (e) {
                    enumerator.Dispose();
                    observer.onError(e);
                }
            });

            return disposable;
        });
    };

    return rx;
});

/*global define*/
define('scalejs.reactive/events',[
    'rx',
    'rx.binding'
], function (
    rx
) {
    

    var subject = new rx.Subject();

    function observe() {
        return subject.asObservable();
    }

    function publish(event) {
        subject.onNext(event);
    }

    return {
        observe: observe,
        publish: publish
    };

});

/*global define*/
define('scalejs.reactive',[
    'scalejs!core',
    'scalejs.reactive/reactive',
    'scalejs.reactive/events'
], function (
    core,
    reactive,
    events
) {
    

    var merge = core.object.merge;

    return {
        reactive: merge(reactive, { events: events })
    };
});
