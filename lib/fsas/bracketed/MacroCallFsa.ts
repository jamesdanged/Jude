"use strict"

import {streamAtMacroWithSpace} from "../../tokens/streamConditions";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";
import {WholeFileParseState} from "./../general/ModuleContentsFsa";
import {streamAtMacroIdentifier} from "../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {IFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {MacroInvocationNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {TreeToken} from "../../tokens/Token";
import {FunctionCallNode} from "../../parseTree/nodes";
import {streamAtComma} from "../../tokens/streamConditions";
import {parseGeneralBlockExpression} from "./../general/ExpressionFsa";
import {ExpressionFsa} from "../general/ExpressionFsa";
import {streamAtMacroWithoutSpace} from "../../tokens/streamConditions";


/**
 * Parses a macro invocation.
 *
 * Since we removed all spaces except \n from the token stream, we introduce the possibility of misparsing
 * the macro invocation. ie
 *
 *   @sprintf("%d", 5)
 *   @sprintf ("%d, 5)  <-- this should be treated as a single argument
 *
 * But without redoing everything to handle whitespace everywhere, we can just ignore this rare issue for now.
 * People rarely will use the space delimited form with multiple arguments with the first argument in parentheses.
 */
class MacroCallFsa implements IFsa {

  startState: FsaState
  stopState: FsaState

  constructor() {

    let startState = new FsaState("start")
    let stopState = new FsaState("stop")
    this.startState = startState
    this.stopState = stopState

    let macroNameWithSpace = new FsaState("macro name with space")
    let macroNameWithoutSpace = new FsaState("macro name without space")

    let spaceDelimitedArgList  = new FsaState("space delimited arg list")

    let commaDelimitedArgList = new FsaState("comma delimited arg list")
    let commaDelimitedArg = new FsaState("comma delimited arg")

    let comma = new FsaState("comma")

    // space delimited
    startState.addArc(macroNameWithSpace, streamAtMacroWithSpace, readMacroName)
    macroNameWithSpace.addArc(spaceDelimitedArgList, alwaysPasses, doNothing)
    // spaces were already removed from stream, so just keep reading expressions until end of line or ;
    spaceDelimitedArgList.addArc(stopState, streamAtNewLineOrSemicolon, doNothing)
    spaceDelimitedArgList.addArc(stopState, streamAtComment, doNothing)
    spaceDelimitedArgList.addArc(spaceDelimitedArgList, alwaysPasses, readSpaceDelimitedArg)

    // comma delimited
    startState.addArc(macroNameWithoutSpace, streamAtMacroWithoutSpace, readMacroName)
    macroNameWithoutSpace.addArc(commaDelimitedArgList, streamAtOpenParenthesis, switchToParenStream)
    // 0 or more args
    commaDelimitedArgList.addArc(stopState, streamAtEof, doNothing)
    commaDelimitedArgList.addArc(commaDelimitedArg, alwaysPasses, readCommaDelimitedArg)
    // must have comma to continue list
    commaDelimitedArg.addArc(stopState, streamAtEof, doNothing)
    commaDelimitedArg.addArc(comma, streamAtComma, skipOneToken)
    // must have arg after a comma
    comma.addArc(commaDelimitedArg, alwaysPasses, readCommaDelimitedArg)


  }

  runStartToStop(ts: TokenStream, nodeToFill: MacroInvocationNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
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

function switchToParenStream(state: ParseState) {
  let tokenTree = state.ts.read() as TreeToken
  state.ts = new TokenStream(tokenTree.contents, tokenTree.openToken)
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
