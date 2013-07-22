
/*global define, document, window */
define('scalejs.layout-cssgrid/utils.base',[],function () {
    

    function defined(test) {
        return test !== undefined;
    }

    String.prototype.contains = function (str) {
        return this.indexOf(str) !== -1;
    };

    function is(obj, test) {
        var r = false,
            testType = typeof test,
            objType = typeof obj;

        try {
            r = obj instanceof test;
        } catch (e) {
            r = testType === 'string' &&
                    objType === test;
        }

        return r;
    }

    function createBoundedWrapper(method) {
        return function () {
            return method.apply(null, arguments);
        };
    }

    function toArray(list, start, end) {
        if (list === undefined || list === null) {
            return [];
        }

        /*ignore jslint start*/
        var array = [],
            i,
            result;

        for (i = list.length; i--; array[i] = list[i]) { }

        result = Array.prototype.slice.call(array, start, end);

        return result;
        /*ignore jslint end*/
    }

    return {
        is: is,
        defined: defined,
        toArray: toArray,
        createBoundedWrapper: createBoundedWrapper
    };
});
/*global define, require, document, window */
define('scalejs.layout-cssgrid/utils.sheetLoader',[
    './utils.base',
    'cssParser',
    'domReady'
], function (
    base,
    cssParser
) {
    

    var toArray = base.toArray;

    function loadStyleSheet(url, loadedStyleSheets, onLoaded) {
        if (loadedStyleSheets.hasOwnProperty(url)) {
            return;
        }

        loadedStyleSheets[url] = null;

        require(['text!' + url], function (stylesheet) {
            var parsed = cssParser.parse(stylesheet);

            loadedStyleSheets[url] = parsed;

            (parsed.imports || []).forEach(function (cssImport) {
                loadStyleSheet(cssImport['import'], loadedStyleSheets, onLoaded);
            });

            onLoaded();
        });
    }

    function loadAllStyleSheets(onLoaded) {
        var loadedStyleSheets = {};

        toArray(document.styleSheets)
            .forEach(function (sheet) {
                if (sheet.href) {
                    loadStyleSheet(sheet.href, loadedStyleSheets, function () {
                        //console.log(sheet.href, loadedStyleSheets);
                        var url;
                        for (url in loadedStyleSheets) {
                            if (loadedStyleSheets.hasOwnProperty(url)) {
                                if (loadedStyleSheets[url] === null) {
                                    return;
                                }
                            }
                        }

                        onLoaded(loadedStyleSheets);
                    });
                }
            });
    }

    return {
        loadAllStyleSheets: loadAllStyleSheets
    };
});
/*global define */
define('scalejs.layout-cssgrid/consts',[],function () {
    

    return {
        GRIDLAYOUT  : 'css-grid-layout',
        STRING      : 'string',
        PROPERTY	: 'property',
        MOZ			: '-moz-',
        MS			: '-ms-',
        OPERA		: '-o-',
        WEBKIT		: '-webkit-',
        SPACE		: ' ',
        PERIOD		: '.',
        COLON		: ':',
        SEMICOL		: ';',
        OPEN_CURLY  : '{',
        CLOSE_CURLY : '}',
        HYPHEN		: '-',
        EMPTY		: '',
        AUTO		: 'auto',
        NONE		: 'none',
        DISPLAY		: 'display',
        POSITION	: 'position',
        RELATIVE	: 'relative',
        STATIC		: 'static',
        ABSOLUTE	: 'absolute',
        WIDTH		: 'width',
        HEIGHT		: 'height',
        PADDING		: 'padding',
        MARGIN		: 'margin',
        BORDER		: 'border',
        STYLE		: '-style',
        TOP			: 'top',
        BOTTOM		: 'bottom',
        LEFT		: 'left',
        RIGHT		: 'right',
        MIN			: 'min-',
        MAX			: 'max-',
        PX			: 'px',
        EM			: 'em',
        PERCENT		: '%',
        REM			: 'rem',
        FR			: 'fr',
        CONTENTBOX	: 'content-box',
        PADDINGBOX	: 'padding-box',
        STRETCH		: 'stretch',
        // properties, etc.
        GRID				: 'grid',
        INLINEGRID			: 'inline-grid',
        GRIDCOLUMNS			: 'grid-columns',
        GRIDCOLUMN			: 'grid-column',
        GRIDCOLUMNSPAN		: 'grid-column-span',
        GRIDCOLUMNALIGN		: 'grid-column-align',
        GRIDROWS			: 'grid-rows',
        GRIDROW				: 'grid-row',
        GRIDROWSPAN			: 'grid-row-span',
        GRIDROWALIGN		: 'grid-row-align',
        BOXSIZING			: 'box-sizing',
        BLOCKPROGRESSION	: 'block-progression',
        precision					: 0, // decimal places
        agentTruncatesLayoutLengths: true,
        regexSpaces: /\s+/
    };
});
/*global define */
define('scalejs.layout-cssgrid/enums',['./consts'], function (consts) {
    

    var EMPTY = consts.EMPTY,
        STATIC = consts.STATIC,
        calculatorOperation = {
            minWidth: {},
            maxWidth: {},
            minHeight: {},
            maxHeight: {},
            shrinkToFit: {}
        },
	    gridTrackValue = {
	        auto: { keyword: consts.AUTO },
	        minContent: { keyword: 'min-content' },
	        maxContent: { keyword: 'max-content' },
	        fitContent: { keyword: 'fit-content' },
	        minmax: { keyword: 'minmax' },
            parse: function (trackValueString) {
                switch (trackValueString) {
                case gridTrackValue.auto.keyword:
                    return gridTrackValue.auto;
                case gridTrackValue.minContent.keyword:
                    return gridTrackValue.minContent;
                case gridTrackValue.maxContent.keyword:
                    return gridTrackValue.maxContent;
                case gridTrackValue.fitContent.keyword:
                    return gridTrackValue.fitContent;
                case gridTrackValue.minmax.keyword:
                    return gridTrackValue.minmax;
                default:
                    throw new Error('unknown grid track string: ' + trackValueString);
                }
            }
        },
	    gridAlign = {
	        stretch: { keyword: consts.STRETCH },
	        start: { keyword: 'start' },
	        end: { keyword: 'end' },
	        center: { keyword: 'center' },
            parse: function (alignString) {
                switch (alignString) {
                case gridAlign.start.keyword:
                    return gridAlign.start;
                case gridAlign.end.keyword:
                    return gridAlign.end;
                case gridAlign.center.keyword:
                    return gridAlign.center;
                    // default
                case gridAlign.stretch.keyword:
                case null:
                case EMPTY:
                    return gridAlign.stretch;
                default:
                    throw new Error('unknown grid align string: ' + alignString);
                }
            }
        },
	    position = {
	        "static": { keyword: consts.STATIC },
	        relative: { keyword: consts.RELATIVE },
	        absolute: { keyword: consts.ABSOLUTE },
	        fixed: { keyword: 'fixed' },
            parse : function (positionString) {
                switch (positionString) {
                case position.relative.keyword:
                    return position.relative;
                case position.absolute.keyword:
                    return position.absolute;
                case position.fixed.keyword:
                    return position.fixed;
                    // default
                case position[STATIC].keyword:
                case null:
                case EMPTY:
                    return position[STATIC];
                default:
                    throw new Error('unknown position string: ' + positionString);
                }
            }
	    },

	    blockProgression = {
	        tb: { keyword: 'tb' },
	        bt: { keyword: 'bt' },
	        lr: { keyword: 'lr' },
	        rl: { keyword: 'rl' },
	        parse: function (positionString) {
                switch (positionString) {
            // default
                case blockProgression.tb.keyword:
                case null:
                case EMPTY:
                    return blockProgression.tb;
                case blockProgression.bt.keyword:
                    return blockProgression.bt;
                case blockProgression.lr.keyword:
                    return blockProgression.lr;
                case blockProgression.rl.keyword:
                    return blockProgression.rl;
                default:
                    throw new Error('unknown block-progression string: ' + positionString);
                }
            }
	    },

	    borderWidths = {
	        thin: 0,
	        medium: 0,
	        thick: 0
	    },
	    sizingType = {
	        valueAndUnit: {},
	        keyword: {}
	    };



    return {
        calculatorOperation: calculatorOperation,
        gridTrackValue: gridTrackValue,
        gridAlign: gridAlign,
        position: position,
        blockProgression: blockProgression,
        borderWidths: borderWidths,
        sizingType: sizingType
    };
});
/*global define */
define('scalejs.layout-cssgrid/objects',['./enums'], function (enums) {
    

    function track() {
        return {
            number: null,
            size: null,
            sizingType: null,
            items: [],
            measure: null,
            minMeasure: null,
            maxMeasure: null,
            contentSizedTrack: false,
            implicit: false
        };
    }

    function implicitTrackRange() {
        return {
            firstNumber: null,
            span: null,
            size: enums.gridTrackValue.auto,
            sizingType: enums.sizingType.keyword,
            items: [],
            measure: null
        };
    }

    function widthAndHeight() {
        return {
            width: null,
            height: null
        };
    }

    function cssValueAndUnit() {
        return {
            value: null,
            unit: null
        };
    }

    function item() {
        return {
            itemElement: null,
            styles: null,
            position: null,
            column: 1,
            columnSpan: 1,
            columnAlign: enums.gridAlign.stretch,
            row: 1,
            rowSpan: 1,
            rowAlign: enums.gridAlign.stretch,
            // Used width calculated during column track size resolution.
            usedWidthMeasure: null,
            maxWidthMeasure: null,
            maxHeightMeasure: null,
            shrinkToFitSize: null, // physical dimensions
            verified: {
                columnBreadth: false,
                rowBreadth: false,
                columnPosition: false,
                rowPosition: false
            }
        };
    }

    return {
        track: track,
        implicitTrackRange: implicitTrackRange,
        item: item,
        widthAndHeight: widthAndHeight,
        cssValueAndUnit: cssValueAndUnit
    };
});
/*global define, document, window */
define('scalejs.layout-cssgrid/utils.css',[
    './consts',
    './utils.base'
], function (
    consts,
    utils
) {
    

    var HYPHEN = consts.HYPHEN,
        EMPTY = consts.EMPTY,
        STRING = consts.STRING,
        GRIDLAYOUT = consts.GRIDLAYOUT,
        SPACE = consts.SPACE,
        ALL = 'all',
        MEDIA = 'media',
        TYPE = consts.TYPE,
        defined = utils.defined,
        is = utils.is,
        headEl = document.getElementsByTagName('head')[0],
        styleEl = document.createElement('style'),
        embedded_css = [],
        addRules;

    styleEl.setAttribute(TYPE, 'text/css');

    if (defined(styleEl.styleSheet)) {
        addRules = function (el, styles) {
            el.styleSheet.cssText += styles;
        };
    } else {
        addRules = function (el, styles) {
            el.appendChild(document.createTextNode(styles));
        };
    }

    function low(w) {
        return is(w, STRING) ? w.toLowerCase() : w;
    }

    function camelize(str) {
        var regex = /(-[a-z])/g,
            func = function (bit) {
                return bit.toUpperCase().replace(HYPHEN, EMPTY);
            };

        return is(str, STRING)
            ? low(str).replace(regex, func)
            : str;
    }

    /**
     * eCSStender::makeUniqueClass()
     * creates a unique class for an element
     * 
     * @return str - the unique class
     */
    function makeUniqueClass() {
        var start = new Date().getTime();

        start += Math.floor(Math.random() * start);

        return GRIDLAYOUT + HYPHEN + start;
    }

    function newRegExp(rxp) {
        return new RegExp(rxp);
    }

    function makeClassRegExp(the_class) {
        return newRegExp('(\\s|^)' + the_class + '(\\s|$)');
    }

    /**
     * checks to see if an element has the given class
     *
     * @param obj el - the element to have its class augmented
     * @param str the_class - the class to add
     * @param RegExp re - a regular expression to match the class (optional)
     */
    function hasClass(el, the_class, re) {
        re = re || makeClassRegExp(the_class);
        return el.className.match(re);
    }

    /**
     * adds a class to an element
     *
     * @param obj el - the element to have its class augmented
     * @param str the_class - the class to add
     * @param RegExp re - a regular expression to match the class (optional)
     */
    function addClass(el, the_class, re) {
        re = re || makeClassRegExp(the_class);
        if (!hasClass(el, the_class, re)) {
            el.className += SPACE + the_class;
        }
    }

    function in_object(needle, haystack) {
        var key;
        for (key in haystack) {
            if (haystack[key] === needle) { return true; }
        }
        return false;
    }

    /**
     * adds a new stylesheet to the document
     *
     * @param str media  - the media to apply the stylesheet to
     * @param str id     - the id to give the stylesheet (optional)
     * @param bool delay - whether or not to delay the writing of the stylesheet (default = true)
     * 
     * @return obj - the STYLE element
     */
    function newStyleElement(media, id) {
        // clone the model style element
        var style = styleEl.cloneNode(true);
        // set the media type & id
        media = media || ALL;
        style.setAttribute(MEDIA, media);
        id = id || 'temp-' + Math.round(Math.random() * 2 + 1);
        style.setAttribute('id', id);
        headEl.appendChild(style);
        // return the element reference
        return style;
    }

    function clearEmbeddedCss(media) {
        var id, style;

        media = media || ALL;

        id = GRIDLAYOUT + HYPHEN + media;

        style = document.getElementById(id);
        if (style) {
            while (style.childNodes.length > 0) {
                style.removeChild(style.childNodes[0]);
            }
        }
    }

    /**
       * embeds styles to the appropriate media
       *
       * @param str styles - the styles to embed
       * @param str media  - the media to apply the stylesheet to (optional)
       * @param bool delay - whether or not to delay the writing of the stylesheet (default = true)
       * 
       * @return obj - the STYLE element
       */
    function embedCss(styles, media) {
        // determine the medium
        media = media || ALL;
        // determine the id
        var id = GRIDLAYOUT + HYPHEN + media, style;
        // find or create the embedded stylesheet
        if (!in_object(media, embedded_css)) {
            // make the new style element
            style = newStyleElement(media, id);
            // store the medium
            embedded_css.push(media);
        } else {
            style = document.getElementById(id);
        }
        // add the rules to the sheet
        if (style !== null) {
            addRules(style, styles);
        }
        // return the style element
        return style;
    }

    /**
       * eCSStender::getCSSValue()
       * gets the computed value of a CSS property
       *
       * @param obj el - the element
       * @param str prop - the property name
       * 
       * @return str - the value
       */
    function getCssValue(el, prop) {
        var computed = window.getComputedStyle;
        if (el.currentStyle) {
            return el.currentStyle[camelize(prop)];
        }

        if (computed) {
            return computed(el, null).getPropertyValue(prop);
        }

        return false;
    }

    return {
        makeUniqueClass: makeUniqueClass,
        getCssValue: getCssValue,
        addClass: addClass,
        embedCss: embedCss,
        clearEmbeddedCss: clearEmbeddedCss
    };
});
/*global define, document, window */
define('scalejs.layout-cssgrid/utils',[
    './utils.base',
    './utils.css'
], function (
    base,
    css
) {
    

    return {
        is: base.is,
        defined: base.defined,
        createBoundedWrapper: base.createBoundedWrapper,
        makeUniqueClass: css.makeUniqueClass,
        getCssValue: css.getCssValue,
        addClass: css.addClass,
        embedCss: css.embedCss,
        clearEmbeddedCss: css.clearEmbeddedCss
    };
});
/*global define, document */
define('scalejs.layout-cssgrid/layoutMeasure',[
    './consts',
    './enums',
    './utils'
], function (
    consts,
    enums,
    utils
) {
    

    var precision = consts.precision,
        PERIOD = consts.PERIOD,
        PX = consts.PX,
        EM = consts.EM,
        REM = consts.REM,
        PERCENT = consts.PERCENT,
        HEIGHT = consts.HEIGHT,
        WIDTH = consts.WIDTH,
        LEFT = consts.LEFT,
        RIGHT = consts.RIGHT,
        TOP = consts.TOP,
        BOTTOM = consts.BOTTOM,
        NONE = consts.NONE,
        zerostring = '0',
        borderWidths = enums.borderWidths,
        getCssValue = utils.getCssValue;

    function create(measure) {
        var internalMeasure;

        if (measure % 1 !== 0) {
            throw new Error('LayoutMeasures must be integers, measure was ' + typeof (measure) + '(' + measure + ')');
        }

        internalMeasure = measure;

        function getRawMeasure() {
            return internalMeasure;
        }

        function getPixelValue() {
            return internalMeasure / Math.pow(10, precision);
        }

        function getMeasureRoundedToWholePixel() {
            var abs = Math.abs,
			    pow = Math.pow,
			    fractionOfPixel = abs(internalMeasure % pow(10, precision)),
			    adjustment;

            if (fractionOfPixel >= 5 * pow(10, precision - 1)) {
                // Round up.
                adjustment = pow(10, precision) - fractionOfPixel;
            } else {
                // Round down.
                adjustment = -fractionOfPixel;
            }

            if (internalMeasure < 0) {
                adjustment = -adjustment;
            }
            return create(internalMeasure + adjustment);
        }

        function add(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.add only accepts layout measures');
            }

            return create(internalMeasure + measure.getRawMeasure());
        }

        function subtract(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.subtract only accepts layout measures');
            }
            return create(internalMeasure - measure.getRawMeasure());
        }

        function multiply(number) {
            if (typeof number !== "number") {
                throw new Error('LayoutMeasure.multiply only accepts numbers');
            }
            // Integer arithmetic; drop any remainder.
            return create(Math.floor(internalMeasure * number));
        }

        function divide(number) {
            if (typeof number !== "number") {
                throw new Error('LayoutMeasure.divide only accepts number');
            }
            // Integer arithmetic; drop any remainder.
            return create(Math.floor(internalMeasure / number));
        }

        function equals(measure) {
            if (typeof measure.getRawMeasure !== 'function') {
                throw new Error('LayoutMeasure.equals only accepts layout measures');
            }
            return internalMeasure === measure.getRawMeasure();
        }

        return {
            getRawMeasure: getRawMeasure,
            getPixelValue: getPixelValue,
            getMeasureRoundedToWholePixel: getMeasureRoundedToWholePixel,
            add: add,
            subtract: subtract,
            multiply: multiply,
            divide: divide,
            equals: equals
        };
    }

    function measureFromPx(measureInPx) {
        // Convert to accuracy of agent's layout engine.
        return create(Math.round(measureInPx * Math.pow(10, precision)));
    }

    function zero() {
        return create(0);
    }

    function min(a, b) {
        return create(Math.min(a.getRawMeasure(), b.getRawMeasure()));
    }

    function max(a, b) {
        return create(Math.max(a.getRawMeasure(), b.getRawMeasure()));
    }

    function measureFromPxString(measureInPxString) {
        var length = measureInPxString.length,
		    wholePart = 0,
		    fractionPart = 0,
		    decimalPosition = measureInPxString.indexOf(PERIOD);

        // Don't depend on a potentially lossy conversion to a float-- we'll parse it ourselves.
        measureInPxString = measureInPxString.substr(0, measureInPxString.length - 2);

        if (decimalPosition >= 0) {
            fractionPart = measureInPxString.substring(decimalPosition + 1);
            while (fractionPart.length < precision) {
                fractionPart += zerostring;
            }
            fractionPart = parseInt(fractionPart, 10);
        }
        if (decimalPosition !== 0) {
            wholePart = measureInPxString.substring(0, decimalPosition >= 0 ? decimalPosition : length);
            wholePart = parseInt(wholePart, 10) * Math.pow(10, precision);
        }
        //return create(wholePart + fractionPart);
        return create(wholePart);
    }

    function measureFromStyleProperty(el, property) {
        // TODO: handle borders with no style and keywords
        var val = getCssValue(el, property),
		    found = false,
		    size,
            s,
            em,
            rem,
            percent;

        if (!val.contains(PX)) {
            if (property.contains('border-width')) {
                size = getCssValue(el, 'border-style');
                if (size === NONE) {
                    val = '0' + PX;
                    found = true;
                } else {
                    for (s in borderWidths) {
                        if (borderWidths.hasOwnProperty(s)) {
                            if (size === s) {
                                val = borderWidths[s] + PX;
                                found = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (!found) {
                em = val.contains(EM);
                rem = val.contains(REM);
                percent = val.contains(PERCENT);
                if (em || rem) {
                    size = parseInt(getCssValue((em ? el : document.body), 'font-size'), 10);
                    val = (parseInt(val, 10) * size) + PX;
                } else if (percent) {
                    if (property.contains(WIDTH) ||
                            property.contains(LEFT) ||
                                property.contains(RIGHT)) {
                        s = el.parentNode.clientWidth;
                    } else if (property.contains(HEIGHT) ||
                                property.contains(TOP) ||
                                    property.contains(BOTTOM)) {
                        s = el.parentNode.clientHeight;
                    }
                    val = Math.round((parseInt(val, 10) / 100) * s) + PX;
                }
            }
        }
        return measureFromPxString(val);
    }

    return {
        create: create,
        measureFromPx: measureFromPx,
        measureFromStyleProperty: measureFromStyleProperty,
        zero: zero,
        min: min,
        max: max
    };
});
/*global define, console */
define('scalejs.layout-cssgrid/trackManager',[
    './consts',
    './enums',
    './objects'
], function (
    consts,
    enums,
    objects
) {
    

    var FR = consts.FR,
        sizingType = enums.sizingType,
        gridTrackValue = enums.gridTrackValue,
        track = objects.track,
        implicitTrackRange = objects.implicitTrackRange;

	return function trackManager() {
	    var tracks = [],
            implicitTrackRanges = [];

	    function trackIterator() {
	        var iteratingtracks = true,
                currentTrackIndex = 0,
                currentImplicitTrackRangeIndex = 0;

	        function reset() {
	            iteratingtracks = true;
	            currentTrackIndex = 0;
	            currentImplicitTrackRangeIndex = 0;
	        }

	        function next() {
	            var nextTrack = null,
                    returnNextTrackRange = false,
                    tracksLength = tracks.length,
                    implicitTrackRangesLength = implicitTrackRanges.length;

	            if (currentTrackIndex >= tracksLength) {
	                returnNextTrackRange = true;
	            } else if (currentImplicitTrackRangeIndex < implicitTrackRangesLength) {
	                // We have both a non-range track and a range track-- check to see if we should return the track range first.
	                if (implicitTrackRanges[currentImplicitTrackRangeIndex].firstNumber < tracks[currentTrackIndex].number) {
	                    returnNextTrackRange = true;
	                }
	            }
	            if (returnNextTrackRange &&
                        currentImplicitTrackRangeIndex < implicitTrackRangesLength) {
	                nextTrack = implicitTrackRanges[currentImplicitTrackRangeIndex];
	                currentImplicitTrackRangeIndex += 1;
	            } else if (currentTrackIndex < tracksLength) {
	                nextTrack = tracks[currentTrackIndex];
	                currentTrackIndex += 1;
	            }
	            return nextTrack;
	        }

	        return {
	            reset: reset,
	            next: next
	        };
	    }

	    function addTrack(trackToAdd) {
	        tracks.push(trackToAdd);
	    }

	    function getRangeLastTrackNumber(range) {
	        return range.firstNumber + range.span - 1;
	    }

	    function makeRoomForExplicitTrack(trackNumber) {
	        var i = 0,
                len = implicitTrackRanges.length,
			    curRange,
                nextRange,
                firstRangeNum,
                firstRangeSpan,
                secondRangeNum,
                //secondRangeSpan,
                //newRange,
                lastTrackNumber;

	        for (i = 0; i < len; i += 1) {
	            curRange		= implicitTrackRanges[i];
	            lastTrackNumber = getRangeLastTrackNumber(curRange);
	            if (trackNumber >= curRange.firstNumber &&
					    trackNumber <= lastTrackNumber) {
	                // This range covers the explicit track we are adding. Split, if necessary, and vacate the track.
	                nextRange = i < len - 1 ? null : implicitTrackRanges[i + 1];
	                // In the first track this range covers.
	                if (trackNumber === curRange.firstNumber) {
	                    if (curRange.span === 1) {
	                        // Remove the range.
	                        implicitTrackRanges.splice(i, 1);
	                    } else {
	                        // Vacate the track.
	                        curRange.firstNumber += 1;
	                        curRange.span -= 1;
	                    }
	                } else if (trackNumber === lastTrackNumber) {
	                    // In the last track this range covers.					
	                    // Vacate the track.
	                    curRange.span -= 1;
	                } else {
	                    // Need to split the range.
	                    // Compute new range values.
	                    firstRangeNum	= curRange.firstNumber;
	                    firstRangeSpan	= trackNumber - curRange.firstNumber;
	                    secondRangeNum = trackNumber + 1;
	                    throw new Error('Not implemented');
                        /*
	                    secondRangeSpan = lastTrackNumber - secondRangeFirstNumber + 1;

	                    // Move the existing range to the second half and add a new range before it.
	                    curRange.firstNumber = secondRangeFirstNumber;
	                    curRange.span = secondRangeSpan;

	                    newRange = new ImplicitTrackRange();
	                    newRange.firstNumber	= firstRangeFirstNumber;
	                    newRange.span			= firstRangeSpan;
	                    // Insert before the existing range.
	                    this.implicitTrackRanges.splice(i, 0, newRange); */
	                }
	                break;
	            }
	        }
	    }

	    function ensureFirstTrackExists(firstTrackNumber) {
	        // Ensure an actual track object exists for the first track.
	        makeRoomForExplicitTrack(firstTrackNumber);

	        var i = 0,
			    len = tracks.length,
			    newTrack = track();

	        newTrack.number		= firstTrackNumber;
	        newTrack.sizingType = sizingType.keyword;
	        newTrack.size		= gridTrackValue.auto;
	        newTrack.implicit = true;

	        if (len === 0 ||
				    firstTrackNumber > tracks[len - 1].number) {
	            // No tracks OR it doesn't exist
	            // add to the end.
	            addTrack(newTrack);
	        //} else if (firstTrackNumber === tracks[len - 1].number) {
	            // Already exists at the end.
	        } else if (firstTrackNumber !== tracks[len - 1].number) {
	            // Doesn't belong at the end. Determine if it exists and, if not, create one and insert it.
	            for (i = 0; i < len; i += 1) {
	                if (firstTrackNumber === tracks[i].number) {
	                    break; // Already exists.
	                } else if (firstTrackNumber < tracks[i].number) {
	                    tracks.splice(i, 0, newTrack);
	                    break;
	                }
	            }
	        }
	    }

	    function ensureTracksExist(firstTrackNumber, lastTrackNumber) {
	        var //newRangeFirstNumber = firstTrackNumber,
			    //newRangeLastNumber = lastTrackNumber,
			    trackLength = tracks.length,
			    mathMin = Math.min,
			    mathMax = Math.max,
			    rangesToCreate,
                curFirstTrackNumber,
                curLastTrackNumber,
                nonRangeTrackIndex,
			    existingRangeIndex,
                newRangeIndex,
                rangesToCreateLength,
                implicitTrackRangesLength,
			    rangeToCreate,
                rangeToCreateFirstNumber,
                rangeToCreateLastNumber,
                needToCreateRange,
			    existingRange,
                existingRangeFirstNumber,
                existingRangeLastNumber,
			    firstRangeFirstNumber,
                firstRangeSpan,
			    secondRangeFirstNumber,
                secondRangeSpan,
			    thirdRangeFirstNumber,
                thirdRangeSpan,
			    newRange;

	        ensureFirstTrackExists(firstTrackNumber);

	        // First track now exists; insert one or more ranges into the set of implicit track ranges.
	        firstTrackNumber += 1;

	        if (firstTrackNumber <= lastTrackNumber) {
	            rangesToCreate		= [];
	            curFirstTrackNumber = firstTrackNumber;
	            curLastTrackNumber	= lastTrackNumber;
	            // Iterate over the non-range track objects and split up our range into multiple ones if necessary.
	            if (trackLength === 0) {
	                // TODO: throw instead of pushing here; at least one track should have been created by ensureFirstTrackExists.
	                rangesToCreate.push({ first: curFirstTrackNumber, last: curLastTrackNumber });
	            }
	            for (nonRangeTrackIndex = 0; nonRangeTrackIndex < trackLength; nonRangeTrackIndex += 1) {
	                if (curFirstTrackNumber > curLastTrackNumber ||
						    tracks[nonRangeTrackIndex].number > curLastTrackNumber) {
	                    break;
	                }

	                // This track sits inside our range.
	                if (tracks[nonRangeTrackIndex].number >= curFirstTrackNumber &&
						    tracks[nonRangeTrackIndex].number <= curLastTrackNumber) {
	                    if (curFirstTrackNumber === tracks[nonRangeTrackIndex].number) {
	                        // No need to create a new range; just move out of the way.
	                        curFirstTrackNumber += 1;
	                    } else if (curLastTrackNumber === tracks[nonRangeTrackIndex].number) {
	                        // No need to create a new range; just move out of the way.
	                        curLastTrackNumber -= 1;
	                    } else {
	                        // Split the range
	                        // add the first half to the list of ranges to create,
	                        // and continue through the loop with the second half, searching
	                        // for more intersections with non-range tracks.
	                        rangesToCreate.push({ first: curFirstTrackNumber, last: tracks[nonRangeTrackIndex].number - 1 });
	                        curFirstTrackNumber = tracks[nonRangeTrackIndex].number + 1;
	                    }
	                }
	            }
	            if (curFirstTrackNumber <= curLastTrackNumber) {
	                rangesToCreate.push({ first: curFirstTrackNumber, last: curLastTrackNumber });
	            }
	            existingRangeIndex		= 0;
	            rangesToCreateLength	= rangesToCreate.length;
	            for (newRangeIndex = 0; newRangeIndex < rangesToCreateLength; newRangeIndex += 1) {
	                rangeToCreate				= rangesToCreate[newRangeIndex];
	                rangeToCreateFirstNumber	= rangeToCreate.first;
	                rangeToCreateLastNumber		= rangeToCreate.last;
	                needToCreateRange			= true;
	                implicitTrackRangesLength = implicitTrackRanges.length;

	                for (existingRangeIndex = 0; existingRangeIndex < implicitTrackRangesLength; existingRangeIndex += 1) {
	                    // Find any ranges that might intersect.
	                    existingRange				= implicitTrackRanges[existingRangeIndex];
	                    existingRangeFirstNumber	= existingRange.firstNumber;
	                    existingRangeLastNumber		= getRangeLastTrackNumber(existingRange);

	                    if (rangeToCreateLastNumber < existingRangeFirstNumber) {
	                        // We are past the existing range.
	                        break;
	                    }

	                    if (rangeToCreateFirstNumber <= existingRangeLastNumber) {
	                        if (rangeToCreateFirstNumber === existingRangeFirstNumber &&
                                            rangeToCreateLastNumber === existingRangeLastNumber) {
	                            // Check if this same range already exists.
	                            needToCreateRange = false;
	                            break;
	                        }


	                        // We have some intersection. 
	                        // Split into up to three ranges to cover the existing range and our new one.else
	                        firstRangeFirstNumber = mathMin(rangeToCreateFirstNumber, existingRangeFirstNumber);
	                        firstRangeSpan = mathMax(rangeToCreateFirstNumber, existingRangeFirstNumber) - firstRangeFirstNumber;
	                        secondRangeFirstNumber = firstRangeFirstNumber + firstRangeSpan;
	                        secondRangeSpan = mathMin(rangeToCreateLastNumber, existingRangeLastNumber) - secondRangeFirstNumber;
	                        thirdRangeFirstNumber = secondRangeFirstNumber + secondRangeSpan;
	                        thirdRangeSpan = mathMax(rangeToCreateLastNumber, existingRangeLastNumber) - thirdRangeFirstNumber + 1;

	                        // Insert the new ranges in front of the existing one.
	                        if (firstRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = firstRangeFirstNumber;
	                            newRange.span = firstRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }

	                        if (secondRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = secondRangeFirstNumber;
	                            newRange.span = secondRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }

	                        if (thirdRangeSpan > 0) {
	                            newRange = implicitTrackRange();
	                            newRange.firstNumber = thirdRangeFirstNumber;
	                            newRange.span = thirdRangeSpan;
	                            implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                            existingRangeIndex += 1;
	                        }
	                        // Remove the old range.

	                        implicitTrackRanges.splice(existingRangeIndex, 1);
	                        needToCreateRange = false;
	                        break;
	                    }
	                }

	                if (needToCreateRange) {
	                    newRange				= implicitTrackRange();
	                    newRange.firstNumber	= rangeToCreateFirstNumber;
	                    newRange.span			= rangeToCreateLastNumber - rangeToCreateFirstNumber + 1;

	                    if (existingRangeIndex >= implicitTrackRanges.length) {
	                        // Add to the end.
	                        implicitTrackRanges.push(newRange);
	                    } else {
	                        // Add before the existing one.
	                        implicitTrackRanges.splice(existingRangeIndex, 0, newRange);
	                    }
	                }
	            }
	        }
	    }

	    function getIterator() {
	        return trackIterator();
	    }

	    function getTrack(trackNumber) {
	        var i,
                len,
                curRangeLastNumber;

	        for (len = tracks.length - 1; len >= 0; len -= 1) {
	            if (tracks[len].number < trackNumber) {
	                break;
	            }

	            if (trackNumber === tracks[len].number) {
	                return tracks[len];
	            }
	        }

	        len = implicitTrackRanges.length;

	        for (i = 0; i < len; i += 1) {
	            curRangeLastNumber = implicitTrackRanges[i].firstNumber + implicitTrackRanges[i].span - 1;
	            if (trackNumber >= implicitTrackRanges[i].firstNumber &&
					    trackNumber <= curRangeLastNumber) {
	                return implicitTrackRanges[i];
	            }
	        }
	        // console.log("getTrack: invalid track number " + trackNumber);
	    }

	    function getTracks(firstTrackNumber, lastTrackNumber) {
	        var collection			= [],
			    number,
                i,
                len,
                curRangeLastNumber;

	        for (i = 0, len = tracks.length; i < len; i += 1) {
	            number = tracks[i].number;

	            if (number > lastTrackNumber) {
	                break;
	            }

	            if (number >= firstTrackNumber &&
					    number <= lastTrackNumber) {
	                collection.push(tracks[i]);
	            }
	        }
	        for (i = 0, len = implicitTrackRanges.length; i < len; i += 1) {
	            curRangeLastNumber = implicitTrackRanges[i].firstNumber + implicitTrackRanges[i].span - 1;
	            if (firstTrackNumber >= implicitTrackRanges[i].firstNumber &&
					    lastTrackNumber <= curRangeLastNumber) {
	                collection.push(implicitTrackRanges[i]);
	            }
	            if (curRangeLastNumber >= lastTrackNumber) {
	                break;
	            }
	        }
	        if (collection.length === 0) {
	            console.log("getTracks: a track in the range " + firstTrackNumber + " - " + lastTrackNumber + " doesn't exist");
	        }
	        return collection;
	    }

	    function trackIsFractionSized(trackToCheck) {
	        return trackToCheck.sizingType === sizingType.valueAndUnit &&
				    trackToCheck.size.unit === FR;
	    }

	    function spanIsInFractionalTrack(firstTrackNum, numSpanned) {
	        var i,
	            len;
	        // Fractional tracks are always represented by actual track objects.
	        for (i = firstTrackNum - 1, len = tracks.length; i < len && i < (firstTrackNum + numSpanned - 1); i += 1) {
	            if (trackIsFractionSized(tracks[i])) {
	                return true;
	            }
	        }
	        return false;
	    }

	    return {
            tracks: tracks,
	        addTrack: addTrack,
	        ensureTracksExist: ensureTracksExist,
	        getIterator: getIterator,
	        getTrack: getTrack,
	        getTracks: getTracks,
            spanIsInFractionalTrack: spanIsInFractionalTrack
	    };
	};
});
/*global define */
define('scalejs.layout-cssgrid/propertyParser',[
    './consts',
    './enums',
    './objects'
], function (
    consts,
    enums,
    objects
) {
    

    // Parses property string definitions and get an associative array of track objects.

    var regexSpaces = consts.regexSpaces,
        NONE = consts.NONE,
        PERIOD = consts.PERIOD,
        PX = consts.PX,
        PERCENT = consts.PERCENT,
        EM = consts.EM,
        REM = consts.REM,
        FR = consts.FR,
        gridTrackValueEnum = enums.gridTrackValue,
        sizingTypeEnum = enums.sizingType,
        track = objects.track,
        cssValueAndUnit = objects.cssValueAndUnit;

    function isKeywordTrackDefinition(definition) {
        var ret = false;

        switch (definition) {
        case gridTrackValueEnum.auto.keyword:
        case gridTrackValueEnum.minContent.keyword:
        case gridTrackValueEnum.maxContent.keyword:
        case gridTrackValueEnum.fitContent.keyword:
            ret = true;
            break;
        }

        return ret;
    }

    function tryParseCssValue(typedValue) {
        // First match: 0 or more digits, an optional decimal, and any digits after the decimal.
        // Second match: anything after the first match (the unit).
        var expression = /^(\d*\.?\d*)([\w\W]*)/,
            regexResult = typedValue.match(expression),
            valueAndUnit = cssValueAndUnit();

        if (regexResult[0].length > 0 &&
                regexResult[1].length > 0 &&
                    regexResult[2].length > 0) {
            if (regexResult[1].indexOf(PERIOD) < 0) {
                valueAndUnit.value = parseInt(regexResult[1], 10);
            } else {
                valueAndUnit.value = parseFloat(regexResult[1], 10);
            }
            valueAndUnit.unit = regexResult[2];
        }
        return valueAndUnit;
    }

    function isValidCssValueUnit(unit) {
        var ret = false;
        switch (unit) {
        case PX:
        case PERCENT:
        case 'pt':
        case 'pc':
        case 'in':
        case 'cm':
        case 'mm':
        case EM:
        case 'ex':
        case 'vh':
        case 'vw':
        case 'vm':
        case 'ch':
        case REM:
        case FR: // Grid only
            ret = true;
            break;
        }
        return ret;
    }

    function parseGridTracksString(tracksDefinition, trackManager) {
        // TODO: add support for minmax definitions which will involve a more complicated tokenizer than split() (a regex?).
        var trackStrings = tracksDefinition.split(regexSpaces),
            length = trackStrings.length,
            i,
            newTrack,
            valueAndUnit;

        if (length === 1 &&
                (trackStrings[0].length === 0 ||
                 trackStrings[0].toLowerCase() === NONE)) {
            // Empty definition.
            return;
        }

        for (i = 0; i < length; i += 1) {
            trackStrings[i] = trackStrings[i].toLowerCase();

            newTrack = null;
            if (isKeywordTrackDefinition(trackStrings[i])) {
                //throw new Error('Not implemented');
                newTrack = track();
                newTrack.number = i + 1;
                newTrack.size = gridTrackValueEnum.parse(trackStrings[i]);
                newTrack.sizingType = sizingTypeEnum.keyword;
                trackManager.addTrack(newTrack);
            } else {
                // Not a keyword; this is a CSS value.
                valueAndUnit = tryParseCssValue(trackStrings[i]);
                if (valueAndUnit.value === null ||
                        valueAndUnit.unit === null) {
                    throw new Error('Not a keyword or a valid CSS value; track ' + (i + 1) + ' = ' + trackStrings[i] +
                                    '. Invalid track definition "' + trackStrings[i] + '"');
                }

                if (!isValidCssValueUnit(valueAndUnit.unit)) {
                    throw new Error('Invalid track unit "' + valueAndUnit.unit + '"');
                }

                newTrack = track();
                newTrack.number = i + 1;
                newTrack.size = valueAndUnit;
                newTrack.sizingType = sizingTypeEnum.valueAndUnit;
                trackManager.addTrack(newTrack);
            }
        }
    }

    // Parses CSS values into their value and their unit.

    return {
        parseGridTracksString: parseGridTracksString
    };
});
/*global define */
define('scalejs.layout-cssgrid/boxSizeCalculator',[
    './consts',
    './utils',
    './layoutMeasure'
], function (
    consts,
    utils,
    layoutMeasure
) {
    

    var BOXSIZING = consts.BOXSIZING,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        TOP = consts.TOP,
        BOTTOM = consts.BOTTOM,
        MARGIN = consts.MARGIN,
        PADDING = consts.PADDING,
        BORDER = consts.BORDER,
        HYPHEN = consts.HYPHEN,
        LEFT = consts.LEFT,
        RIGHT = consts.RIGHT,
        CONTENTBOX = consts.CONTENTBOX,
        PADDINGBOX = consts.PADDINGBOX,
        STYLE = consts.STYLE,
        NONE = consts.NONE,
        getCssValue = utils.getCssValue;

	function calcMarginBoxWidth(element) {
        var boxSizing = getCssValue(element, BOXSIZING),
            marginBoxWidth = layoutMeasure.measureFromStyleProperty(element, WIDTH);

	    marginBoxWidth = marginBoxWidth
							.add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + LEFT))
							.add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + RIGHT));

	    if (boxSizing === CONTENTBOX) {
	        marginBoxWidth = marginBoxWidth
								.add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + LEFT))
								.add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + RIGHT));
	    }
	    if (boxSizing === CONTENTBOX ||
				boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + LEFT + STYLE) !== NONE) {
	            marginBoxWidth = marginBoxWidth
									.add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + LEFT + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + RIGHT + STYLE) !== NONE) {
	            marginBoxWidth = marginBoxWidth
									.add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + RIGHT + HYPHEN + WIDTH));
	        }
	    }
	    return marginBoxWidth;
	}

	function calcMarginBoxHeight(element) {
	    var boxSizing = getCssValue(element, BOXSIZING),
            marginBoxHeight = layoutMeasure.measureFromStyleProperty(element, HEIGHT);

	    marginBoxHeight = marginBoxHeight
                            .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + TOP))
                            .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + BOTTOM));

	    if (boxSizing === CONTENTBOX) {
	        marginBoxHeight = marginBoxHeight
                                .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + TOP))
                                .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + BOTTOM));
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + TOP + STYLE) !== NONE) {
	            marginBoxHeight = marginBoxHeight
                                    .add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + TOP + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + BOTTOM + STYLE) !== NONE) {
	            marginBoxHeight = marginBoxHeight
                                    .add(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + BOTTOM + HYPHEN + WIDTH));
	        }
	    }
	    return marginBoxHeight;
	}
	    // Calculates a box width suitable for use with the width property from a given margin box width.
	    // Takes into account the box-sizing of the box.
	function calcBoxWidthFromMarginBoxWidth(element, marginBoxWidth) {
	    var boxSizing = getCssValue(element, BOXSIZING),
            boxWidth = marginBoxWidth;

	    if (boxSizing === CONTENTBOX) {
	        boxWidth = boxWidth
                .subtract(
                    layoutMeasure
                        .measureFromStyleProperty(element, PADDING + HYPHEN + LEFT)
                        .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + RIGHT))
                );
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + LEFT + STYLE) !== NONE) {
	            boxWidth = boxWidth.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + LEFT + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + RIGHT + STYLE) !== NONE) {
	            boxWidth = boxWidth.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + RIGHT + HYPHEN + WIDTH));
	        }
	    }
	    boxWidth = boxWidth
            .subtract(
                layoutMeasure
                    .measureFromStyleProperty(element, MARGIN + HYPHEN + LEFT)
                    .add(layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + RIGHT))
            );
	    return boxWidth;
	}
	    // Calculates a box height suitable for use with the height property from a given margin box height.
	    // Takes into account the box-sizing of the box.
	function calcBoxHeightFromMarginBoxHeight(element, marginBoxHeight) {
	    var boxSizing = getCssValue(element, BOXSIZING),
	        boxHeight = marginBoxHeight,
            usedStyle; // TODO: what is this???

	    if (boxSizing === CONTENTBOX) {
	        boxHeight = boxHeight
                .subtract(
                    layoutMeasure
                        .measureFromStyleProperty(element, PADDING + HYPHEN + TOP)
                        .add(layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + BOTTOM))
                );
	    }
	    if (boxSizing === CONTENTBOX ||
                boxSizing === PADDINGBOX) {
	        if (getCssValue(element, BORDER + HYPHEN + TOP + STYLE) !== NONE) {
	            boxHeight = boxHeight.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + TOP + HYPHEN + WIDTH));
	        }
	        if (getCssValue(element, BORDER + HYPHEN + BOTTOM + STYLE) !== NONE) {
	            boxHeight = boxHeight.subtract(layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + BOTTOM + HYPHEN + WIDTH));
	        }
	    }

	    boxHeight = boxHeight
            .subtract(
                layoutMeasure
                    .measureFromStyleProperty(usedStyle, MARGIN + HYPHEN + TOP)
                    .add(layoutMeasure.measureFromStyleProperty(usedStyle, MARGIN + HYPHEN + BOTTOM))
            );
	    return boxHeight;
	}

	return {
	    calcMarginBoxWidth: calcMarginBoxWidth,
	    calcMarginBoxHeight: calcMarginBoxHeight,
	    calcBoxWidthFromMarginBoxWidth: calcBoxWidthFromMarginBoxWidth,
	    calcBoxHeightFromMarginBoxHeight: calcBoxHeightFromMarginBoxHeight
    };
});
/*global define, document, window*/
define('scalejs.layout-cssgrid/intrinsicSizeCalculator',[
    './consts',
    './enums',
    './objects',
    './utils',
    './boxSizeCalculator'
], function (
    consts,
    enums,
    objects,
    utils,
    boxSizeCalculator
) {
    

    var EMPTY = consts.EMPTY,
        STRETCH = consts.STRETCH,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        COLON = consts.COLON,
        PX = consts.PX,
        SEMICOL = consts.SEMICOL,
        BLOCKPROGRESSION = consts.BLOCKPROGRESSION,
        MIN = consts.MIN,
        MAX = consts.MAX,
        calculatorOperation = enums.calculatorOperation,
        widthAndHeight = objects.widthAndHeight,
        defined = utils.defined,
        getCssValue = utils.getCssValue,
        zeroLength = { cssText: '0px' },
        infiniteLength = { cssText: '1000000px' },
        div = document.createElement('div'),
	    intrinsicSizeCalculatorElement = null,
	    intrinsicSizeCalculatorElementParent = null;


	/* last 2 params only required for shrink-to-fit calculation */
	function prepare(element, calculatorOperation, containerWidth, containerHeight) {
	    if (intrinsicSizeCalculatorElement === null) {
	        intrinsicSizeCalculatorElement = div.cloneNode(true);
	        intrinsicSizeCalculatorElement.id = "intrinsicSizeCalculator";
	    }

	    var cssText = EMPTY,
		    gridElement = element.parentNode,
		    //gridElementUsedStyle,
		    FONT = 'font-',
		    FONTFAMILY = FONT + 'family',
		    FONTSIZE = FONT + 'size',
		    FONTADJUST = FONTSIZE + '-adjust',
		    FONTSTRETCH = FONT + STRETCH,
		    FONTSTYLE = FONT + 'style',
		    FONTVARIANT = FONT + 'variant',
		    FONTWEIGHT = FONT + 'weight',
		    DIRECTION = 'direction';

	    if (!defined(containerWidth) &&
				containerWidth !== null) {
	        cssText += WIDTH + COLON + containerWidth.getPixelValueString() + PX + SEMICOL;
	    } else {
	        switch (calculatorOperation) {
	        case calculatorOperation.minWidth:
	        case calculatorOperation.maxHeight:
	            cssText += WIDTH + COLON + zeroLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.minHeight:
	        case calculatorOperation.maxWidth:
	            cssText += WIDTH + COLON + infiniteLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.shrinkToFit:
	            // console.log("Calculating shrink to fit size without specified container width");
	            break;
	        }
	    }

	    if (defined(containerHeight) &&
				containerHeight !== null) {
	        cssText += HEIGHT + COLON + containerHeight.getPixelValueString() + PX + SEMICOL;
	    } else {
	        switch (calculatorOperation) {
	        case calculatorOperation.minWidth:
	        case calculatorOperation.maxHeight:
	            cssText += HEIGHT + COLON + infiniteLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.minHeight:
	        case calculatorOperation.maxWidth:
	            cssText += HEIGHT + COLON + zeroLength.cssText + SEMICOL;
	            break;
	        case calculatorOperation.shrinkToFit:
	            // console.log("Calculating shrink to fit size without specified container height");
	            break;
	        }
	    }

	    /* Insert our calculator at the same level as the grid to ensure child selectors work as well as we can reasonably achieve.
			* Special case: the grid is the body element.
			* In that case, put the calculator under the grid anyway;
			* it shouldn't impact calculations assuming selectors aren't impacted.
			**/
	    intrinsicSizeCalculatorElementParent = gridElement === document.body ? gridElement : gridElement.parentNode;

	    // Copy styles from the grid to the calculator to ensure any values that are inherited by grid items still happens.
	    // TODO: add additional properties if new test content requires it.
	    if (intrinsicSizeCalculatorElementParent !== gridElement) {
	        cssText += FONTFAMILY + COLON + getCssValue(gridElement, FONTFAMILY) + SEMICOL
					+ FONTSIZE + COLON + getCssValue(gridElement, FONTSIZE) + SEMICOL
					+ FONTADJUST + COLON + getCssValue(gridElement, FONTADJUST) + SEMICOL
					+ FONTSTRETCH + COLON + getCssValue(gridElement, FONTSTRETCH) + SEMICOL
					+ FONTSTYLE + COLON + getCssValue(gridElement, FONTSTYLE) + SEMICOL
					+ FONTVARIANT + COLON + getCssValue(gridElement, FONTVARIANT) + SEMICOL
					+ FONTWEIGHT + COLON + getCssValue(gridElement, FONTWEIGHT) + SEMICOL
					+ DIRECTION + COLON + getCssValue(gridElement, DIRECTION) + SEMICOL
					+ BLOCKPROGRESSION + COLON + getCssValue(gridElement, BLOCKPROGRESSION) + SEMICOL;
	    }
	    intrinsicSizeCalculatorElement.style.cssText += cssText;
	    intrinsicSizeCalculatorElementParent.appendChild(intrinsicSizeCalculatorElement);
	}

	function unprepare() {
	    intrinsicSizeCalculatorElementParent.removeChild(intrinsicSizeCalculatorElement);
	}

	function cloneAndAppendToCalculator(element) {
	    var clone = element.cloneNode(true);
	    // Float it so that the box won't constrain itself to the parent's size.
	    clone.style.cssText = clone.style.cssText + SEMICOL + "float:left";
	    intrinsicSizeCalculatorElement.appendChild(clone);
	    return clone;
	}

	function calcMinWidth(element) {
	    prepare(element, calculatorOperation.minWidth);

	    var clone = cloneAndAppendToCalculator(element),
            width = boxSizeCalculator.calcMarginBoxWidth(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return width;
	}

	function calcMaxWidth(element) {
	    prepare(element, calculatorOperation.maxWidth);

	    var clone = cloneAndAppendToCalculator(element),
            width = boxSizeCalculator.calcMarginBoxWidth(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return width;
	}

	function calcMinHeight(element, usedWidth) {
	    if (defined(usedWidth) ||
                usedWidth === null) {
	        throw new Error('No `usedWidth` specified.');
	    }

	    prepare(element, calculatorOperation.minHeight, usedWidth);

	    var clone = cloneAndAppendToCalculator(element),
            height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return height;
	}

	function calcMaxHeight(element, usedWidth) {
	    if (!defined(usedWidth) ||
                usedWidth === null) {
	        throw new Error('No `usedWidth` specified');
	    }

	    prepare(element, calculatorOperation.maxHeight, usedWidth);

	    var clone = cloneAndAppendToCalculator(element),
            height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return height;
	}

	function calcShrinkToFitWidthAndHeight(element, containerWidth, containerHeight, forcedMarginBoxWidth, forcedMarginBoxHeight) {
	    // If we're forcing a specific size on the grid item, adjust the calculator's container size to accomodate it.
	    if (forcedMarginBoxWidth !== null) {
	        containerWidth = forcedMarginBoxWidth;
	    }
	    if (forcedMarginBoxHeight !== null) {
	        containerHeight = forcedMarginBoxHeight;
	    }

	    prepare(element, calculatorOperation.shrinkToFit, containerWidth, containerHeight);

	    var clone = cloneAndAppendToCalculator(element),
            //cloneUsedStyle = window.getComputedStyle(clone, null),
            shrinkToFitWidthAndHeight = widthAndHeight(),
            forcedWidth,
            forcedHeight;

	    /* Force a width or height for width/height if requested.
         * We don't want to change the box-sizing on the box since we are not 
         * overriding all of the border/padding/width/height properties and
         * want the original values to work correctly. Convert the specified 
         * forced length to the appropriate length for the width/height property.
         **/
	    if (forcedMarginBoxWidth !== null) {
	        forcedWidth = boxSizeCalculator.calcBoxWidthFromMarginBoxWidth(clone, forcedMarginBoxWidth);
	        clone.style.cssText += MIN + WIDTH + COLON + forcedWidth.getPixelValueString() + PX + SEMICOL +
                                    MAX + WIDTH + COLON + forcedWidth.getPixelValueString() + PX + SEMICOL;
	    }
	    if (forcedMarginBoxHeight !== null) {
	        forcedHeight = boxSizeCalculator.calcBoxHeightFromMarginBoxHeight(clone, forcedMarginBoxHeight);
	        clone.style.cssText += MIN + HEIGHT + COLON + forcedHeight.getPixelValueString() + PX + SEMICOL +
                                    MAX + HEIGHT + COLON + forcedHeight.getPixelValueString() + PX + SEMICOL;
	    }
	    shrinkToFitWidthAndHeight.width = boxSizeCalculator.calcMarginBoxWidth(clone);
	    shrinkToFitWidthAndHeight.height = boxSizeCalculator.calcMarginBoxHeight(clone);

	    intrinsicSizeCalculatorElement.removeChild(clone);
	    unprepare();

	    return shrinkToFitWidthAndHeight;
	}

	return {
	    calcMinWidth: calcMinWidth,
	    calcMaxWidth: calcMaxWidth,
	    calcMinHeight: calcMinHeight,
	    calcMaxHeight: calcMaxHeight,
	    calcShrinkToFitWidthAndHeight: calcShrinkToFitWidthAndHeight
	};
});
/*global define, document, window */
define('scalejs.layout-cssgrid/gridLayout',[
    './consts',
    './enums',
    './objects',
    './utils',
    './layoutMeasure',
    './trackManager',
    './propertyParser',
    './boxSizeCalculator',
    './intrinsicSizeCalculator'
], function (
    consts,
    enums,
    objects,
    utils,
    layoutMeasure,
    trackManager,
    propertyParser,
    boxSizeCalculator,
    intrinsicSizeCalculator
) {
    

    var BLOCKPROGRESSION = consts.BLOCKPROGRESSION,
        EMPTY = consts.EMPTY,
        OPEN_CURLY = consts.OPEN_CURLY,
        ABSOLUTE = consts.ABSOLUTE,
        CLOSE_CURLY = consts.CLOSE_CURLY,
        RELATIVE = consts.RELATIVE,
        STATIC = consts.STATIC,
        PERIOD = consts.PERIOD,
        GRIDLAYOUT = consts.GRIDLAYOUT,
        GRIDCOLUMNS = consts.GRIDCOLUMNS,
        GRIDROWS = consts.GRIDROWS,
        GRIDCOLUMN = consts.GRIDCOLUMN,
        GRIDCOLUMNSPAN = consts.GRIDCOLUMNSPAN,
        GRIDROW = consts.GRIDROW,
        GRIDROWSPAN = consts.GRIDROWSPAN,
        GRIDROWALIGN = consts.GRIDROWALIGN,
        GRIDCOLUMNALIGN = consts.GRIDCOLUMNALIGN,
        NONE = consts.NONE,
        TOP = consts.TOP,
        RIGHT = consts.RIGHT,
        BOTTOM = consts.BOTTOM,
        LEFT = consts.LEFT,
        INLINEGRID = consts.INLINEGRID,
        MARGIN = consts.MARGIN,
        HYPHEN = consts.HYPHEN,
        PADDING = consts.PADDING,
        BORDER = consts.BORDER,
        WIDTH = consts.WIDTH,
        HEIGHT = consts.HEIGHT,
        AUTO = consts.AUTO,
        PX = consts.PX,
        FR = consts.FR,
        DISPLAY = consts.DISPLAY,
        COLON = consts.COLON,
        SEMICOL = consts.SEMICOL,
        STYLE = consts.STYLE,
        BOXSIZING = consts.BOXSIZING,
        MIN = consts.MIN,
        MAX = consts.MAX,
        POSITION = consts.POSITION,
        STRETCH = consts.STRETCH,
        precision = consts.precision,
        blockProgressionEnum = enums.blockProgression,
        positionEnum = enums.position,
        gridAlignEnum = enums.gridAlign,
        sizingTypeEnum = enums.sizingType,
        borderWidthsEnum = enums.borderWidths,
        blockProgressionStringToEnum = blockProgressionEnum.parse,
        positionStringToEnum = positionEnum.parse,
        gridAlignStringToEnum = gridAlignEnum.parse,
        gridTrackValue = enums.gridTrackValue,
        widthAndHeight = objects.widthAndHeight,
        item = objects.item,
        getCssValue = utils.getCssValue,
        createBoundedWrapper = utils.createBoundedWrapper,
        defined = utils.defined,
        makeUniqueClass = utils.makeUniqueClass,
        addClass = utils.addClass,
        embedCss = utils.embedCss,
        clearEmbeddedCss = utils.clearEmbeddedCss,
        div = document.createElement('div');


    return function cssGridLayout(element, selector, properties, media, grid_items) {
        var gridElement = element,
            blockProgression = blockProgressionStringToEnum(getCssValue(element, BLOCKPROGRESSION)),
            availableSpaceForColumns = null,
            availableSpaceForRows = null,
            items = null,
            columnTrackManager = trackManager(),
            rowTrackManager = trackManager(),
            useAlternateFractionalSizingForColumns = false,
            useAlternateFractionalSizingForRows = false,
            error = false;

        function determineSize(dimension, margins, padding, borders) {
            var parent = gridElement.parentNode,
                one = dimension === WIDTH ? LEFT : TOP,
                two = dimension === WIDTH ? RIGHT : BOTTOM,
                size = dimension === WIDTH ? parent.offsetWidth : parent.offsetHeight,
                border1 = layoutMeasure.measureFromStyleProperty(parent, BORDER + HYPHEN + one + HYPHEN + WIDTH),
                border2 = layoutMeasure.measureFromStyleProperty(parent, BORDER + HYPHEN + two + HYPHEN + WIDTH),
                padd1 = layoutMeasure.measureFromStyleProperty(parent, PADDING + HYPHEN + one),
                padd2 = layoutMeasure.measureFromStyleProperty(parent, PADDING + HYPHEN + two);

            size -= (border1.getRawMeasure() + border2.getRawMeasure() +
                        padd1.getRawMeasure() + padd2.getRawMeasure() +
                        margins[one].getRawMeasure() + margins[two].getRawMeasure() +
                        borders[one].getRawMeasure() + borders[two].getRawMeasure() +
                        padding[one].getRawMeasure() + padding[two].getRawMeasure());

            return size;
        }

        function verticalScrollbarWidth() {
            return window.innerWidth - document.documentElement.clientWidth;
        }

        function horizontalScrollbarHeight() {
            return window.innerHeight - document.documentElement.clientHeight;
        }

        function shouldSwapWidthAndHeight() {
            return (blockProgression === blockProgressionEnum.lr ||
                     blockProgression === blockProgressionEnum.rl);
        }


        /* Determines the available space for the grid by:
         * 1. Swapping in a dummy block|inline-block element where the grid 
         *    element was with one fractionally sized column and one fractionally sized row,
         *    causing it to take up all available space.
         *    a. If getting the cascaded (not used) style is possible (IE only),
         *          copy the same width/height/box-sizing values to ensure the available
         *          space takes into account explicit constraints.
         * 2. Querying for the used widths/heights
         * 3. Swapping back the real grid element
         * Yes, this depends on the dummy block|inline-block sizing to work correctly.
         **/
        function determineGridAvailableSpace() {
            var dummy = gridElement.cloneNode(false),
                gridProperties = properties,
                gridElementParent = gridElement.parentNode,
                isInlineGrid,
                zero = '0px',
                sides = [TOP, RIGHT, BOTTOM, LEFT],
                margins = {},
                padding = {},
                borders = {},
                oldDisplay = gridElement.style.display,
                //innerHTML,
                //s,
                width,
                height,
                floated,
                widthToUse,
                heightToUse,
                //marginToUse,
                //borderWidthToUse,
                //borderStyleToUse,
                //paddingToUse,
                cssText,
                scrollWidth,
                scrollHeight,
                removedElement,
                widthAdjustment,
                heightAdjustment,
                widthMeasure,
                heightMeasure,
                widthAdjustmentMeasure,
                heightAdjustmentMeasure;

            // we need to get grid props from the passed styles
            isInlineGrid = gridProperties.display === INLINEGRID ? true : false;

            // Get each individual margin, border, and padding value for
            // using with calc() when specifying the width/height of the dummy element.
            sides.forEach(function (side) {
                margins[side] = layoutMeasure.measureFromStyleProperty(gridElement, MARGIN + HYPHEN + side);
                padding[side] = layoutMeasure.measureFromStyleProperty(gridElement, PADDING + HYPHEN + side);
                borders[side] = layoutMeasure.measureFromStyleProperty(gridElement, BORDER + HYPHEN + side + HYPHEN + WIDTH);
            });

            // If the grid has an explicit width and/or height, that determines the available space for the tracks.
            // If there is none, we need to use alternate fractional sizing. The exception is if we are a non-inline grid;
            // in that case, we are a block element and take up all available width.
            // TODO: ensure we do the right thing for floats.
            // need to remove the content to ensure we get the right height
            gridElementParent.insertBefore(dummy, gridElement);
            gridElement.style.display = 'none';
            width = getCssValue(dummy, WIDTH);
            floated = getCssValue(gridElement, 'float');
            if (width === zero) { width = AUTO; }
            if (width === AUTO &&
                    (isInlineGrid ||
                        floated === LEFT ||
                        floated === RIGHT)) {
                useAlternateFractionalSizingForColumns = true;
            }
            height = getCssValue(dummy, HEIGHT);
            if (height === zero) { height = AUTO; }
            if (height === AUTO) {
                useAlternateFractionalSizingForRows = true;
            }
            // remove the dummy
            gridElement.style.display = oldDisplay;
            gridElementParent.removeChild(dummy);

            // build the straw man for getting dimensions
            dummy = document.createElement(gridElement.tagName);
            widthToUse = width !== AUTO
                ? width
                : determineSize(WIDTH, margins, padding, borders) + PX;

            heightToUse = height !== AUTO
                ? height
                : determineSize(HEIGHT, margins, padding, borders) + PX;

            cssText = DISPLAY + COLON + (!isInlineGrid ? "block" : "inline-block") + SEMICOL
                    + MARGIN + COLON + getCssValue(gridElement, MARGIN) + SEMICOL
                    + BORDER + HYPHEN + WIDTH + COLON + getCssValue(gridElement, BORDER + HYPHEN + WIDTH) + SEMICOL
                    + PADDING + COLON + getCssValue(gridElement, PADDING) + SEMICOL
                    + BORDER + STYLE + COLON + getCssValue(gridElement, BORDER + STYLE) + SEMICOL
                    + WIDTH + COLON + widthToUse + SEMICOL
                    + HEIGHT + COLON + heightToUse + SEMICOL
                    + BOXSIZING + COLON + getCssValue(gridElement, BOXSIZING) + SEMICOL
                    + MIN + WIDTH + COLON + getCssValue(gridElement, MIN + WIDTH) + SEMICOL
                    + MIN + HEIGHT + COLON + getCssValue(gridElement, MIN + HEIGHT) + SEMICOL
                    + MAX + WIDTH + COLON + getCssValue(gridElement, MAX + WIDTH) + SEMICOL
                    + MAX + HEIGHT + COLON + getCssValue(gridElement, MAX + HEIGHT) + SEMICOL;
            dummy.style.cssText = cssText;

            // Determine width/height (if any) of scrollbars are showing with the grid element on the page.
            scrollWidth = verticalScrollbarWidth();
            scrollHeight = horizontalScrollbarHeight();

            // Insert before the real grid element.
            gridElementParent.insertBefore(dummy, gridElement);

            // Remove the real grid element.
            removedElement = gridElementParent.removeChild(gridElement);

            // The dummy item should never add scrollbars if the grid element didn't.
            widthAdjustment = width !== AUTO ? 0 : scrollWidth - verticalScrollbarWidth();
            heightAdjustment = height !== AUTO ? 0 : scrollHeight - horizontalScrollbarHeight();
            // get the final measurements
            widthMeasure = layoutMeasure.measureFromStyleProperty(dummy, WIDTH);
            heightMeasure = layoutMeasure.measureFromStyleProperty(dummy, HEIGHT);
            widthAdjustmentMeasure = layoutMeasure.measureFromPx(widthAdjustment);
            heightAdjustmentMeasure = layoutMeasure.measureFromPx(heightAdjustment);

            // Get the content width/height; this is the available space for tracks and grid items to be placed in.
            if (!shouldSwapWidthAndHeight()) {
                availableSpaceForColumns = widthMeasure.subtract(widthAdjustmentMeasure);
                availableSpaceForRows = heightMeasure.subtract(heightAdjustmentMeasure);
            } else {
                availableSpaceForColumns = heightMeasure.subtract(heightAdjustmentMeasure);
                availableSpaceForRows = widthMeasure.subtract(widthAdjustmentMeasure);
            }

            // Restore the DOM.
            gridElementParent.insertBefore(removedElement, dummy);
            gridElementParent.removeChild(dummy);
        }

        // Creates track objects for implicit tracks if needed.
        function ensureTracksExist(trackManager, firstTrackNumber, lastTrackNumber) {
            /* TODO: we need a better data structure for tracks created by spans.
             * If a grid item has a really high span value,
             * we currently end up creating implicit tracks for every one of the
             * implicit tracks (span 100000=>100000 tracks created).
             * Instead, a single track object should be able to represent multiple
             * implicit tracks. The number of implicit tracks it represents would 
             * be used during the track sizing algorithm when redistributing space
             * among each of the tracks to ensure it gets the right proportional amount.
             **/
            trackManager.ensureTracksExist(firstTrackNumber, lastTrackNumber);
        }

        // Traverses all tracks that the item belongs to and adds a reference to it in each of the track objects.
        function addItemToTracks(trackManager, itemToAdd, firstTrackNumber, lastTrackNumber) {
            var i,
                tracks = trackManager.tracks.length,
                implicitTrackIndex,
                implicitTracks = trackManager.implicitTracks;

            for (i = 0; i < tracks; i += 1) {
                if (trackManager.tracks[i].number === firstTrackNumber) {
                    trackManager.tracks[i].items.push(itemToAdd);
                } else if (trackManager.tracks[i].number > firstTrackNumber) {
                    break;
                }
            }
            // TODO: check if we can remove 
            for (implicitTrackIndex = 0; implicitTrackIndex < implicitTracks; implicitTrackIndex += 1) {
                if (firstTrackNumber >= trackManager.implicitTracks[implicitTrackIndex].firstNumber &&
                        lastTrackNumber <= trackManager.implicitTracks[implicitTrackIndex].length) {
                    trackManager.implicitTracks[implicitTrackIndex].items.push(itemToAdd);
                }
            }
        }

        function mapGridItemsToTracks() {
            items = grid_items.map(function (curItem) {
                var column,
                    columnSpan,
                    row,
                    rowSpan,
                    columnAlignString,
                    columnAlign,
                    rowAlignString,
                    rowAlign,
                    boxSizing,
                    newItem,
                    firstColumn,
                    lastColumn,
                    firstRow,
                    lastRow;

                column = parseInt(curItem.details.properties[GRIDCOLUMN], 10);

                if (isNaN(column)) {
                    error = true;
                    // console.log("column is NaN");
                    column = 1;
                }

                columnSpan = parseInt(curItem.details.properties[GRIDCOLUMNSPAN], 10);
                if (isNaN(columnSpan)) {
                    error = true;
                    // console.log("column-span is NaN");
                    columnSpan = 1;
                }

                row = parseInt(curItem.details.properties[GRIDROW], 10);
                if (isNaN(row)) {
                    error = true;
                    // console.log("row is NaN");
                    row = 1;
                }

                rowSpan = parseInt(curItem.details.properties[GRIDROWSPAN], 10);
                if (isNaN(rowSpan)) {
                    error = true;
                    // console.log("row-span is NaN");
                    rowSpan = 1;
                }

                columnAlignString = curItem.details.properties[GRIDCOLUMNALIGN] || EMPTY;
                if (columnAlignString.length === 0) {
                    error = true;
                    // console.log("getPropertyValue for " + GRIDCOLUMNALIGN + " is an empty string");
                }
                columnAlign = gridAlignStringToEnum(columnAlignString);

                rowAlignString = curItem.details.properties[GRIDROWALIGN] || EMPTY;
                if (rowAlignString.length === 0) {
                    error = true;
                    // console.log("getPropertyValue for " + GRIDROWALIGN + " is an empty string");
                }
                rowAlign = gridAlignStringToEnum(rowAlignString);

                // TODO: handle directionality. These properties are physical; we probably need to map them to logical values.
                boxSizing = getCssValue(curItem.element, BOXSIZING);

                newItem = item();
                newItem.itemElement = curItem.element;
                newItem.styles = curItem.details;
                newItem.column = column;
                newItem.columnSpan = columnSpan;
                newItem.columnAlign = columnAlign;
                newItem.row = row;
                newItem.rowSpan = rowSpan;
                newItem.rowAlign = rowAlign;

                firstColumn = newItem.column;
                lastColumn = firstColumn + newItem.columnSpan - 1;
                firstRow = newItem.row;
                lastRow = firstRow + newItem.rowSpan - 1;

                // Ensure implicit track definitions exist for all tracks this item spans.
                ensureTracksExist(columnTrackManager, firstColumn, lastColumn);
                ensureTracksExist(rowTrackManager, firstRow, lastRow);

                // place the items as appropriate
                addItemToTracks(columnTrackManager, newItem, firstColumn, lastColumn);
                addItemToTracks(rowTrackManager, newItem, firstRow, lastRow);

                return newItem;
            });
        }

        function saveItemPositioningTypes() {
            // console.log('saving positioning types');
            items.forEach(function (item) {
                if (item.position === null) {
                    item.position = positionStringToEnum(getCssValue(item.itemElement, POSITION));
                }
            });
        }

        function usePhysicalWidths(blockProgression, verifyingColumns) {
            var ret = false;
            if (((blockProgression === blockProgressionEnum.tb ||
                     blockProgression === blockProgressionEnum.bt) &&
                     verifyingColumns === true) ||
                    ((blockProgression === blockProgressionEnum.lr ||
                        blockProgression === blockProgressionEnum.rl) &&
                        verifyingColumns === false)) {
                ret = true;
            }
            return ret;
        }


        // Inserts an empty grid item into a given track and gets its size.
        function getActualTrackMeasure(trackNumber, computingColumns) {
            var blockProgression, trackMeasure,
                dummyItem = div.cloneNode(true),
                cssText = "margin:0px;border:0px;padding:0px;"
                + (computingColumns ? GRIDCOLUMNALIGN : GRIDROWALIGN)
                + COLON + STRETCH + SEMICOL
                + (computingColumns ? GRIDCOLUMN : GRIDROW)
                + COLON + trackNumber + SEMICOL;

            dummyItem.style.cssText = cssText;

            dummyItem = gridElement.appendChild(dummyItem);
            blockProgression = blockProgressionStringToEnum(getCssValue(gridElement, BLOCKPROGRESSION));
            trackMeasure = usePhysicalWidths(blockProgression, computingColumns)
                                ? layoutMeasure.measureFromStyleProperty(dummyItem, WIDTH)
                                : layoutMeasure.measureFromStyleProperty(dummyItem, HEIGHT);

            gridElement.removeChild(dummyItem);
            return trackMeasure;
        }

        function getSumOfTrackMeasures(trackManager) {
            var sum = layoutMeasure.zero(),
                trackIter = trackManager.getIterator(),
                curTrack = trackIter.next();

            while (curTrack !== null) {
                sum = sum.add(curTrack.measure);
                curTrack = trackIter.next();
            }

            return sum;
        }

        function compareAutoTracksAvailableGrowth(a, b) {
            var availableGrowthA = a.maxMeasure.subtract(a.measure),
                availableGrowthB = b.maxMeasure.subtract(b.measure);

            if (availableGrowthA.getRawMeasure() < availableGrowthB.getRawMeasure()) {
                return -1;
            }

            if (availableGrowthA.getRawMeasure() > availableGrowthB.getRawMeasure()) {
                return 1;
            }

            return 0;
        }

        function trackIsFractionSized(trackToCheck) {
            return (trackToCheck.sizingType === sizingTypeEnum.valueAndUnit &&
                     trackToCheck.size.unit === FR);
        }

        function getSumOfSpannedTrackMeasures(trackManager, firstTrackNum, numSpanned) {
            var sum,
                tracks = trackManager.getTracks(firstTrackNum, firstTrackNum + numSpanned - 1);

            sum = tracks.reduce(function (acc, track) {
                return acc.add(track.measure);
            }, layoutMeasure.zero());

            return sum;
        }

        function getNormalFractionMeasure(track) {
            if (!trackIsFractionSized(track)) {
                throw new Error('getNormalFractionMeasure called for non-fraction sized track');
            }
            var frValue = track.size.value;
            return frValue === 0 ? layoutMeasure.zero() : track.measure.divide(frValue);
        }

        function compareFractionTracksNormalMeasure(a, b) {
            var result = 0,
                // Called from a sort function; can't depend on "this" object being CSSGridAlignment.
                normalFractionMeasureA = getNormalFractionMeasure(a),
                normalFractionMeasureB = getNormalFractionMeasure(b);

            if (defined(a) &&
                    defined(b)) {
                if (normalFractionMeasureA.getRawMeasure() < normalFractionMeasureB.getRawMeasure()) {
                    result = -1;
                } else if (normalFractionMeasureA.getRawMeasure() > normalFractionMeasureB.getRawMeasure()) {
                    result = 1;
                } else {
                    if (a.size.value > b.size.value) {
                        result = -1;
                    } else if (a.size.value < b.size.value) {
                        result = 1;
                    }
                }
            }
            return result;
        }

        function determineMeasureOfOneFractionUnconstrained(fractionalTracks) {
            // Iterate over all of the fractional tracks, 
            var maxOneFractionMeasure = layoutMeasure.zero();

            fractionalTracks.forEach(function (curTrack) {
                var curFractionValue = curTrack.size.value,
                    oneFractionMeasure = curTrack.maxMeasure.divide(curFractionValue);

                if (oneFractionMeasure.getRawMeasure() > maxOneFractionMeasure.getRawMeasure()) {
                    maxOneFractionMeasure = oneFractionMeasure;
                }
            });

            return maxOneFractionMeasure;
        }

        function saveUsedCellWidths(columnTrackManager) {
            var iter = columnTrackManager.getIterator(),
                curTrack = iter.next();

            function setUsedWithMeasure(curItem) {
                if (curItem.usedWidthMeasure === null) {
                    curItem.usedWidthMeasure = getSumOfSpannedTrackMeasures(columnTrackManager, curItem.column, curItem.columnSpan);
                }
            }

            while (curTrack !== null) {
                curTrack.items.forEach(setUsedWithMeasure);

                curTrack = iter.next();
            }
        }

        /* Determines track sizes using the algorithm from sections 9.1 and 9.2 of the W3C spec.
         * Rules:
         *   1. If it's a defined length, that is the track size.
         *      2. If it's a keyword, its sizing is based on its content. 
         *         Iterate over the items in the track to attempt to determine the size of the track.
         * TODO: handle percentages
         **/
        function determineTrackSizes(lengthPropertyName) {
            var computingColumns = (lengthPropertyName.toLowerCase() === WIDTH),
                trackManager = computingColumns ? columnTrackManager : rowTrackManager,
                availableSpace = computingColumns ? availableSpaceForColumns : availableSpaceForRows,
                useAlternateFractionalSizing = computingColumns ? useAlternateFractionalSizingForColumns
                                                                    : useAlternateFractionalSizingForRows,
                // Keep track of spans which could affect track sizing later.
                spans = [],
                autoTracks = [],
                fractionalTracks = [],
                respectAvailableLength = true,
                iter = trackManager.getIterator(),
                curTrack = iter.next(),
                curSize,
                sizingAlternateFraction,
                i,
                iLen,
                curItem,
                minItemMeasure,
                maxCellMeasure,
                actualMeasure,
                remainingSpace,
                autoTrackIndex,
                autoTrackLength,
                trackShareOfSpace,
                curSpanningItem,
                firstTrack,
                numSpanned,
                sumOfTrackMeasures,
                measureSpanCanGrow,
                sumOfFractions,
                oneFractionMeasure,
                totalMeasureToAdd,
                lastNormalizedFractionalMeasure,
                accumulatedFactors,
                accumulatedFactorsInDistributionSet,
                normalizedDelta,
                j,
                spaceToDistribute,
                sortFunc;

            if (useAlternateFractionalSizing &&
                    availableSpace.getRawMeasure() === 0) {
                // Assume we have as much space as we want.
                respectAvailableLength = false;
            }

            // 9.1.1/9.2.1: [Columns|Widths] are initialized to their minimum [widths|heights].
            while (curTrack !== null) {
                if (curTrack.sizingType !== sizingTypeEnum.keyword &&
                        curTrack.sizingType !== sizingTypeEnum.valueAndUnit) {
                    throw new Error('Unknown grid track sizing type');
                }

                // TODO: add support for minmax (M3)
                curTrack.measure = layoutMeasure.zero();
                curTrack.minMeasure = layoutMeasure.zero();
                curTrack.maxMeasure = layoutMeasure.zero();
                sizingAlternateFraction = (useAlternateFractionalSizing && trackIsFractionSized(curTrack));

                if (curTrack.sizingType === sizingTypeEnum.keyword ||
                        sizingAlternateFraction) {
                    curSize = curTrack.size;

                    if (curSize !== gridTrackValue.fitContent &&
                            curSize !== gridTrackValue.minContent &&
                            curSize !== gridTrackValue.maxContent &&
                            curSize !== gridTrackValue.auto &&
                            !sizingAlternateFraction) {
                        throw new Error('Unknown grid track sizing value ' + curSize.keyword);
                    }
                    if (!sizingAlternateFraction) {
                        curTrack.contentSizedTrack = true;
                    }

                    for (i = 0, iLen = curTrack.items.length; i < iLen; i += 1) {
                        curItem = curTrack.items[i];

                        if (curItem.position !== positionEnum[STATIC] &&
                                curItem.position !== positionEnum.relative) {
                            // Only position: static and position: relative items contribute to track size.
                            /*jslint continue:true*/
                            continue;
                        }

                        // 9.1.a.i/9.2.a.i: Spanning elements are ignored to avoid premature growth of [columns|rows].
                        if ((computingColumns ? curItem.columnSpan : curItem.rowSpan) > 1) {
                            // This is a span; determine and save its max width or height for use later in the track sizing algorithm.
                            if (curItem.maxWidthMeasure === null) {
                                if (computingColumns) {
                                    curItem.maxWidthMeasure = intrinsicSizeCalculator
                                                                .calcMaxWidth(curItem.itemElement);
                                } else {
                                    curItem.maxHeightMeasure = intrinsicSizeCalculator
                                                                .calcMaxHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }
                            }
                            if (curSize === gridTrackValue.fitContent ||
                                    curSize === gridTrackValue.auto) {
                                /* Only keep track of this span if we found it in a non-fixed size track.
                                 * Note: we are adding the span multiple times for each track but the 
                                 * sizing algorithm will be unaffected by trying to
                                 * process the same span multiple times.
                                 **/
                                spans.push(curItem);
                            }
                        } else {
                            // Not a span. Let's size the track.
                            if (!sizingAlternateFraction &&
                                    (curSize === gridTrackValue.minContent ||
                                        curSize === gridTrackValue.fitContent ||
                                        curSize === gridTrackValue.auto)) {
                                if (computingColumns) {
                                    minItemMeasure = intrinsicSizeCalculator.calcMinWidth(curItem.itemElement);
                                } else {
                                    minItemMeasure = intrinsicSizeCalculator.calcMinHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }

                                if (minItemMeasure.getRawMeasure() > curTrack.minMeasure.getRawMeasure()) {
                                    curTrack.minMeasure = minItemMeasure;
                                }
                            }
                            // Auto sized tracks may grow to their maximum length. Determine that length up front.
                            if (sizingAlternateFraction ||
                                    curSize === gridTrackValue.maxContent ||
                                    curSize === gridTrackValue.auto) {
                                if (computingColumns) {
                                    maxCellMeasure = intrinsicSizeCalculator.calcMaxWidth(curItem.itemElement);
                                } else {
                                    maxCellMeasure = intrinsicSizeCalculator.calcMaxHeight(curItem.itemElement, curItem.usedWidthMeasure);
                                }

                                if (maxCellMeasure.getRawMeasure() > curTrack.maxMeasure.getRawMeasure()) {
                                    curTrack.maxMeasure = maxCellMeasure;
                                }
                            }
                        }
                    }
                    /* Note: for content sized tracks, the layout engine may be using more than 1px precision.
                     * To ensure we match the layout engine's rounded result, we will get the actual track length
                     * and compare against our calculated length. If it is within 1px, we will assume that it is correct.
                     **/
                    // console.log( 'dealing with content-sized tracks now' );
                    switch (curSize) {
                    case gridTrackValue.maxContent:
                        actualMeasure = getActualTrackMeasure(curTrack.number, computingColumns);
                        //if (actualMeasure.equals(curTrack.maxMeasure) !== true) {
                            // Not an error; we will catch the problem later when we verify grid items.
                            // console.log( (computingColumns ? "Column" : "Row") + " " + curTrack.number + 
                            //             ": " + "max-content length difference detected; expected = " +
                            //             curTrack.maxMeasure.getPixelValueString() + ", actual = " +
                            //             actualMeasure.getPixelValueString() );
                        //}
                        curTrack.measure = curTrack.minMeasure = curTrack.maxMeasure;
                        break;
                    case gridTrackValue.minContent:
                        actualMeasure = getActualTrackMeasure(curTrack.number, computingColumns);
                        //if (actualMeasure.equals(curTrack.minMeasure) !== true) {
                            // Not an error; we will catch the problem later when we verify grid items.
                            // console.log( (computingColumns ? "Column" : "Row") + " " + curTrack.number + 
                            //              ": " + "min-content length difference detected; expected = " +
                            //              curTrack.minMeasure.getPixelValueString() + ", actual = " +
                            //              actualMeasure.getPixelValueString() );
                        //}
                        curTrack.measure = curTrack.maxMeasure = curTrack.minMeasure;
                        break;
                    case gridTrackValue.fitContent:
                    case gridTrackValue.auto:
                        // We can't determine at this point if we need to adjust 
                        // to the actual track length since sizing isn't complete.
                        curTrack.measure = curTrack.minMeasure;
                        break;
                    }
                }

                if (curTrack.sizingType === sizingTypeEnum.keyword &&
                        (curTrack.size === gridTrackValue.auto ||
                         curTrack.size === gridTrackValue.fitContent)) {
                    autoTracks.push(curTrack);
                }
                if (curTrack.sizingType === sizingTypeEnum.valueAndUnit) {
                    if (curTrack.size.unit === PX) {
                        curTrack.measure = curTrack.minMeasure = curTrack.maxMeasure = layoutMeasure.measureFromPx(curTrack.size.value);
                    } else if (curTrack.size.unit === FR) {
                        // 9.1.1.b/9.2.1.b: A column with a fraction-sized minimum length is assigned a 0px minimum.
                        curTrack.measure = layoutMeasure.zero();
                        fractionalTracks.push(curTrack);
                        // TODO: fractional tracks should go through the max calculation for 
                        // use with verifying a grid in infinite/unconstrained space.
                    } else {
                        // Track lengths are assumed to always be in pixels or fractions. Convert before going into this function.
                        error = true;
                        // console.log("track size not converted into px!");
                        // TODO: throw after we start doing conversions and don't want to ignore this anymore.
                    }
                }
                curTrack = iter.next();
            }

            // 9.1.2/9.2.2: All [columns|rows] not having a fraction-sized maximum are grown from
            // their minimum to their maximum specified size until available space is exhausted.
            sumOfTrackMeasures = getSumOfTrackMeasures(trackManager);
            remainingSpace = availableSpace.subtract(sumOfTrackMeasures);

            if (remainingSpace.getRawMeasure() > 0) {
                sortFunc = createBoundedWrapper(compareAutoTracksAvailableGrowth);
                autoTracks.sort(sortFunc);

                for (autoTrackIndex = 0, autoTrackLength = autoTracks.length; autoTrackIndex < autoTrackLength; autoTrackIndex += 1) {
                    if (remainingSpace.getRawMeasure() <= 0) {
                        break;
                    }
                    trackShareOfSpace = remainingSpace.divide(autoTracks.length - autoTrackIndex);

                    trackShareOfSpace = layoutMeasure
                                            .min(trackShareOfSpace, autoTracks[autoTrackIndex]
                                                                        .maxMeasure
                                                                        .subtract(autoTracks[autoTrackIndex].measure));
                    autoTracks[autoTrackIndex].measure = autoTracks[autoTrackIndex].measure.add(trackShareOfSpace);
                    remainingSpace = remainingSpace.subtract(trackShareOfSpace);
                }
            }

            /* 9.1.2.c/9.2.2.c: After all [columns|rows] (excluding those with a fractional maximum)
             * have grown to their maximum [width|height], consider any spanning elements that could
             * contribute to a content-based [column|row] [width|height] (minimum or maximum) and 
             * grow equally all [columns|rows] covered by the span until available space is exhausted.
             **/
            for (i = 0, iLen = spans.length; i < iLen && remainingSpace > 0; i += 1) {
                curSpanningItem = spans[i];
                firstTrack = (computingColumns ? curSpanningItem.column : curSpanningItem.row);
                numSpanned = (computingColumns ? curSpanningItem.columnSpan : curSpanningItem.rowSpan);

                /* 9.1.2.c.i/9.2.2.c.i. Spanning elements covering [columns|rows] with
                 * fraction-sized maximums are ignored as the fraction column "eats" all
                 * the space from the spanning element which could have caused growth 
                 * in [columns|rows] with a content-based size.
                 **/
                if (!trackManager.spanIsInFractionalTrack(firstTrack, numSpanned)) {
                    continue;
                }

                sumOfTrackMeasures = getSumOfSpannedTrackMeasures(trackManager, firstTrack, numSpanned);
                measureSpanCanGrow = (computingColumns === true ? curSpanningItem.maxWidthMeasure
                                                                 : curSpanningItem.maxHeightMeasure).subtract(sumOfTrackMeasures);

                if (measureSpanCanGrow.getRawMeasure() > 0) {
                    throw new Error('Not implemented');
                    // Redistribute among all content-sized tracks that this span is a member of.
                    //tracksToGrow = getContentBasedTracksThatSpanCrosses(trackManager, firstTrack, numSpanned);
                    //remainingSpace = redistributeSpace(tracksToGrow, remainingSpace, measureSpanCanGrow);
                }
            }

            // REMOVING AS IT SEEMS UNNECESSARY RIGHT NOW
            // remainingSpace = remainingSpace
            //                         .subtract( adjustForTrackLengthDifferences( autoTracks, computingColumns ) );

            /* 9.1.3/9.2.3: Fraction-sized [columns|rows] are grown 
             * from their minimum to their maximum [width|height] in 
             * accordance with their space distribution factor until 
             * available space is exhausted.
             **/
            if (fractionalTracks.length > 0 &&
                    (remainingSpace.getRawMeasure() > 0 ||
                     useAlternateFractionalSizing)) {
                //if (!useAlternateFractionalSizing || respectAvailableLength) {
                    // console.log("remaining space for fractional sizing = " + remainingSpace.getPixelValueString());
                //}
                sortFunc = createBoundedWrapper(compareFractionTracksNormalMeasure);
                fractionalTracks.sort(sortFunc);
                sumOfFractions = 0;
                for (i = 0, iLen = fractionalTracks.length; i < iLen; i += 1) {
                    sumOfFractions += fractionalTracks[i].size.value;
                }
                oneFractionMeasure = null;
                if (!useAlternateFractionalSizing) {
                    oneFractionMeasure = remainingSpace.divide(sumOfFractions);
                } else {
                    // In alternate fractional sizing, we determine the max "1fr"
                    // length based on the max-content size of the track.
                    oneFractionMeasure = determineMeasureOfOneFractionUnconstrained(fractionalTracks);
                }

                iLen = fractionalTracks.length;
                if (useAlternateFractionalSizing) {
                    if (respectAvailableLength) {
                        // Using alternate sizing but still need to stay within the remaining space.
                        // Adjust the one fraction length so that everything will fit.
                        totalMeasureToAdd = layoutMeasure.zero();
                        for (i = 0; i < iLen; i += 1) {
                            totalMeasureToAdd = totalMeasureToAdd.add(oneFractionMeasure.multiply(fractionalTracks[i].size.value));
                        }
                        if (totalMeasureToAdd.getRawMeasure() > 0 &&
                                remainingSpace.getRawMeasure() > 0 &&
                                totalMeasureToAdd.getRawMeasure() > remainingSpace.getRawMeasure()) {
                            oneFractionMeasure = oneFractionMeasure.multiply(remainingSpace.divide(totalMeasureToAdd.getRawMeasure()).getRawMeasure());
                        }
                    }
                    for (i = 0; i < iLen; i += 1) {
                        fractionalTracks[i].measure = fractionalTracks[i]
                                                        .measure
                                                        .add(oneFractionMeasure.multiply(fractionalTracks[i].size.value));
                    }
                } else if (iLen > 0) {
                    lastNormalizedFractionalMeasure = getNormalFractionMeasure(fractionalTracks[0]);
                    accumulatedFactors = 0;
                    accumulatedFactorsInDistributionSet = 0;
                    for (i = 0; i < iLen; i += 1) {
                        if (lastNormalizedFractionalMeasure.getRawMeasure() <
                                getNormalFractionMeasure(fractionalTracks[i]).getRawMeasure()) {
                            accumulatedFactorsInDistributionSet = accumulatedFactors;
                            normalizedDelta = getNormalFractionMeasure(fractionalTracks[i])
                                                .subtract(lastNormalizedFractionalMeasure);
                            for (j = 0; j < i; j += 1) {
                                spaceToDistribute = 0;
                                if (accumulatedFactorsInDistributionSet > 0) {
                                    spaceToDistribute = remainingSpace
                                                            .multiply(fractionalTracks[j].size.value)
                                                            .divide(accumulatedFactorsInDistributionSet);
                                    spaceToDistribute = layoutMeasure
                                                            .min(spaceToDistribute,
                                                                 normalizedDelta.multiply(fractionalTracks[j].size.value));
                                    spaceToDistribute = layoutMeasure.min(spaceToDistribute, fractionalTracks[j].maxMeasure);
                                }

                                fractionalTracks[j].measure = fractionalTracks[j].measure.add(spaceToDistribute);
                                remainingSpace -= spaceToDistribute;
                                accumulatedFactorsInDistributionSet -= fractionalTracks[j].size.value;
                            }
                            lastNormalizedFractionalMeasure = getNormalFractionMeasure(fractionalTracks[i]);
                        }
                        accumulatedFactors += fractionalTracks[i].size.value;
                        if (remainingSpace.getRawMeasure() <= 0) {
                            break;
                        }
                    }
                    // Once all fractional tracks are in the same group, do a final pass to distribute the remaining space.
                    accumulatedFactorsInDistributionSet = accumulatedFactors;
                    for (i = 0; i < iLen; i += 1) {
                        spaceToDistribute = 0;
                        if (accumulatedFactorsInDistributionSet > 0) {
                            spaceToDistribute = remainingSpace
                                                    .multiply(fractionalTracks[i].size.value / accumulatedFactorsInDistributionSet);
                            //    uncomment and scope to minmax functionality
                            //spaceToDistribute = layoutMeasure.min(spaceToDistribute, fractionalTracks[i].maxMeasure);
                        }
                        fractionalTracks[i].measure = fractionalTracks[i].measure.add(spaceToDistribute);
                        remainingSpace = remainingSpace.subtract(spaceToDistribute);
                        accumulatedFactorsInDistributionSet -= fractionalTracks[i].size.value;
                    }
                }
                // REMOVING AS IT SEEMS UNNECESSARY RIGHT NOW
                // remainingSpace = remainingSpace
                //                     .subtract( adjustForTrackLengthDifferences( fractionalTracks, computingColumns ) );
            }
            if (computingColumns) {
                // Save the used widths for each of the items so that it can be used during row size resolution.
                saveUsedCellWidths(trackManager);
            }
        }

        function calculateGridItemShrinkToFitSizes() {
            var i,
                iLen = items.length,
                curItem,
                columnsBreadth,
                rowsBreadth,
                swapWidthAndHeight,
                forcedWidth = null,
                forcedHeight = null;

            for (i = 0; i < iLen; i += 1) {
                curItem = items[i];
                if (curItem.shrinkToFitSize === null) {
                    // Percentage resolution is based on the size of the cell for the grid item.
                    columnsBreadth = getSumOfSpannedTrackMeasures(columnTrackManager, curItem.column, curItem.columnSpan);
                    rowsBreadth = getSumOfSpannedTrackMeasures(rowTrackManager, curItem.row, curItem.rowSpan);

                    // Force a stretch if requested.
                    if (curItem.position === positionEnum[STATIC] ||
                            curItem.position === positionEnum.relative) {
                        swapWidthAndHeight = shouldSwapWidthAndHeight();
                        if (curItem.columnAlign === gridAlignEnum.stretch) {
                            if (!swapWidthAndHeight) {
                                forcedWidth = columnsBreadth;
                            } else {
                                forcedHeight = columnsBreadth;
                            }
                        }
                        if (curItem.rowAlign === gridAlignEnum.stretch) {
                            if (!swapWidthAndHeight) {
                                forcedHeight = rowsBreadth;
                            } else {
                                forcedWidth = rowsBreadth;
                            }
                        }
                    }

                    // Only calculate an intrinsic size if we're not forcing both width and height.
                    if (forcedWidth === null ||
                            forcedHeight === null) {
                        curItem.shrinkToFitSize =
                            intrinsicSizeCalculator.calcShrinkToFitWidthAndHeight(
                                curItem.itemElement,
                                columnsBreadth,
                                rowsBreadth,
                                forcedWidth,
                                forcedHeight
                            );
                    } else {
                        curItem.shrinkToFitSize = widthAndHeight();
                    }

                    if (forcedWidth !== null) {
                        curItem.shrinkToFitSize.width = forcedWidth;
                    }

                    if (forcedHeight !== null) {
                        curItem.shrinkToFitSize.height = forcedHeight;
                    }
                }
            }
        }

        function determineBorderWidths() {
            var el = div.cloneNode(false),
                border = BORDER + HYPHEN + RIGHT,
                width,
                size;

            document.body.appendChild(el);
            el.style.width = '100px';
            width = parseInt(el.offsetWidth, 10);

            for (size in borderWidthsEnum) {
                if (borderWidthsEnum.hasOwnProperty(size)) {
                    el.style[border] = size + ' solid';
                    borderWidthsEnum[size] = parseInt(el.offsetWidth, 10) - width;
                }
            }

            document.body.removeChild(el);
        }

        function getPosition(item) {
            var col = item.column - 1,
                row = item.row - 1,
                pos = {
                    top: 0,
                    left: 0
                };

            pos.left = columnTrackManager.tracks.slice(0, col).reduce(function (acc, track) {
                return acc + track.measure.getRawMeasure();
            }, 0);

            pos.top = rowTrackManager.tracks.slice(0, row).reduce(function (acc, track) {
                return acc + track.measure.getRawMeasure();
            }, 0);

            /*
            for (col = item.column - 1; col > 0; col -= 1) {
                pos.left += columnTrackManager.tracks[col].measure.internalMeasure;
            }

            for (row = item.row - 1; row > 0; row -= 1) {
                pos.top += rowTrackManager.tracks[row].measure.internalMeasure;
            }
            */
            pos.left += PX;
            pos.top += PX;

            return pos;
        }

        function getDimensions(item) {
            var dimensions = item.shrinkToFitSize,
                element = item.itemElement,
                margins = {},
                padding = {},
                borders = {},
                sides = [TOP, RIGHT, BOTTOM, LEFT];

            dimensions = {
                height: dimensions.height.getRawMeasure(),
                width: dimensions.width.getRawMeasure()
            };

            sides.forEach(function (side) {
                margins[side] = layoutMeasure.measureFromStyleProperty(element, MARGIN + HYPHEN + side);
                padding[side] = layoutMeasure.measureFromStyleProperty(element, PADDING + HYPHEN + side);
                borders[side] = layoutMeasure.measureFromStyleProperty(element, BORDER + HYPHEN + side + HYPHEN + WIDTH);
            });

            dimensions.height -= (margins.top.getRawMeasure() + margins.bottom.getRawMeasure() +
                                    padding.top.getRawMeasure() + padding.bottom.getRawMeasure() +
                                    borders.top.getRawMeasure() + borders.bottom.getRawMeasure());
            dimensions.width -= (margins.left.getRawMeasure() + margins.right.getRawMeasure() +
                                   padding.left.getRawMeasure() + padding.right.getRawMeasure() +
                                  borders.left.getRawMeasure() + borders.right.getRawMeasure());
            return dimensions;
        }

        function layout() {
            // console.log('laying out now');
            var styles = EMPTY,
                gridstyles = EMPTY,
                height = 0,
                width = 0,
                rows = rowTrackManager.tracks,
                cols = columnTrackManager.tracks;

            items.forEach(function (item) {
                var details = item.styles,
                    className = item.itemElement.className,
                    newclass = makeUniqueClass(),
                    re,
                    position,
                    dimensions;

                re = new RegExp(GRIDLAYOUT + '-\\d*\\s?', 'g');
                item.itemElement.className = className.replace(re, '');
                addClass(item.itemElement, newclass);
                position = getPosition(item);
                dimensions = getDimensions(item);

                styles += details.selector + PERIOD + newclass + OPEN_CURLY + POSITION + COLON + ABSOLUTE + SEMICOL;
                styles += TOP + COLON + position.top + SEMICOL;
                styles += LEFT + COLON + position.left + SEMICOL;
                styles += WIDTH + COLON + dimensions.width + PX + SEMICOL;
                styles += HEIGHT + COLON + dimensions.height + PX + SEMICOL;
                styles += CLOSE_CURLY;
            });

            if (getCssValue(gridElement, POSITION) === STATIC) {
                gridstyles += POSITION + COLON + RELATIVE + SEMICOL;
            }

            height = rows.reduce(function (acc, row) {
                return acc + row.measure.getRawMeasure();
            }, 0);

            gridstyles += HEIGHT + COLON + height + PX + SEMICOL;

            width = cols.reduce(function (acc, col) {
                return acc + col.measure.getRawMeasure();
            }, 0);

            gridstyles += WIDTH + COLON + width + PX + SEMICOL;

            styles += selector + OPEN_CURLY + gridstyles + CLOSE_CURLY;

            // console.log(styles);
            embedCss(styles, media);
        }

        function prepare() {
            clearEmbeddedCss(media);
        }

        function setup() {
            var gridCols = properties[GRIDCOLUMNS] || NONE,
                gridRows = properties[GRIDROWS] || NONE;

            // Get the available space for the grid since it is required
            // for determining track sizes for auto/fit-content/minmax 
            // and fractional tracks.
            determineGridAvailableSpace();

            // console.log( "Grid element content available space: columns = " + 
            //             availableSpaceForColumns.getPixelValueString() + "; rows = " +
            //             availableSpaceForRows.getPixelValueString() );

            propertyParser.parseGridTracksString(gridCols, columnTrackManager);
            propertyParser.parseGridTracksString(gridRows, rowTrackManager);

            mapGridItemsToTracks();
            saveItemPositioningTypes();

            determineTrackSizes(WIDTH);
            determineTrackSizes(HEIGHT);

            calculateGridItemShrinkToFitSizes();

            determineBorderWidths();

            //verifyGridItemSizes();
            //verifyGridItemPositions(gridObject);
        }

        function verifyGridItemLengths(verifyingColumnBreadths) {
            var trackManager = verifyingColumnBreadths ? columnTrackManager : rowTrackManager,
                verifyingPhysicalWidths = usePhysicalWidths(blockProgression, verifyingColumnBreadths),
                dimension = verifyingPhysicalWidths ? 'Width' : 'Height';


            // Uncomment if needed for debugging.
            //dumpTrackLengths(trackManager, GridTest.logger, GridTest.logger.logDebug);


            //if (verifyingColumnBreadths && !verifyingPhysicalWidths) {
                // console.log("Column breadths are heights due to block-progression value '" + blockProgressionEnum.keyword + "'");
            //} else if (!verifyingColumnBreadths && verifyingPhysicalWidths) {
                // console.log("Row breadths are widths due to block-progression value '" + blockProgressionEnum.keyword + "'");
            //}

            items.forEach(function (curItem) {
                var curItemElement = curItem.itemElement,
                    trackNum,
                    alignType,
                    actualMeasure,
                    itemId,
                    offsetLength,
                    offsetMeasure,
                    expectedMeasure,
                    firstTrack,
                    trackSpan;

                if ((verifyingColumnBreadths ? curItem.verified.columnBreadth : curItem.verified.rowBreadth) !== true) {
                    trackNum = verifyingColumnBreadths ? curItem.column : curItem.row;
                    alignType = verifyingColumnBreadths ? curItem.columnAlign : curItem.rowAlign;
                    // console.log(curItemElement.parentNode);
                    // console.log(getCssValue(curItemElement,WIDTH));
                    actualMeasure = boxSizeCalculator['calcMarginBox' + dimension](curItemElement);

                    itemId = EMPTY;
                    if (curItem.itemElement.id.length > 0) {
                        itemId = "[ID = " + curItem.itemElement.id + "] ";
                    }

                    // Check the offsetWidth/offsetHeight to make sure it agrees.
                    offsetLength = curItem.itemElement['offset' + dimension];
                    offsetMeasure = layoutMeasure.measureFromPx(offsetLength);
                    if (actualMeasure.getMeasureRoundedToWholePixel().equals(offsetMeasure) !== true) {
                        error = true;
                        // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + 
                        //             trackNum + ", item " + i + ": " +
                        //             "offset length doesn't agree with calculated margin box length (" +
                        //             ( verifyingPhysicalWidths ? "offsetWidth" : "offsetHeight" ) +
                        //             ": " + offsetMeasure.getPixelValueString() + "; expected (unrounded): " +
                        //             actualMeasure.getPixelValueString() );
                    }


                    if (curItem.position === positionEnum.absolute) {
                        // Use shrink-to-fit sizes.
                        if (curItem.shrinkToFitSize === null) {
                            throw new Error('Current item\'s shrink to fit size has not been calculated');
                        }
                        expectedMeasure = (verifyingPhysicalWidths ? curItem.shrinkToFitSize.width : curItem.shrinkToFitSize.height);
                    } else {
                        switch (alignType) {
                        case gridAlignEnum.stretch:
                            // Grid item's width/height should be equal to the lengths of the tracks it spans.
                            firstTrack = (verifyingColumnBreadths ? curItem.column : curItem.row);
                            trackSpan = (verifyingColumnBreadths ? curItem.columnSpan : curItem.rowSpan);
                            expectedMeasure = getSumOfSpannedTrackMeasures(trackManager, firstTrack, trackSpan);
                            break;
                        case gridAlignEnum.start:
                        case gridAlignEnum.end:
                        case gridAlignEnum.center:
                            // Item uses its shrink-to-fit size.
                            if (curItem.shrinkToFitSize === null) {
                                throw new Error('Current item\'s shrink to fit size has not been calculated');
                            }
                            // shrinkToFitSize is physical
                            expectedMeasure = (verifyingPhysicalWidths ? curItem.shrinkToFitSize.width
                                                                        : curItem.shrinkToFitSize.height);
                            break;
                        default:
                            throw new Error("Unknown grid align type " + alignType.keyword);
                        }
                    }

                    if (expectedMeasure.equals(actualMeasure) !== true) {
                        // If the agent is more precise than whole pixels, and we are off 
                        // by just one layout pixel (1/100th of a pixel for IE), it's close enough.
                        if (precision === 0 && Math.abs(expectedMeasure.subtract(actualMeasure).getRawMeasure()) !== 1) {
                            error = true;
                            // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                            //             "sizing check failed (alignment: " + alignType.keyword + "; expected: " +
                            //             expectedMeasure.getPixelValueString() + "; actual: " + 
                            //             actualMeasure.getPixelValueString() + ")" );
                        }
                        // else {
                            // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                            //             "sizing check passed after adjustment for fuzzy error checking (alignment: " + 
                            //             alignType.keyword + "; expected: " + expectedMeasure.getPixelValueString() + 
                            //             "; actual: " + actualMeasure.getPixelValueString() + ")" );
                        //} 
                    }
                    //} else {
                        // console.log( itemId + (verifyingColumnBreadths ? "column" : "row") + " " + trackNum + ": " +
                        //             "sizing check passed (alignment: " + alignType.keyword + "; expected: " +
                        //             expectedMeasure.getPixelValueString() + "; actual: " + actualMeasure.getPixelValueString() + ")" );
                    //}

                    if (verifyingColumnBreadths) {
                        curItem.verified.columnBreadth = true;
                    } else {
                        curItem.verified.rowBreadth = true;
                    }
                }
                //else {
                    // console.log( itemId + ": already verified " + (verifyingColumnBreadths ? "column" : "row") + " breadth" );
                //}
            });
        }

        /*
        function verifyGridItemSizes() {
            verifyGridItemLengths(true);
            verifyGridItemLengths(false);
        }
        */
        /*
        function verifyGridItemPositions(gridObject) {
            verifyGridItemTrackPositions(gridObject, true);
            verifyGridItemTrackPositions(gridObject, false);
        }*/

        prepare();
        setup();
        layout();

        return {
            verifyGridItemLengths: verifyGridItemLengths
        };
    };
});
/*global define, require, document, console, window */
define('scalejs.layout-cssgrid/cssGridLayout',[
    'scalejs!core',
    './utils.sheetLoader',
    './gridLayout'
], function (
    core,
    utils,
    gridLayout
) {
    

    var cssGridRules,
        cssGridSelectors;

    function doLayout() {
        cssGridSelectors.forEach(function (grid) {
            var selector = grid.selector,
                element,
                properties = grid.properties,
                grid_items;

            element = document.getElementById(grid.selector.substring(1));
            if (element === null) { return; }

            grid_items = cssGridRules
                .filter(function (item) { return item !== grid; })
                .map(function (item) {
                    var grid_item = {};
                    grid_item.details = item;
                    grid_item.element = document.getElementById(item.selector.substring(1));

                    return grid_item;
                });

            //console.log(selector, properties, grid_items);

            gridLayout(element, selector, properties, 'screen', grid_items);
        });
    }

    return function polyfill() {
        var messageBus = core.reactive.messageBus;

        utils.loadAllStyleSheets(function (stylesheets) {
            //console.log('-->all stylesheets loaded', stylesheets);
            cssGridRules = Object.keys(stylesheets)
                .reduce(function (acc, url) {
                    var sheet = stylesheets[url];
                    return acc.concat(sheet.rulelist);
                }, [])
                .filter(function (rule) {
                    var declarations = rule.declarations;

                    if (rule.type !== 'style' || !declarations) { return false; }

                    return Object.keys(declarations).some(function (property) {
                        return property.indexOf('-ms-grid') === 0;
                    });
                })
                .map(function (rule) {
                    var e = {};

                    e.selector = rule.selector;
                    e.media = 'screen';
                    e.properties = {};
                    Object.keys(rule.declarations).forEach(function (property) {
                        var value = rule.declarations[property];
                        if (property.indexOf('-ms-grid') === 0) {
                            e.properties[property.substring(4)] = value;
                        } else if (property === 'display' && value === '-ms-grid') {
                            e.properties.display = 'grid';
                        } else {
                            e.properties[property] = value;
                        }
                    });

                    return e;
                });

            //console.log('css grid rule', gridRules);

            cssGridSelectors = cssGridRules.filter(function (rule) {
                return rule.properties.display === 'grid';
            });
            //console.log('css grids', grids);

            doLayout();

            messageBus.receive('css-grid-layout', function () {
                console.log('--->css grid layout: doLayout');
                doLayout();
            });

            window.addEventListener('resize', function () {
                doLayout();
            });
        });
    };
});

/*global define*/
define('scalejs.layout-cssgrid',[
    'CSS.supports',
    './scalejs.layout-cssgrid/cssGridLayout',
    'scalejs.reactive'
], function (
    css,
    polyfill
) {
    

    //console.log('is -ms-grid supported? ' + (css.supports('display', '-ms-grid') || false));
    if (!css.supports('display', '-ms-grid')) {
        polyfill();
    }
});

