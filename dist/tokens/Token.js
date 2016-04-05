"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var assert_1 = require("../utils/assert");
var operatorsAndKeywords_1 = require("./operatorsAndKeywords");
class Token {
    constructor(str, type, range) {
        this.str = str;
        this.type = type;
        this.range = range;
    }
    toString() { return this.str; }
    /**
     * Useful for inserting placeholder text that aren't actually in the file.
     * Token will point to the first character in the file.
     *
     * @param name
     * @returns {Token}
     */
    static createEmptyIdentifier(name) {
        return new Token(name, operatorsAndKeywords_1.TokenType.Identifier, Range.createEmptyRange());
    }
}
exports.Token = Token;
/**
 * Contains a subtree of tokens.
 * Used between (), [], {}, "", '', ``, and various keyword ... end blocks
 */
class TreeToken extends Token {
    constructor(openToken) {
        super(openToken.str, openToken.type, openToken.range);
        this.openToken = openToken;
        this.closeToken = null;
        this.contents = [];
    }
    toString() {
        let s = this.openToken.toString();
        for (let iTok of this.contents) {
            s = s + iTok.toString();
        }
        if (this.closeToken !== null) {
            s = s + this.closeToken.toString();
        }
        return s;
    }
}
exports.TreeToken = TreeToken;
/**
 * Read only row,col coordinate.
 */
class Point {
    constructor(row, col) {
        this._row = row;
        this._column = col;
    }
    get row() { return this._row; }
    get column() { return this._column; }
    copy() {
        return new Point(this.row, this.column);
    }
    isBefore(other) {
        if (this.row < other.row)
            return true;
        if (this.row > other.row)
            return false;
        return this.column < other.column;
    }
    equals(other) {
        return this.row === other.row && this.column === other.column;
    }
}
exports.Point = Point;
/**
 * Read only start/end coordinates of points.
 * The end point is inclusive.
 */
class Range {
    constructor(start, end) {
        this._start = start;
        this._end = end;
    }
    get start() { return this._start; }
    get end() { return this._end; }
    copy() {
        return new Range(this.start, this.end);
    }
    pointWithin(p) {
        let start = this._start;
        let end = this._end;
        let afterStart = p.row > start.row || (p.row === start.row && p.column >= start.column);
        let beforeEnd = p.row < end.row || (p.row === end.row && p.column <= end.column);
        return afterStart && beforeEnd;
    }
    static create(rowStart, colStart, rowEnd, colEnd) {
        return new Range(new Point(rowStart, colStart), new Point(rowEnd, colEnd));
    }
    static createEmptyRange() {
        return new Range(new Point(0, 0), new Point(0, 0));
    }
}
exports.Range = Range;
class Indent {
    constructor(text) {
        text = text.replace("\r", "");
        this.text = text;
        this.tabs = 0;
        this.spaces = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === " ") {
                this.spaces++;
            }
            else if (text[i] === "\t") {
                this.tabs++;
            }
            else {
                throw new assert_1.AssertError("Only spaces and tabs allowed as arg.");
            }
        }
    }
}
exports.Indent = Indent;
//# sourceMappingURL=Token.js.map