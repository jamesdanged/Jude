"use strict";
const errors_1 = require("./../utils/errors");
const operatorsAndKeywords_1 = require("./operatorsAndKeywords");
const assert_1 = require("../utils/assert");
class TokenStream {
    // If stream is entire contents of file, provide a placeholder token.
    constructor(tokens, prevTokenBeforeStream) {
        this._tokens = tokens;
        this._index = 0;
        this._prevTokenBeforeStream = prevTokenBeforeStream;
    }
    get index() { return this._index; }
    set index(newValue) {
        if (newValue < 0 || newValue > this._tokens.length)
            throw new assert_1.AssertError("New index should be between 0 and " + this._tokens.length + ". Got " + newValue);
        this._index = newValue;
    }
    /**
     * Returns a new TokenStream with a view to the same tokens array,
     * initialized to the same index.
     * Reading from it increments its own index.
     */
    shallowCopy() {
        let copy = new TokenStream(this._tokens, this._prevTokenBeforeStream);
        copy._index = this._index;
        return copy;
    }
    bof() {
        return this._index === 0;
    }
    eof() {
        return this._index >= this._tokens.length;
    }
    /**
     * Returns the previous token. May return null if at bof.
     */
    getLastToken() {
        if (this.index === 0)
            return this._prevTokenBeforeStream;
        return this._tokens[this.index - 1];
    }
    /**
     * True if there are no more tokens before EOF except new lines.
     * @returns {boolean}
     */
    eofIgnoringNewLine() {
        let idx = this._index;
        while (idx < this._tokens.length) {
            let tok = this._tokens[idx];
            if (tok.type === operatorsAndKeywords_1.TokenType.NewLine)
                continue;
            return false;
        }
        return true;
    }
    read() {
        if (this.eof()) {
            throw new errors_1.InvalidParseError("Already at end of tokens.", this.getLastToken());
        }
        let tok = this._tokens[this._index];
        this._index += 1;
        return tok;
    }
    unread() {
        if (this.bof()) {
            throw new assert_1.AssertError("Already at beginning of tokens.");
        }
        this._index -= 1;
    }
    peek() {
        if (this.eof()) {
            throw new errors_1.InvalidParseError("Already at end of tokens.", this.getLastToken());
        }
        return this._tokens[this._index];
    }
    /**
     * Returns the next X tokens, without moving the cursor.
     * If less than X before eof, returns null.
     */
    peekUpToX(x) {
        if (this._tokens.length - this._index < x)
            return null;
        return this._tokens.slice(this._index, this._index + x);
    }
    /**
     * Returns the next non newline token.
     * Does not advance the cursor.
     * Throws if reaches EOF.
     */
    peekIgnoringNewLine() {
        let idx = this._index;
        while (idx < this._tokens.length) {
            let tok = this._tokens[idx];
            if (tok.type === operatorsAndKeywords_1.TokenType.NewLine)
                continue;
            return tok;
        }
        throw new errors_1.InvalidParseError("Already at end of tokens.", this.getLastToken());
    }
    /**
     * Will throw if EOF.
     */
    readNonNewLine() {
        this.skipNewLines();
        if (this.eof()) {
            throw new errors_1.InvalidParseError("Already at end of sequence.", this.getLastToken());
        }
        return this.read();
    }
    ///**
    // * Returns next two tokens which are not newlines.
    // * Doesn't advance position.
    // * Returns null if EOF before able to get two tokens.
    // */
    //peekTwoNonNewLine(): Token[] {
    //  let tokens: Token[] = []
    //  let peekIndex = this.index
    //  while (tokens.length < 2) {
    //    if (peekIndex >= this.tokens.length) {
    //      return null
    //    }
    //
    //    let tok = tokens[peekIndex]
    //    if (tok.type !== TokenType.NewLine) {
    //      tokens.push(tok)
    //    }
    //    peekIndex++
    //  }
    //  return tokens
    //}
    /**
     * Seeks first token that satsifies the condition
     * @param condition
     */
    seek(condition) {
        let tok = null;
        while (!this.eof()) {
            let curr = this.read();
            if (condition(curr)) {
                tok = curr;
                break;
            }
        }
        return tok;
    }
    /**
     * Skips any new lines.
     * Doesn't do anything if EOF.
     */
    skipNewLines() {
        while (!this.eof()) {
            if (this.peek().type === operatorsAndKeywords_1.TokenType.NewLine) {
                this.read();
            }
            else {
                return;
            }
        }
    }
    skipNewLinesAndComments() {
        while (!this.eof()) {
            let tok = this.peek();
            if (tok.type === operatorsAndKeywords_1.TokenType.NewLine || tok.type === operatorsAndKeywords_1.TokenType.Comment) {
                this.read();
            }
            else {
                return;
            }
        }
    }
    /**
     *
     * @param fromIndex
     * @param toIndex  exclusive
     */
    toOrigString(fromIndex, toIndex) {
        if (fromIndex < 0)
            throw new assert_1.AssertError("");
        if (this._tokens.length < toIndex)
            throw new assert_1.AssertError("");
        //if (fromIndex > toIndex) throw new AssertError("")
        let s = "";
        for (let i = fromIndex; i < toIndex; i++) {
            s = s + this._tokens[i].toString();
        }
        return s;
    }
    /**
     * Skips line white space, new lines, and comments.
     * Doesn't throw error if eof.
     */
    skipToNextNonWhitespace() {
        while (!this.eof()) {
            let tok = this.peek();
            if (tok.type === operatorsAndKeywords_1.TokenType.LineWhiteSpace || tok.type === operatorsAndKeywords_1.TokenType.NewLine || tok.type === operatorsAndKeywords_1.TokenType.Comment) {
                this.read();
            }
            else {
                return;
            }
        }
    }
    /**
     * For debugging. Gets the token strings for +/- 10 tokens around the current point.
     */
    getContext() {
        let start = this._index - 10;
        let stop = this._index + 10;
        if (start < 0)
            start = 0;
        if (stop > this._tokens.length)
            stop = this._tokens.length;
        return this.toOrigString(start, stop);
    }
    splice(spliceIndex, deleteCount, ...tokensToInsert) {
        let args = [spliceIndex, deleteCount];
        args = args.concat(tokensToInsert);
        let result = this._tokens.splice.apply(this._tokens, args);
        // shift the index accordingly
        if (spliceIndex < this._index) {
            let offset = tokensToInsert.length - deleteCount;
            this._index += offset;
        }
        return result;
    }
}
exports.TokenStream = TokenStream;
//# sourceMappingURL=TokenStream.js.map