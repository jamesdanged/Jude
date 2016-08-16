"use strict";
const fsaUtils_1 = require("../general/fsaUtils");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const fsaUtils_2 = require("../general/fsaUtils");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_1 = require("./../../tokens/streamConditions");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const streamConditions_8 = require("./../../tokens/streamConditions");
const nodes_2 = require("./../../parseTree/nodes");
const arrayUtils_1 = require("../../utils/arrayUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
class IfBlockFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let ifCondition = new fsaUtils_4.FsaState("if condition");
        let ifTrueBlock = new fsaUtils_4.FsaState("if true block");
        let ifTrueBetweenExpressions = new fsaUtils_4.FsaState("if true between expressions");
        let elseIfKeyword = new fsaUtils_4.FsaState("else if keyword");
        let elseIfCondition = new fsaUtils_4.FsaState("else if condition");
        let elseIfBlock = new fsaUtils_4.FsaState("else if block");
        let elseIfBetweenExpressions = new fsaUtils_4.FsaState("else if between expressions");
        let elseKeyword = new fsaUtils_4.FsaState("else keyword");
        let elseBlock = new fsaUtils_4.FsaState("else block");
        let elseBetweenExpressions = new fsaUtils_4.FsaState("else between expressions");
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
        fsaUtils_5.runFsaStartToStop(this, parseState);
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