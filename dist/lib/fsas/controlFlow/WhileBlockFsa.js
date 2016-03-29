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
var streamConditions_1 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
class WhileBlockFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start");
        let stopState = new fsaUtils_3.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let condition = new fsaUtils_3.FsaState("condition");
        let body = new fsaUtils_3.FsaState("body");
        let betweenExpressions = new fsaUtils_3.FsaState("between expressions");
        let allStatesExceptStop = [startState, condition, body, betweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        // allow new lines in certain areas
        for (let state of [startState, condition, body]) {
            state.addArc(state, streamConditions_2.streamAtNewLine, skipOneToken);
        }
        startState.addArc(condition, streamConditions_3.alwaysPasses, readCondition);
        condition.addArc(body, streamConditions_3.alwaysPasses, doNothing);
        body.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        body.addArc(body, streamConditions_5.streamAtSemicolon, doNothing);
        body.addArc(betweenExpressions, streamConditions_3.alwaysPasses, readBodyExpression);
        betweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        betweenExpressions.addArc(body, streamConditions_6.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
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
function readCondition(state) {
    state.nodeToFill.condition = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
var fsaWhileBlock = new WhileBlockFsa();
function parseWholeWhileBlock(tree, wholeState) {
    if (tree.openToken.str !== "while")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.WhileBlockNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, tokens)
        //} else {
        fsaWhileBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeWhileBlock = parseWholeWhileBlock;
//# sourceMappingURL=WhileBlockFsa.js.map