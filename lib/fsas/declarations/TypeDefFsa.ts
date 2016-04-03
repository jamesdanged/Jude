"use strict"

import {BinaryOpNode} from "../../parseTree/nodes";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {parseGenericDefArgList} from "./GenericDefArgListFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TokenStream} from "./../../tokens/TokenStream";
import {TypeDefNode} from "./../../parseTree/nodes";
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

/**
 * Recognizes the body of a type...end declaration.
 */
class TypeDefFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let typeDefName = new FsaState("type def name")
    let genericParams = new FsaState("generic params")
    let lessThanColon = new FsaState("<:")
    let parentType = new FsaState("parent type")

    let body = new FsaState("body")
    //let fieldName = new FsaState("field name")
    //let doubleColon = new FsaState("::")
    //let fieldType = new FsaState("file type")
    let betweenExpressions = new FsaState("between expressions")  // state after a field has been read

    let generalExpression = new FsaState("general expression")

    // TODO what about new()

    let allStatesExceptStop = [startState, typeDefName, genericParams, lessThanColon, parentType,
      body,
      //fieldName, doubleColon, fieldType,
      betweenExpressions, generalExpression]

    // ignore new lines at various points
    for (let state of [startState, typeDefName, genericParams, lessThanColon, parentType, body]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }
    // ignore comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }

    // name is required
    startState.addArc(typeDefName, streamAtIdentifier, readTypeDefName)

    // optional generic params
    typeDefName.addArc(genericParams, streamAtOpenCurlyBraces, readTypeGenericParams)
    // optional parent type
    typeDefName.addArc(lessThanColon, streamAtLessThanColon, skipOneToken)
    genericParams.addArc(lessThanColon, streamAtLessThanColon, skipOneToken)
    // if there was a <:, must have the parent typenow
    lessThanColon.addArc(parentType, alwaysPasses, readParentType)
    // otherwise jump to body
    typeDefName.addArc(body, alwaysPasses, doNothing)
    genericParams.addArc(body, alwaysPasses, doNothing)
    parentType.addArc(body, alwaysPasses, doNothing)

    // zero or more expressions, some of which are fields
    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtSemicolon, skipOneToken)
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression) // otherwise must be an expression


    //// zero or more fields
    //body.addArc(stopState, streamAtEof, doNothing)
    //body.addArc(fieldName, streamAtIdentifier, readFieldName)
    //
    //// optional field type annotation
    //fieldName.addArc(doubleColon, streamAtDoubleColon, skipOneToken)
    //doubleColon.addArc(fieldType, alwaysPasses, readFieldTypeExpression)
    //fieldName.addArc(betweenExpressions, alwaysPasses, doNothing)
    //fieldType.addArc(betweenExpressions, alwaysPasses, doNothing)

    // after each expression must be delimited
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)
    // last expression does not need delimiter
    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: TypeDefNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}


class ParseState implements IFsaParseState {
  mostRecentField: FieldNode
  constructor(public ts: TokenStream, public nodeToFill: TypeDefNode, public wholeState: WholeFileParseState) {
    this.mostRecentField = null
  }
}


function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readTypeDefName(state: ParseState): void {
  let tok = state.ts.read()
  state.nodeToFill.name = new IdentifierNode(tok)
}

function readTypeGenericParams(state: ParseState): void {
  let curlyBracesToken = state.ts.read() as TreeToken
  state.nodeToFill.genericArgs = parseGenericDefArgList(curlyBracesToken, state.wholeState)
}

function readParentType(state: ParseState): void {
  state.nodeToFill.parentType = parseGeneralBlockExpression(state.ts, state.wholeState)
}

function readBodyExpression(state: ParseState): void {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)

  let isField = false
  if (expr instanceof IdentifierNode) {
    // is a field without a type annotation
    isField = true
    let field = new FieldNode(expr)
    state.nodeToFill.fields.push(field)

  } else if (expr instanceof BinaryOpNode) {
    if (expr.op === "::" && expr.arg1 instanceof IdentifierNode) {
      // is a field with a type annotation
      isField = true
      let identNode = expr.arg1 as IdentifierNode
      let field = new FieldNode(identNode)
      field.type = expr.arg2
      state.nodeToFill.fields.push(field)
    }
  }

  if (!isField) {
    state.nodeToFill.bodyContents.push(expr)
  }
}

//function readFieldName(state: ParseState): void {
//  let tok = state.ts.read()
//  let field = new FieldNode(new IdentifierNode(tok))
//  state.nodeToFill.fields.push(field)
//  state.mostRecentField = field
//}
//
//function readFieldTypeExpression(state: ParseState): void {
//  if (state.mostRecentField === null) throw new AssertError("")
//  state.mostRecentField.type = parseGeneralBlockExpression(state.ts, state.wholeState)
//}






var fsaTypeDef = new TypeDefFsa()

export function parseWholeTypeDef(tree: TreeToken, wholeState: WholeFileParseState): TypeDefNode {
  let ts = new TokenStream(tree.contents, tree.openToken)
  let node = new TypeDefNode()
  if (tree.openToken.str === "type") {
    node.isImmutable = false
  } else if (tree.openToken.str === "immutable") {
    node.isImmutable = true
  } else {
    throw new AssertError("")
  }
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken


  try {
    fsaTypeDef.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, tree.contents, wholeState)
  }
  return node

}
