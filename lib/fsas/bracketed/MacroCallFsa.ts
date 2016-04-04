"use strict"

import {AssertError} from "../../utils/assert";
import {streamAtNewLine} from "../../tokens/streamConditions";
import {streamAtMacroWithSpace} from "../../tokens/streamConditions";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";
import {WholeFileParseState} from "./../general/ModuleContentsFsa";
import {streamAtMacroIdentifier} from "../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {MacroInvocationNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {TreeToken} from "../../tokens/Token";
import {streamAtComma} from "../../tokens/streamConditions";
import {parseGeneralBlockExpression} from "./../general/ExpressionFsa";
import {ExpressionFsa} from "../general/ExpressionFsa";
import {streamAtMacroWithoutSpace} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";


/**
 * Parses a macro invocation.
 */
class MacroCallFsa extends BaseFsa {

  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let macroNameWithSpace = new FsaState("macro name with space")
    let macroNameWithoutSpace = new FsaState("macro name without space")

    let spaceDelimitedArgList  = new FsaState("space delimited arg list")
    let commaDelimitedArgList = new FsaState("comma delimited arg list")

    // space delimited
    startState.addArc(macroNameWithSpace, streamAtMacroWithSpace, readMacroName)
    macroNameWithSpace.addArc(spaceDelimitedArgList, alwaysPasses, doNothing)
    // spaces were already removed from stream, so just keep reading expressions until end of line or ;
    spaceDelimitedArgList.addArc(stopState, streamAtNewLineOrSemicolon, doNothing)
    spaceDelimitedArgList.addArc(stopState, streamAtComment, doNothing)
    spaceDelimitedArgList.addArc(spaceDelimitedArgList, alwaysPasses, readSpaceDelimitedArg)

    // comma delimited
    startState.addArc(macroNameWithoutSpace, streamAtMacroWithoutSpace, readMacroName)
    macroNameWithoutSpace.addArc(commaDelimitedArgList, streamAtOpenParenthesis, readCommaArgList)
    commaDelimitedArgList.addArc(stopState, alwaysPasses, doNothing)

  }

  runStartToStop(ts: TokenStream, nodeToFill: MacroInvocationNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}

class MacroCommaArgListFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let commaDelimitedArg = new FsaState("comma delimited arg")
    let comma = new FsaState("comma")

    for (let state of [comma, commaDelimitedArg]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    // 0 or more args
    startState.addArc(stopState, streamAtEof, doNothing)
    startState.addArc(commaDelimitedArg, alwaysPasses, readCommaDelimitedArg)
    // must have comma to continue list
    commaDelimitedArg.addArc(stopState, streamAtEof, doNothing)
    commaDelimitedArg.addArc(comma, streamAtComma, skipOneToken)
    // must have arg after a comma
    comma.addArc(commaDelimitedArg, alwaysPasses, readCommaDelimitedArg)
  }

  runStartToStop(ts:TokenStream, nodeToFill: MacroInvocationNode, wholeState: WholeFileParseState): void {
    let state = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, state)
  }
}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, // note the stream will get switched to another stream if comma delimited list of args
              public nodeToFill: MacroInvocationNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }
function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readMacroName(state: ParseState) {
  let tok = state.ts.read()
  state.nodeToFill.name = new IdentifierNode(tok)
}

function readCommaArgList(state: ParseState) {
  let tokenTree = state.ts.read() as TreeToken
  parseCommaArgList(tokenTree, state.nodeToFill, state.wholeState)
}

var fsaMacroCallExpressions = null // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readCommaDelimitedArg(state: ParseState) {
  if (fsaMacroCallExpressions === null) {
    // Used to read expressions within a function call body
    // commas must be treated specially as an escape, not a binary operator
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaOptions.allowSplat = true
    fsaMacroCallExpressions = new ExpressionFsa(fsaOptions)
  }
  let expr = fsaMacroCallExpressions.runStartToStop(state.ts, state.wholeState)
  state.nodeToFill.params.push(expr)
}

function readSpaceDelimitedArg(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.params.push(expr)
}









var fsaMacroCall = new MacroCallFsa()

/**
 *
 * @param ts Stream should be scrolled back to be at the macro name.
 * @param wholeState
 */
export function parseMacroCall(ts: TokenStream, wholeState: WholeFileParseState): MacroInvocationNode {
  // TODO catch parse errors if the macro was invoked with parentheses
  // may even be able to catch parse errors if macro invoked with space delimited params
  // Just keep reading expressions until end of line
  let node = new MacroInvocationNode()
  fsaMacroCall.runStartToStop(ts, node, wholeState)
  return node
}



var fsaMacroCommaArgList = new MacroCommaArgListFsa()
export function parseCommaArgList(bracketTree: TreeToken, node: MacroInvocationNode, wholeState: WholeFileParseState): void {
  if (bracketTree.openToken.str !== "(") throw new AssertError("")
  let ts = new TokenStream(bracketTree.contents, bracketTree.openToken)

  try {
    fsaMacroCommaArgList.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, bracketTree.contents, wholeState)
  }
}
