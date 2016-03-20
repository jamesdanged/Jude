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
var ExpressionFsa_1 = require("../general/ExpressionFsa");
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
var streamConditions_8 = require("./../../tokens/streamConditions");
var nodes_2 = require("./../../parseTree/nodes");
var arrayUtils_1 = require("../../utils/arrayUtils");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
class IfBlockFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start state");
        let stopState = new fsaUtils_3.FsaState("stop state");
        this.startState = startState;
        this.stopState = stopState;
        let ifCondition = new fsaUtils_3.FsaState("if condition");
        let ifTrueBlock = new fsaUtils_3.FsaState("if true block");
        let ifTrueBetweenExpressions = new fsaUtils_3.FsaState("if true between expressions");
        let elseIfKeyword = new fsaUtils_3.FsaState("else if keyword");
        let elseIfCondition = new fsaUtils_3.FsaState("else if condition");
        let elseIfBlock = new fsaUtils_3.FsaState("else if block");
        let elseIfBetweenExpressions = new fsaUtils_3.FsaState("else if between expressions");
        let elseKeyword = new fsaUtils_3.FsaState("else keyword");
        let elseBlock = new fsaUtils_3.FsaState("else block");
        let elseBetweenExpressions = new fsaUtils_3.FsaState("else between expressions");
        let allStatesExceptStop = [startState,
            ifCondition, ifTrueBlock, ifTrueBetweenExpressions,
            elseIfKeyword, elseIfCondition, elseIfBlock, elseIfBetweenExpressions,
            elseKeyword, elseBlock, elseBetweenExpressions];
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        // ignore newlines everywhere except between expressions
        for (let state of [startState, ifCondition, ifTrueBlock, elseIfKeyword, elseIfCondition, elseIfBlock, elseKeyword, elseBlock]) {
            state.addArc(state, streamConditions_2.streamAtNewLine, skipOneToken);
        }
        // ignore semicolons in blocks
        for (let state of [ifTrueBlock, elseIfBlock, elseBlock]) {
            state.addArc(state, streamConditions_6.streamAtSemicolon, skipOneToken);
        }
        startState.addArc(ifCondition, streamConditions_3.alwaysPasses, readIfCondtion);
        ifCondition.addArc(ifTrueBlock, streamConditions_3.alwaysPasses, doNothing);
        ifTrueBlock.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        ifTrueBlock.addArc(elseIfKeyword, streamConditions_5.streamAtElseIf, skipOneToken);
        ifTrueBlock.addArc(elseKeyword, streamConditions_7.streamAtElse, skipOneToken);
        ifTrueBlock.addArc(ifTrueBetweenExpressions, streamConditions_3.alwaysPasses, readIfTrueExpression); // otherwise must read an expression
        ifTrueBetweenExpressions.addArc(ifTrueBlock, streamConditions_8.streamAtNewLineOrSemicolon, skipOneToken); // require delimiters if multiple expressions
        ifTrueBetweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        ifTrueBetweenExpressions.addArc(elseIfKeyword, streamConditions_5.streamAtElseIf, skipOneToken);
        ifTrueBetweenExpressions.addArc(elseKeyword, streamConditions_7.streamAtElse, skipOneToken);
        elseIfKeyword.addArc(elseIfCondition, streamConditions_3.alwaysPasses, readElseIfCondition);
        elseIfCondition.addArc(elseIfBlock, streamConditions_3.alwaysPasses, newElseIfBlock);
        elseIfBlock.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        elseIfBlock.addArc(elseIfKeyword, streamConditions_5.streamAtElseIf, skipOneToken);
        elseIfBlock.addArc(elseKeyword, streamConditions_7.streamAtElse, skipOneToken);
        elseIfBlock.addArc(elseIfBetweenExpressions, streamConditions_3.alwaysPasses, readElseIfExpression); // otherwise must read an expression
        elseIfBetweenExpressions.addArc(elseIfBlock, streamConditions_8.streamAtNewLineOrSemicolon, skipOneToken); // require delimiters if multiple expressions
        elseIfBetweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        elseIfBetweenExpressions.addArc(elseIfKeyword, streamConditions_5.streamAtElseIf, skipOneToken);
        elseIfBetweenExpressions.addArc(elseKeyword, streamConditions_7.streamAtElse, skipOneToken);
        elseKeyword.addArc(elseBlock, streamConditions_3.alwaysPasses, newElseBlock);
        elseBlock.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        elseBlock.addArc(elseBetweenExpressions, streamConditions_3.alwaysPasses, readElseExpression); // otherwise must read an expression
        elseBetweenExpressions.addArc(elseBlock, streamConditions_8.streamAtNewLineOrSemicolon, skipOneToken); // require delimiters if multiple expressions
        elseBetweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
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
function readIfCondtion(state) {
    state.nodeToFill.ifCondition = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readElseIfCondition(state) {
    state.nodeToFill.elseIfConditions.push(ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState));
}
function newElseIfBlock(state) {
    let elseIfNode = new nodes_2.MultiExpressionNode();
    state.nodeToFill.elseIfBlocks.push(elseIfNode);
}
function newElseBlock(state) {
    let elseNode = new nodes_2.MultiExpressionNode();
    state.nodeToFill.elseBlock = elseNode;
}
function readIfTrueExpression(state) {
    let block = state.nodeToFill.ifBlock;
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
function readElseIfExpression(state) {
    let block = arrayUtils_1.last(state.nodeToFill.elseIfBlocks);
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
function readElseExpression(state) {
    let block = state.nodeToFill.elseBlock;
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    block.expressions.push(expr);
}
var fsaIfBlock = new IfBlockFsa();
function parseWholeIfBlock(ifBlockTree, wholeState) {
    if (ifBlockTree.openToken.str !== "if")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(ifBlockTree.contents, ifBlockTree.openToken);
    let node = new nodes_1.IfBlockNode();
    try {
        fsaIfBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, ifBlockTree.contents, wholeState);
    }
    return node;
}
exports.parseWholeIfBlock = parseWholeIfBlock;
//# sourceMappingURL=IfBlockFsa.js.map