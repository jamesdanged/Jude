"use strict"

import {streamAtOverridableOperator} from "../../tokens/streamConditions";
import {streamAtDot} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {parseFunctionDefArgList} from "./FunctionDefArgListFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
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
import {runFsaStartToEarlyExit} from "../general/fsaUtils";
import {TreeToken} from "../../tokens/Token";
import {IdentifierNode} from "../../parseTree/nodes";
import {AssertError} from "../../utils/assert";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {parseGenericDefArgList} from "./GenericDefArgListFsa";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {TokenType} from "../../tokens/operatorsAndKeywords";


/**
 * An automaton that recognizes the entire contents within a function ... end block.
 */
class FunctionDefFsa extends BaseFsa {

  functionBodyState: FsaState
  typeParamsState: FsaState
  functionArgListState: FsaState

  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let functionName = new FsaState("function name")
    let functionNameDot = new FsaState("function name dot")
    let typeParams = this.typeParamsState = new FsaState("type params")
    let functionArgList = this.functionArgListState = new FsaState("function arg list") // the entire handling of the arg list will be handled by a sub fsa
    let functionBody = this.functionBodyState = new FsaState("function body")
    let betweenExpressions = new FsaState("between expressions") // state after an expression has been read

    let allStatesExceptStop = [startState, functionName, functionNameDot, typeParams, functionArgList, functionBody, betweenExpressions]

    // ignore new lines between parts of the function declaration
    for (let state of [startState, functionName, functionNameDot, typeParams]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }
    // ignore comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }


    // function name can be skipped if anonymous
    startState.addArc(functionName, streamAtIdentifier, readFunctionName)
    startState.addArc(functionName, streamAtOverridableOperator, readFunctionNameAsOverridableOperator)
    startState.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)

    // name can have multiple parts if referring to a function name in another module
    functionName.addArc(functionNameDot, streamAtDot, skipOneToken)
    functionNameDot.addArc(functionName, streamAtIdentifier, readFunctionName)
    functionNameDot.addArc(functionName, streamAtOverridableOperator, readFunctionNameAsOverridableOperator)

    // type params only allowed if there was a function name
    functionName.addArc(typeParams, streamAtOpenCurlyBraces, readFunctionGenericParams)
    // must be followed by function arg list
    functionName.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)
    typeParams.addArc(functionArgList, streamAtOpenParenthesis, readFunctionArgList)

    // rest must be function body
    functionArgList.addArc(functionBody, alwaysPasses, doNothing)

    // 0 or more expressions in body
    functionBody.addArc(stopState, streamAtEof, doNothing)
    functionBody.addArc(functionBody, streamAtNewLineOrSemicolon, skipOneToken)
    functionBody.addArc(betweenExpressions, alwaysPasses, readBodyExpression)

    // expressions must be delimited
    betweenExpressions.addArc(functionBody, streamAtNewLineOrSemicolon, skipOneToken)
    // last expression does not need delimiter
    betweenExpressions.addArc(stopState, streamAtEof, doNothing)


  }

  runStartToStop(ts: TokenStream, nodeToFill: FunctionDefNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    //if (wholeState.onlyParseTopLevel) {
    //runFsaStartToEarlyExit(this, parseState, [this.typeParamsState, this.functionArgListState, this.functionBodyState])
    //} else {
    runFsaStartToStop(this, parseState)
    //}
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







var fsaFunctionDef = new FunctionDefFsa()

export function parseWholeFunctionDef(tree: TreeToken, wholeState: WholeFileParseState): FunctionDefNode {
  if (tree.openToken.str !== "function") throw new AssertError("")
  let ts = new TokenStream(tree.contents, tree.openToken)
  let node = new FunctionDefNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken


  try {
    fsaFunctionDef.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, tree.contents, wholeState)
  }
  return node
}

