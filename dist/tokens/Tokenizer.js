"use strict";
const operatorsAndKeywords_1 = require("./operatorsAndKeywords");
const operatorsAndKeywords_2 = require("./operatorsAndKeywords");
const assert_1 = require("../utils/assert");
const charUtils = require("./../utils/charUtils");
const errors_1 = require("./../utils/errors");
const operatorsAndKeywords_3 = require("./operatorsAndKeywords");
const operatorsAndKeywords_4 = require("./operatorsAndKeywords");
const operatorsAndKeywords_5 = require("./operatorsAndKeywords");
const operatorsAndKeywords_6 = require("./operatorsAndKeywords");
const operatorsAndKeywords_7 = require("./operatorsAndKeywords");
const operatorsAndKeywords_8 = require("./operatorsAndKeywords");
const StringStream_1 = require("./../utils/StringStream");
const Token_1 = require("./Token");
const Token_2 = require("./Token");
const arrayUtils_1 = require("./../utils/arrayUtils");
/**
 * Converts a string into a sequence of julia tokens.
 * Doesn't do any significant parsing except for recognizing string literals
 * and string interpolations.
 */
class Tokenizer {
    constructor() {
        this.ss = null;
        this.currParenthesisLevel = 0;
        this.tokens = null;
        this.errors = null;
    }
    get parsedTokens() { return this.tokens; }
    /**
     * Tokenize the string.
     * Any parsing errors will be stored.
     *
     */
    tokenize(str) {
        this.tokens = [];
        this.ss = new StringStream_1.StringStream(str);
        this.currParenthesisLevel = 0;
        this.errors = [];
        try {
            while (!this.ss.eof()) {
                this.readNextToken();
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
    readNextToken() {
        let ss = this.ss;
        if (ss.eof())
            throw new assert_1.AssertError("Already EOF");
        // comments
        if (streamAtComment(ss)) {
            this.readComment();
            return;
        }
        // whitespace
        if (streamAtLineWhiteSpace(ss)) {
            this.readLineWhiteSpace();
            return;
        }
        if (streamAtNewLine(ss)) {
            this.readNewLine();
            return;
        }
        // interpolated strings or string literals
        if (streamAtDoubleQuoteOrBacktick(ss)) {
            this.readString();
            return;
        }
        // parenthesis handling within string interpolation
        if (this.currParenthesisLevel > 0) {
            let pointStart = ss.currPoint();
            let c = ss.peek();
            if (c === "(") {
                ss.read();
                this.currParenthesisLevel++;
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.Bracket, rng));
                return;
            }
            if (c === ")") {
                ss.read();
                this.currParenthesisLevel--;
                let rng = new Token_2.Range(pointStart, ss.currPoint());
                this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.Bracket, rng));
                return;
            }
        }
        // must handle transpose op before char literal
        if (this.streamAtTransposeOperator(ss)) {
            this.readTransposeOperator();
            return;
        }
        if (streamAtSingleQuote(ss)) {
            this.readCharLiteral();
            return;
        }
        // symbols
        // eg :foo
        // must be handled before operators, as ':' is also an operator
        // doesn't handle quoting, ie :(a+b)
        if (this.streamAtSymbol()) {
            this.readSymbol();
            return;
        }
        // operators
        // must process before identifiers because ÷ is considered a valid UTF8 char to start an identifier
        if (streamAtOperator(ss)) {
            this.readOperator();
            return;
        }
        // keywords and identifiers
        if (streamAtIdentifier(ss)) {
            this.readIdentifier();
            return;
        }
        // macro invocations
        if (streamAtMacroInvocation(ss)) {
            this.readMacroInvocation();
            return;
        }
        // numbers
        if (streamAtNumber(ss)) {
            this.readNumber();
            return;
        }
        if (streamAtBracket(ss)) {
            this.readBracket();
            return;
        }
        if (streamAtSemicolon(ss)) {
            this.readSemicolon();
            return;
        }
        let c = ss.read();
        throw new errors_1.InvalidParseError("Unexpected character: '" + c + "'. Context: '" + ss.getContext() + "'.", new Token_1.Token(c, operatorsAndKeywords_8.TokenType.Identifier, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
    }
    readComment() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        ss.read(); // discard #
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
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Comment, rng));
        }
        else {
            // single line comment
            let str = ss.readUntil(charUtils.isNewLine);
            str = "#" + str; // leave the '#' in front in order to distinguish the str from operators/keywords
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Comment, rng));
        }
    }
    readLineWhiteSpace() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let c = ss.read();
        let str = ss.readWhile(charUtils.isWhiteSpaceNotNewLine);
        str = c + str;
        let rng = new Token_2.Range(pointStart, ss.currPoint());
        this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.LineWhiteSpace, rng));
    }
    readNewLine() {
        let ss = this.ss;
        let c = ss.read();
        let rng = new Token_2.Range(ss.prevPoint(), ss.currPoint());
        this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.NewLine, rng));
    }
    readTransposeOperator() {
        let ss = this.ss;
        let c = ss.read();
        let rng = new Token_2.Range(ss.prevPoint(), ss.currPoint());
        this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.Operator, rng));
    }
    /**
     * string literals or interpolated strings
     * " or ` or """
     *
     * The double quote is stored as a token.
     * The contents of the string literal is stored as a single token.
     * Any interpolation operator $ is stored as a token.
     * Interpolation parentheses are stored as a token.
     * The interpolation contents are tokenized like any other valid code,
     * except that we track the number of parentheses so we can tell when we're back
     * inside the string literal.
     * Notice that string literals can have the 'str' property be the exact same as operators or keywords,
     * but usually we can just check 'str' if we know we are not inside quotes.
     */
    readString() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let c = ss.read();
        let openQuote = c;
        // could be a triple quote
        let next2 = ss.peekUpToX(2);
        if (next2 === '""') {
            openQuote = '"""';
            ss.read();
            ss.read();
        }
        this.tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
        let str = "";
        let pointCurrStringLiteralStart = ss.currPoint();
        let storeCurrentStringLiteral = () => {
            if (str.length > 0) {
                let rng = new Token_2.Range(pointCurrStringLiteralStart, ss.currPoint());
                this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.StringLiteralContents, rng));
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
                    throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(ch, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
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
                this.tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(chPoint, ss.currPoint())));
                stringClosedSuccessfully = true;
                break; // while
            }
            if (ch === "$") {
                if (ss.eof()) {
                    throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(ch, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
                }
                let pointAfterDollar = ss.currPoint();
                let ch2 = ss.read();
                if (charUtils.isValidIdentifierStart(ch2)) {
                    storeCurrentStringLiteral();
                    this.tokens.push(new Token_1.Token("$", operatorsAndKeywords_8.TokenType.StringInterpolationStart, new Token_2.Range(chPoint, pointAfterDollar)));
                    let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
                    this.tokens.push(new Token_1.Token(ch2 + str, operatorsAndKeywords_8.TokenType.Identifier, new Token_2.Range(pointAfterDollar, ss.currPoint())));
                }
                else if (ch2 === "(") {
                    // major string interpolation
                    // need to recurse
                    storeCurrentStringLiteral();
                    this.tokens.push(new Token_1.Token("$", operatorsAndKeywords_8.TokenType.StringInterpolationStart, new Token_2.Range(chPoint, pointAfterDollar)));
                    this.tokens.push(new Token_1.Token("(", operatorsAndKeywords_8.TokenType.Bracket, new Token_2.Range(pointAfterDollar, ss.currPoint())));
                    let origParenthesisLevel = this.currParenthesisLevel;
                    this.currParenthesisLevel++;
                    while (!ss.eof() && this.currParenthesisLevel != origParenthesisLevel) {
                        this.readNextToken();
                    }
                    if (ss.eof()) {
                        throw new errors_1.InvalidParseError("Unexpected EOF while waiting for end of string interpolation.", arrayUtils_1.last(this.tokens));
                    }
                }
                else {
                    throw new errors_1.InvalidParseError("Invalid interpolation syntax: $" + ch2, new Token_1.Token(ch2, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(chPoint, ss.currPoint())));
                }
                continue;
            }
            // simply append to the string
            str += ch;
        } // while
        if (!stringClosedSuccessfully)
            throw new errors_1.InvalidParseError("Got to EOF without closing string.", arrayUtils_1.last(this.tokens));
    }
    readCharLiteral() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let openQuote = ss.read();
        let next2 = ss.peekUpToX(2);
        if (next2 === null)
            throw new errors_1.InvalidParseError("Unclosed character literal", new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
        let c = next2[0];
        let closeQuote = next2[1];
        if (c !== "'" && c !== "\\" && closeQuote === "'") {
            this.tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
            ss.read();
            this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
            ss.read();
            this.tokens.push(new Token_1.Token(closeQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
            return;
        }
        // escaped chars, ie \'  \n  \t  \r
        if (c === "\\") {
            let next3 = ss.peekUpToX(3);
            let c3 = next3[2];
            if (c3 === "'") {
                this.tokens.push(new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
                ss.read();
                ss.read();
                this.tokens.push(new Token_1.Token("'", operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                ss.read();
                this.tokens.push(new Token_1.Token(c3, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                return;
            }
        }
        throw new errors_1.InvalidParseError("Character literal must have only one character.", new Token_1.Token(openQuote, operatorsAndKeywords_8.TokenType.Quote, new Token_2.Range(pointStart, ss.currPoint())));
    }
    readSymbol() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let c = ss.read(); // c = ":"
        // valid symbol
        // read either an operator
        // or a number
        // or an identifier
        // identifier
        if (streamAtIdentifier(ss)) {
            let c2 = ss.read();
            let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
            str = c + c2 + str;
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
            return;
        }
        if (streamAtNumber(ss)) {
            let str = this.readAndReturnNumber();
            str = c + str;
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
            return;
        }
        if (streamAtOperator(ss)) {
            let str = this.readAndReturnOperator();
            str = c + str;
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
            return;
        }
        // what other symbol could it be?
        let c2 = ss.read(); // always will at least be 1 more char after ':'
        throw new errors_1.InvalidParseError("Unrecognized symbol", new Token_1.Token(c + c2, operatorsAndKeywords_8.TokenType.Symbol, new Token_2.Range(pointStart, ss.currPoint())));
    }
    readIdentifier() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let ident = ss.read();
        ident += ss.readWhile(charUtils.isValidIdentifierContinuation);
        // if next char is a quote, than this is a string macro
        // eg regexes
        if (streamAtDoubleQuote(ss)) {
            let lastChar = ss.read(); // "
            // read quote contents
            let contents = "";
            while (!ss.eof()) {
                let c = ss.read();
                lastChar = c;
                if (c === "\\") {
                    // escape the next character
                    if (ss.eof()) {
                        throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(c, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
                    }
                    let c2 = ss.read();
                    contents += "\\" + c2;
                }
                else if (c === "\"") {
                    // ready to terminate contents
                    // read any suffix
                    let suffix = "";
                    if (!ss.eof()) {
                        let c2 = ss.peek();
                        if (charUtils.isValidIdentifierStart(c2)) {
                            ss.read();
                            suffix += c2;
                            suffix += ss.readWhile(charUtils.isValidIdentifierContinuation);
                        }
                    }
                    this.tokens.push(new Token_1.Token(ident + "\"" + contents + "\"" + suffix, operatorsAndKeywords_8.TokenType.StringMacro, new Token_2.Range(pointStart, ss.currPoint())));
                    return;
                }
                else {
                    contents += c;
                }
            }
            throw new errors_1.InvalidParseError("Unexpected EOF", new Token_1.Token(lastChar, operatorsAndKeywords_8.TokenType.StringLiteralContents, new Token_2.Range(ss.prevPoint(), ss.currPoint())));
        }
        let rng = new Token_2.Range(pointStart, ss.currPoint());
        // make sure not a keyword
        if (ident in operatorsAndKeywords_6.keywords) {
            this.tokens.push(new Token_1.Token(ident, operatorsAndKeywords_8.TokenType.Keyword, rng));
            return;
        }
        if (ident in operatorsAndKeywords_1.keywordValues) {
            this.tokens.push(new Token_1.Token(ident, operatorsAndKeywords_8.TokenType.Number, rng)); // can treat like a number for parse purposes
            return;
        }
        if (ident in operatorsAndKeywords_2.binaryOperatorsLikeIdentifiers) {
            this.tokens.push(new Token_1.Token(ident, operatorsAndKeywords_8.TokenType.Operator, rng));
            return;
        }
        this.tokens.push(new Token_1.Token(ident, operatorsAndKeywords_8.TokenType.Identifier, rng));
        return;
    }
    readMacroInvocation() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let c = ss.read();
        let c2 = ss.read();
        if (charUtils.isValidIdentifierStart(c2)) {
            let str = ss.readWhile(charUtils.isValidIdentifierContinuation);
            str = c + c2 + str;
            let rng = new Token_2.Range(pointStart, ss.currPoint());
            this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Macro, rng));
            return;
        }
        throw new errors_1.InvalidParseError("Expecting a macro name, but got '..." + ss.getContext() + "...'", new Token_1.Token(c + c2, operatorsAndKeywords_8.TokenType.Macro, new Token_2.Range(pointStart, ss.currPoint())));
    }
    readNumber() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let str = this.readAndReturnNumber();
        let rng = new Token_2.Range(pointStart, ss.currPoint());
        this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Number, rng));
    }
    readOperator() {
        let ss = this.ss;
        let pointStart = ss.currPoint();
        let str = this.readAndReturnOperator();
        let rng = new Token_2.Range(pointStart, ss.currPoint());
        this.tokens.push(new Token_1.Token(str, operatorsAndKeywords_8.TokenType.Operator, rng));
    }
    readBracket() {
        let ss = this.ss;
        let c = ss.read();
        let rng = new Token_2.Range(ss.prevPoint(), ss.currPoint());
        this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.Bracket, rng));
    }
    readSemicolon() {
        let ss = this.ss;
        let c = ss.read();
        let rng = new Token_2.Range(ss.prevPoint(), ss.currPoint());
        this.tokens.push(new Token_1.Token(c, operatorsAndKeywords_8.TokenType.SemiColon, rng));
    }
    /**
     * Reads a complete operator from the stream.
     * The first character read must start the operator.
     */
    readAndReturnOperator() {
        let ss = this.ss;
        let str = ss.read();
        while (!ss.eof() && str.length < operatorsAndKeywords_4.longestOperatorLength) {
            str += ss.read();
        }
        // trim down to longest valid operator
        while (!(str in operatorsAndKeywords_5.allOperators)) {
            str = str.substring(0, str.length - 1);
            ss.unread();
        }
        return str;
    }
    /**
     * Reads a complete number from the stream.
     * The first character read must start the number.
     */
    readAndReturnNumber() {
        let ss = this.ss;
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
    streamAtSymbol() {
        let ss = this.ss;
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
            if (tok.type === operatorsAndKeywords_8.TokenType.NewLine)
                return true;
            if (tok.type === operatorsAndKeywords_8.TokenType.Bracket && (tok.str === "(" || tok.str === "[" || tok.str === "{"))
                return true;
            if (tok.type === operatorsAndKeywords_8.TokenType.Operator && (tok.str in operatorsAndKeywords_3.binaryOperators || tok.str === "?"))
                return true;
            if (tok.type === operatorsAndKeywords_8.TokenType.Keyword)
                return true;
            return false;
        };
        if (this.tokens.length === 0) {
            prevTokenIsOk = true;
        }
        else {
            let prevToken = arrayUtils_1.last(this.tokens);
            if (isTokenOkForPrev(prevToken))
                prevTokenIsOk = true;
            if (!prevTokenIsOk && prevToken.type === operatorsAndKeywords_8.TokenType.LineWhiteSpace && this.tokens.length > 1) {
                // check token before that
                let prevToken2 = this.tokens[this.tokens.length - 2];
                if (isTokenOkForPrev(prevToken2))
                    prevTokenIsOk = true;
            }
        }
        return prevTokenIsOk;
    }
    streamAtTransposeOperator(ss) {
        if (ss.eof())
            return false;
        if (!streamAtSingleQuote(ss))
            return false;
        // will consider a transpose if the immediately preceding token was an identifier
        // or a close bracket
        // no spacing allowed
        if (this.tokens.length > 0) {
            let lastToken = arrayUtils_1.last(this.tokens);
            if (lastToken.type === operatorsAndKeywords_8.TokenType.Identifier ||
                (lastToken.type === operatorsAndKeywords_8.TokenType.Bracket && (lastToken.str === ")" || lastToken.str === "]"))) {
                return true;
            }
        }
        return false;
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
function streamAtComment(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === "#";
}
function streamAtLineWhiteSpace(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return charUtils.isWhiteSpaceNotNewLine(c);
}
function streamAtNewLine(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === "\n";
}
function streamAtDoubleQuoteOrBacktick(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === "\"" || c === "`";
}
function streamAtDoubleQuote(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === "\"";
}
function streamAtSingleQuote(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === "'";
}
function streamAtNumber(ss) {
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
function streamAtOperator(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    // assumes first char of all operators is an operator
    // for other operators like 'in' which are like strings,
    // we will process during identifier processing
    return c in operatorsAndKeywords_5.allOperators;
}
function streamAtRegex(ss) {
    if (ss.eof())
        return false;
    let next2 = ss.peekUpToX(2);
    if (next2 === null)
        return false;
    let c1 = next2[0];
    let c2 = next2[1];
    return c1 === "r" && c2 === "\"";
}
function streamAtIdentifier(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return charUtils.isValidIdentifierStart(c);
}
function streamAtMacroInvocation(ss) {
    let next2 = ss.peekUpToX(2); // needs a char after @
    if (next2 === null)
        return false;
    return next2[0] === "@";
}
function streamAtBracket(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c in operatorsAndKeywords_7.allBrackets;
}
function streamAtSemicolon(ss) {
    if (ss.eof())
        return false;
    let c = ss.peek();
    return c === ";";
}
//# sourceMappingURL=Tokenizer.js.map