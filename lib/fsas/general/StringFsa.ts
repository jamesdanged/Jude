"use strict"

import {expectNoMoreExpressions} from "./fsaUtils";
import {WholeFileParseState} from "./ModuleContentsFsa";
import {handleParseErrorOnly} from "./fsaUtils";
import {FsaState} from "./fsaUtils";
import {IFsa} from "./fsaUtils";
import {streamAtComment} from "../../tokens/streamConditions";
import {streamAtNewLine} from "../../tokens/streamConditions";
import {alwaysPasses} from "../../tokens/streamConditions";
import {TokenStream} from "../../tokens/TokenStream";
import {runFsaStartToStop} from "./fsaUtils";
import {IFsaParseState} from "./fsaUtils";
import {InterpolatedStringNode} from "../../parseTree/nodes";
import {streamAtStringLiteral} from "../../tokens/streamConditions";
import {StringLiteralNode} from "../../parseTree/nodes";
import {streamAtInterpolationStart} from "../../tokens/streamConditions";
import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {streamAtIdentifier} from "../../tokens/streamConditions";
import {streamAtEof} from "../../tokens/streamConditions";
import {IdentifierNode} from "../../parseTree/nodes";
import {TreeToken} from "../../tokens/Token";
import {AssertError} from "../../utils/assert";
import {parseGroupingParenthesisExpression} from "./ExpressionFsa";

/**
 * Handles interpolated strings and simple strings.
 * Works for double quoted string and backtick (`) strings.
 */
class StringFsa implements IFsa {

  startState: FsaState
  stopState: FsaState

  constructor() {

    let startState = new FsaState("start")
    let stopState = new FsaState("stop")
    this.startState = startState
    this.stopState = stopState

    let stringLiteral = new FsaState("string literal")
    let dollarSign = new FsaState("$ sign")
    let interpVariable = new FsaState("interpolated variable")
    let interpExpr = new FsaState("interpolated expression")

    startState.addArc(stringLiteral, streamAtStringLiteral, readStringLiteral)
    startState.addArc(dollarSign, streamAtInterpolationStart, skipOneToken)
    startState.addArc(stopState, streamAtEof, doNothing)

    dollarSign.addArc(interpExpr, streamAtOpenParenthesis, readInterpolationExpression)
    dollarSign.addArc(interpVariable, streamAtIdentifier, readInterpolationVariable)

    stringLiteral.addArc(startState, alwaysPasses, doNothing)
    interpExpr.addArc(startState, alwaysPasses, doNothing)
    interpVariable.addArc(startState, alwaysPasses, doNothing)

  }

  /**
   * Only takes an interpolated string node. Caller can convert it to a simple string node if there is only
   * one item in contents.
   *
   */
  runStartToStop(ts: TokenStream, nodeToFill: InterpolatedStringNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: InterpolatedStringNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readStringLiteral(state: ParseState): void {
  let tok = state.ts.read()
  state.nodeToFill.contents.push(new StringLiteralNode(tok))
}

function readInterpolationVariable(state: ParseState): void {
  let tok = state.ts.read()
  state.nodeToFill.contents.push(new IdentifierNode(tok))
}

function readInterpolationExpression(state: ParseState): void {
  let tok = state.ts.read()
  if (tok instanceof TreeToken) {
    let exprNode = parseGroupingParenthesisExpression(tok, state.wholeState)
    state.nodeToFill.contents.push(exprNode)
  } else {
    throw new AssertError("")
  }
}





var fsaStringFsa = new StringFsa()

export function parseString(tree: TreeToken, wholeState: WholeFileParseState): (InterpolatedStringNode | StringLiteralNode) {
  if (tree.openToken.str !== "\"" && tree.openToken.str !== "`") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new InterpolatedStringNode()
  if (tree.openToken.str === "`") node.isBackTick = true

  try {
    fsaStringFsa.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    if (node.contents.length === 1 && node.contents[0] instanceof StringLiteralNode) {
      let strLitNode = node.contents[0] as StringLiteralNode
      strLitNode.isBackTick = node.isBackTick
      return strLitNode
    }
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
