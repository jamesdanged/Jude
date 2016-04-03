"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {TokenStream} from "./../../tokens/TokenStream";
import {IfBlockNode} from "./../../parseTree/nodes";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtElseIf} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtElse} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {MultiExpressionNode} from "./../../parseTree/nodes";
import {last} from "../../utils/arrayUtils";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {WholeFileParseState} from "../general/ModuleContentsFsa";


class IfBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let ifCondition = new FsaState("if condition")
    let ifTrueBlock = new FsaState("if true block")
    let ifTrueBetweenExpressions = new FsaState("if true between expressions")

    let elseIfKeyword = new FsaState("else if keyword")
    let elseIfCondition = new FsaState("else if condition")
    let elseIfBlock = new FsaState("else if block")
    let elseIfBetweenExpressions = new FsaState("else if between expressions")

    let elseKeyword = new FsaState("else keyword")
    let elseBlock = new FsaState("else block")
    let elseBetweenExpressions = new FsaState("else between expressions")

    let allStatesExceptStop = [startState,
      ifCondition, ifTrueBlock, ifTrueBetweenExpressions,
      elseIfKeyword, elseIfCondition, elseIfBlock, elseIfBetweenExpressions,
      elseKeyword, elseBlock, elseBetweenExpressions]

    // ignore comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // ignore newlines everywhere except between expressions
    for (let state of [startState, ifCondition, ifTrueBlock, elseIfKeyword, elseIfCondition, elseIfBlock, elseKeyword, elseBlock]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }
    // ignore semicolons in blocks
    for (let state of [ifTrueBlock, elseIfBlock, elseBlock]) {
      state.addArc(state, streamAtSemicolon, skipOneToken)
    }

    startState.addArc(ifCondition, alwaysPasses, readIfCondtion)
    ifCondition.addArc(ifTrueBlock, alwaysPasses, doNothing)

    ifTrueBlock.addArc(stopState, streamAtEof, doNothing)
    ifTrueBlock.addArc(elseIfKeyword, streamAtElseIf, skipOneToken)
    ifTrueBlock.addArc(elseKeyword, streamAtElse, skipOneToken)
    ifTrueBlock.addArc(ifTrueBetweenExpressions, alwaysPasses, readIfTrueExpression) // otherwise must read an expression

    ifTrueBetweenExpressions.addArc(ifTrueBlock, streamAtNewLineOrSemicolon, skipOneToken) // require delimiters if multiple expressions
    ifTrueBetweenExpressions.addArc(stopState, streamAtEof, doNothing)
    ifTrueBetweenExpressions.addArc(elseIfKeyword, streamAtElseIf, skipOneToken)
    ifTrueBetweenExpressions.addArc(elseKeyword, streamAtElse, skipOneToken)

    elseIfKeyword.addArc(elseIfCondition, alwaysPasses, readElseIfCondition)
    elseIfCondition.addArc(elseIfBlock, alwaysPasses, newElseIfBlock)

    elseIfBlock.addArc(stopState, streamAtEof, doNothing)
    elseIfBlock.addArc(elseIfKeyword, streamAtElseIf, skipOneToken)
    elseIfBlock.addArc(elseKeyword, streamAtElse, skipOneToken)
    elseIfBlock.addArc(elseIfBetweenExpressions, alwaysPasses, readElseIfExpression) // otherwise must read an expression

    elseIfBetweenExpressions.addArc(elseIfBlock, streamAtNewLineOrSemicolon, skipOneToken) // require delimiters if multiple expressions
    elseIfBetweenExpressions.addArc(stopState, streamAtEof, doNothing)
    elseIfBetweenExpressions.addArc(elseIfKeyword, streamAtElseIf, skipOneToken)
    elseIfBetweenExpressions.addArc(elseKeyword, streamAtElse, skipOneToken)

    elseKeyword.addArc(elseBlock, alwaysPasses, newElseBlock)

    elseBlock.addArc(stopState, streamAtEof, doNothing)
    elseBlock.addArc(elseBetweenExpressions, alwaysPasses, readElseExpression) // otherwise must read an expression

    elseBetweenExpressions.addArc(elseBlock, streamAtNewLineOrSemicolon, skipOneToken) // require delimiters if multiple expressions
    elseBetweenExpressions.addArc(stopState, streamAtEof, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: IfBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }


}

class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: IfBlockNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readIfCondtion(state: ParseState): void {
  state.nodeToFill.ifCondition = parseGeneralBlockExpression(state.ts, state.wholeState)
}
function readElseIfCondition(state: ParseState): void {
  state.nodeToFill.elseIfConditions.push(parseGeneralBlockExpression(state.ts, state.wholeState))
}

function newElseIfBlock(state: ParseState): void {
  let elseIfNode = new MultiExpressionNode()
  state.nodeToFill.elseIfBlocks.push(elseIfNode)
}
function newElseBlock(state: ParseState): void {
  let elseNode = new MultiExpressionNode()
  state.nodeToFill.elseBlock = elseNode
}

function readIfTrueExpression(state: ParseState): void {
  let block = state.nodeToFill.ifBlock
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}
function readElseIfExpression(state: ParseState): void {
  let block = last(state.nodeToFill.elseIfBlocks)
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}
function readElseExpression(state: ParseState): void {
  let block = state.nodeToFill.elseBlock
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  block.expressions.push(expr)
}





var fsaIfBlock = new IfBlockFsa()

export function parseWholeIfBlock(ifBlockTree: TreeToken, wholeState: WholeFileParseState): IfBlockNode {
  if (ifBlockTree.openToken.str !== "if") throw new AssertError("")
  let ts = new TokenStream(ifBlockTree.contents, ifBlockTree.openToken)
  let node = new IfBlockNode()

  try {
    fsaIfBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, ifBlockTree.contents, wholeState)
  }
  return node
}
