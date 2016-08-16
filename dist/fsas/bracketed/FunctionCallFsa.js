"use strict";
const fsaUtils_1 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const TokenStream_1 = require("./../../tokens/TokenStream");
const operatorsAndKeywords_1 = require("./../../tokens/operatorsAndKeywords");
const streamConditions_1 = require("./../../tokens/streamConditions");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const lookAheadStreamConditions_1 = require("./../general/lookAheadStreamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_6 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("./../general/fsaUtils");
const fsaUtils_3 = require("./../general/fsaUtils");
const fsaUtils_4 = require("./../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
/**
 * A automaton that recognizes the contents within the parentheses of a function invocation,
 * eg  foo(param1, param2, ...)
 */
class FunctionCallFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let orderedArgExpression = new fsaUtils_3.FsaState("ordered arg");
        let orderedArgComma = new fsaUtils_3.FsaState("ordered arg comma");
        let semicolonState = new fsaUtils_3.FsaState("semicolon");
        let keywordArg = new fsaUtils_3.FsaState("keyword arg");
        let keywordArgComma = new fsaUtils_3.FsaState("keyword arg comma");
        let allStatesExceptStop = [startState, orderedArgExpression, orderedArgComma, semicolonState, keywordArg,
            keywordArgComma];
        // add loops to ignore new lines and comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_5.streamAtNewLine, skipOneToken);
            state.addArc(state, streamConditions_6.streamAtComment, skipOneToken);
        }
        // can start with nothing (no params), a semicolon, a keyword arg, or an ordered arg
        startState.addArc(stopState, streamConditions_1.streamAtEof, doNothing); // passes if EOF
        startState.addArc(semicolonState, streamConditions_2.streamAtSemicolon, skipOneToken);
        startState.addArc(keywordArg, lookAheadStreamConditions_1.streamAtIdentifierEquals, readKeywordArg);
        startState.addArc(orderedArgExpression, streamConditions_3.alwaysPasses, readOrderedArg); // add this one last as its condition always passes
        // after an ordered arg, can have
        //   a comma and another arg
        //   a semicolon
        //   end
        orderedArgExpression.addArc(orderedArgComma, streamConditions_4.streamAtComma, skipOneToken);
        orderedArgExpression.addArc(semicolonState, streamConditions_2.streamAtSemicolon, skipOneToken);
        orderedArgExpression.addArc(stopState, streamConditions_1.streamAtEof, doNothing);
        orderedArgComma.addArc(stopState, streamConditions_1.streamAtEof, doNothing); // , can be dangling at end
        orderedArgComma.addArc(keywordArg, lookAheadStreamConditions_1.streamAtIdentifierEquals, readKeywordArg); // ; is optional in function calls. Required in function defs.
        orderedArgComma.addArc(orderedArgExpression, streamConditions_3.alwaysPasses, readOrderedArg); // add this one last as its condition always passes
        // after semicolon, can have a keyword arg or EOF
        semicolonState.addArc(keywordArg, lookAheadStreamConditions_1.streamAtIdentifierEquals, readKeywordArg);
        semicolonState.addArc(stopState, streamConditions_1.streamAtEof, doNothing);
        // after a keyword arg, can have
        //   a comma and another keyword arg
        //   end
        keywordArg.addArc(keywordArgComma, streamConditions_4.streamAtComma, skipOneToken);
        keywordArg.addArc(stopState, streamConditions_1.streamAtEof, doNothing);
        keywordArgComma.addArc(stopState, streamConditions_1.streamAtEof, doNothing);
        keywordArgComma.addArc(keywordArg, lookAheadStreamConditions_1.streamAtIdentifierEquals, readKeywordArg);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let state = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_4.runFsaStartToStop(this, state);
    }
}
class ParseState {
    constructor(ts, nodeToFill, wholeState) {
        this.ts = ts;
        this.nodeToFill = nodeToFill;
        this.wholeState = wholeState;
        this.streamStartIndex = ts.index;
        this.mostRecentKeyword = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readOrderedArg(state) {
    let paramValue = readExpression(state);
    state.nodeToFill.orderedArgs.push(paramValue);
}
function readKeywordArg(state) {
    let idToken = state.ts.readNonNewLine();
    if (idToken.type != operatorsAndKeywords_1.TokenType.Identifier)
        throw new assert_1.AssertError("");
    let paramName = idToken.str;
    state.ts.skipToNextNonWhitespace();
    let equalsToken = state.ts.readNonNewLine();
    if (equalsToken.str != "=")
        throw new assert_1.AssertError("");
    let paramValue = readExpression(state);
    state.nodeToFill.keywordArgs.push([paramName, paramValue]);
}
var fsaFunctionCallExpressions = null; // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readExpression(state) {
    if (fsaFunctionCallExpressions === null) {
        // Used to read expressions within a function call body
        // commas must be treated specially as an escape, not a binary operator
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaOptions.allowSplat = true;
        fsaOptions.allowSingleColon = true;
        fsaFunctionCallExpressions = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    return fsaFunctionCallExpressions.runStartToStop(state.ts, state.wholeState);
}
var fsaFunctionCall = new FunctionCallFsa();
function parseFunctionCallArgs(parenTree, wholeState) {
    if (parenTree.openToken.str !== "(")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(parenTree.contents, parenTree.openToken);
    let node = new nodes_1.FunctionCallNode();
    try {
        fsaFunctionCall.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, parenTree.contents, wholeState);
    }
    return node;
}
exports.parseFunctionCallArgs = parseFunctionCallArgs;
//# sourceMappingURL=FunctionCallFsa.js.map