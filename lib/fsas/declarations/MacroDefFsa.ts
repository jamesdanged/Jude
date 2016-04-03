"use strict"

import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {MacroDefNode} from "../../parseTree/nodes";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {parseGenericDefArgList} from "./GenericDefArgListFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TokenStream} from "./../../tokens/TokenStream";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtOpenCurlyBraces} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {FieldNode} from "./../../parseTree/nodes";
import {streamAtDoubleColon} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {IdentifierNode} from "../../parseTree/nodes";
import {TreeToken} from "../../tokens/Token";
import {streamAtLessThanColon} from "../../tokens/streamConditions";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {InvalidParseError} from "../../utils/errors";

/**
 * Recognizes the body of a macro...end declaration.
 *
 * Not fully implemented. Just stores everything inside the node.
 */
class MacroDefFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let macroName = new FsaState("macro name")
    let argList = new FsaState("arg list")
    let body = new FsaState("body")

    let allStatesExceptStop = [startState, macroName, argList, body]

    // ignore comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }

    startState.addArc(macroName, streamAtIdentifier, readMacroName)
    macroName.addArc(argList, streamAtOpenParenthesis, readArgList)
    argList.addArc(body, alwaysPasses, doNothing)
    body.addArc(stopState, alwaysPasses, doNothing)  // simply discard the macro body contents for now
  }

}


class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: MacroDefNode, public wholeState: WholeFileParseState) {
  }
}


function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readMacroName(state: ParseState): void {
  let tok = state.ts.read()
  state.nodeToFill.name = new IdentifierNode(tok)
}

function readArgList(state: ParseState): void {
  let tree = state.ts.read() as TreeToken
  // just discard
}




var fsaMacroDef = new MacroDefFsa()

export function parseWholeMacroDef(tree: TreeToken, wholeState: WholeFileParseState): MacroDefNode {
  let ts = new TokenStream(tree.contents, tree.openToken)
  let node = new MacroDefNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken
  let parseState = new ParseState(ts, node, wholeState)
  try {
    runFsaStartToStop(fsaMacroDef, parseState)
  } catch (err) {
    handleParseErrorOnly(err, node, tree.contents, wholeState)
  }
  return node

}
