"use strict"

import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {TreeToken} from "../../tokens/Token";
import {AssertError} from "../../utils/assert";
import {TokenStream} from "./../../tokens/TokenStream";
import {TokenType} from "./../../tokens/operatorsAndKeywords";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtComma} from "./../../tokens/streamConditions";
import {streamAtIdentifierEquals} from "./../../tokens/lookAheadStreamConditions";
import {streamAtEquals} from "./../../tokens/streamConditions";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {parseIntoTreeByOrderOfOperations} from "./../../parseTree/orderOfOperations";
import {Node} from "./../../parseTree/nodes"
import {FunctionCallNode} from "./../../parseTree/nodes";
import {streamAtComment} from "./../../tokens/streamConditions";
import {BaseFsa} from "./../general/fsaUtils";
import {FsaState} from "./../general/fsaUtils";
import {runFsaStartToStop} from "./../general/fsaUtils";
import {IFsaParseState} from "./../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {ExpressionFsa} from "../general/ExpressionFsa";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";


/**
 * A automaton that recognizes the contents within the parentheses of a function invocation,
 * eg  foo(param1, param2, ...)
 */
class FunctionCallFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let orderedArgExpression = new FsaState("ordered arg")
    let orderedArgComma = new FsaState("ordered arg comma")
    let semicolonState = new FsaState("semicolon")
    let keywordArg = new FsaState("keyword arg")
    let keywordArgComma = new FsaState("keyword arg comma")

    let allStatesExceptStop = [startState, orderedArgExpression, orderedArgComma, semicolonState, keywordArg,
      keywordArgComma]

    // add loops to ignore new lines and comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtNewLine, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }

    // can start with nothing (no params), a semicolon, a keyword arg, or an ordered arg
    startState.addArc(stopState, streamAtEof, doNothing)  // passes if EOF
    startState.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    startState.addArc(keywordArg, streamAtIdentifierEquals, readKeywordArg)
    startState.addArc(orderedArgExpression, alwaysPasses, readOrderedArg)  // add this one last as its condition always passes

    // after an ordered arg, can have
    //   a comma and another arg
    //   a semicolon
    //   end
    orderedArgExpression.addArc(orderedArgComma, streamAtComma, skipOneToken)
    orderedArgExpression.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    orderedArgExpression.addArc(stopState, streamAtEof, doNothing)

    orderedArgComma.addArc(stopState, streamAtEof, doNothing)  // , can be dangling at end
    orderedArgComma.addArc(keywordArg, streamAtIdentifierEquals, readKeywordArg) // ; is optional in function calls. Required in function defs.
    orderedArgComma.addArc(orderedArgExpression, alwaysPasses, readOrderedArg) // add this one last as its condition always passes

    // after semicolon, can have a keyword arg or EOF
    semicolonState.addArc(keywordArg, streamAtIdentifierEquals, readKeywordArg)
    semicolonState.addArc(stopState, streamAtEof, doNothing)

    // after a keyword arg, can have
    //   a comma and another keyword arg
    //   end
    keywordArg.addArc(keywordArgComma, streamAtComma, skipOneToken)
    keywordArg.addArc(stopState, streamAtEof, doNothing)

    keywordArgComma.addArc(stopState, streamAtEof, doNothing)
    keywordArgComma.addArc(keywordArg, streamAtIdentifierEquals, readKeywordArg )

  }

  runStartToStop(ts:TokenStream, nodeToFill: FunctionCallNode, wholeState: WholeFileParseState): void {
    let state = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, state)
  }


}

class ParseState implements IFsaParseState {
  mostRecentKeyword: string
  streamStartIndex: number

  constructor(public ts: TokenStream, public nodeToFill: FunctionCallNode, public wholeState: WholeFileParseState) {
    this.streamStartIndex = ts.index
    this.mostRecentKeyword = null
  }
}


function doNothing(state: ParseState): void {}

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readOrderedArg(state: ParseState): void {
  let paramValue = readExpression(state)
  state.nodeToFill.orderedArgs.push(paramValue)
}

function readKeywordArg(state: ParseState): void {
  let idToken = state.ts.readNonNewLine()
  if (idToken.type != TokenType.Identifier) throw new AssertError("")
  let paramName = idToken.str

  let equalsToken = state.ts.readNonNewLine()
  if (equalsToken.str != "=") throw new AssertError("")

  let paramValue = readExpression(state)
  state.nodeToFill.keywordArgs.push([paramName, paramValue])
}


var fsaFunctionCallExpressions = null // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readExpression(state: ParseState): Node {
  if (fsaFunctionCallExpressions === null) {
    // Used to read expressions within a function call body
    // commas must be treated specially as an escape, not a binary operator
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaOptions.allowSplat = true
    fsaOptions.allowSingleColon = true
    fsaFunctionCallExpressions = new ExpressionFsa(fsaOptions)
  }

  return fsaFunctionCallExpressions.runStartToStop(state.ts, state.wholeState)
}












var fsaFunctionCall = new FunctionCallFsa()
export function parseFunctionCallArgs(parenTree: TreeToken, wholeState: WholeFileParseState): FunctionCallNode {
  if (parenTree.openToken.str !== "(") throw new AssertError("")
  let ts = new TokenStream(parenTree.contents, parenTree.openToken)
  let node = new FunctionCallNode()

  try {
    fsaFunctionCall.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, parenTree.contents, wholeState)
  }
  return node
}

