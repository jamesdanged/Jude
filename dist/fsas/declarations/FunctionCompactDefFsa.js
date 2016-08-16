"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const streamConditions_2 = require("../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const nodes_1 = require("./../../parseTree/nodes");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const streamConditions_8 = require("./../../tokens/streamConditions");
const fsaUtils_1 = require("../general/fsaUtils");
const fsaUtils_2 = require("../general/fsaUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const streamConditions_9 = require("../../tokens/streamConditions");
const nodes_2 = require("../../parseTree/nodes");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const FunctionDefArgListFsa_1 = require("./FunctionDefArgListFsa");
const GenericDefArgListFsa_1 = require("./GenericDefArgListFsa");
const operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
/**
 * Recognizes a compact function declaration, such as
 *  f{T}(val::T) = val + 1
 * where there is no 'function' or 'end' and the body is a single expression.
 */
class FunctionCompactDefFsa extends fsaUtils_1.BaseFsa {
    /**
     * The token stream is assumed to have the function name (being assigned to) as the first token.
     */
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let name = new fsaUtils_2.FsaState('function name');
        let nameDot = new fsaUtils_2.FsaState("function name dot");
        let overridableOperator = new fsaUtils_2.FsaState("overridable operator");
        let typeParams = new fsaUtils_2.FsaState("type params");
        let functionArgList = new fsaUtils_2.FsaState("function arg list");
        let equalsSign = new fsaUtils_2.FsaState("= sign");
        let functionBody = new fsaUtils_2.FsaState("function body");
        let allStatesExceptStop = [startState, name, nameDot, overridableOperator, typeParams, functionArgList, equalsSign, functionBody];
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
        startState.addArc(name, streamConditions_4.streamAtIdentifier, readFunctionName);
        startState.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        // name can have multiple parts if referring to a function name in another module
        name.addArc(nameDot, streamConditions_2.streamAtDot, skipOneToken);
        nameDot.addArc(name, streamConditions_4.streamAtIdentifier, readFunctionName);
        nameDot.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        // optional type params
        name.addArc(typeParams, streamConditions_6.streamAtOpenCurlyBraces, readFunctionGenericParams);
        overridableOperator.addArc(typeParams, streamConditions_6.streamAtOpenCurlyBraces, readFunctionGenericParams);
        // must be followed by function arg list
        name.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        overridableOperator.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
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