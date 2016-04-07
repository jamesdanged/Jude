"use strict"

import {keywordValues} from "./operatorsAndKeywords";
import {binaryOperatorsLikeIdentifiers} from "./operatorsAndKeywords";
import {AssertError} from "../utils/assert";
import charUtils = require("./../utils/charUtils")
import {InvalidParseError} from "./../utils/errors";
import {createStringSet} from "./../utils/StringSet";
import {mergeSets} from "./../utils/StringSet";
import {log} from "util";
import {unaryOperators} from "./operatorsAndKeywords";
import {binaryOperators} from "./operatorsAndKeywords";
import {longestOperatorLength} from "./operatorsAndKeywords";
import {allOperators} from "./operatorsAndKeywords";
import {keywords} from "./operatorsAndKeywords";
import {allBrackets} from "./operatorsAndKeywords";
import {allQuotes} from "./operatorsAndKeywords";
import {TokenType} from "./operatorsAndKeywords";
import {StringStream} from "./../utils/StringStream";
import {Token} from "./Token";
import {Indent} from "./Token";
import {Range} from "./Token"
import {last} from "./../utils/arrayUtils";

/**
 * Converts a string into a sequence of julia tokens.
 * Doesn't do any significant parsing except for recognizing string literals
 * and string interpolations.
 */
export class Tokenizer {
  _ss : StringStream
  //_currRow: number  // 0 is first line
  //_currCol: number  // 0 is first col
  _currParenthesisLevel: number  // 0 unless we are currently interpolating a string.
  _tokens: Token[]
  errors: InvalidParseError[]

  constructor() {
    this._ss = null
    this._currParenthesisLevel = 0
    this._tokens = null
    this.errors = null
  }

  get parsedTokens(): Token[] { return this._tokens }

  /**
   * Tokenize the string.
   * Any parsing errors will be stored.
   *
   */
  tokenize(str: string): void {
    this._tokens = []
    this._ss = new StringStream(str)
    this._currParenthesisLevel = 0
    this.errors = []

    try {
      while (!this._ss.eof()) {
        this._readNextToken()
      }
    } catch (err) {
      if (err instanceof InvalidParseError) {
        this.errors.push(err)
      } else {
        throw err
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
  _readNextToken(): void {
    let ss = this._ss

    if (ss.eof()) throw new AssertError("Already EOF")
    let pointStart = ss.currPoint()
    let c = ss.read()

    // comments
    if (c === "#") {
      let str = ss.readUntil(charUtils.isNewLine)
      str = "#" + str // leave the '#' in front in order to distinguish the str from operators/keywords
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(str, TokenType.Comment, rng))
      return
    }

    // whitespace
    if (charUtils.isWhiteSpaceNotNewLine(c)) {
      let str = ss.readWhile(charUtils.isWhiteSpaceNotNewLine)
      str = c + str
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(str, TokenType.LineWhiteSpace, rng))
      return
    }
    if (charUtils.isNewLine(c)) {
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(c, TokenType.NewLine, rng))
      //this._currRow++
      return
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
      let openQuote = c

      // could be a triple quote
      let next2 = ss.peekUpToX(2)
      if (next2 === '""') {
        openQuote = '"""'
        ss.read()
        ss.read()
      }

      this._tokens.push(new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))

      let str = ""
      let pointCurrStringLiteralStart = ss.currPoint()
      let storeCurrentStringLiteral = () => {
        if (str.length > 0) {
          let rng = new Range(pointCurrStringLiteralStart, ss.currPoint())
          this._tokens.push(new Token(str, TokenType.StringLiteralContents, rng))
        }
        str = ""
      }
      let stringClosedSuccessfully = false

      // read string contents
      while (!ss.eof()) {
        let ch = ss.read()
        let chPoint = ss.currPoint()

        if (ch === "\\") {
          // escape the next character
          // especially if it is \$
          if (ss.eof()) {
            throw new InvalidParseError("Unexpected EOF",
              new Token(ch, TokenType.StringLiteralContents, new Range(chPoint, ss.currPoint())))
          }
          let ch2 = ss.read()
          str += "\\" + ch2
          continue
        }

        if (ch === "\n") {
          // julia strings can span multiple lines
          str += "\n"
          //this._currRow++
          continue
        }

        let matchesOpenQuote = false
        if (openQuote.length === 1 && ch === openQuote) matchesOpenQuote = true
        if (openQuote.length === 3) {
          let next2 = ss.peekUpToX(2)
          if (next2 !== null && ch + next2 === openQuote) {
            matchesOpenQuote = true
            ss.read()
            ss.read()
          }
        }
        if (matchesOpenQuote) {
          // terminate the string
          storeCurrentStringLiteral()

          // store close quote
          this._tokens.push(new Token(openQuote, TokenType.Quote, new Range(chPoint, ss.currPoint())))
          stringClosedSuccessfully = true

          break // while
        }

        if (ch === "$") {

          if (ss.eof()) {
            throw new InvalidParseError("Unexpected EOF",
              new Token(ch, TokenType.StringLiteralContents, new Range(chPoint, ss.currPoint())))
          }

          let pointAfterDollar = ss.currPoint()
          let ch2 = ss.read()

          if (charUtils.isValidIdentifierStart(ch2)) {
            storeCurrentStringLiteral()
            this._tokens.push(new Token("$", TokenType.StringInterpolationStart, new Range(chPoint, pointAfterDollar)))
            let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
            this._tokens.push(new Token(ch2 + str, TokenType.Identifier, new Range(pointAfterDollar, ss.currPoint())))

          } else if (ch2 === "(") {
            // major string interpolation
            // need to recurse
            storeCurrentStringLiteral()
            this._tokens.push(new Token("$", TokenType.StringInterpolationStart, new Range(chPoint, pointAfterDollar)))
            this._tokens.push(new Token("(", TokenType.Bracket, new Range(pointAfterDollar, ss.currPoint())))
            let origParenthesisLevel = this._currParenthesisLevel
            this._currParenthesisLevel++
            while (!ss.eof() && this._currParenthesisLevel != origParenthesisLevel) {
              this._readNextToken()
            }
            if (ss.eof()) {
              throw new InvalidParseError("Unexpected EOF while waiting for end of string interpolation.", last(this._tokens))
            }


          } else {
            throw new InvalidParseError("Invalid interpolation syntax: $" + ch2,
              new Token(ch2, TokenType.StringLiteralContents, new Range(chPoint, ss.currPoint())))
          }

          continue
        }

        // simply append to the string
        str += ch

      } // while

      if (!stringClosedSuccessfully) throw new InvalidParseError("Got to EOF without closing string.", last(this._tokens))
      return
    }

    // parenthesis handling within string interpolation
    if (this._currParenthesisLevel > 0) {
      if (c === "(") {
        this._currParenthesisLevel++
        let rng = new Range(pointStart, ss.currPoint())
        this._tokens.push(new Token(c, TokenType.Bracket, rng))
        return
      }
      if (c === ")") {
        this._currParenthesisLevel--
        let rng = new Range(pointStart, ss.currPoint())
        this._tokens.push(new Token(c, TokenType.Bracket, rng))
        return
      }
    }


    // char literals and transpose operator
    if (c === "'") {
      // will consider a transpose if the immediately preceding token was an identifier
      // or a close bracket
      // no spacing allowed
      if (this._tokens.length > 0) {
        let lastToken = last(this._tokens)
        if (lastToken.type === TokenType.Identifier ||
          (lastToken.type === TokenType.Bracket && (lastToken.str === ")" || lastToken.str === "]"))) {

          let rng = new Range(pointStart, ss.currPoint())
          this._tokens.push(new Token(c, TokenType.Operator, rng))
          return
        }
      }

      // try interpreting as a char literal
      let next2 = ss.peekUpToX(2)
      if (next2 !== null) {
        let c1 = next2[0]
        let c2 = next2[1]
        if (c1 !== "'" && c1 !== "\\" && c2 === "'") {
          this._tokens.push(new Token(c, TokenType.Quote, new Range(pointStart, ss.currPoint())))
          ss.read()
          this._tokens.push(new Token(c1, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
          ss.read()
          this._tokens.push(new Token(c2, TokenType.Quote, new Range(ss.prevPoint(), ss.currPoint())))
          return
        }
        // escaped chars, ie \'  \n  \t  \r
        if (c1 === "\\") {
          let next3 = ss.peekUpToX(3)
          let c3 = next3[2]
          if (c3 === "'") {
            this._tokens.push(new Token(c, TokenType.Quote, new Range(pointStart, ss.currPoint())))
            ss.read()
            ss.read()
            this._tokens.push(new Token("'", TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
            ss.read()
            this._tokens.push(new Token(c3, TokenType.Quote, new Range(ss.prevPoint(), ss.currPoint())))
            return
          }
        }
        throw new InvalidParseError("Character literal must have only one character.",
          new Token(c, TokenType.Quote, new Range(pointStart, ss.currPoint())))
      }
    }


    // regex
    if (c === "r" && !ss.eof()) {
      let c2 = ss.peek()
      if (c2 === "\"") {
        ss.read()
        let regexContents = ""
        let lastChar = c2

        // read regex contents
        while (!ss.eof()) {
          let iChar = ss.read()
          lastChar = iChar
          if (iChar === "\\") {
            // escape the next character
            if (ss.eof()) {
              throw new InvalidParseError("Unexpected EOF",
                new Token(iChar, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
            }
            let iChar2 = ss.read()
            regexContents += "\\" + iChar2
          } else if (iChar === "\"") {
            // terminate
            this._tokens.push(new Token("r\"" + regexContents + "\"", TokenType.Regex, new Range(pointStart, ss.currPoint())))
            return
          } else {
            regexContents += iChar
          }
        }

        throw new InvalidParseError("Unexpected EOF",
          new Token(lastChar, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
      }
    }


    // symbols
    // eg :foo
    // must be handled before operators, as ':' is also an operator
    // doesn't handle quoting, ie :(a+b)
    ss.unread()
    if (this._streamAtSymbol()) {
      // valid symbol
      // read either an operator
      // or a number
      // or an identifier
      ss.read() // c = ":"


      // identifier
      let c2 = ss.read()
      if (charUtils.isValidIdentifierStart(c2)) {
        let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
        str = c + c2 + str
        this._tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
        return
      }

      ss.unread()
      if (this._streamAtNumber()) {
        let str = this._readNumber()
        str = c + str
        this._tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
        return
      }
      if (this._streamAtOperator()) {
        let str = this._readOperator()
        str = c + str
        this._tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
        return
      }

      // what other symbol could it be?
      // just return to correct place in stream
      ss.read()

    } else {
      ss.read()
    }


    // operators
    // must process before identifiers because ÷ is considered a valid UTF8 char to start an identifier
    ss.unread()
    if (this._streamAtOperator()) {
      let str = this._readOperator()
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(str, TokenType.Operator, rng))
      return
    } else {
      ss.read()
    }


    // keywords and identifiers
    if (charUtils.isValidIdentifierStart(c)) {
      let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
      str = c + str
      let rng = new Range(pointStart, ss.currPoint())

      // make sure not a keyword
      if (str in keywords) {
        this._tokens.push(new Token(str, TokenType.Keyword, rng))
        return
      }

      if (str in keywordValues) {
        this._tokens.push(new Token(str, TokenType.Number, rng))  // can treat like a number for parse purposes
        return
      }

      if (str in binaryOperatorsLikeIdentifiers) {
        this._tokens.push(new Token(str, TokenType.Operator, rng))
        return
      }

      this._tokens.push(new Token(str, TokenType.Identifier, rng))
      return
    }

    // macro invocations
    if (c === "@" && !ss.eof()) {
      let c2 = ss.read()
      if (charUtils.isValidIdentifierStart(c2)) {
        let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
        str = c + c2 + str
        let rng = new Range(pointStart, ss.currPoint())
        //let followedBySpace = false
        //if (!ss.eof()) {
        //  let c3 = ss.peek()
        //  if (c3 === " " || c3 === "\t" || c3 === "\n" || c3 === "\r") followedBySpace = true
        //}
        //let tokType = TokenType.Macro
        //if (followedBySpace) tokType = TokenType.MacroWithSpace

        this._tokens.push(new Token(str, TokenType.Macro, rng))
        return
      } else {
        throw new InvalidParseError("Expecting a macro name, but got '..." + ss.getContext() + "...'",
          new Token(c + c2, TokenType.Macro, new Range(pointStart, ss.currPoint())))
      }
    }

    // numbers
    ss.unread()
    if (this._streamAtNumber()) {
      let str = this._readNumber()
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(str, TokenType.Number, rng))
      return
    } else {
      ss.read()
    }

    if (c in allBrackets) {
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(c, TokenType.Bracket, rng))
      return
    }

    if (c === ";") {
      let rng = new Range(pointStart, ss.currPoint())
      this._tokens.push(new Token(c, TokenType.SemiColon, rng))
      return
    }

    throw new InvalidParseError("Unexpected character: '" + c + "'. Context: '" + ss.getContext() + "'.",
      new Token(c, TokenType.Identifier, new Range(ss.prevPoint(), ss.currPoint()) ))
  }


  /**
   * Reads a complete operator from the stream.
   * The first character read must start the operator.
   *
   */
  _readOperator(): string {
    let ss = this._ss
    let str = ss.read()
    while (!ss.eof() && str.length < longestOperatorLength) {
      str += ss.read()
    }
    // trim down to longest valid operator
    while (!(str in allOperators)) {
      str = str.substring(0, str.length - 1)
      ss.unread()
    }
    return str
  }

  /**
   * Reads a complete number from the stream.
   * The first character read must start the number.
   */
  _readNumber(): string {
    let ss = this._ss
    let foundDecimal = false
    let foundExp = false  // will recognize either "e" "E" or "f"  TODO "p"
    let str = ""

    if (ss.peek() !== "." && !charUtils.isNumeric(ss.peek()))
      throw new AssertError("Must only call if next chars are numbers. Found: " + ss.peek())

    while (!ss.eof()) {
      let c = ss.read()

      if (c === ".") {
        if (foundDecimal) {
          ss.unread()
          break
          //throw new InvalidParseError("Cannot have two decimals in a number: \"" + str + c + "\"",
          //  new Token(c, TokenType.Number, new Range(ss.prevPoint(), ss.prevPoint()) ))
        }
        if (foundExp) {
          ss.unread()
          break
          //throw new InvalidParseError("Cannot have decimal in exponent: \"" + str + c + "\"",
          //  new Token(c, TokenType.Number, new Range(ss.prevPoint(), ss.prevPoint()) ))
        }
        foundDecimal = true
        str = str + c
        continue
      }

      if (c === "e" || c === "E" || c === "f") {
        if (foundExp) {
          ss.unread()
          break
        }
        foundExp = true
        str = str + c
        continue
      }

      if (charUtils.isNumeric(c)) {
        str = str + c
        continue
      }

      // otherwise, invalid character for a number
      ss.unread()
      break
    }

    return str
  }


  _streamAtNumber(): boolean {
    let ss = this._ss
    if (ss.eof()) return false

    let c = ss.peek()
    if (charUtils.isNumeric(c)) return true

    let next2 = ss.peekUpToX(2)
    if (next2 === null) return false
    c = next2[0]
    let c2 = next2[1]
    return c === "." && charUtils.isNumeric(c2)
  }

  _streamAtOperator(): boolean {
    let ss = this._ss
    if (ss.eof()) return false

    let c = ss.peek()
    return c in allOperators // assumes first char of all operators is an operator
  }

  _streamAtSymbol(): boolean {
    let ss = this._ss
    let next2 = ss.peekUpToX(2)
    if (next2 === null) return false
    let c = next2[0]
    if (c !== ":") return false

    // check next char
    let c2 = next2[1]
    if (c2 === ":") return false
    if (c2 === ",") return false
    if (c2 === ";") return false
    if (charUtils.isWhiteSpace(c2)) return false
    if (charUtils.isBracket(c2)) return false

    // check prev char
    let prevTokenIsOk = false
    let isTokenOkForPrev = (tok: Token): boolean => {
      if (tok.type === TokenType.NewLine) return true
      if (tok.type === TokenType.Bracket && (tok.str === "(" || tok.str === "[" || tok.str === "{")) return true
      if (tok.type === TokenType.Operator && tok.str in binaryOperators) return true
      return false
    }
    if (this._tokens.length === 0) {
      prevTokenIsOk = true
    } else {
      let prevToken = last(this._tokens)
      if (isTokenOkForPrev(prevToken)) prevTokenIsOk = true
      if (!prevTokenIsOk && prevToken.type === TokenType.LineWhiteSpace && this._tokens.length > 1) {
        // check token before that
        let prevToken2 = this._tokens[this._tokens.length - 2]
        if (isTokenOkForPrev(prevToken2)) prevTokenIsOk = true
      }
    }
    return prevTokenIsOk
  }

  static tokenizeThrowIfError(str: string): Token[] {
    let tokenizer = new Tokenizer()
    tokenizer.tokenize(str)
    if (tokenizer.errors.length > 0) throw new AssertError(tokenizer.errors[0].message)
    return tokenizer.parsedTokens
  }

}










 
