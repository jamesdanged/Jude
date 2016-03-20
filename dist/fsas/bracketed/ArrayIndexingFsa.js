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
//import {ExpressionFsa} from "../general/ExpressionFsa";
//import {expectNoMoreExpressions} from "../general/core";
//import {WholeFileParseState} from "../general/ModuleContentsFsa";
//import {UnparsedTreeToken} from "../../tokens/Token";
//import {IndexingNode} from "../../parseTree/nodes";
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
//
///**
// * Recognizes the expression inside [] when indexing into an array.
// */
//class ArrayIndexingFsa implements IFsa {
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
//    let expr = new FsaState("expression")
//    let comma = new FsaState("comma")
//
//    let allStatesExceptStop = [startState, expr, comma]
//
//    // ignore new lines and comments everywhere
//    for (let state of allStatesExceptStop) {
//      state.addArc(state, streamAtNewLine, skipOneToken)
//      state.addArc(state, streamAtComment, skipOneToken)
//    }
//
//    // at least 1 expression
//    startState.addArc(expr, alwaysPasses, readExpression)
//
//    expr.addArc(stopState, streamAtEof, doNothing)
//    expr.addArc(comma, streamAtComma, skipOneToken)
//
//    comma.addArc(expr, alwaysPasses, readExpression)
//  }
//
//  runStartToStop(ts: TokenStream, nodeToFill: IndexingNode, wholeState: WholeFileParseState): void {
//    let parseState = new ParseState(ts, nodeToFill, wholeState)
//    runFsaStartToStop(this, parseState)
//  }
//
//}
//
//
//
//class ParseState implements IFsaParseState {
//  constructor(public ts: TokenStream, public nodeToFill: IndexingNode,
//              public wholeState: WholeFileParseState) {
//  }
//}
//
//function doNothing(state: ParseState): void { }
//
//function skipOneToken(state: ParseState): void {
//  state.ts.read()
//}
//
//var fsaIndexerExpression = null // build on first usage. Constructors may not be exported yet upon global scope evaluation.
//function readExpression(state: ParseState): void {
//  if (fsaIndexerExpression === null) {
//    let fsaOptions = new ExpressionFsaOptions()
//    fsaOptions.newLineInMiddleDoesNotEndExpression = true
//    fsaOptions.allowSingleColon = true
//    fsaOptions.binaryOpsToIgnore = [","]
//    fsaOptions.allowSplat = true
//    fsaIndexerExpression = new ExpressionFsa(fsaOptions)
//  }
//  let node = fsaIndexerExpression.runStartToStop(state.ts, state.wholeState)
//  state.nodeToFill.indexingArgs.push(node)
//}
//
//
//
//
//
//
//
//
//var fsaArrayIndexing = new ArrayIndexingFsa()
//
//export function parseIndexingArgList(bracketTree: UnparsedTreeToken, wholeState: WholeFileParseState): IndexingNode {
//  if (bracketTree.openToken.str !== "[") throw new AssertError("")
//  let ts = new TokenStream(bracketTree.contents, bracketTree.openToken)
//  let node = new IndexingNode()
//
//  try {
//    fsaArrayIndexing.runStartToStop(ts, node, wholeState)
//    expectNoMoreExpressions(ts)
//  } catch (err) {
//    handleParseErrorOnly(err, node, bracketTree.contents, wholeState)
//  }
//  return node
//}
//# sourceMappingURL=ArrayIndexingFsa.js.map