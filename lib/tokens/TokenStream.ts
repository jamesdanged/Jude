"use strict"

import {TreeToken} from "./Token";
import {InvalidParseError} from "./../utils/errors";
import {TokenType} from "./operatorsAndKeywords";
import {Token} from "./Token";
import {AssertError} from "../utils/assert";

export class TokenStream {
  private _tokens: Token[]
  private _index: number
  private _prevTokenBeforeStream: Token  // The token before the first token in the stream. Needed for error reporting.
                                         // If stream is entire contents of file, provide a placeholder token.

  constructor(tokens: Token[], prevTokenBeforeStream: Token) {
    this._tokens = tokens
    this._index = 0
    this._prevTokenBeforeStream = prevTokenBeforeStream
  }

  get index(): number { return this._index }
  set index(newValue: number) {
    if (newValue < 0 || newValue > this._tokens.length)
      throw new AssertError("New index should be between 0 and " + this._tokens.length + ". Got " + newValue)
    this._index = newValue
  }

  /**
   * Returns a new TokenStream with a view to the same tokens array,
   * initialized to the same index.
   * Reading from it increments its own index.
   */
  shallowCopy(): TokenStream {
    let copy = new TokenStream(this._tokens, this._prevTokenBeforeStream)
    copy._index = this._index
    return copy
  }

  bof() : boolean {
    return this._index === 0
  }
  eof() : boolean {
    return this._index >= this._tokens.length
  }

  /**
   * Returns the previous token. May return null if at bof.
   */
  getLastToken(): Token {
    if (this.index === 0) return this._prevTokenBeforeStream
    return this._tokens[this.index - 1]
  }


  /**
   * True if there are no more tokens before EOF except new lines.
   * @returns {boolean}
   */
  eofIgnoringNewLine(): boolean {
    let idx = this._index
    while (idx < this._tokens.length) {
      let tok = this._tokens[idx]
      if (tok.type === TokenType.NewLine) continue
      return false
    }
    return true
  }

  read(): Token {
    if (this.eof()) {
      throw new InvalidParseError("Already at end of tokens.", this.getLastToken())
    }
    let tok = this._tokens[this._index]
    this._index += 1
    return tok
  }

  unread(): void {
    if (this.bof()) {
      throw new AssertError("Already at beginning of tokens.")
    }
    this._index -= 1
  }

  peek(): Token {
    if (this.eof()) {
      throw new InvalidParseError("Already at end of tokens.", this.getLastToken())
    }
    return this._tokens[this._index]
  }

  /**
   * Returns the next X tokens, without moving the cursor.
   * If less than X before eof, returns null.
   */
  peekUpToX(x: number): Token[] {
    if (this._tokens.length - this._index < x) return null
    return this._tokens.slice(this._index, this._index + x)
  }

  /**
   * Returns the next non newline token.
   * Does not advance the cursor.
   * Throws if reaches EOF.
   */
  peekIgnoringNewLine(): Token {
    let idx = this._index
    while (idx < this._tokens.length) {
      let tok = this._tokens[idx]
      if (tok.type === TokenType.NewLine) continue
      return tok
    }
    throw new InvalidParseError("Already at end of tokens.", this.getLastToken())
  }

  /**
   * Will throw if EOF.
   */
  readNonNewLine(): Token {
    this.skipNewLines()
    if (this.eof()) {
      throw new InvalidParseError("Already at end of sequence.", this.getLastToken())
    }
    return this.read()
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
  seek(condition: (Token) => boolean): Token {
    let tok : Token = null
    while (!this.eof()) {
      let curr = this.read()
      if (condition(curr)) {
        tok = curr
        break
      }
    }
    return tok
  }

  /**
   * Skips any new lines.
   * Doesn't do anything if EOF.
   */
  skipNewLines(): void {
    while (!this.eof()) {
      if (this.peek().type === TokenType.NewLine) {
        this.read()
      } else {
        return
      }
    }
  }

  skipNewLinesAndComments(): void {
    while (!this.eof()) {
      let tok = this.peek()
      if (tok.type === TokenType.NewLine || tok.type === TokenType.Comment) {
        this.read()
      } else {
        return
      }
    }
  }


  /**
   *
   * @param fromIndex
   * @param toIndex  exclusive
   */
  toOrigString(fromIndex: number, toIndex: number): string {
    if (fromIndex < 0) throw new AssertError("")
    if (this._tokens.length < toIndex) throw new AssertError("")

    //if (fromIndex > toIndex) throw new AssertError("")

    let s = ""
    for (let i = fromIndex; i < toIndex; i++) {
      s = s + this._tokens[i].toString()
    }
    return s
  }


  /**
   * Skips line white space, new lines, and comments.
   * Doesn't throw error if eof.
   */
  skipToNextNonWhitespace(): void {
    while (!this.eof()) {
      let tok = this.peek()
      if (tok.type === TokenType.LineWhiteSpace || tok.type === TokenType.NewLine || tok.type === TokenType.Comment) {
        this.read()
      } else {
        return
      }
    }
  }

  /**
   * For debugging. Gets the token strings for +/- 10 tokens around the current point.
   */
  getContext(): string {
    let start = this._index - 10
    let stop = this._index + 10
    if (start < 0) start = 0
    if (stop > this._tokens.length) stop = this._tokens.length
    return this.toOrigString(start, stop)
  }

  splice(spliceIndex: number, deleteCount: number, ...tokensToInsert: Token[]): Token[] {
    let args: any[] = [spliceIndex, deleteCount]
    args = args.concat(tokensToInsert)
    let result = this._tokens.splice.apply(this._tokens, args)

    // shift the index accordingly
    if (spliceIndex < this._index) {
      let offset = tokensToInsert.length - deleteCount
      this._index += offset
    }

    return result
  }

}