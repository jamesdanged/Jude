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
var operatorsAndKeywords_1 = require("./operatorsAndKeywords");
var operatorsAndKeywords_2 = require("./operatorsAndKeywords");
var operatorsAndKeywords_3 = require("./operatorsAndKeywords");
var assert_1 = require("../utils/assert");
var charUtils = require("./../utils/charUtils");
var errors_1 = require("./../utils/errors");
var operatorsAndKeywords_4 = require("./operatorsAndKeywords");
var operatorsAndKeywords_5 = require("./operatorsAndKeywords");
var operatorsAndKeywords_6 = require("./operatorsAndKeywords");
var operatorsAndKeywords_7 = require("./operatorsAndKeywords");
var operatorsAndKeywords_8 = require("./operatorsAndKeywords");
var operatorsAndKeywords_9 = require("./operatorsAndKeywords");
var StringStream_1 = require("./../utils/StringStream");
var Token_1 = require("./Token");
var Token_2 = require("./Token");
var arrayUtils_1 = require("./../utils/arrayUtils");
/**
 * Converts a string into a sequence of julia tokens.
 * Doesn't do any significant parsing except for recognizing string literals
 * and string interpolations.
 */
class Tokenizer {
    constructor() {
        this._ss = null;
        this._currParenthesisLevel = 0;
        this._tokens = null;
        this.errors = null;
    }
    get parsedTokens() { return this._tokens; }
    /**
     * Tokenize the string.
     * Any parsing errors will be stored.
     *
     */
    tokenize(str) {
        this._tokens = [];
        this._ss = new StringStream_1.StringStream(str);
        this._currParenthesisLevel = 0;
        this.errors = [];
        try {
            while (!this._ss.eof()) {
                this._readNextToken();
            }
        }
        catch (err) {
            if (err instanceof errors_1.InvalidParseError) {
                this.errors.push(err);
            }
            else {
                throw err;
            }
        }
        //this._insertImplicitMultiplications()
        //this._removeLineWhiteSpace()     // now we can remove all non newline whitespace
    }
    /**
     * Reads consecutive characters until a complete token is obtained.
     * Assumes we are starting at a new token, not in the middle of one.
     *
     * Token can be whitespace. Contiguous white space condensed into single whitespace, except new line.
     *
     * Will recurse to handle string interpolation.
     *
     * xxxUnexpected tokens will be returned as a special token type: Unexpected.
     */
    _readNextToken() {
        let ss = this._ss;
        if (ss.eof())
            throw new assert_1.AssertError("Already EOF");
        let pointStart = ss.currPoint();
        let c = ss.read();
        // comments
        if (c === "#") {
            if (!ss.eof() && ss.peek() === "=") {
                // multi line comment
                ss.read();
                let str = "#=";
                while (!ss.eof()) {
                    let next2 = ss.peekUpToX(2);
                    if (next2 === "=#") {
                        ss.read();
                        ss.read();
                        str += "=#";
                        break;
                    }
                    else {
                        str += ss.read();
                    }
                }
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Comment, rng));
                return;
            }
            else {
                // single line comment
                let str = ss.readUntil(charUtils.isNewLine);
                str = "#" + str; // leave the '#' in front in order to distinguish the str from operators/keywords
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Comment, rng));
                return;
            }
        }
        // whitespace
        if (charUtils.isWhiteSpaceNotNewLine(c)) {
            let str = ss.readWhile(charUtils.isWhiteSpaceNotNewLine);
            str = c + str;
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.LineWhiteSpace, rng));
            return;
        }
        if (charUtils.isNewLine(c)) {
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.NewLine, rng));
            //this._currRow++
            return;
        }
        // string literals
        // " or ` or """
        //
        // The double quote is stored as a token.
        // The contents of the string literal is stored as a single token.
        // Any interpolation operator $ is stored as a token.
        // Interpolation parentheses are stored as a token.
        // The interpolation contents are tokenized like any other valid code,
        // except that we track the number of parentheses so we can tell when we're back
        // inside the string literal.
        // Notice that string literals can have the 'str' property be the exact same as operators or keywords,
        // but usually we can just check 'str' if we know we are not inside quotes.
        if (c === "\"" || c === "`") {
            let openQuote = c;
            // could be a triple quote
            let next2 = ss.peekUpToX(2);
            if (next2 === '""') {
                openQuote = '"""';
                ss.read();
                ss.read();
            }
            this._tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
            let str = "";
            let pointCurrStringLiteralStart = ss.currPoint();
            let storeCurrentStringLiteral = () => {
                if (str.length > 0) {
                    let rng = new Token_2.Range(pointCurrStringLiteralStart, ss.currPoint());
                    this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.StringLiteralContents, rng));
                }
                str = "";
            };
            let stringClosedSuccessfully = false;
            // read string contents
            while (!ss.eof()) {
                let ch = ss.read();
                let chPoint = ss.currPoint();
                if (ch === "\\") {
                    // escape the next character
                    // especially if it is \$
                    if (ss.eof()) {
                        throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(ch, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
                    }
                    let ch2 = ss.read();
                    str += "\\" + ch2;
                    continue;
                }
                if (ch === "\n") {
                    // julia strings can span multiple lines
                    str += "\n";
                    //this._currRow++
                    continue;
                }
                let matchesOpenQuote = false;
                if (openQuote.length === 1 && ch === openQuote)
                    matchesOpenQuote = true;
                if (openQuote.length === 3) {
                    let next2 = ss.peekUpToX(2);
                    if (next2 !== null && ch + next2 === openQuote) {
                        matchesOpenQuote = true;
                        ss.read();
                        ss.read();
                    }
                }
                if (matchesOpenQuote) {
                    // terminate the string
                    storeCurrentStringLiteral();
                    // store close quote
                    this._tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(chPoint, ss.currPoint())));
                    stringClosedSuccessfully = true;
                    break; // while
                }
                if (ch === "$") {
                    if (ss.eof()) {
                        throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(ch, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
                    }
                    let pointAfterDollar = ss.currPoint();
                    let ch2 = ss.read();
                    if (charUtils.isValidIdentifierStart(ch2)) {
                        storeCurrentStringLiteral();
                        this._tokens.push(new Token_1.Token("$", operatorsAndKeywords_9.TokenType.StringInterpolationStart, new Token_2.Range(chPoint, pointAfterDollar)));
                        let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
                        this._tokens.push(new Token_1.Token(ch2 + str, operatorsAndKeywords_9.TokenType.Identifier, new Token_2.Range(pointAfterDollar, ss.currPoint())));
                    }
                    else if (ch2 === "(") {
                        // major string interpolation
                        // need to recurse
                        storeCurrentStringLiteral();
                        this._tokens.push(new Token_1.Token("$", operatorsAndKeywords_9.TokenType.StringInterpolationStart, new Token_2.Range(chPoint, pointAfterDollar)));
                        this._tokens.push(new Token_1.Token("(", operatorsAndKeywords_9.TokenType.Bracket, new Token_2.Range(pointAfterDollar, ss.currPoint())));
                        let origParenthesisLevel = this._currParenthesisLevel;
                        this._currParenthesisLevel++;
                        while (!ss.eof() && this._currParenthesisLevel != origParenthesisLevel) {
                            this._readNextToken();
                        }
                        if (ss.eof()) {
                            throw new errors_1.InvalidParseError("Unexpected EOF while waiting for end of string interpolation.", arrayUtils_1.last(this._tokens));
                        }
                    }
                    else {
                        throw new errors_1.InvalidParseError("Invalid interpolation syntax: $" + ch2, new Token_1.Token(ch2, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
                    }
                    continue;
                }
                // simply append to the string
                str += ch;
            } // while
            if (!stringClosedSuccessfully)
                throw new errors_1.InvalidParseError("Got to EOF without closing string.", arrayUtils_1.last(this._tokens));
            return;
        }
        // parenthesis handling within string interpolation
        if (this._currParenthesisLevel > 0) {
            if (c === "(") {
                this._currParenthesisLevel++;
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Bracket, rng));
                return;
            }
            if (c === ")") {
                this._currParenthesisLevel--;
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Bracket, rng));
                return;
            }
        }
        // char literals and transpose operator
        if (c === "'") {
            // will consider a transpose if the immediately preceding token was an identifier
            // or a close bracket
            // no spacing allowed
            if (this._tokens.length > 0) {
                let lastToken = arrayUtils_1.last(this._tokens);
                if (lastToken.type === operatorsAndKeywords_9.TokenType.Identifier ||
                    (lastToken.type === operatorsAndKeywords_9.TokenType.Bracket && (lastToken.str === ")" || lastToken.str === "]"))) {
                    let rng = new Token_2.Range(pointStart, ss.currPoint());
                    this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Operator, rng));
                    return;
                }
            }
            // try interpreting as a char literal
            let next2 = ss.peekUpToX(2);
            if (next2 !== null) {
                let c1 = next2[0];
                let c2 = next2[1];
                if (c1 !== "'" && c1 !== "\\" && c2 === "'") {
                    this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
                    ss.read();
                    this._tokens.push(new Token_1.Token(c1, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                    ss.read();
                    this._tokens.push(new Token_1.Token(c2, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                    return;
                }
                // escaped chars, ie \'  \n  \t  \r
                if (c1 === "\\") {
                    let next3 = ss.peekUpToX(3);
                    let c3 = next3[2];
                    if (c3 === "'") {
                        this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
                        ss.read();
                        ss.read();
                        this._tokens.push(new Token_1.Token("'", operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                        ss.read();
                        this._tokens.push(new Token_1.Token(c3, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                        return;
                    }
                }
                throw new errors_1.InvalidParseError("Character literal must have only one character.", new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
            }
        }
        // regex
        if (c === "r" && !ss.eof()) {
            let c2 = ss.peek();
            if (c2 === "\"") {
                ss.read();
                let regexContents = "";
                let lastChar = c2;
                // read regex contents
                while (!ss.eof()) {
                    let iChar = ss.read();
                    lastChar = iChar;
                    if (iChar === "\\") {
                        // escape the next character
                        if (ss.eof()) {
                            throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(iChar, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                        }
                        let iChar2 = ss.read();
                        regexContents += "\\" + iChar2;
                    }
                    else if (iChar === "\"") {
                        // ready to terminate regex
                        // read any flags
                        let flags = "";
                        while (!ss.eof()) {
                            let c3 = ss.peek();
                            if (c3 in operatorsAndKeywords_1.regexFlags) {
                                ss.read();
                                flags += c3;
                            }
                            else {
                                break;
                            }
                        }
                        this._tokens.push(new Token_1.Token("r\"" + regexContents + "\"" + flags, operatorsAndKeywords_9.TokenType.Regex, new Token_2.Range(pointStart, ss.currPoint())));
                        return;
                    }
                    else {
                        regexContents += iChar;
                    }
                }
                throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(lastChar, operatorsAndKeywords_9.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
            }
        }
        // symbols
        // eg :foo
        // must be handled before operators, as ':' is also an operator
        // doesn't handle quoting, ie :(a+b)
        ss.unread();
        if (this._streamAtSymbol()) {
            // valid symbol
            // read either an operator
            // or a number
            // or an identifier
            ss.read(); // c = ":"
            // identifier
            let c2 = ss.read();
            if (charUtils.isValidIdentifierStart(c2)) {
                let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
                str = c + c2 + str;
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
                return;
            }
            ss.unread();
            if (this._streamAtNumber()) {
                let str = this._readNumber();
                str = c + str;
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
                return;
            }
            if (this._streamAtOperator()) {
                let str = this._readOperator();
                str = c + str;
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
                return;
            }
            // what other symbol could it be?
            // just return to correct place in stream
            ss.read();
        }
        else {
            ss.read();
        }
        // operators
        // must process before identifiers because ÷ is considered a valid UTF8 char to start an identifier
        ss.unread();
        if (this._streamAtOperator()) {
            let str = this._readOperator();
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Operator, rng));
            return;
        }
        else {
            ss.read();
        }
        // keywords and identifiers
        if (charUtils.isValidIdentifierStart(c)) {
            let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
            str = c + str;
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            // make sure not a keyword
            if (str in operatorsAndKeywords_7.keywords) {
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Keyword, rng));
                return;
            }
            if (str in operatorsAndKeywords_2.keywordValues) {
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Number, rng)); // can treat like a number for parse purposes
                return;
            }
            if (str in operatorsAndKeywords_3.binaryOperatorsLikeIdentifiers) {
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Operator, rng));
                return;
            }
            this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Identifier, rng));
            return;
        }
        // macro invocations
        if (c === "@" && !ss.eof()) {
            let c2 = ss.read();
            if (charUtils.isValidIdentifierStart(c2)) {
                let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
                str = c + c2 + str;
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                //let followedBySpace = false
                //if (!ss.eof()) {
                //  let c3 = ss.peek()
                //  if (c3 === " " || c3 === "\t" || c3 === "\n" || c3 === "\r") followedBySpace = true
                //}
                //let tokType = TokenType.Macro
                //if (followedBySpace) tokType = TokenType.MacroWithSpace
                this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Macro, rng));
                return;
            }
            else {
                throw new errors_1.InvalidParseError("Expecting a macro name, but got '..." + ss.getContext() + "...'", new Token_1.Token(c + c2, operatorsAndKeywords_9.TokenType.Macro, new Token_2.Range(pointStart, ss.currPoint())));
            }
        }
        // numbers
        ss.unread();
        if (this._streamAtNumber()) {
            let str = this._readNumber();
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(str, operatorsAndKeywords_9.TokenType.Number, rng));
            return;
        }
        else {
            ss.read();
        }
        if (c in operatorsAndKeywords_8.allBrackets) {
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Bracket, rng));
            return;
        }
        if (c === ";") {
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this._tokens.push(new Token_1.Token(c, operatorsAndKeywords_9.TokenType.SemiColon, rng));
            return;
        }
        throw new errors_1.InvalidParseError("Unexpected character: '" + c + "'. Context: '" + ss.getContext() + "'.", new Token_1.Token(c, operatorsAndKeywords_9.TokenType.Identifier, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
    }
    /**
     * Reads a complete operator from the stream.
     * The first character read must start the operator.
     *
     */
    _readOperator() {
        let ss = this._ss;
        let str = ss.read();
        while (!ss.eof() && str.length < operatorsAndKeywords_5.longestOperatorLength) {
            str += ss.read();
        }
        // trim down to longest valid operator
        while (!(str in operatorsAndKeywords_6.allOperators)) {
            str = str.substring(0, str.length - 1);
            ss.unread();
        }
        return str;
    }
    /**
     * Reads a complete number from the stream.
     * The first character read must start the number.
     */
    _readNumber() {
        let ss = this._ss;
        let foundDecimal = false;
        let foundExp = false; // will recognize either "e" "E" or "f"  TODO "p"
        let str = "";
        if (ss.peek() !== "." && !charUtils.isNumeric(ss.peek()))
            throw new assert_1.AssertError("Must only call if next chars are numbers. Found: " + ss.peek());
        while (!ss.eof()) {
            let c = ss.read();
            if (c === ".") {
                if (foundDecimal) {
                    ss.unread();
                    break;
                }
                if (foundExp) {
                    ss.unread();
                    break;
                }
                foundDecimal = true;
                str = str + c;
                continue;
            }
            if (c === "e" || c === "E" || c === "f") {
                if (foundExp) {
                    ss.unread();
                    break;
                }
                foundExp = true;
                str = str + c;
                continue;
            }
            if (charUtils.isNumeric(c)) {
                str = str + c;
                continue;
            }
            // otherwise, invalid character for a number
            ss.unread();
            break;
        }
        return str;
    }
    _streamAtNumber() {
        let ss = this._ss;
        if (ss.eof())
            return false;
        let c = ss.peek();
        if (charUtils.isNumeric(c))
            return true;
        let next2 = ss.peekUpToX(2);
        if (next2 === null)
            return false;
        c = next2[0];
        let c2 = next2[1];
        return c === "." && charUtils.isNumeric(c2);
    }
    _streamAtOperator() {
        let ss = this._ss;
        if (ss.eof())
            return false;
        let c = ss.peek();
        return c in operatorsAndKeywords_6.allOperators; // assumes first char of all operators is an operator
    }
    _streamAtSymbol() {
        let ss = this._ss;
        let next2 = ss.peekUpToX(2);
        if (next2 === null)
            return false;
        let c = next2[0];
        if (c !== ":")
            return false;
        // check next char
        let c2 = next2[1];
        if (c2 === ":")
            return false;
        if (c2 === ",")
            return false;
        if (c2 === ";")
            return false;
        if (charUtils.isWhiteSpace(c2))
            return false;
        if (charUtils.isBracket(c2))
            return false;
        // check prev char
        let prevTokenIsOk = false;
        let isTokenOkForPrev = (tok) => {
            if (tok.type === operatorsAndKeywords_9.TokenType.NewLine)
                return true;
            if (tok.type === operatorsAndKeywords_9.TokenType.Bracket && (tok.str === "(" || tok.str === "[" || tok.str === "{"))
                return true;
            if (tok.type === operatorsAndKeywords_9.TokenType.Operator && tok.str in operatorsAndKeywords_4.binaryOperators)
                return true;
            return false;
        };
        if (this._tokens.length === 0) {
            prevTokenIsOk = true;
        }
        else {
            let prevToken = arrayUtils_1.last(this._tokens);
            if (isTokenOkForPrev(prevToken))
                prevTokenIsOk = true;
            if (!prevTokenIsOk && prevToken.type === operatorsAndKeywords_9.TokenType.LineWhiteSpace && this._tokens.length > 1) {
                // check token before that
                let prevToken2 = this._tokens[this._tokens.length - 2];
                if (isTokenOkForPrev(prevToken2))
                    prevTokenIsOk = true;
            }
        }
        return prevTokenIsOk;
    }
    static tokenizeThrowIfError(str) {
        let tokenizer = new Tokenizer();
        tokenizer.tokenize(str);
        if (tokenizer.errors.length > 0)
            throw new assert_1.AssertError(tokenizer.errors[0].message);
        return tokenizer.parsedTokens;
    }
}
exports.Tokenizer = Tokenizer;
//# sourceMappingURL=Tokenizer.js.map