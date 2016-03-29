var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};//"use strict"
//
//import {streamAtSemicolon} from "../../tokens/streamConditions";
//import {ArrayLiteralNode} from "../../parseTree/nodes";
//import {ExpressionFsa} from "../general/ExpressionFsa";
//import {expectNoMoreExpressions} from "../general/core";
//import {WholeFileParseState} from "../general/ModuleContentsFsa";
//import {UnparsedTreeToken} from "../../tokens/Token";
//import {streamAtNewLine} from "./../../tokens/streamConditions";
//import {GenericArgListNode} from "./../../parseTree/nodes";
//import {TokenStream} from "./../../tokens/TokenStream";
//import {streamAtComment} from "./../../tokens/streamConditions";
//import {alwaysPasses} from "./../../tokens/streamConditions";
//import {streamAtEof} from "./../../tokens/streamConditions";
//import {streamAtComma} from "./../../tokens/streamConditions";
//import {IFsa} from "./../general/core";
//import {FsaState} from "./../general/core";
//import {runFsaStartToStop} from "./../general/core";
//import {IFsaParseState} from "./../general/core";
//import {AssertError} from "../../utils/assert";
//import {handleParseErrorOnly} from "../general/core";
//import {ExpressionFsaOptions} from "../general/ExpressionFsa";
//import {streamAtFor} from "../../tokens/streamConditions";
//import {ForBlockNode} from "../../parseTree/nodes";
//import {streamAtIdentifier} from "../../tokens/streamConditions";
//import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
//import {streamAtEquals} from "../../tokens/streamConditions";
//import {streamAtIn} from "../../tokens/streamConditions";
//import {IdentifierNode} from "../../parseTree/nodes";
//import {TokenType} from "../../tokens/tokenInfo";
//import {InvalidParseError} from "../../utils/errors";
//import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
//
///**
// * Recognizes an array literal or list comprehension, eg
// *   [1, 2, 3]
// *   [1 2; 3 4]
// *   [val+1 for val in arr]
// *
// * Doesn't bother distinguishing whether result is a row vector, col vector, 2d array, etc
// * nor validates the dimensions.
// */
//class ArrayLiteralFsa implements IFsa {
//  startState: FsaState
//  stopState: FsaState
//
//  constructor() {
//
//    let startState = new FsaState("start")
//    let stopState = new FsaState("stop")
//    this.startState = startState
//    this.stopState = stopState
//
//    let firstExpr = new FsaState("first expression")
//    let expr = new FsaState("expression")
//    let delimiter = new FsaState("between expressions")
//
//    // for list comprehensions
//    let forState = new FsaState("for")
//    let iterVariable = new FsaState("iter variable")
//    let equals = new FsaState("equals")
//    let inKeyword = new FsaState("in keyword")
//    let iterRange = new FsaState("iter range")
//
//    let allStatesExceptStop = [startState, firstExpr, expr, delimiter, forState, iterVariable, equals, inKeyword, iterRange]
//
//    // ignore comments everywhere
//    for (let state of allStatesExceptStop) {
//      state.addArc(state, streamAtComment, skipOneToken)
//    }
//
//    // zero or more expressions
//    startState.addArc(stopState, streamAtEof, doNothing)
//    startState.addArc(startState, streamAtNewLine, doNothing)
//    startState.addArc(firstExpr, alwaysPasses, readExpression)
//
//    // the first expression can be part of a list comprehension
//    // or else just treat as any other expression
//    firstExpr.addArc(firstExpr, streamAtNewLine, skipOneToken)
//    firstExpr.addArc(forState, streamAtFor, startListComprehension)
//    firstExpr.addArc(expr, alwaysPasses, doNothing)
//
//    // commas, semicolons, spaces, and new lines are delimiters
//    expr.addArc(stopState, streamAtEof, doNothing)
//    expr.addArc(expr, streamAtNewLine, skipOneToken)
//    expr.addArc(delimiter, streamAtComma, skipOneToken)
//    expr.addArc(delimiter, streamAtSemicolon, skipOneToken)
//    expr.addArc(delimiter, alwaysPasses, doNothing) // spaces are implicit, so always otherwise go to next expression
//
//    // after a delimiter, have to have another expression
//    delimiter.addArc(delimiter, streamAtNewLine, skipOneToken) // allow extra spacing
//    delimiter.addArc(expr, alwaysPasses, readExpression)
//
//    // handle list comprehension
//
//    // allow new lines in certain areas
//    // \n not allowed between iter variable and in/=
//    for (let state of [forState, equals, inKeyword, iterRange]) {
//      state.addArc(state, streamAtNewLine, skipOneToken)
//    }
//
//    // can have a single iteration variable or a tuple of destructured variables
//    forState.addArc(iterVariable, streamAtIdentifier, readIterVariable)
//    forState.addArc(iterVariable, streamAtOpenParenthesis, readMultipleIterVariables)
//
//    // either = or in
//    iterVariable.addArc(equals, streamAtEquals, skipOneToken)
//    iterVariable.addArc(inKeyword, streamAtIn, skipOneToken)
//
//    equals.addArc(iterRange, alwaysPasses, readIterRange)
//    inKeyword.addArc(iterRange, alwaysPasses, readIterRange)
//
//    iterRange.addArc(stopState, streamAtEof, doNothing)
//
//  }
//
//  runStartToStop(ts: TokenStream, nodeToFill: ArrayLiteralNode, wholeState: WholeFileParseState): void {
//    let parseState = new ParseState(ts, nodeToFill, wholeState)
//    runFsaStartToStop(this, parseState)
//  }
//
//}
//
//
//
//class ParseState implements IFsaParseState {
//  listComprehensionNode: ForBlockNode
//  constructor(public ts: TokenStream, public nodeToFill: ArrayLiteralNode,
//              public wholeState: WholeFileParseState) {
//    this.listComprehensionNode = null
//  }
//}
//
//function doNothing(state: ParseState): void { }
//
//function skipOneToken(state: ParseState): void {
//  state.ts.read()
//}
//
//var fsaArrayLiteralExpression = null // build on first usage. Constructors may not be exported yet upon global scope evaluation.
//function readExpression(state: ParseState): void {
//  if (fsaArrayLiteralExpression === null) {
//    let fsaOptions = new ExpressionFsaOptions()
//    fsaOptions.binaryOpsToIgnore = [","]
//    fsaOptions.allowSplat = true
//    fsaOptions.allowSingleColon = true
//    fsaArrayLiteralExpression = new ExpressionFsa(fsaOptions)
//  }
//  let node = fsaArrayLiteralExpression.runStartToStop(state.ts, state.wholeState)
//  state.nodeToFill.contents.push(node)
//}
//
//function startListComprehension(state: ParseState): void {
//  state.ts.read() // discard 'for'
//  // replace the expression with a for node which represents the list comprehension
//  let firstExpression = state.nodeToFill.contents.pop()
//  let forNode = new ForBlockNode()
//  state.nodeToFill.contents.push(forNode)
//  forNode.expressions.push(firstExpression)
//  state.listComprehensionNode = forNode
//}
//
//function readIterVariable(state: ParseState) {
//  let tok = state.ts.read()
//  state.listComprehensionNode.iterVariable.push(new IdentifierNode(tok))
//}
//
//function readMultipleIterVariables(state: ParseState) {
//  let parenTok = state.ts.read() as UnparsedTreeToken
//  let ts = new TokenStream(parenTok.contents, parenTok.openToken)
//  ts.skipNewLinesAndComments()
//
//  while (!ts.eof()) {
//    let tok = ts.read()
//    if (tok.type !== TokenType.Identifier) {
//      state.wholeState.parseErrors.push(new InvalidParseError("Expecting an identifier.", tok))
//      return
//    }
//    state.listComprehensionNode.iterVariable.push(new IdentifierNode(tok))
//    ts.skipNewLinesAndComments()
//
//    if (ts.eof()) break
//    tok = ts.read()
//    if (!(tok.type === TokenType.Operator && tok.str === ",")) {
//      state.wholeState.parseErrors.push(new InvalidParseError("Expecting ','", tok))
//      return
//    }
//    ts.skipNewLinesAndComments()
//  }
//
//  if (state.listComprehensionNode.iterVariable.length === 0) {
//    state.wholeState.parseErrors.push(new InvalidParseError("Must have at least one name.", parenTok))
//  }
//}
//
//function readIterRange(state: ParseState) {
//  state.listComprehensionNode.range = parseGeneralBlockExpression(state.ts, state.wholeState)
//}
//
//
//
//
//
//
//
//
//var fsaArrayLiteral = new ArrayLiteralFsa()
//export function parseArrayLiteral(bracketTree: UnparsedTreeToken, wholeState: WholeFileParseState): ArrayLiteralNode {
//  let openBracketString = bracketTree.openToken.str
//  if (openBracketString !== "[" && openBracketString !== "{") throw new AssertError("")
//  let ts = new TokenStream(bracketTree.contents, bracketTree.openToken)
//  let node = new ArrayLiteralNode()
//  if (openBracketString === "{") node.isAnyArray = true
//
//  try {
//    fsaArrayLiteral.runStartToStop(ts, node, wholeState)
//    expectNoMoreExpressions(ts)
//  } catch (err) {
//    handleParseErrorOnly(err, node, bracketTree.contents, wholeState)
//  }
//  return node
//}
//# sourceMappingURL=ArrayLiteralFsa.js.map