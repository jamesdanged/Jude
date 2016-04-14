"use strict"

import {regexFlags} from "./operatorsAndKeywords";
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
  private ss : StringStream
  private currParenthesisLevel: number  // 0 unless we are currently interpolating a string.
  private tokens: Token[]
  errors: InvalidParseError[]

  constructor() {
    this.ss = null
    this.currParenthesisLevel = 0
    this.tokens = null
    this.errors = null
  }

  get parsedTokens(): Token[] { return this.tokens }

  /**
   * Tokenize the string.
   * Any parsing errors will be stored.
   *
   */
  tokenize(str: string): void {
    this.tokens = []
    this.ss = new StringStream(str)
    this.currParenthesisLevel = 0
    this.errors = []

    try {
      while (!this.ss.eof()) {
        this.readNextToken()
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
  private readNextToken(): void {
    let ss = this.ss

    if (ss.eof()) throw new AssertError("Already EOF")

    // comments
    if (streamAtComment(ss)) {
      this.readComment()
      return
    }

    // whitespace
    if (streamAtLineWhiteSpace(ss)) {
      this.readLineWhiteSpace()
      return
    }
    if (streamAtNewLine(ss)) {
      this.readNewLine()
      return
    }

    // interpolated strings or string literals
    if (streamAtDoubleQuoteOrBacktick(ss)) {
      this.readString()
      return
    }

    // parenthesis handling within string interpolation
    if (this.currParenthesisLevel > 0) {
      let pointStart = ss.currPoint()
      let c = ss.peek()

      if (c === "(") {
        ss.read()
        this.currParenthesisLevel++
        let rng = new Range(pointStart, ss.currPoint())
        this.tokens.push(new Token(c, TokenType.Bracket, rng))
        return
      }
      if (c === ")") {
        ss.read()
        this.currParenthesisLevel--
        let rng = new Range(pointStart, ss.currPoint())
        this.tokens.push(new Token(c, TokenType.Bracket, rng))
        return
      }
    }

    // must handle transpose op before char literal
    if (this.streamAtTransposeOperator(ss)) {
      this.readTransposeOperator()
      return
    }
    if (streamAtSingleQuote(ss)) {
      this.readCharLiteral()
      return
    }

    // symbols
    // eg :foo
    // must be handled before operators, as ':' is also an operator
    // doesn't handle quoting, ie :(a+b)
    if (this.streamAtSymbol()) {
      this.readSymbol()
      return
    }

    // operators
    // must process before identifiers because ÷ is considered a valid UTF8 char to start an identifier
    if (streamAtOperator(ss)) {
      this.readOperator()
      return
    }

    // keywords and identifiers
    if (streamAtIdentifier(ss)) {
      this.readIdentifier()
      return
    }

    // macro invocations
    if (streamAtMacroInvocation(ss)) {
      this.readMacroInvocation()
      return
    }

    // numbers
    if (streamAtNumber(ss)) {
      this.readNumber()
      return
    }

    if (streamAtBracket(ss)) {
      this.readBracket()
      return
    }

    if (streamAtSemicolon(ss)) {
      this.readSemicolon()
      return
    }

    let c = ss.read()
    throw new InvalidParseError("Unexpected character: '" + c + "'. Context: '" + ss.getContext() + "'.",
      new Token(c, TokenType.Identifier, new Range(ss.prevPoint(), ss.currPoint()) ))
  }



  private readComment(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    ss.read() // discard #

    if (!ss.eof() && ss.peek() === "=") {
      // multi line comment
      ss.read()
      let str = "#="
      while (!ss.eof()) {
        let next2 = ss.peekUpToX(2)
        if (next2 === "=#") {
          ss.read()
          ss.read()
          str += "=#"
          break
        } else {
          str += ss.read()
        }
      }
      let rng = new Range(pointStart, ss.currPoint())
      this.tokens.push(new Token(str, TokenType.Comment, rng))
    } else {
      // single line comment
      let str = ss.readUntil(charUtils.isNewLine)
      str = "#" + str // leave the '#' in front in order to distinguish the str from operators/keywords
      let rng = new Range(pointStart, ss.currPoint())
      this.tokens.push(new Token(str, TokenType.Comment, rng))
    }
  }

  private readLineWhiteSpace(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let c = ss.read()

    let str = ss.readWhile(charUtils.isWhiteSpaceNotNewLine)
    str = c + str
    let rng = new Range(pointStart, ss.currPoint())
    this.tokens.push(new Token(str, TokenType.LineWhiteSpace, rng))
  }

  private readNewLine(): void {
    let ss = this.ss
    let c = ss.read()
    let rng = new Range(ss.prevPoint(), ss.currPoint())
    this.tokens.push(new Token(c, TokenType.NewLine, rng))
  }

  private readTransposeOperator(): void {
    let ss = this.ss
    let c = ss.read()
    let rng = new Range(ss.prevPoint(), ss.currPoint())
    this.tokens.push(new Token(c, TokenType.Operator, rng))
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
  private readString(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let c = ss.read()

    let openQuote = c

    // could be a triple quote
    let next2 = ss.peekUpToX(2)
    if (next2 === '""') {
      openQuote = '"""'
      ss.read()
      ss.read()
    }

    this.tokens.push(new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))

    let str = ""
    let pointCurrStringLiteralStart = ss.currPoint()
    let storeCurrentStringLiteral = () => {
      if (str.length > 0) {
        let rng = new Range(pointCurrStringLiteralStart, ss.currPoint())
        this.tokens.push(new Token(str, TokenType.StringLiteralContents, rng))
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
        this.tokens.push(new Token(openQuote, TokenType.Quote, new Range(chPoint, ss.currPoint())))
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
          this.tokens.push(new Token("$", TokenType.StringInterpolationStart, new Range(chPoint, pointAfterDollar)))
          let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
          this.tokens.push(new Token(ch2 + str, TokenType.Identifier, new Range(pointAfterDollar, ss.currPoint())))

        } else if (ch2 === "(") {
          // major string interpolation
          // need to recurse
          storeCurrentStringLiteral()
          this.tokens.push(new Token("$", TokenType.StringInterpolationStart, new Range(chPoint, pointAfterDollar)))
          this.tokens.push(new Token("(", TokenType.Bracket, new Range(pointAfterDollar, ss.currPoint())))
          let origParenthesisLevel = this.currParenthesisLevel
          this.currParenthesisLevel++
          while (!ss.eof() && this.currParenthesisLevel != origParenthesisLevel) {
            this.readNextToken()
          }
          if (ss.eof()) {
            throw new InvalidParseError("Unexpected EOF while waiting for end of string interpolation.", last(this.tokens))
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

    if (!stringClosedSuccessfully) throw new InvalidParseError("Got to EOF without closing string.", last(this.tokens))
  }

  private readCharLiteral(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let openQuote = ss.read()

    let next2 = ss.peekUpToX(2)
    if (next2 === null) throw new InvalidParseError("Unclosed character literal",
      new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))

    let c = next2[0]
    let closeQuote = next2[1]
    if (c !== "'" && c !== "\\" && closeQuote === "'") {
      this.tokens.push(new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))
      ss.read()
      this.tokens.push(new Token(c, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
      ss.read()
      this.tokens.push(new Token(closeQuote, TokenType.Quote, new Range(ss.prevPoint(), ss.currPoint())))
      return
    }
    // escaped chars, ie \'  \n  \t  \r
    if (c === "\\") {
      let next3 = ss.peekUpToX(3)
      let c3 = next3[2]
      if (c3 === "'") {
        this.tokens.push(new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))
        ss.read()
        ss.read()
        this.tokens.push(new Token("'", TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
        ss.read()
        this.tokens.push(new Token(c3, TokenType.Quote, new Range(ss.prevPoint(), ss.currPoint())))
        return
      }
    }
    throw new InvalidParseError("Character literal must have only one character.",
      new Token(openQuote, TokenType.Quote, new Range(pointStart, ss.currPoint())))
  }

  private readSymbol(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let c = ss.read()  // c = ":"

    // valid symbol
    // read either an operator
    // or a number
    // or an identifier

    // identifier
    if (streamAtIdentifier(ss)) {
      let c2 = ss.read()
      let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
      str = c + c2 + str
      this.tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
      return
    }

    if (streamAtNumber(ss)) {
      let str = this.readAndReturnNumber()
      str = c + str
      this.tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
      return
    }
    if (streamAtOperator(ss)) {
      let str = this.readAndReturnOperator()
      str = c + str
      this.tokens.push(new Token(str, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
      return
    }

    // what other symbol could it be?
    let c2 = ss.read()  // always will at least be 1 more char after ':'
    throw new InvalidParseError("Unrecognized symbol", new Token(c + c2, TokenType.Symbol, new Range(pointStart, ss.currPoint())))
  }

  private readIdentifier(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let ident = ss.read()
    ident += ss.readWhile(charUtils.isValidIdentifierContinuation)

    // if next char is a quote, than this is a string macro
    // eg regexes
    if (streamAtDoubleQuote(ss)) {
      let lastChar = ss.read()  // "

      // read quote contents
      let contents = ""
      while (!ss.eof()) {
        let c = ss.read()
        lastChar = c

        if (c === "\\") {
          // escape the next character
          if (ss.eof()) {
            throw new InvalidParseError("Unexpected EOF",
              new Token(c, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
          }
          let c2 = ss.read()
          contents += "\\" + c2

        } else if (c === "\"") {
          // ready to terminate contents

          // read any suffix
          let suffix = ""
          if (!ss.eof()) {
            let c2 = ss.peek()
            if (charUtils.isValidIdentifierStart(c2)) {
              ss.read()
              suffix += c2
              suffix += ss.readWhile(charUtils.isValidIdentifierContinuation)
            }
          }

          this.tokens.push(new Token(ident + "\"" + contents + "\"" + suffix, TokenType.StringMacro, new Range(pointStart, ss.currPoint())))
          return
        } else {
          contents += c
        }
      }
      throw new InvalidParseError("Unexpected EOF",
        new Token(lastChar, TokenType.StringLiteralContents, new Range(ss.prevPoint(), ss.currPoint())))
    }


    let rng = new Range(pointStart, ss.currPoint())

    // make sure not a keyword
    if (ident in keywords) {
      this.tokens.push(new Token(ident, TokenType.Keyword, rng))
      return
    }

    if (ident in keywordValues) {
      this.tokens.push(new Token(ident, TokenType.Number, rng))  // can treat like a number for parse purposes
      return
    }

    if (ident in binaryOperatorsLikeIdentifiers) {
      this.tokens.push(new Token(ident, TokenType.Operator, rng))
      return
    }

    this.tokens.push(new Token(ident, TokenType.Identifier, rng))
    return
  }

  private readMacroInvocation(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let c = ss.read()

    let c2 = ss.read()
    if (charUtils.isValidIdentifierStart(c2)) {
      let str = ss.readWhile(charUtils.isValidIdentifierContinuation)
      str = c + c2 + str
      let rng = new Range(pointStart, ss.currPoint())
      this.tokens.push(new Token(str, TokenType.Macro, rng))
      return
    }

    throw new InvalidParseError("Expecting a macro name, but got '..." + ss.getContext() + "...'",
      new Token(c + c2, TokenType.Macro, new Range(pointStart, ss.currPoint())))
  }

  private readNumber(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let str = this.readAndReturnNumber()
    let rng = new Range(pointStart, ss.currPoint())
    this.tokens.push(new Token(str, TokenType.Number, rng))
  }

  private readOperator(): void {
    let ss = this.ss
    let pointStart = ss.currPoint()
    let str = this.readAndReturnOperator()
    let rng = new Range(pointStart, ss.currPoint())
    this.tokens.push(new Token(str, TokenType.Operator, rng))
  }

  private readBracket(): void {
    let ss = this.ss
    let c = ss.read()
    let rng = new Range(ss.prevPoint(), ss.currPoint())
    this.tokens.push(new Token(c, TokenType.Bracket, rng))
  }

  private readSemicolon(): void {
    let ss = this.ss
    let c = ss.read()
    let rng = new Range(ss.prevPoint(), ss.currPoint())
    this.tokens.push(new Token(c, TokenType.SemiColon, rng))
  }

  /**
   * Reads a complete operator from the stream.
   * The first character read must start the operator.
   */
  private readAndReturnOperator(): string {
    let ss = this.ss
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
  private readAndReturnNumber(): string {

    let ss = this.ss
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

  private streamAtSymbol(): boolean {
    let ss = this.ss
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
    if (this.tokens.length === 0) {
      prevTokenIsOk = true
    } else {
      let prevToken = last(this.tokens)
      if (isTokenOkForPrev(prevToken)) prevTokenIsOk = true
      if (!prevTokenIsOk && prevToken.type === TokenType.LineWhiteSpace && this.tokens.length > 1) {
        // check token before that
        let prevToken2 = this.tokens[this.tokens.length - 2]
        if (isTokenOkForPrev(prevToken2)) prevTokenIsOk = true
      }
    }
    return prevTokenIsOk
  }

  private streamAtTransposeOperator(ss: StringStream): boolean {
    if (ss.eof()) return false
    if (!streamAtSingleQuote(ss)) return false

    // will consider a transpose if the immediately preceding token was an identifier
    // or a close bracket
    // no spacing allowed
    if (this.tokens.length > 0) {
      let lastToken = last(this.tokens)
      if (lastToken.type === TokenType.Identifier ||
        (lastToken.type === TokenType.Bracket && (lastToken.str === ")" || lastToken.str === "]"))) {
        return true
      }
    }
    return false
  }

  static tokenizeThrowIfError(str: string): Token[] {
    let tokenizer = new Tokenizer()
    tokenizer.tokenize(str)
    if (tokenizer.errors.length > 0) throw new AssertError(tokenizer.errors[0].message)
    return tokenizer.parsedTokens
  }

}





function streamAtComment(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === "#"
}

function streamAtLineWhiteSpace(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return charUtils.isWhiteSpaceNotNewLine(c)
}

function streamAtNewLine(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === "\n"
}

function streamAtDoubleQuoteOrBacktick(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === "\"" || c === "`"
}

function streamAtDoubleQuote(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === "\""
}

function streamAtSingleQuote(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === "'"
}

function streamAtNumber(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  if (charUtils.isNumeric(c)) return true

  let next2 = ss.peekUpToX(2)
  if (next2 === null) return false
  c = next2[0]
  let c2 = next2[1]
  return c === "." && charUtils.isNumeric(c2)
}

function streamAtOperator(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  // assumes first char of all operators is an operator
  // for other operators like 'in' which are like strings,
  // we will process during identifier processing
  return c in allOperators
}

function streamAtRegex(ss: StringStream): boolean {
  if (ss.eof()) return false
  let next2 = ss.peekUpToX(2)
  if (next2 === null) return false
  let c1 = next2[0]
  let c2 = next2[1]
  return c1 === "r" && c2 === "\""
}

function streamAtIdentifier(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return charUtils.isValidIdentifierStart(c)
}

function streamAtMacroInvocation(ss: StringStream): boolean {
  let next2 = ss.peekUpToX(2)  // needs a char after @
  if (next2 === null) return false
  return next2[0] === "@"
}

function streamAtBracket(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c in allBrackets
}

function streamAtSemicolon(ss: StringStream): boolean {
  if (ss.eof()) return false
  let c = ss.peek()
  return c === ";"
}