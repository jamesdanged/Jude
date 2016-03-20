"use strict"

import {AssertError} from "../utils/assert";
import {TokenStream} from "./../tokens/TokenStream";
import {Node} from "./nodes";
import {keywordsNeedEnd} from "./../tokens/operatorsAndKeywords";
import {AssertionError} from "assert";
import {InvalidParseError} from "./../utils/errors";
import {TokenType} from "./../tokens/operatorsAndKeywords";
import {Token} from "./../tokens/Token";
import {TreeToken} from "./../tokens/Token";
import {Indent} from "../tokens/Token";
import {Point} from "../tokens/Token";
import {Range} from "../tokens/Token";
import {last} from "../utils/arrayUtils";


/**
 * Runs a partial parse of the token sequence, merely
 * grouping tokens within
 *  brackets () [] {}
 *  quotes "" '' ``
 *  and various xxx...end blocks
 */
export class BracketGrouper {
  ts: TokenStream
  openTokenStack: Token[]
  errors: InvalidParseError[]
  tree: Token[]

  constructor() {
    this.ts = null
    this.openTokenStack = null
    this.errors = null
    this.tree = null
  }

  /**
   * If any open token fails to close, there will be parse errors stored in 'errors'.
   */
  runGrouping(ts: TokenStream): void {
    this.ts = ts
    this.tree = []
    this.errors = []
    this.openTokenStack = []
    this.openTokenStack.push(null) // null will be placeholder for the outermost node, which has no open/close bracket

    try {
      this._buildSubTree(null, this.tree)
      return
    } catch (err) {
      if (err instanceof InvalidParseError) {
        this.errors.push(err)
        return
      } else {
        throw err
      }
    }
  }

  /**
   * @param parentOpenToken  Can be null for top level.
   * @param children  Array to populate with the children of the given parent.
   */
  _buildSubTree(parentOpenToken: Token, children: Token[]): void {
    let ts = this.ts
    //let children: Token[] = []

    while (!ts.eof()) {
      // read contents
      let token = ts.read()

      if (isOpenToken(token)) {

        if (token.type === TokenType.Keyword && token.str === "for" && parentOpenToken !== null && parentOpenToken.str === "[") {
          // for inside brackets indicates a list comprehension
          // not a for...end block
          children.push(token)
          continue
        }

        if (token.type === TokenType.Quote && isOpenCloseMatch(parentOpenToken, token)) {
          // actually is a close
          ts.unread()
          return
        }

        // create a new sub tree and populate recursively for everything up to the matching close
        let innerTree = new TreeToken(token)
        children.push(innerTree)

        this.openTokenStack.push(token)
        this._buildSubTree(token, innerTree.contents)
        this.openTokenStack.pop()

        // get the close token
        if (ts.eof()) throw new InvalidParseError("Failed to find close token before EOF", parentOpenToken)
        innerTree.closeToken = ts.read()

        continue
      }

      if (isCloseToken(token)) {

        // If we are inside [] then the keyword 'end' no longer counts as a close
        if (token.type === TokenType.Keyword && token.str === "end" && this.endCountsAsIndex()) {
          // alter the token so it now counts as an identifier. Name resolution will have to handle it specially.
          token.type = TokenType.Identifier
          children.push(token)
          continue
        }

        if (!isOpenCloseMatch(parentOpenToken, token)) {
          if (parentOpenToken === null) {
            throw new InvalidParseError("Unexpected close: '" + token.str +
              "'. Context: '..." + ts.getContext() + "...'", token)
          } else {
            throw new InvalidParseError("Expected to close: '" + parentOpenToken.str + "' but found: '" + token.str +
              "'. Context: '..." + ts.getContext() + "...'", parentOpenToken)
          }
        }

        // is the correct closing token
        // end recursion
        ts.unread()
        return
      }

      children.push(token)
    }

    // reached EOF without a close token
    // OK if top level
    if (parentOpenToken === null) {
      return
    }
    throw new InvalidParseError("Failed to find close token before EOF", parentOpenToken)
  }

  /**
   * The keyword 'end' actually can be used as an indexing arg, eg arr[1:end].
   *
   * True if we are inside [] (immediate parent or distant parent)
   * but not inside any xxx...end block.
   * Can be inside (), such as arr[1:(end-1)]
   */
  endCountsAsIndex(): boolean {
    if (this.openTokenStack.length === 1) return false  // only null is on stack
    for (let i = this.openTokenStack.length - 1; i >= 0; i--) {
      let tok = this.openTokenStack[i]
      if (tok.str === "(") {
        continue
      }
      if (tok.str === "[") {
        return true
      }
      return false
    }
    return false
  }

  static groupIntoOneThrowIfError(tokens: Token[]): TreeToken {
    let tokenMinus1 = new Token("", TokenType.LineWhiteSpace, new Range(new Point(0, 0), new Point(0, 1)), new Indent(""))
    let tokenStream = new TokenStream(tokens, tokenMinus1)
    let treeBuilder = new BracketGrouper()
    treeBuilder.runGrouping(tokenStream)
    if (treeBuilder.errors.length > 0) throw new AssertError(treeBuilder.errors[0].message)
    if (treeBuilder.tree.length !== 1) throw new AssertError("")
    return treeBuilder.tree[0] as TreeToken
  }
}



// helper functions

function isOpenToken(token: Token): boolean {
  return (token.type === TokenType.Bracket && (token.str === "(" || token.str === "[" || token.str === "{")) ||
    (token.type === TokenType.Quote) ||
    (token.type === TokenType.Keyword && (token.str in keywordsNeedEnd))
}

function isCloseToken(token: Token): boolean {
  return (token.type === TokenType.Bracket && (token.str === ")" || token.str === "]" || token.str === "}")) ||
    (token.type === TokenType.Quote) ||
    (token.type === TokenType.Keyword && token.str === "end")
}

function isOpenCloseMatch(openToken: Token, closeToken: Token) : boolean {
  if (openToken === null) return false
  if (openToken.type === TokenType.Bracket && closeToken.type === TokenType.Bracket) { // possible that ( is a string literal
    if (openToken.str === "(" && closeToken.str === ")") return true
    if (openToken.str === "[" && closeToken.str === "]") return true
    if (openToken.str === "{" && closeToken.str === "}") return true
  }
  if (openToken.type === TokenType.Quote && closeToken.type === TokenType.Quote) {
    if (openToken.str === "\"" && closeToken.str === "\"") return true
    if (openToken.str === "'" && closeToken.str === "'") return true
    if (openToken.str === "`" && closeToken.str === "`") return true
  }
  if (openToken.type === TokenType.Keyword && closeToken.type == TokenType.Keyword) {
    if ((openToken.str in keywordsNeedEnd) && closeToken.str === "end") {
      return true
    }
  }
  return false
}
