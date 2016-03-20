"use strict"

import {AssertError} from "../utils/assert";
import {TokenType} from "./operatorsAndKeywords";


export class Token {
  str: string
  type: TokenType
  indent: Indent  // was going to use to track when missing correct open/close brackets, but not not really used
  range: Range

  constructor(str : string, type: TokenType, range: Range, indent: Indent) {
    this.str = str
    this.type = type
    this.range = range
    this.indent = indent
  }

  toString(): string { return this.str }

  /**
   * Useful for inserting placeholder text that aren't actually in the file.
   * Token will point to the first character in the file.
   *
   * @param name
   * @returns {Token}
   */
  static createEmptyIdentifier(name: string): Token {
    return new Token(name, TokenType.Identifier, Range.createEmptyRange(), new Indent(""))
  }
}

/**
 * Contains a subtree of tokens.
 * Used between (), [], {}, "", '', ``, and various keyword ... end blocks
 */
export class TreeToken extends Token {
  openToken: Token
  closeToken: Token  // this may be null if we failed to find a closing bracket and had to resort to heuristics
  contents: Token[]

  constructor(openToken: Token) {
    super(openToken.str, openToken.type, openToken.range, openToken.indent)
    this.openToken = openToken
    this.closeToken = null
    this.contents = []
  }

  toString(): string {
    let s = this.openToken.toString()
    for (let iTok of this.contents) {
      s = s + iTok.toString()
    }
    if (this.closeToken !== null) {
      s = s + this.closeToken.toString()
    }
    return s
  }
}



/**
 * Read only row,col coordinate.
 */
export class Point {
  private _row: number
  private _column: number

  constructor(row: number, col: number) {
    this._row = row
    this._column = col
  }

  get row(): number { return this._row }
  get column(): number { return this._column}

  copy(): Point {
    return new Point(this.row, this.column)
  }

  isBefore(other: Point): boolean {
    if (this.row < other.row) return true
    if (this.row > other.row) return false
    return this.column < other.column
  }

  equals(other: Point): boolean {
    return this.row === other.row && this.column === other.column
  }

}

/**
 * Read only start/end coordinates of points.
 * The end point is inclusive.
 */
export class Range {
  private _start: Point
  private _end: Point

  constructor(start: Point, end: Point) {
    this._start = start
    this._end = end
  }

  get start(): Point { return this._start }
  get end(): Point { return this._end }

  copy(): Range {
    return new Range(this.start, this.end)
  }

  pointWithin(p: Point): boolean {
    let start = this._start
    let end = this._end
    let afterStart = p.row > start.row || (p.row === start.row && p.column >= start.column)
    let beforeEnd = p.row < end.row || (p.row === end.row && p.column <= end.column)
    return afterStart && beforeEnd
  }

  static create(rowStart: number, colStart: number, rowEnd: number, colEnd: number): Range {
    return new Range(new Point(rowStart, colStart), new Point(rowEnd, colEnd))
  }
  static createEmptyRange(): Range {
    return new Range(new Point(0, 0), new Point(0, 0))
  }
}



export class Indent {
  spaces: number
  tabs: number
  text: string
  constructor(text: string) {
    text = text.replace("\r", "")
    this.text = text
    this.tabs = 0
    this.spaces = 0
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " ") {
        this.spaces++
      } else if (text[i] === "\t") {
        this.tabs++
      } else {
        throw new AssertError("Only spaces and tabs allowed as arg.")
      }
    }
  }
}

