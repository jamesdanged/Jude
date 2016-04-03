"use strict"

import {expectNoMoreExpressions} from "./fsaUtils";
import {WholeFileParseState} from "./ModuleContentsFsa";
import {parseModuleContents} from "./ModuleContentsFsa";
import {handleParseErrorOnly} from "./fsaUtils";
import {BaseFsa} from "./fsaUtils";
import {FsaState} from "./fsaUtils";
import {TokenStream} from "../../tokens/TokenStream";
import {ModuleDefNode} from "../../parseTree/nodes";
import {runFsaStartToStop} from "./fsaUtils";
import {IFsaParseState} from "./fsaUtils";
import {streamAtNewLine} from "../../tokens/streamConditions";
import {streamAtComment} from "../../tokens/streamConditions";
import {streamAtIdentifier} from "../../tokens/streamConditions";
import {IdentifierNode} from "../../parseTree/nodes";
import {alwaysPasses} from "../../tokens/streamConditions";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {InvalidParseError} from "../../utils/errors";

class ModuleDefFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let nameState = new FsaState("name")
    let bodyState = new FsaState("body")

    let allStatesExceptStop = [startState, nameState, bodyState]
    // ignore comments and new lines everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    startState.addArc(nameState, streamAtIdentifier, readModuleName)
    nameState.addArc(bodyState, alwaysPasses, readBody)
    bodyState.addArc(stopState, alwaysPasses, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: ModuleDefNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: ModuleDefNode, public wholeState: WholeFileParseState) {
  }
}



function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readModuleName(state: ParseState): void {
  let nameToken = state.ts.read()
  state.nodeToFill.name = new IdentifierNode(nameToken)
}

function readBody(state: ParseState): void {
  parseModuleContents(state.ts, state.nodeToFill, state.wholeState)
}






var fsaModuleDef = new ModuleDefFsa()

export function parseWholeModuleDef(tree: TreeToken, wholeState: WholeFileParseState): ModuleDefNode {
  if (tree.openToken.str !== "module" && tree.openToken.str !== "baremodule") throw new AssertError("")

  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new ModuleDefNode()
  if (tree.openToken.str === "baremodule") {
    node.isBareModule = true
  }
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken

  try {
    fsaModuleDef.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}


