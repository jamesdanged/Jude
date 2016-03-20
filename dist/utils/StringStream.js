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
var assert_1 = require("./assert");
var Token_1 = require("./../tokens/Token");
class StringStream {
    constructor(str) {
        this._str = str;
        this._pos = 0;
        this._row = 0;
        this._col = 0;
    }
    get pos() { return this._pos; }
    get str() { return this._str; }
    /**
     * The 0 based row index corresponding to where the stream is now,
     * ie the next character to read's coordinates.
     *
     * Row and col assume the string started at 0,0 and is not some substring.
     */
    get row() { return this._row; }
    /**
     * The 0 based col index corresponding to the where the stream is now,
     * ie the next character to read's coordinates.
     *
     * TODO handle characters that don't consume width, such as \r or multi-codepoint runes
     */
    get col() { return this._col; }
    currPoint() { return new Token_1.Point(this.row, this.col); }
    prevPoint() {
        if (this.bof())
            throw new assert_1.AssertError("Already BOF.");
        let prevChar = this._str[this._pos - 1];
        if (prevChar === "\n") {
            let row = this.row - 1;
            let col = this._numCharsOnRowEndingAt(this._pos - 1) + 1; // num chars + \n
            return new Token_1.Point(row, col);
        }
        else {
            return new Token_1.Point(this.row, this.col - 1);
        }
    }
    /**
     * Read a single character. Moves forward one.
     *
     * @returns {string}
     */
    read() {
        if (this.eof())
            throw new assert_1.AssertError("End of string");
        var c = this._str[this._pos];
        this._pos += 1;
        if (c === "\n") {
            this._row += 1;
            this._col = 0;
        }
        else {
            this._col += 1;
        }
        return c;
    }
    /**
     * Returns the next character, but does not move forward a position.
     */
    peek() {
        if (this.eof())
            throw new assert_1.AssertError("End of string");
        return this._str[this._pos];
    }
    /**
     * Returns the next X characters, without moving the cursor.
     * If less than X before eof, returns null.
     */
    peekUpToX(x) {
        if (this._str.length - this._pos < x)
            return null;
        return this._str.slice(this._pos, this._pos + x);
    }
    /**
     * Move back a character.
     */
    unread() {
        if (this.bof())
            throw new assert_1.AssertError("Already at beginning");
        this._pos -= 1;
        let c = this.peek();
        if (c === "\n") {
            this._row -= 1;
            this._col = this._numCharsOnRowEndingAt(this._pos); // ie if line is 'abcd' then 4 will be \n index
        }
        else {
            this._col -= 1;
        }
    }
    /**
     * Reads until encounters a character that satisfies the condition (until callback returns true).
     *
     * @returns String with everything read except the character that satisfied the condition.
     */
    readUntil(terminatingCondition) {
        var s = "";
        while (!this.eof()) {
            var c = this.read();
            if (terminatingCondition(c)) {
                this.unread();
                break;
            }
            s = s + c;
        }
        return s;
    }
    readWhile(continuingCondition) {
        var s = "";
        while (!this.eof()) {
            var c = this.read();
            if (!continuingCondition(c)) {
                this.unread();
                break;
            }
            s = s + c;
        }
        return s;
    }
    /**
     * Seeks first character that satisfies the condition.
     *
     * @returns {string} Matching character or empty string if no match found.
     */
    seek(condition) {
        while (!this.eof()) {
            var c = this.read();
            if (condition(c)) {
                return c;
            }
        }
        return "";
    }
    eof() {
        return this._pos >= this._str.length;
    }
    bof() {
        return this._pos === 0;
    }
    /**
     * For error reporting, gets around 10 characters before and after current point.
     */
    getContext() {
        let start = this._pos - 10;
        let stop = this._pos + 10;
        if (start < 0)
            start = 0;
        if (stop > this._str.length)
            stop = this._str.length;
        return this._str.slice(start, stop);
    }
    /**
     * Calculate number of characters in this row excluding newline.
     * Assumes we are at \n at end of the row.
     *
     * @param newlinePos Index of position of \n that is at the end of the row.
     */
    _numCharsOnRowEndingAt(newlinePos) {
        let numCharsInRow = 0;
        for (let idx = newlinePos - 1; idx >= 0; idx--) {
            let cPeekBack = this._str[idx];
            if (cPeekBack === "\n") {
                break;
            }
            else {
                numCharsInRow++;
            }
        }
        return numCharsInRow;
    }
}
exports.StringStream = StringStream;
//# sourceMappingURL=StringStream.js.map