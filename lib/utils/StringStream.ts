"use strict"

import {AssertError} from "./assert";
import {Point} from "./../tokens/Token";

export class StringStream {
  private _str: string
  private _pos: number
  private _row: number   // 0 based
  private _col: number   // 0 based

  constructor(str: string) {
    if (str === null || str === undefined) throw new AssertError("Cannot be null or undefined")
    this._str = str
    this._pos = 0
    this._row = 0
    this._col = 0
  }

  get pos(): number { return this._pos }
  get str(): string { return this._str }


  /**
   * The 0 based row index corresponding to where the stream is now,
   * ie the next character to read's coordinates.
   *
   * Row and col assume the string started at 0,0 and is not some substring.
   */
  get row(): number { return this._row }

  /**
   * The 0 based col index corresponding to the where the stream is now,
   * ie the next character to read's coordinates.
   *
   * TODO handle characters that don't consume width, such as \r or multi-codepoint runes
   */
  get col(): number { return this._col }


  currPoint(): Point { return new Point(this.row, this.col) }
  prevPoint(): Point {
    if (this.bof()) throw new AssertError("Already BOF.")
    let prevChar = this._str[this._pos - 1]
    if (prevChar === "\n") {
      let row = this.row - 1
      let col = this._numCharsOnRowEndingAt(this._pos - 1) + 1 // num chars + \n
      return new Point(row, col)
    } else {
      return new Point(this.row, this.col - 1)
    }
  }


  /**
   * Read a single character. Moves forward one.
   *
   * @returns {string}
   */
  read(): string {
    if (this.eof()) throw new AssertError("End of string")

    var c = this._str[this._pos]
    this._pos += 1

    if (c === "\n") {
      this._row += 1
      this._col = 0
    } else {
      this._col += 1
    }

    return c
  }

  /**
   * Returns the next character, but does not move forward a position.
   */
  peek(): string {
    if (this.eof()) throw new AssertError("End of string")
    return this._str[this._pos]
  }

  /**
   * Returns the next X characters, without moving the cursor.
   * If less than X before eof, returns null.
   */
  peekUpToX(x: number): string {
    if (this._str.length - this._pos < x) return null
    return this._str.slice(this._pos, this._pos + x)
  }

  /**
   * Move back a character.
   */
  unread(): void {
    if (this.bof()) throw new AssertError("Already at beginning")
    this._pos -= 1

    let c = this.peek()
    if (c === "\n") {
      this._row -= 1
      this._col = this._numCharsOnRowEndingAt(this._pos) // ie if line is 'abcd' then 4 will be \n index
    } else {
      this._col -= 1
    }

  }

  /**
   * Reads until encounters a character that satisfies the condition (until callback returns true).
   *
   * @returns String with everything read except the character that satisfied the condition.
   */
  readUntil(terminatingCondition: (string) => boolean): string {
    var s = ""
    while (!this.eof()) {
      var c = this.read()
      if (terminatingCondition(c)) {
        this.unread()
        break
      }
      s = s + c
    }
    return s
  }

  readWhile(continuingCondition: (string) => boolean): string {
    var s = ""
    while (!this.eof()) {
      var c = this.read()
      if (!continuingCondition(c)) {
        this.unread()
        break
      }
      s = s + c
    }
    return s
  }


  /**
   * Seeks first character that satisfies the condition.
   *
   * @returns {string} Matching character or empty string if no match found.
   */
  seek(condition: (string) => boolean) : string {
    while (!this.eof()) {
      var c = this.read()
      if (condition(c)) {
        return c
      }
    }
    return ""
  }

  eof() : boolean {
    return this._pos >= this._str.length
  }

  bof() : boolean {
    return this._pos === 0
  }

  /**
   * For error reporting, gets around 10 characters before and after current point.
   */
  getContext(): string {
    let start = this._pos - 10
    let stop = this._pos + 10
    if (start < 0) start = 0
    if (stop > this._str.length) stop = this._str.length
    return this._str.slice(start, stop)
  }

  /**
   * Calculate number of characters in this row excluding newline.
   * Assumes we are at \n at end of the row.
   *
   * @param newlinePos Index of position of \n that is at the end of the row.
   */
  private _numCharsOnRowEndingAt(newlinePos: number): number {
    let numCharsInRow = 0
    for (let idx = newlinePos - 1; idx >= 0; idx--) {
      let cPeekBack = this._str[idx]
      if (cPeekBack === "\n") {
        break
      } else {
        numCharsInRow++
      }
    }
    return numCharsInRow
  }
}

