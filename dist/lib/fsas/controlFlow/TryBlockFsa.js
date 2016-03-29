"use strict";
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
};
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_1 = require("./../../tokens/streamConditions");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var nodes_2 = require("../../parseTree/nodes");
var nodes_3 = require("../../parseTree/nodes");
var assert_1 = require("../../utils/assert");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
class TryBlockFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start");
        let stopState = new fsaUtils_3.FsaState("stio");
        this.startState = startState;
        this.stopState = stopState;
        let tryBody = new fsaUtils_3.FsaState("try body");
        let tryBetweenExpressions = new fsaUtils_3.FsaState("try between expressions");
        let catchKeyword = new fsaUtils_3.FsaState("catch keyword");
        let catchErrorVariable = new fsaUtils_3.FsaState("catch error variable");
        let catchBody = new fsaUtils_3.FsaState("catch body");
        let catchBetweenExpressions = new fsaUtils_3.FsaState("catch between expressions");
        let finallyKeyword = new fsaUtils_3.FsaState("finally keyword");
        let finallyBody = new fsaUtils_3.FsaState("finally body");
        let finallyBetweenExpressions = new fsaUtils_3.FsaState("finally between expressions");
        let allStatesExceptStop = [startState,
            tryBody, tryBetweenExpressions,
            catchKeyword, catchErrorVariable, catchBody, catchBetweenExpressions,
            finallyKeyword, finallyBody, finallyBetweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        // allow newlines and ; within bodies
        for (let state of [tryBody, catchBody, finallyBody]) {
            state.addArc(state, streamConditions_2.streamAtNewLineOrSemicolon, skipOneToken);
        }
        startState.addArc(tryBody, streamConditions_3.alwaysPasses, doNothing);
        tryBody.addArc(catchKeyword, streamConditions_4.streamAtCatch, newCatchBlock);
        tryBody.addArc(finallyKeyword, streamConditions_5.streamAtFinally, newFinallyBlock);
        tryBody.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        tryBody.addArc(tryBetweenExpressions, streamConditions_3.alwaysPasses, readTryBodyExpression); // otherwise must be an expression
        tryBetweenExpressions.addArc(tryBody, streamConditions_2.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
        tryBetweenExpressions.addArc(catchKeyword, streamConditions_4.streamAtCatch, newCatchBlock);
        tryBetweenExpressions.addArc(finallyKeyword, streamConditions_5.streamAtFinally, newFinallyBlock);
        tryBetweenExpressions.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        // optional catch error variable
        catchKeyword.addArc(catchErrorVariable, streamConditions_7.streamAtIdentifier, readCatchErrorVariableName);
        catchErrorVariable.addArc(catchBody, streamConditions_3.alwaysPasses, doNothing);
        // if no error variable, must insert a semicolon or advance to a new line
        catchKeyword.addArc(catchBody, streamConditions_2.streamAtNewLineOrSemicolon, skipOneToken);
        catchBody.addArc(finallyKeyword, streamConditions_5.streamAtFinally, skipOneToken);
        catchBody.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        catchBody.addArc(catchBetweenExpressions, streamConditions_3.alwaysPasses, readCatchBodyExpression); // otherwise must be an expression
        catchBetweenExpressions.addArc(catchBody, streamConditions_2.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
        catchBetweenExpressions.addArc(finallyKeyword, streamConditions_5.streamAtFinally, newFinallyBlock);
        catchBetweenExpressions.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        finallyKeyword.addArc(finallyBody, streamConditions_3.alwaysPasses, doNothing);
        finallyBody.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        finallyBody.addArc(finallyBetweenExpressions, streamConditions_3.alwaysPasses, readFinallyBodyExpression); // otherwise must be an expression
        finallyBetweenExpressions.addArc(finallyBody, streamConditions_2.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
        finallyBetweenExpressions.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_4.runFsaStartToStop(this, parseState);
    }
}
class ParseState {
    constructor(ts, nodeToFill, wholeState) {
        this.ts = ts;
        this.nodeToFill = nodeToFill;
        this.wholeState = wholeState;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function newCatchBlock(state) {
    let catchToken = state.ts.read();
    state.nodeToFill.tryBlock.scopeEndToken = catchToken;
    state.nodeToFill.catchBlock = new nodes_2.ScopedMultiExpressionNode();
    state.nodeToFill.catchBlock.scopeStartToken = catchToken;
}
function newFinallyBlock(state) {
    let finallyToken = state.ts.read();
    if (state.nodeToFill.catchBlock === null) {
        state.nodeToFill.tryBlock.scopeEndToken = finallyToken;
    }
    else {
        state.nodeToFill.catchBlock.scopeEndToken = finallyToken;
    }
    state.nodeToFill.finallyBlock = new nodes_2.ScopedMultiExpressionNode();
    state.nodeToFill.finallyBlock.scopeStartToken = finallyToken;
}
function readTryBodyExpression(state) {
    let block = state.nodeToFill.tryBlock;
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
function readCatchBodyExpression(state) {
    let block = state.nodeToFill.catchBlock;
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
function readFinallyBodyExpression(state) {
    let block = state.nodeToFill.finallyBlock;
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
function readCatchErrorVariableName(state) {
    let tok = state.ts.read();
    state.nodeToFill.catchErrorVariable = new nodes_3.IdentifierNode(tok);
}
var fsaTryBlock = new TryBlockFsa();
function parseWholeTryBlock(tree, wholeState) {
    if (tree.openToken.str !== "try")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.TryBlockNode();
    node.tryBlock.scopeStartToken = tree.openToken;
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, tokens)
        //} else {
        fsaTryBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
        if (node.finallyBlock !== null) {
            node.finallyBlock.scopeEndToken = tree.closeToken;
        }
        else if (node.catchBlock !== null) {
            node.catchBlock.scopeEndToken = tree.closeToken;
        }
        else {
            node.tryBlock.scopeEndToken = tree.closeToken;
        }
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeTryBlock = parseWholeTryBlock;
//# sourceMappingURL=TryBlockFsa.js.map