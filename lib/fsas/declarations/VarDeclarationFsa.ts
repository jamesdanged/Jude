"use strict"

import {ExpressionFsa} from "../general/ExpressionFsa";
import {streamAtDoubleColon} from "../../tokens/streamConditions";
import {NameDeclType} from "../../nameResolution/Resolve";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {TreeToken} from "../../tokens/Token";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {BeginBlockNode} from "./../../parseTree/nodes";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {Node} from "./../../parseTree/nodes"
import {streamAtIdentifier} from "../../tokens/streamConditions";
import {streamAtEquals} from "../../tokens/streamConditions";
import {streamAtComma} from "../../tokens/streamConditions";
import {streamAtNewLine} from "../../tokens/streamConditions";
import {VarDeclarationNode} from "../../parseTree/nodes";
import {VarDeclItemNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";

/**
 * Recognizes a variable declaration like
 *   local ...
 *   global...
 *   const...
 *
 * Expects the stream to already be past the local/global/const keyword.
 *
 * Doesn't consume \n or any token after the variable declaration.
 */
class VarDeclarationFsa extends BaseFsa {
  constructor(public varType: NameDeclType) {
    super()
    let startState = this.startState
    let stopState = this.stopState

    if (varType === NameDeclType.ImpliedByAssignment || varType === NameDeclType.ArgList) throw new AssertError("")

    let name = new FsaState("name")
    let doubleColon = new FsaState("::")
    let typeState = new FsaState("type")
    let equals = new FsaState("equals")
    let value = new FsaState("value")
    let comma = new FsaState("comma")

    let allowMoreThanOneVar = true
    let requireAssignment = false
    if (varType === NameDeclType.Const) {
      allowMoreThanOneVar = false
      requireAssignment = true
    }


    // allow comments and newlines between certain states
    for (let state of [doubleColon, equals, comma]) {
      state.addArc(state, streamAtComment, skipOneToken)
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    // at least one variable
    startState.addArc(name, streamAtIdentifier, readVariableName)

    // the variable name can be by itself, or can have an assignment
    // and optionally multiple variables declared at once.
    // Multiple variables requires the comma to be on the same line.

    name.addArc(doubleColon, streamAtDoubleColon, skipOneToken)
    name.addArc(equals, streamAtEquals, skipOneToken)
    doubleColon.addArc(typeState, alwaysPasses, readTypeExpression)
    typeState.addArc(equals, streamAtEquals, skipOneToken)
    if (!requireAssignment) {
      if (allowMoreThanOneVar) {
        name.addArc(comma, streamAtComma, skipOneToken)
        typeState.addArc(comma, streamAtComma, skipOneToken)
      }
      name.addArc(stopState, alwaysPasses, doNothing)
      typeState.addArc(stopState, alwaysPasses, doNothing)
    }


    // must have expression for value after '='
    // The expression cannot have commas if it is a local/global variable.
    if (varType === NameDeclType.Const) {
      equals.addArc(value, alwaysPasses, readVariableValue)
    } else {
      equals.addArc(value, alwaysPasses, readLocalGlobalVariableValue)
    }

    // local and global statements can have multiple variables declared at once
    if (allowMoreThanOneVar) {
      value.addArc(comma, streamAtComma, skipOneToken)
    }
    value.addArc(stopState, alwaysPasses, doNothing)

    // must follow comma with another variable
    comma.addArc(name, streamAtIdentifier, readVariableName)


  }

  runStartToStop(ts: TokenStream, wholeState: WholeFileParseState): VarDeclarationNode {
    let nodeToFill = new VarDeclarationNode(this.varType)
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
    return parseState.nodeToFill
  }

}



class ParseState implements IFsaParseState {
  mostRecentVar: VarDeclItemNode
  constructor(public ts: TokenStream, public nodeToFill: VarDeclarationNode, public wholeState: WholeFileParseState) {
    this.mostRecentVar = null
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readVariableName(state: ParseState): void {
  let tok = state.ts.read()
  let varNode = new VarDeclItemNode(new IdentifierNode(tok))
  state.mostRecentVar = varNode
  state.nodeToFill.names.push(varNode)
}



var fsaTypeAnnotationInLocalGlobalConst = null
function readTypeExpression(state: ParseState): void {
  if (fsaTypeAnnotationInLocalGlobalConst === null) {
    // Used to read type annotations in local/global/const lists.
    // An '=' sign denotes the default value and a ',' denotes another arg so they must be ignored.
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [",", "="]
    fsaOptions.allowReturn = false
    fsaTypeAnnotationInLocalGlobalConst = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentVar === null) throw new AssertError("")
  state.mostRecentVar.type = fsaTypeAnnotationInLocalGlobalConst.runStartToStop(state.ts, state.wholeState)
}


function readVariableValue(state: ParseState): void {
  if (state.mostRecentVar === null) throw new AssertError("")
  state.mostRecentVar.value = parseGeneralBlockExpression(state.ts, state.wholeState)
}



var fsaLocalGlobalVarValueExpression = null
function readLocalGlobalVariableValue(state: ParseState): void {
  if (fsaLocalGlobalVarValueExpression === null) {
    // Used to read the expression for the variable's value in a local/global variable declaration
    // as a ',' will indicate the start of another variable
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaLocalGlobalVarValueExpression = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentVar === null) throw new AssertError("")
  state.mostRecentVar.value = fsaLocalGlobalVarValueExpression.runStartToStop(state.ts, state.wholeState)
}






var fsaLocalDeclaration = new VarDeclarationFsa(NameDeclType.Local)
var fsaGlobalDeclaration = new VarDeclarationFsa(NameDeclType.Global)
var fsaConstDeclaration = new VarDeclarationFsa(NameDeclType.Const)

export function parseLocalStatement(ts: TokenStream, wholeState: WholeFileParseState): VarDeclarationNode {
  return fsaLocalDeclaration.runStartToStop(ts, wholeState)
}
export function parseGlobalStatement(ts: TokenStream, wholeState: WholeFileParseState): VarDeclarationNode {
  return fsaGlobalDeclaration.runStartToStop(ts, wholeState)
}
export function parseConstStatement(ts: TokenStream, wholeState: WholeFileParseState): VarDeclarationNode {
  return fsaConstDeclaration.runStartToStop(ts, wholeState)
}

