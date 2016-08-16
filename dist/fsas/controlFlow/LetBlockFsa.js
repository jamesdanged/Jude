"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const nodes_1 = require("../../parseTree/nodes");
const fsaUtils_1 = require("../general/fsaUtils");
const fsaUtils_2 = require("../general/fsaUtils");
const streamConditions_2 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const streamConditions_8 = require("./../../tokens/streamConditions");
const streamConditions_9 = require("./../../tokens/streamConditions");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const nodes_2 = require("../../parseTree/nodes");
const assert_1 = require("../../utils/assert");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const streamConditions_10 = require("../../tokens/streamConditions");
const nodes_3 = require("../../parseTree/nodes");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
const ExpressionFsa_3 = require("../general/ExpressionFsa");
class LetBlockFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let name = new fsaUtils_4.FsaState("name");
        let doubleColon = new fsaUtils_4.FsaState("::");
        let typeState = new fsaUtils_4.FsaState("type");
        let equals = new fsaUtils_4.FsaState("equals");
        let value = new fsaUtils_4.FsaState("value");
        let comma = new fsaUtils_4.FsaState("comma");
        let body = new fsaUtils_4.FsaState("body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
        let allStatesExceptStop = [startState, name, doubleColon, typeState, equals, value, comma, body, betweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // allow new lines in certain areas
        for (let state of [equals, comma, body]) {
            state.addArc(state, streamConditions_3.streamAtNewLine, skipOneToken);
        }
        // zero or more names
        startState.addArc(body, streamConditions_3.streamAtNewLine, skipOneToken);
        startState.addArc(name, streamConditions_4.streamAtIdentifier, readVariableName);
        name.addArc(doubleColon, streamConditions_1.streamAtDoubleColon, skipOneToken);
        name.addArc(comma, streamConditions_10.streamAtComma, skipOneToken);
        name.addArc(equals, streamConditions_5.streamAtEquals, skipOneToken);
        name.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        doubleColon.addArc(typeState, streamConditions_6.alwaysPasses, readTypeExpression);
        typeState.addArc(comma, streamConditions_10.streamAtComma, skipOneToken);
        typeState.addArc(equals, streamConditions_5.streamAtEquals, skipOneToken);
        typeState.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        equals.addArc(value, streamConditions_6.alwaysPasses, readValue);
        value.addArc(comma, streamConditions_10.streamAtComma, skipOneToken);
        value.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        // must follow comma with another variable
        comma.addArc(name, streamConditions_4.streamAtIdentifier, readVariableName);
        body.addArc(stopState, streamConditions_7.streamAtEof, doNothing);
        body.addArc(body, streamConditions_8.streamAtSemicolon, doNothing);
        body.addArc(betweenExpressions, streamConditions_6.alwaysPasses, readBodyExpression);
        betweenExpressions.addArc(stopState, streamConditions_7.streamAtEof, doNothing);
        betweenExpressions.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
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
        this.mostRecentVar = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readVariableName(state) {
    let tok = state.ts.read();
    let varNode = new nodes_3.VarDeclItemNode(new nodes_2.IdentifierNode(tok));
    state.mostRecentVar = varNode;
    state.nodeToFill.names.push(varNode);
}
var fsaTypeAnnotation = null;
function readTypeExpression(state) {
    if (fsaTypeAnnotation === null) {
        // Used to read type annotations
        // An '=' sign denotes the default value and a ',' denotes another arg so they must be ignored.
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [",", "="];
        fsaOptions.allowReturn = false;
        fsaTypeAnnotation = new ExpressionFsa_3.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentVar === null)
        throw new assert_1.AssertError("");
    state.mostRecentVar.type = fsaTypeAnnotation.runStartToStop(state.ts, state.wholeState);
}
function readValue(state) {
    if (state.mostRecentVar === null)
        throw new assert_1.AssertError("");
    state.mostRecentVar.value = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
var fsaLetBlock = new LetBlockFsa();
function parseWholeLetBlock(tree, wholeState) {
    if (tree.openToken.str !== "let")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.LetBlockNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        fsaLetBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeLetBlock = parseWholeLetBlock;
//# sourceMappingURL=LetBlockFsa.js.map