
/*global define, require, document, window, ActiveXObject, XMLHttpRequest, console*/
define('scalejs.layout-cssgrid/utils.sheetLoader',[
    'cssparser',
    'domReady'
], function (
    cssParser
) {
    

    function toArray(list, start, end) {
        /*ignore jslint start*/
        var array = [],
            i,
            result;

        for (i = list.length; i--; array[i] = list[i]) { }

        result = Array.prototype.slice.call(array, start, end);

        return result;
        /*ignore jslint end*/
    }

    function load(url, callback) {
        function getRequest() {
            if (window.ActiveXObject) {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }

            if (window.XMLHttpRequest) {
                return new XMLHttpRequest();
            }
        }

        var request = getRequest();
        if (request) {
            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    callback(request.responseText);
                }
            };
        }
        request.open("GET", url, true);
        request.send();
    }

    function loadStyleSheet(url, loadedStyleSheets, onLoaded) {
        if (loadedStyleSheets.hasOwnProperty(url)) {
            return;
        }

        loadedStyleSheets[url] = null;

        load(url, function (stylesheet) {
            var parsed = cssParser.parse(stylesheet);

            loadedStyleSheets[url] = parsed;

            (parsed.imports || []).forEach(function (cssImport) {
                loadStyleSheet(cssImport['import'].replace(/['"]/g, ''), loadedStyleSheets, onLoaded);
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

    Object.getPrototypeOf(cssParser).parseError = function (error, details) {
        console.log(error, details);
    };

    return {
        loadAllStyleSheets: loadAllStyleSheets
    };
});


define('scalejs.layout-cssgrid/gridTracksParser',[], function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"start":3,"tokens":4,"EOF":5,"t":6,"SPACE":7,"NUMBER":8,"PX":9,"FR":10,"AUTO":11,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",7:"SPACE",8:"NUMBER",9:"PX",10:"FR",11:"AUTO"},
productions_: [0,[3,2],[4,1],[4,3],[6,0],[6,2],[6,2],[6,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1: 
            var result = $$[$0-1]
                .filter(function (track) { return track; })
                .map(function (track, i) { track.index = i + 1; return track; });
            //console.log(result);
            return result;
        
break;
case 2: this.$ = [$$[$0]]; 
break;
case 3: 
            this.$ = $$[$0-2].concat($$[$0]); 
        
break;
case 5: this.$ = { type: 'px', size : parseInt($$[$0-1], 10) }; 
break;
case 6: this.$ = { type: 'fr', size: parseInt($$[$0-1], 10) }; 
break;
case 7: this.$ = { type: 'keyword', size : 'auto' }; 
break;
}
},
table: [{3:1,4:2,5:[2,4],6:3,7:[2,4],8:[1,4],11:[1,5]},{1:[3]},{5:[1,6],7:[1,7]},{5:[2,2],7:[2,2]},{9:[1,8],10:[1,9]},{5:[2,7],7:[2,7]},{1:[2,1]},{5:[2,4],6:10,7:[2,4],8:[1,4],11:[1,5]},{5:[2,5],7:[2,5]},{5:[2,6],7:[2,6]},{5:[2,3],7:[2,3]}],
defaultActions: {6:[2,1]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == 'undefined') {
        this.lexer.yylloc = {};
    }
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === 'function') {
        this.parseError = this.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || EOF;
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + this.lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: this.lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: this.lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                this.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

/* generated by jison-lex 0.2.1 */
var lexer = (function(){
var lexer = {

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input) {
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 7
break;
case 1:return 8
break;
case 2:return 11
break;
case 3:return 9
break;
case 4:return 10
break;
case 5:return 5
break;
}
},
rules: [/^(?:\s+)/,/^(?:[0-9]+)/,/^(?:[aA][uU][tT][oO])/,/^(?:[pP][xX])/,/^(?:[fF][rR])/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5],"inclusive":true}}
};
return lexer;
})();
parser.lexer = lexer;
return parser;
});
/*global define, document, window */
define('scalejs.layout-cssgrid/gridLayout',[
    './gridTracksParser'
], function (
    gridTracksParser
) {
    

    var GRIDCOLUMN = 'grid-column',
        GRIDCOLUMNS = 'grid-columns',
        GRIDCOLUMNSPAN = 'grid-column-span',
        GRIDROW = 'grid-row',
        GRIDROWS = 'grid-rows',
        GRIDROWSPAN = 'grid-row-span',
        KEYWORD = 'keyword',
        FR = 'fr',
        AUTO = 'auto',
        PX = 'px',
        TOP = 'top',
        RIGHT = 'right',
        BOTTOM = 'bottom',
        LEFT = 'left',
        WIDTH = 'width',
        HEIGHT = 'height',
        MARGIN = 'margin',
        PADDING = 'padding',
        BORDER = 'border',
        HYPHEN = '-';

    function addItemToTracks(tracks, itemTracks, item, firstTrack, lastTrack) {
        tracks
            .filter(function (track) { return track.index >= firstTrack && track.index <= lastTrack; })
            .forEach(function (track) {
                if (track.items === undefined) {
                    track.items = [];
                }
                track.items.push(item);
                itemTracks.push(track);
            });
    }

    function mapGridItemsToTracks(gridItems, columnTracks, rowTracks) {
        return gridItems.map(function (curItem) {
            var newItem = {};

            newItem.column = parseInt(curItem.details.properties[GRIDCOLUMN], 10);

            if (isNaN(newItem.column)) {
                newItem.column = 1;
            }

            newItem.columnSpan = parseInt(curItem.details.properties[GRIDCOLUMNSPAN], 10);
            if (isNaN(newItem.columnSpan)) {
                newItem.columnSpan = 1;
            }

            newItem.row = parseInt(curItem.details.properties[GRIDROW], 10);
            if (isNaN(newItem.row)) {
                newItem.row = 1;
            }

            newItem.rowSpan = parseInt(curItem.details.properties[GRIDROWSPAN], 10);
            if (isNaN(newItem.rowSpan)) {
                newItem.rowSpan = 1;
            }

            newItem.element = curItem.element;
            newItem.styles = curItem.details;
            newItem.columnTracks = [];
            newItem.rowTracks = [];

            addItemToTracks(columnTracks, newItem.columnTracks, newItem, newItem.column, newItem.column + newItem.columnSpan - 1);
            addItemToTracks(rowTracks, newItem.rowTracks, newItem, newItem.row, newItem.row + newItem.rowSpan - 1);

            return newItem;
        });
    }

    function camelize(str) {
        var regex = /(-[a-z])/g,
            func = function (bit) {
                return bit.toUpperCase().replace('-', '');
            };

        return is(str, 'string')
            ? str.toLowerCase().replace(regex, func)
            : str;
    }

    function getCssValue(element, property) {
        if (element.currentStyle) {
            return element.currentStyle[camelize(prop)];
        }

        if (window.getComputedStyle) {
            return window.getComputedStyle(element, null).getPropertyValue(property);
        }
    }

    function getMeasureValue(element, property) {
        var value = getCssValue(element, property);
        value = parseFloat(value, 10);

        return isNaN(value) ? 0 : Math.ceil(value);
    }

    function frameSize(element, dimension) {
        var sides = dimension === WIDTH ? [RIGHT, LEFT] : [TOP, BOTTOM],
            size;

        size = sides.reduce(function (result, side) {
            return result +
                getMeasureValue(element, MARGIN + HYPHEN + side) +
                getMeasureValue(element, PADDING + HYPHEN + side) +
                getMeasureValue(element, BORDER + HYPHEN + side + HYPHEN + WIDTH);
        }, 0);

        return size;
    }

    function pxTracks(tracks) {
        return tracks
            .filter(function (track) { return track.type === PX; })
            .reduce(function (size, track) {
                track.pixels = track.size;
                return size + track.pixels;
            }, 0);
    }

    function autoTracks(tracks, dimension) {
        return tracks
             .filter(function (track) { return track.type === KEYWORD && track.size === AUTO && track.items; })
             .reduce(function (size, track) {
                 var noFrItems,
                     noFrItem,
                     trackSize,
                     offsetProperty = 'offset' + (dimension === WIDTH ? 'Width' : 'Height'),
                     tracksProperty = (dimension === WIDTH ? 'column' : 'row') + 'Tracks';
                 // find first item that has no FR rows.
                 // Then use it's size to determine track size.
                 noFrItems = track.items.filter(function (item, i) {
                     return item[tracksProperty].reduce(function (r, tr) { return r && tr.type !== FR; }, true);
                 });

                 noFrItem = noFrItems[0];
                 if (noFrItem) {
                     //trackSize = getMeasureValue(noFrItem.element, dimension) + frameSize(noFrItem.element, dimension);
                     trackSize = Math.ceil(parseFloat(noFrItem.element.style[dimension], 10)) + frameSize(noFrItem.element, dimension);
                     if (isNaN(trackSize)) {
                         noFrItem.element.style[dimension] = '';
                         trackSize = noFrItem.element[offsetProperty];
                     }
                     // set it to 0 so that reduce would properly calculate
                     track.pixels = 0;
                     track.pixels = noFrItem[tracksProperty].reduce(function (r, tr) { return r - tr.pixels; }, trackSize);
                 } else {
                     track.pixels = 0;
                 }

                 return size + track.pixels;
             }, 0);
    }

    function frTracks(tracks, size) {
        var frs,
            totalFRs;

        frs = tracks.filter(function (track) { return track.type === FR; });
        totalFRs = frs.reduce(function (sum, track) { return sum + track.size; }, 0);

        frs.forEach(function (track) {
            track.pixels = size * track.size / totalFRs;
        });
    }

    function sizeTracks(tracks, size, dimension) {
        size -= pxTracks(tracks);
        size -= autoTracks(tracks, dimension);

        frTracks(tracks, size);
    }

    /*jslint unparam:true*/
    return function gridLayout(gridElement, selector, properties, media, gridItems) {
        var columnTracks,
            rowTracks,
            mappedItems;

        columnTracks = gridTracksParser.parse(properties[GRIDCOLUMNS]);
        rowTracks = gridTracksParser.parse(properties[GRIDROWS]);

        mappedItems = mapGridItemsToTracks(gridItems, columnTracks, rowTracks);

        sizeTracks(columnTracks, gridElement.offsetWidth, WIDTH);
        sizeTracks(rowTracks, gridElement.offsetHeight, HEIGHT);
        //console.log(width, height);

        //gridElement.style.position = 'relative';
        //console.log('--->' + properties[GRIDROWS]);
        //console.log(gridTracksParser.parse(properties[GRIDROWS]));
        //console.log('-->gridLayout', gridElement, properties, grid_items);
        mappedItems.forEach(function (item) {
            var width,
                height,
                left,
                top,
                parentLeft = 0,
                parentTop = 0;

            item.element.style.position = 'absolute';

            width = columnTracks
                .filter(function (track) { return track.index >= item.column && track.index < item.column + item.columnSpan; })
                .reduce(function (sum, track) { return sum + track.pixels; }, 0);

            height = rowTracks
                .filter(function (track) { return track.index >= item.row && track.index < item.row + item.rowSpan; })
                .reduce(function (sum, track) { return sum + track.pixels; }, 0);

            left = columnTracks
                .filter(function (track) { return track.index < item.column; })
                .reduce(function (sum, track) { return sum + track.pixels; }, 0);

            top = rowTracks
                .filter(function (track) { return track.index < item.row; })
                .reduce(function (sum, track) { return sum + track.pixels; }, 0);

            if (item.element.parentNode) {
                parentMarginLeft = parseInt(item.element.parentNode.marginLeft, 10);
                if (isNaN(parentMarginLeft)) {
                    parentMarginLeft = 0;
                }
            }

            if (item.element.parentNode) {
                parentTop = parseInt(item.element.parentNode.top, 10);
                if (isNaN(parentTop)) {
                    parentTop = 0;
                }
            }
            
            width -= frameSize(item.element, WIDTH);
            height -= frameSize(item.element, HEIGHT);

            console.log(item.element.id, width, height);

            item.element.style.width = width + PX;
            item.element.style.height = height + PX;
            item.element.style.left = left + parentLeft + PX;
            item.element.style.top = top + parentTop + PX;
        });
    };
});
/*global define, document, window, console */
define('scalejs.layout-cssgrid/utils.profiler',[],function () {
    

    var profile,
        activeProfiles,
        self;

    function reset() {
        profile = {
            name: 'Profiler',
            profiles: []
        };
        activeProfiles = [profile];
    }

    function caller(n) {
        n = n || 0;
        var err = new Error(),
            caller_line = err.stack.split("\n")[3 + n],
            index = caller_line.indexOf("at "),
            clean = caller_line.slice(index + 2, caller_line.length);

        return clean;
    }

    function start(n) {
        var name = caller(n),
            profile = {
                name: name,
                start: new Date().getTime(),
                profiles: []
            };
        activeProfiles[activeProfiles.length - 1].profiles.push(profile);
        activeProfiles.push(profile);
    }

    function prepend(indent) {
        var arr = [];
        arr.length = indent + 1;
        return "\n" + arr.join(' ');
    }

    function stop() {
        function loop(profile, indent) {
            var delta = profile.start && profile.finish
                    ? ': ' + (profile.finish - profile.start)
                    : '',
                current = prepend(indent) + profile.name + delta;
            profile.profiles.forEach(function (sw) {
                current += loop(sw, indent + 2);
            });
            return current;
        }

        var profile = activeProfiles.pop(),
            report;

        profile.finish = new Date().getTime();

        if (activeProfiles.length === 1) {
            report = loop(activeProfiles[0], 0);
            reset();

            console.debug(report);
        }
    }

    function item() {
        stop();
        start(1);
    }

    reset();

    self = {
        start: start,
        item: item,
        stop: stop
    };

    window.profiler = self;

    return self;
});
/*global define, require, document, console, window, clearTimeout, setTimeout */
define('scalejs.layout-cssgrid/cssGridLayout',[
    'scalejs!core',
    './utils.sheetLoader',
    './gridLayout',
    './utils.profiler'
], function (
    core,
    sheetLoader,
    gridLayout,
    profiler
) {
    

    var cssGridRules,
        cssGridSelectors,
        //layoutTimeoutId,
        listeners = [];

    function onLayoutDone(callback) {
        core.array.addOne(listeners, callback);

        return function () {
            core.array.removeOne(listeners, callback);
        };
    }

    function notifyLayoutDone(gridElement, selector) {
        listeners.forEach(function (l) {
            l(gridElement, selector);
        });
    }

    /*jslint unparam:true*/
    function doLayout(element) {
        cssGridSelectors.forEach(function (grid) {
            profiler.start();
            var selector = grid.selector,
                gridElement,
                properties = grid.properties,
                grid_items,
                gridStyle;

            gridElement = document.getElementById(grid.selector.substring(1));
            if (gridElement === null) { return; }

            gridStyle = gridElement.getAttribute("style");
            if (gridStyle !== null) {
                gridStyle.split('; ').forEach(function (property) {
                    var tokens = property.split(':'),
                        value;

                    if (tokens.length === 2) {
                        property = tokens[0].trim();
                        value = tokens[1].trim();

                        if (property.indexOf('-ms-grid') === 0) {
                            properties[property.substring(4)] = value;
                        }
                    }
                });
            }
            Object.keys(properties).forEach(function (key) {
                gridElement.setAttribute('data-ms-' + key, properties[key]);
            });

            grid_items = cssGridRules
                .filter(function (item) { return item !== grid; })
                .map(function (item) {
                    var grid_item = {},
                        style,
                        gridItemElement;

                    gridItemElement = document.getElementById(item.selector.substring(1));
                    if (gridItemElement === null || gridItemElement.parentNode !== gridElement) {
                        return;
                    }

                    grid_item.element = gridItemElement;
                    grid_item.details = item;

                    style = grid_item.element.getAttribute("style");
                    if (style !== null) {
                        style.split(';').forEach(function (property) {
                            var tokens = property.split(':'),
                                value;

                            if (tokens.length === 2) {
                                property = tokens[0].trim();
                                value = tokens[1].trim();

                                if (property.indexOf('-ms-grid') === 0) {
                                    grid_item.details.properties[property.substring(4)] = value;
                                }
                            }
                        });
                    }

                    Object.keys(grid_item.details.properties).forEach(function (key) {
                        grid_item.element.setAttribute('data-ms-' + key, grid_item.details.properties[key]);
                    });
                    return grid_item;
                })
                .filter(function (item) { return item; });

            //console.log(selector, properties, grid_items);

            gridLayout(gridElement, selector, properties, 'screen', grid_items);
            profiler.stop();

            notifyLayoutDone(gridElement, selector);
        });
    }
    /*
    function layout() {
        clearTimeout(layoutTimeoutId);
        layoutTimeoutId = setTimeout(doLayout, 100);
    }*/

    function polyfill() {
        sheetLoader.loadAllStyleSheets(function (stylesheets) {
            if (cssGridRules) { return; }

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

            setTimeout(doLayout, 100);

            window.addEventListener('resize', function () {
                doLayout();
            });
        });
    }

    return {
        polyfill: polyfill,
        doLayout: doLayout,
        onLayoutDone: onLayoutDone
    };
});

/*global define*/
define('scalejs.layout-cssgrid',[
    'scalejs!core',
    'CSS.supports',
    './scalejs.layout-cssgrid/cssGridLayout'
], function (
    core,
    css,
    cssGridLayout
) {
    

    //console.log('is -ms-grid supported? ' + (css.supports('display', '-ms-grid') || false));
    if (!css.supports('display', '-ms-grid')) {
        cssGridLayout.polyfill();
    }

    core.registerExtension({
        layout: {
            doLayout: cssGridLayout.doLayout,
            onLayoutDone: cssGridLayout.onLayoutDone
        }
    });
});

