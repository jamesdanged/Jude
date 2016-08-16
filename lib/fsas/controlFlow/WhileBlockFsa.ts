"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {WhileBlockNode} from "./../../parseTree/nodes";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtEquals} from "./../../tokens/streamConditions";
import {streamAtIn} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {skipParse} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";

class WhileBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let condition = new FsaState("condition")
    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, condition, body, betweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // allow new lines in certain areas
    for (let state of [startState, condition, body]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    startState.addArc(condition, alwaysPasses, readCondition)

    condition.addArc(body, alwaysPasses, doNothing)

    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtSemicolon, skipOneToken)  // can have extra semicolons in body
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression)

    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
  }

  runStartToStop(ts: TokenStream, nodeToFill: WhileBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: WhileBlockNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readCondition(state: ParseState) {
  state.nodeToFill.condition = parseGeneralBlockExpression(state.ts, state.wholeState)
}
function readBodyExpression(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}



var fsaWhileBlock = new WhileBlockFsa()

export function parseWholeWhileBlock(tree: TreeToken, wholeState: WholeFileParseState): WhileBlockNode {
  if (tree.openToken.str !== "while") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new WhileBlockNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, tokens)
    //} else {
    fsaWhileBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
