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
var streamConditions_1 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var fsaUtils_2 = require("../general/fsaUtils");
var fsaUtils_3 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
var fsaUtils_4 = require("../general/fsaUtils");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
class BeginBlockFsa {
    constructor() {
        let startState = new fsaUtils_2.FsaState("start");
        let stopState = new fsaUtils_2.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let body = new fsaUtils_2.FsaState("body");
        let betweenExpressions = new fsaUtils_2.FsaState("between expressions");
        let allStatesExceptStop = [startState, body, betweenExpressions];
        // skip comments
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        startState.addArc(body, streamConditions_2.alwaysPasses, doNothing);
        body.addArc(body, streamConditions_3.streamAtNewLineOrSemicolon, skipOneToken);
        body.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        body.addArc(betweenExpressions, streamConditions_2.alwaysPasses, readBodyExpression); // otherwise must be an expression
        betweenExpressions.addArc(body, streamConditions_3.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
        betweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_3.runFsaStartToStop(this, parseState);
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
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
var fsaBeginBlock = new BeginBlockFsa();
function parseWholeBeginBlock(beginBlockTree, wholeState) {
    if (beginBlockTree.openToken.str !== "begin")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(beginBlockTree.contents, beginBlockTree.openToken);
    let node = new nodes_1.BeginBlockNode();
    try {
        fsaBeginBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_4.handleParseErrorOnly(err, node, beginBlockTree.contents, wholeState);
    }
    return node;
}
exports.parseWholeBeginBlock = parseWholeBeginBlock;
//# sourceMappingURL=BeginBlockFsa.js.map