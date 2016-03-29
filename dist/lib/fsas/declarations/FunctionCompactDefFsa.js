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
var streamConditions_1 = require("../../tokens/streamConditions");
var streamConditions_2 = require("../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var streamConditions_8 = require("./../../tokens/streamConditions");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var streamConditions_9 = require("../../tokens/streamConditions");
var nodes_2 = require("../../parseTree/nodes");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
var FunctionDefArgListFsa_1 = require("./FunctionDefArgListFsa");
var GenericDefArgListFsa_1 = require("./GenericDefArgListFsa");
var operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
/**
 * Recognizes a compact function declaration, such as
 *  f{T}(val::T) = val + 1
 * where there is no 'function' or 'end' and the body is a single expression.
 */
class FunctionCompactDefFsa {
    /**
     * The token stream is assumed to have the function name (being assigned to) as the first token.
     */
    constructor() {
        let startState = new fsaUtils_1.FsaState("start");
        let stopState = new fsaUtils_1.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let functionName = new fsaUtils_1.FsaState('function name');
        let functionNameDot = new fsaUtils_1.FsaState("function name dot");
        let typeParams = new fsaUtils_1.FsaState("type params");
        let functionArgList = new fsaUtils_1.FsaState("function arg list");
        let equalsSign = new fsaUtils_1.FsaState("= sign");
        let functionBody = new fsaUtils_1.FsaState("function body");
        let allStatesExceptStop = [startState, functionName, functionNameDot, typeParams, functionArgList, equalsSign, functionBody];
        // TODO allow newlines between elements if the def is contained within a parentheses
        // ignore new lines between parts of the function declaration
        //for (let state of [startState, functionName, typeParams]) {
        //  state.addArc(state, streamAtNewLine, skipOneToken)
        //}
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_8.streamAtComment, skipOneToken);
        }
        // function name cannot be skipped
        startState.addArc(functionName, streamConditions_4.streamAtIdentifier, readFunctionName);
        startState.addArc(functionName, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        // name can have multiple parts if referring to a function name in another module
        functionName.addArc(functionNameDot, streamConditions_2.streamAtDot, skipOneToken);
        functionNameDot.addArc(functionName, streamConditions_4.streamAtIdentifier, readFunctionName);
        functionNameDot.addArc(functionName, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        // optional type params
        functionName.addArc(typeParams, streamConditions_6.streamAtOpenCurlyBraces, readFunctionGenericParams);
        // must be followed by function arg list
        functionName.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        typeParams.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        // require equals sign
        functionArgList.addArc(equalsSign, streamConditions_9.streamAtEquals, skipOneToken);
        // allow body on separate line
        equalsSign.addArc(equalsSign, streamConditions_3.streamAtNewLine, skipOneToken);
        // rest must be function body
        equalsSign.addArc(functionBody, streamConditions_7.alwaysPasses, readBodyExpression);
        functionBody.addArc(stopState, streamConditions_7.alwaysPasses, doNothing);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_2.runFsaStartToStop(this, parseState);
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
function readFunctionName(state) {
    let token = state.ts.read();
    state.nodeToFill.name.push(new nodes_2.IdentifierNode(token));
}
function readFunctionNameAsOverridableOperator(state) {
    let token = state.ts.read();
    // change token from an operator to an identifier
    token.type = operatorsAndKeywords_1.TokenType.Identifier;
    state.nodeToFill.name.push(new nodes_2.IdentifierNode(token));
}
function readFunctionGenericParams(state) {
    let curlyBracesToken = state.ts.read();
    state.nodeToFill.genericArgs = GenericDefArgListFsa_1.parseGenericDefArgList(curlyBracesToken, state.wholeState);
}
function readFunctionArgList(state) {
    let parenToken = state.ts.read();
    FunctionDefArgListFsa_1.parseFunctionDefArgList(state.nodeToFill.args, parenToken, state.wholeState);
}
function readBodyExpression(state) {
    let exprNode = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.bodyExpressions.push(exprNode);
}
var fsaFunctionCompactDef = new FunctionCompactDefFsa();
function parseWholeCompactFunctionDef(ts, wholeState) {
    // does not handle errors
    let node = new nodes_1.FunctionDefNode();
    node.scopeStartToken = ts.peek();
    fsaFunctionCompactDef.runStartToStop(ts, node, wholeState);
    node.scopeEndToken = ts.getLastToken();
    return node;
}
exports.parseWholeCompactFunctionDef = parseWholeCompactFunctionDef;
//# sourceMappingURL=FunctionCompactDefFsa.js.map