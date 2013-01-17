
/*global define,console,document*/
define('scalejs.ajax-jquery/json',[
    'scalejs!core',
    'json2'
], function (
    core,
    json2
) {
    

    var has = core.object.has;

    function toJson(obj) {
        return json2.stringify(obj);
    }

    function fromJson(json) {
        if (!has(json) || json === "") {
            return {};
        }

        return json2.parse(json);
    }

    return {
        toJson: toJson,
        fromJson: fromJson
    };
});

/*global define*/
define('scalejs.ajax-jquery/ajax',[
    'jQuery',
    'scalejs!core'
], function (
    jQuery,
    core
) {
    

    function ajax(url, opts) {
        var observable = core.reactive.Observable,
            merge = core.object.merge,
            log = core.log;

        return observable.create(function (observer) {
            /*jslint unparam: true*/
            function success(data, textStatus, jqXhr) {
                observer.onNext(data);
            }
            /*jslint unparam: false*/

            /*jslint unparam: true*/
            function error(jqXhr, textStatus, errorThrown) {
                log.error('Error: "' + errorThrown + ': ' + textStatus + ' in response to ' + url + '"');
                observer.onError({
                    error: errorThrown,
                    status: textStatus
                });
            }

            function completed() {
                observer.onCompleted();
            }
            /*jslint unparam: false*/

            var settings = merge({
                type: 'GET',
                /*headers: {
                    'Accept': 'application/json'
                },*/
                success: success,
                error: error,
                completed: completed
            }, opts);

            jQuery.ajax(url, settings);

            return function () {};
        });
    }

    function get(url, data, options) {
        options = core.object.merge(options, {
            type: 'GET',
            data: data
        });

        return ajax(url, options);
    }

    function postMultipart(url, data, options) {
        options = core.object.merge(options, {
            type: 'POST',
            data: data
        });

        return ajax(url, options);
    }

    function postJson(url, data, options) {
        var jsonString = core.json.toJson(data);
        options = core.object.merge(options, {
            type: 'POST',
            data: jsonString,
            contentType: 'application/json',
            processData: false
        });

        return ajax(url, options);
    }

    return {
        postJson: postJson,
        postMultipart: postMultipart,
        get: get
    };
});

/*global define*/
define('scalejs.ajax-jquery',[
    './scalejs.ajax-jquery/json',
    './scalejs.ajax-jquery/ajax'
], function (
    json,
    ajax
) {
    

    return {
        json: json,
        ajax: ajax
    };
});

