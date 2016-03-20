"use strict"

import {ExpressionFsa} from "../general/ExpressionFsa";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {DoBlockNode} from "./../../parseTree/nodes";
import {DoBlockArgNode} from "./../../parseTree/nodes";
import {streamAtDoubleColon} from "./../../tokens/streamConditions";
import {streamAtComma} from "./../../tokens/streamConditions";
import {IFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {IdentifierNode} from "../../parseTree/nodes";
import {skipParse} from "../general/fsaUtils";
import {TreeToken} from "../../tokens/Token";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";



class DoBlockFsa implements IFsa {

  startState: FsaState
  stopState: FsaState

  constructor() {

    let startState = new FsaState("start")
    let stopState = new FsaState("stop")
    this.startState = startState
    this.stopState = stopState

    // similar to function definition's arg list, but cannot have default values or keyword args
    let argList = new FsaState("arg list")
    let argName = new FsaState("arg name")
    let argDoubleColon = new FsaState("arg ::")
    let argTypeAnnotation = new FsaState("arg type annotation")
    let argListComma = new FsaState("arg list comma")

    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, argList, argName, argDoubleColon, argTypeAnnotation, argListComma, body, betweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }

    // ignore new lines in certain locations
    for (let state of [argDoubleColon, argListComma, body]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    startState.addArc(argList, alwaysPasses, doNothing)

    // arg list has 0 or more args
    argList.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // end of arg list
    argList.addArc(argName, streamAtIdentifier, readArgName)

    // optional type annotation
    argName.addArc(argDoubleColon, streamAtDoubleColon, skipOneToken)
    argDoubleColon.addArc(argTypeAnnotation, alwaysPasses, readArgTypeExpression)

    // after an arg, can have another arg or go straight to body
    argName.addArc(argListComma, streamAtComma, skipOneToken)
    argName.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // end of arg list
    argTypeAnnotation.addArc(argListComma, streamAtComma, skipOneToken)
    argTypeAnnotation.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)

    // must have another arg after comma
    argListComma.addArc(argName, streamAtIdentifier, readArgName)

    // body can have 0 or more expressions
    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtSemicolon, doNothing)
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression) // otherwise must be an expression

    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter
  }

  runStartToStop(ts: TokenStream, nodeToFill: DoBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  mostRecentArg: DoBlockArgNode
  constructor(public ts: TokenStream, public nodeToFill: DoBlockNode, public wholeState: WholeFileParseState) {
    this.mostRecentArg = null
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readArgName(state: ParseState): void {
  let tok = state.ts.read()
  let arg = new DoBlockArgNode(new IdentifierNode(tok))
  state.mostRecentArg = arg
  state.nodeToFill.argList.push(arg)
}


var fsaDoBlockArgListExpression = null
function readArgTypeExpression(state: ParseState): void {
  if (fsaDoBlockArgListExpression === null) {
    // Used to read expressions within the arg list of a do block.
    // Commas must be treated specially as an escape, not a binary operator.
    // But new lines should not continue an expression (unless after a unary/binary/ternary operator)
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaDoBlockArgListExpression = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentArg === null) throw new AssertError("")
  state.mostRecentArg.type = fsaDoBlockArgListExpression.runStartToStop(state.ts, state.wholeState)
}

function readBodyExpression(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}





var fsaDoBlock = new DoBlockFsa()

export function parseWholeDoBlock(tree: TreeToken, wholeState: WholeFileParseState): DoBlockNode {
  if (tree.openToken.str !== "do") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new DoBlockNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, tokens)
    //} else {
    fsaDoBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
