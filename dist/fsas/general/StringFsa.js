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
var fsaUtils_1 = require("./fsaUtils");
var fsaUtils_2 = require("./fsaUtils");
var fsaUtils_3 = require("./fsaUtils");
var streamConditions_1 = require("../../tokens/streamConditions");
var TokenStream_1 = require("../../tokens/TokenStream");
var fsaUtils_4 = require("./fsaUtils");
var nodes_1 = require("../../parseTree/nodes");
var streamConditions_2 = require("../../tokens/streamConditions");
var nodes_2 = require("../../parseTree/nodes");
var streamConditions_3 = require("../../tokens/streamConditions");
var streamConditions_4 = require("../../tokens/streamConditions");
var streamConditions_5 = require("../../tokens/streamConditions");
var streamConditions_6 = require("../../tokens/streamConditions");
var nodes_3 = require("../../parseTree/nodes");
var Token_1 = require("../../tokens/Token");
var assert_1 = require("../../utils/assert");
var ExpressionFsa_1 = require("./ExpressionFsa");
/**
 * Handles interpolated strings and simple strings.
 * Works for double quoted string and backtick (`) strings.
 */
class StringFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start");
        let stopState = new fsaUtils_3.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let stringLiteral = new fsaUtils_3.FsaState("string literal");
        let dollarSign = new fsaUtils_3.FsaState("$ sign");
        let interpVariable = new fsaUtils_3.FsaState("interpolated variable");
        let interpExpr = new fsaUtils_3.FsaState("interpolated expression");
        startState.addArc(stringLiteral, streamConditions_2.streamAtStringLiteral, readStringLiteral);
        startState.addArc(dollarSign, streamConditions_3.streamAtInterpolationStart, skipOneToken);
        startState.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        dollarSign.addArc(interpExpr, streamConditions_4.streamAtOpenParenthesis, readInterpolationExpression);
        dollarSign.addArc(interpVariable, streamConditions_5.streamAtIdentifier, readInterpolationVariable);
        stringLiteral.addArc(startState, streamConditions_1.alwaysPasses, doNothing);
        interpExpr.addArc(startState, streamConditions_1.alwaysPasses, doNothing);
        interpVariable.addArc(startState, streamConditions_1.alwaysPasses, doNothing);
    }
    /**
     * Only takes an interpolated string node. Caller can convert it to a simple string node if there is only
     * one item in contents.
     *
     */
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
function readStringLiteral(state) {
    let tok = state.ts.read();
    state.nodeToFill.contents.push(new nodes_2.StringLiteralNode(tok));
}
function readInterpolationVariable(state) {
    let tok = state.ts.read();
    state.nodeToFill.contents.push(new nodes_3.IdentifierNode(tok));
}
function readInterpolationExpression(state) {
    let tok = state.ts.read();
    if (tok instanceof Token_1.TreeToken) {
        let exprNode = ExpressionFsa_1.parseGroupingParenthesisExpression(tok, state.wholeState);
        state.nodeToFill.contents.push(exprNode);
    }
    else {
        throw new assert_1.AssertError("");
    }
}
var fsaStringFsa = new StringFsa();
function parseString(tree, wholeState) {
    if (tree.openToken.str !== "\"" && tree.openToken.str !== "`")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.InterpolatedStringNode();
    if (tree.openToken.str === "`")
        node.isBackTick = true;
    try {
        fsaStringFsa.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
        if (node.contents.length === 1 && node.contents[0] instanceof nodes_2.StringLiteralNode) {
            let strLitNode = node.contents[0];
            strLitNode.isBackTick = node.isBackTick;
            return strLitNode;
        }
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseString = parseString;
//# sourceMappingURL=StringFsa.js.map