"use strict";
const fsaUtils_1 = require("../general/fsaUtils");
const fsaUtils_2 = require("../general/fsaUtils");
const streamConditions_1 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
class ParenthesesFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let expressions = new fsaUtils_4.FsaState("expressions");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
        let allStatesExceptStop = [startState, expressions, betweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        startState.addArc(expressions, streamConditions_2.alwaysPasses, doNothing);
        // 0 or more expressions
        // empty paren is an empty tuple
        expressions.addArc(stopState, streamConditions_3.streamAtEof, doNothing);
        // one or more expressions separated by semicolon
        expressions.addArc(betweenExpressions, streamConditions_2.alwaysPasses, readExpression);
        expressions.addArc(expressions, streamConditions_4.streamAtSemicolon, skipOneToken); // skip extra ';'
        // require semicolons if there are more than 1 expressions
        betweenExpressions.addArc(expressions, streamConditions_4.streamAtSemicolon, skipOneToken);
        betweenExpressions.addArc(stopState, streamConditions_3.streamAtEof, doNothing);
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
function readExpression(state) {
    let node = parseExpressionWithinParentheses(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(node);
}
var fsaExpressionWithinParentheses = null; // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function parseExpressionWithinParentheses(ts, wholeState) {
    if (fsaExpressionWithinParentheses == null) {
        // the expression can have "\n"
        // only ";" will separate multiple expressions
        let fsaOptions = new ExpressionFsa_1.ExpressionFsaOptions();
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaOptions.allowSplat = true;
        fsaExpressionWithinParentheses = new ExpressionFsa_2.ExpressionFsa(fsaOptions);
    }
    return fsaExpressionWithinParentheses.runStartToStop(ts, wholeState);
}
var fsaParentheses = new ParenthesesFsa();
function parseGroupingParentheses(parenTree, wholeState) {
    // handles arithmetic expression grouping
    //   eg (a + b) * c
    // as well as tuples
    //   since "," is treated simply as a binary operator
    // as well as multiple semicolon delimited statements
    if (parenTree.openToken.str !== "(")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(parenTree.contents, parenTree.openToken);
    let node = new nodes_1.ParenthesesNode();
    try {
        fsaParentheses.runStartToStop(ts, node, wholeState);
        if (node.expressions.length == 0) {
            return new nodes_1.EmptyTupleNode();
        }
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, parenTree.contents, wholeState);
    }
    return node;
}
exports.parseGroupingParentheses = parseGroupingParentheses;
//# sourceMappingURL=ParenthesesFsa.js.map