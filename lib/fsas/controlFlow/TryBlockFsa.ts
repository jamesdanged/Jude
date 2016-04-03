"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {TokenStream} from "./../../tokens/TokenStream";
import {TryBlockNode} from "./../../parseTree/nodes";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtCatch} from "./../../tokens/streamConditions";
import {streamAtFinally} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {ScopedMultiExpressionNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {skipParse} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";

class TryBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let tryBody = new FsaState("try body")
    let tryBetweenExpressions = new FsaState("try between expressions")

    let catchKeyword = new FsaState("catch keyword")
    let catchErrorVariable = new FsaState("catch error variable")
    let catchBody = new FsaState("catch body")
    let catchBetweenExpressions = new FsaState("catch between expressions")

    let finallyKeyword = new FsaState("finally keyword")
    let finallyBody = new FsaState("finally body")
    let finallyBetweenExpressions = new FsaState("finally between expressions")

    let allStatesExceptStop = [startState,
      tryBody, tryBetweenExpressions,
      catchKeyword, catchErrorVariable, catchBody, catchBetweenExpressions,
      finallyKeyword, finallyBody, finallyBetweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // allow newlines and ; within bodies
    for (let state of [tryBody, catchBody, finallyBody]) {
      state.addArc(state, streamAtNewLineOrSemicolon, skipOneToken)
    }

    startState.addArc(tryBody, alwaysPasses, doNothing)

    tryBody.addArc(catchKeyword, streamAtCatch, newCatchBlock)
    tryBody.addArc(finallyKeyword, streamAtFinally, newFinallyBlock)
    tryBody.addArc(stopState, streamAtEof, doNothing)
    tryBody.addArc(tryBetweenExpressions, alwaysPasses, readTryBodyExpression) // otherwise must be an expression

    tryBetweenExpressions.addArc(tryBody, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
    tryBetweenExpressions.addArc(catchKeyword, streamAtCatch, newCatchBlock)
    tryBetweenExpressions.addArc(finallyKeyword, streamAtFinally, newFinallyBlock)
    tryBetweenExpressions.addArc(stopState, streamAtEof, doNothing)

    // optional catch error variable
    catchKeyword.addArc(catchErrorVariable, streamAtIdentifier, readCatchErrorVariableName)
    catchErrorVariable.addArc(catchBody, alwaysPasses, doNothing)
    // if no error variable, must insert a semicolon or advance to a new line
    catchKeyword.addArc(catchBody, streamAtNewLineOrSemicolon, skipOneToken)

    catchBody.addArc(finallyKeyword, streamAtFinally, newFinallyBlock)
    catchBody.addArc(stopState, streamAtEof, doNothing)
    catchBody.addArc(catchBetweenExpressions, alwaysPasses, readCatchBodyExpression) // otherwise must be an expression

    catchBetweenExpressions.addArc(catchBody, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
    catchBetweenExpressions.addArc(finallyKeyword, streamAtFinally, newFinallyBlock)
    catchBetweenExpressions.addArc(stopState, streamAtEof, doNothing)

    finallyKeyword.addArc(finallyBody, alwaysPasses, doNothing)

    finallyBody.addArc(stopState, streamAtEof, doNothing)
    finallyBody.addArc(finallyBetweenExpressions, alwaysPasses, readFinallyBodyExpression) // otherwise must be an expression

    finallyBetweenExpressions.addArc(finallyBody, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
    finallyBetweenExpressions.addArc(stopState, streamAtEof, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: TryBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }


}


class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: TryBlockNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function newCatchBlock(state: ParseState): void {
  let catchToken = state.ts.read()
  state.nodeToFill.tryBlock.scopeEndToken = catchToken
  state.nodeToFill.catchBlock = new ScopedMultiExpressionNode()
  state.nodeToFill.catchBlock.scopeStartToken = catchToken
}

function newFinallyBlock(state: ParseState): void {
  let finallyToken = state.ts.read()
  if (state.nodeToFill.catchBlock === null) {
    state.nodeToFill.tryBlock.scopeEndToken = finallyToken
  } else {
    state.nodeToFill.catchBlock.scopeEndToken = finallyToken
  }
  state.nodeToFill.finallyBlock = new ScopedMultiExpressionNode()
  state.nodeToFill.finallyBlock.scopeStartToken = finallyToken
}

function readTryBodyExpression(state: ParseState): void {
  let block = state.nodeToFill.tryBlock
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}
function readCatchBodyExpression(state: ParseState): void {
  let block = state.nodeToFill.catchBlock
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}
function readFinallyBodyExpression(state: ParseState): void {
  let block = state.nodeToFill.finallyBlock
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}

function readCatchErrorVariableName(state: ParseState): void {
  let tok = state.ts.read()
  state.nodeToFill.catchErrorVariable = new IdentifierNode(tok)
}




var fsaTryBlock = new TryBlockFsa()

export function parseWholeTryBlock(tree: TreeToken, wholeState: WholeFileParseState): TryBlockNode {
  if (tree.openToken.str !== "try") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new TryBlockNode()
  node.tryBlock.scopeStartToken = tree.openToken

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, tokens)
    //} else {
    fsaTryBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    if (node.finallyBlock !== null) {
      node.finallyBlock.scopeEndToken = tree.closeToken
    } else if (node.catchBlock !== null) {
      node.catchBlock.scopeEndToken = tree.closeToken
    } else {
      node.tryBlock.scopeEndToken = tree.closeToken
    }
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
