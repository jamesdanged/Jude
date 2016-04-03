"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {TreeToken} from "../../tokens/Token";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {BeginBlockNode} from "./../../parseTree/nodes";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";

class BeginBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, body, betweenExpressions]

    // skip comments
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }

    startState.addArc(body, alwaysPasses, doNothing)

    body.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)
    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression) // otherwise must be an expression

    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: BeginBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: BeginBlockNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}
function readBodyExpression(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}





var fsaBeginBlock = new BeginBlockFsa()

export function parseWholeBeginBlock(beginBlockTree: TreeToken, wholeState: WholeFileParseState): BeginBlockNode {
  if (beginBlockTree.openToken.str !== "begin") throw new AssertError("")
  let ts = new TokenStream(beginBlockTree.contents, beginBlockTree.openToken)
  let node = new BeginBlockNode()

  try {
    fsaBeginBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, beginBlockTree.contents, wholeState)
  }
  return node
}
