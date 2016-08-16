"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {ParenthesesNode, EmptyTupleNode} from "./../../parseTree/nodes";
import {Node} from "../../parseTree/nodes"
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";
import {ExpressionFsa} from "../general/ExpressionFsa"

class ParenthesesFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let expressions = new FsaState("expressions")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, expressions, betweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }

    startState.addArc(expressions, alwaysPasses, doNothing)

    // 0 or more expressions
    // empty paren is an empty tuple
    expressions.addArc(stopState, streamAtEof, doNothing)

    // one or more expressions separated by semicolon
    expressions.addArc(betweenExpressions, alwaysPasses, readExpression)
    expressions.addArc(expressions, streamAtSemicolon, skipOneToken) // skip extra ';'

    // require semicolons if there are more than 1 expressions
    betweenExpressions.addArc(expressions, streamAtSemicolon, skipOneToken)
    betweenExpressions.addArc(stopState, streamAtEof, doNothing)

  }

  runStartToStop(ts: TokenStream, nodeToFill: ParenthesesNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: ParenthesesNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readExpression(state: ParseState): void {
  let node = parseExpressionWithinParentheses(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(node)
}





var fsaExpressionWithinParentheses = null   // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function parseExpressionWithinParentheses(ts: TokenStream, wholeState: WholeFileParseState): Node {
  if (fsaExpressionWithinParentheses == null) {
    // the expression can have "\n"
    // only ";" will separate multiple expressions
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaOptions.allowSplat = true
    fsaExpressionWithinParentheses = new ExpressionFsa(fsaOptions)
  }
  return fsaExpressionWithinParentheses.runStartToStop(ts, wholeState)
}


var fsaParentheses = new ParenthesesFsa()

export function parseGroupingParentheses(parenTree: TreeToken, wholeState: WholeFileParseState): Node {
  // handles arithmetic expression grouping
  //   eg (a + b) * c
  // as well as tuples
  //   since "," is treated simply as a binary operator
  // as well as multiple semicolon delimited statements

  if (parenTree.openToken.str !== "(") throw new AssertError("")
  let ts = new TokenStream(parenTree.contents, parenTree.openToken)
  let node = new ParenthesesNode()

  try {
    fsaParentheses.runStartToStop(ts, node, wholeState)

    if (node.expressions.length == 0) {
      return new EmptyTupleNode()
    }
    expectNoMoreExpressions(ts)

  } catch (err) {
    handleParseErrorOnly(err, node, parenTree.contents, wholeState)
  }
  return node
}


