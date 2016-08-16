"use strict";
const fsaUtils_1 = require("../general/fsaUtils");
const streamConditions_1 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("../general/fsaUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const fsaUtils_5 = require("../general/fsaUtils");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
class BeginBlockFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let body = new fsaUtils_3.FsaState("body");
        let betweenExpressions = new fsaUtils_3.FsaState("between expressions");
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
        fsaUtils_5.handleParseErrorOnly(err, node, beginBlockTree.contents, wholeState);
    }
    return node;
}
exports.parseWholeBeginBlock = parseWholeBeginBlock;
//# sourceMappingURL=BeginBlockFsa.js.map