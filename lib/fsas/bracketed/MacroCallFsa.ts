"use strict"

import {streamAtLineWhitespace} from "../../tokens/streamConditions";
import {runFsaStartToStopAllowWhitespace} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {streamAtNewLine} from "../../tokens/streamConditions";
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
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {streamAtIdentifier} from "../../tokens/streamConditions";
import {streamAtDot} from "../../tokens/streamConditions";


/**
 * Parses a macro invocation.
 */
class MacroCallFsa extends BaseFsa {

  constructor() {
    super()
    let start = this.startState
    let stop = this.stopState

    // for @Base.time
    // or @time
    let firstNameWithAt = new FsaState("first name with @")
    let suffix = new FsaState("suffix")  // no names should have @
    let dotSuffix = new FsaState(". suffix")

    // for Base.@time
    let prefix = new FsaState("prefix") // no names should have @
    let dotPrefix = new FsaState(". prefix")
    let lastNameWithAt = new FsaState("last name with @")

    let space = new FsaState("space")
    let spaceDelimitedArg  = new FsaState("space delimited arg")

    let commaDelimitedArgList = new FsaState("comma delimited arg list")

    start.addArc(firstNameWithAt, streamAtMacroIdentifier, readMacroNamePart)
    firstNameWithAt.addArc(dotSuffix, streamAtDot, skipOneToken)
    dotSuffix.addArc(suffix, streamAtIdentifier, readMacroNamePart)
    suffix.addArc(dotSuffix, streamAtDot, skipOneToken)

    start.addArc(prefix, streamAtIdentifier, readMacroNamePart)
    prefix.addArc(dotPrefix, streamAtDot, skipOneToken)
    dotPrefix.addArc(prefix, streamAtIdentifier, readMacroNamePart)
    dotPrefix.addArc(lastNameWithAt, streamAtMacroIdentifier, readMacroNamePart)

    // valid name ending states
    for (let state of [firstNameWithAt, suffix, lastNameWithAt]) {
      // start a space delimited arg list
      state.addArc(space, streamAtLineWhitespace, skipOneToken)
      // start a comma delimited arg list
      state.addArc(commaDelimitedArgList, streamAtOpenParenthesis, readCommaArgList)
      // no args nor parentheses before new line
      state.addArc(stop, streamAtNewLineOrSemicolon, doNothing)
      state.addArc(stop, streamAtComment, doNothing)
      state.addArc(stop, streamAtEof, doNothing)
    }

    // handle space delimited arg list
    space.addArc(stop, streamAtNewLineOrSemicolon, doNothing)
    space.addArc(stop, streamAtComment, doNothing)
    space.addArc(spaceDelimitedArg, alwaysPasses, readSpaceDelimitedArg)
    // reading expressions for space delimited args will already skip past spaces
    // so don't need to specifically require a space between args
    spaceDelimitedArg.addArc(stop, streamAtNewLineOrSemicolon, doNothing)
    spaceDelimitedArg.addArc(stop, streamAtComment, doNothing)
    spaceDelimitedArg.addArc(spaceDelimitedArg, alwaysPasses, readSpaceDelimitedArg)

    // handle comma delimited arg list
    commaDelimitedArgList.addArc(stop, alwaysPasses, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: MacroInvocationNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStopAllowWhitespace(this, parseState)
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

function readMacroNamePart(state: ParseState) {
  let tok = state.ts.read()
  state.nodeToFill.name.push(new IdentifierNode(tok))
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
