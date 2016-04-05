"use strict"

import {streamAtOverridableOperator} from "../../tokens/streamConditions";
import {streamAtDot} from "../../tokens/streamConditions";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {FunctionDefNode} from "./../../parseTree/nodes";
import {TokenStream} from "./../../tokens/TokenStream";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtOpenParenthesis} from "./../../tokens/streamConditions";
import {streamAtOpenCurlyBraces} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {TreeToken} from "../../tokens/Token";
import {streamAtEquals} from "../../tokens/streamConditions";
import {IdentifierNode} from "../../parseTree/nodes";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {parseFunctionDefArgList} from "./FunctionDefArgListFsa";
import {parseGenericDefArgList} from "./GenericDefArgListFsa";
import {TokenType} from "../../tokens/operatorsAndKeywords";

/**
 * Recognizes a compact function declaration, such as
 *  f{T}(val::T) = val + 1
 * where there is no 'function' or 'end' and the body is a single expression.
 */
class FunctionCompactDefFsa extends BaseFsa {
  /**
   * The token stream is assumed to have the function name (being assigned to) as the first token.
   */
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let name = new FsaState('function name')
    let nameDot = new FsaState("function name dot")
    let overridableOperator = new FsaState("overridable operator")
    let typeParams = new FsaState("type params")
    let functionArgList = new FsaState("function arg list")
    let equalsSign = new FsaState("= sign")
    let functionBody = new FsaState("function body")

    let allStatesExceptStop = [startState, name, nameDot, overridableOperator, typeParams, functionArgList, equalsSign, functionBody]

    // TODO allow newlines between elements if the def is contained within a parentheses
    // ignore new lines between parts of the function declaration
    //for (let state of [startState, functionName, typeParams]) {
    //  state.addArc(state, streamAtNewLine, skipOneToken)
    //}
    // ignore comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }


    // function name cannot be skipped
    startState.addArc(name, streamAtIdentifier, readFunctionName)
    startState.addArc(overridableOperator, streamAtOverridableOperator, readFunctionNameAsOverridableOperator)

    // name can have multiple parts if referring to a function name in another module
    name.addArc(nameDot, streamAtDot, skipOneToken)
    nameDot.addArc(name, streamAtIdentifier, readFunctionName)
    nameDot.addArc(overridableOperator, streamAtOverridableOperator, readFunctionNameAsOverridableOperator)

    // optional type params
    name.addArc(typeParams, streamAtOpenCurlyBraces, readFunctionGenericParams)
    overridableOperator.addArc(typeParams, streamAtOpenCurlyBraces, readFunctionGenericParams)
    // must be followed by function arg list
    name.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)
    overridableOperator.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)
    typeParams.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)

    // require equals sign
    functionArgList.addArc(equalsSign, streamAtEquals, skipOneToken)
    // allow body on separate line
    equalsSign.addArc(equalsSign, streamAtNewLine, skipOneToken)

    // rest must be function body
    equalsSign.addArc(functionBody, alwaysPasses, readBodyExpression)

    functionBody.addArc(stopState, alwaysPasses, doNothing)
  }

  runStartToStop(ts: TokenStream, nodeToFill: FunctionDefNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }


}

class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: FunctionDefNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readFunctionName(state: ParseState): void {
  let token = state.ts.read()
  state.nodeToFill.name.push(new IdentifierNode(token))
}

function readFunctionNameAsOverridableOperator(state: ParseState): void {
  let token = state.ts.read()
  // change token from an operator to an identifier
  token.type = TokenType.Identifier
  state.nodeToFill.name.push(new IdentifierNode(token))
}

function readFunctionGenericParams(state: ParseState): void {
  let curlyBracesToken = state.ts.read() as TreeToken
  state.nodeToFill.genericArgs = parseGenericDefArgList(curlyBracesToken, state.wholeState)
}

function readFunctionArgList(state: ParseState): void {
  let parenToken = state.ts.read() as TreeToken
  parseFunctionDefArgList(state.nodeToFill.args, parenToken, state.wholeState)
}

function readBodyExpression(state: ParseState): void {
  let exprNode = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.bodyExpressions.push(exprNode)
}






var fsaFunctionCompactDef = new FunctionCompactDefFsa()

export function parseWholeCompactFunctionDef(ts: TokenStream, wholeState: WholeFileParseState): FunctionDefNode {
  // does not handle errors
  let node = new FunctionDefNode()
  node.scopeStartToken = ts.peek()
  fsaFunctionCompactDef.runStartToStop(ts, node, wholeState)
  node.scopeEndToken = ts.getLastToken()
  return node
}


