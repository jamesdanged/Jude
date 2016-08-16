"use strict";
const fsaUtils_1 = require("../general/fsaUtils");
const fsaUtils_2 = require("../general/fsaUtils");
const streamConditions_1 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
class WhileBlockFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let condition = new fsaUtils_4.FsaState("condition");
        let body = new fsaUtils_4.FsaState("body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
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
        body.addArc(body, streamConditions_5.streamAtSemicolon, skipOneToken); // can have extra semicolons in body
        body.addArc(betweenExpressions, streamConditions_3.alwaysPasses, readBodyExpression);
        betweenExpressions.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        betweenExpressions.addArc(body, streamConditions_6.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
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