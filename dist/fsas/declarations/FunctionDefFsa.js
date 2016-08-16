"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const streamConditions_2 = require("../../tokens/streamConditions");
const fsaUtils_1 = require("../general/fsaUtils");
const FunctionDefArgListFsa_1 = require("./FunctionDefArgListFsa");
const fsaUtils_2 = require("../general/fsaUtils");
const streamConditions_3 = require("./../../tokens/streamConditions");
const nodes_1 = require("./../../parseTree/nodes");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const streamConditions_8 = require("./../../tokens/streamConditions");
const streamConditions_9 = require("./../../tokens/streamConditions");
const streamConditions_10 = require("./../../tokens/streamConditions");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const nodes_2 = require("../../parseTree/nodes");
const assert_1 = require("../../utils/assert");
const GenericDefArgListFsa_1 = require("./GenericDefArgListFsa");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
/**
 * An automaton that recognizes the entire contents within a function ... end block.
 */
class FunctionDefFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let name = new fsaUtils_4.FsaState("function name");
        let nameDot = new fsaUtils_4.FsaState("function name dot");
        let overridableOperator = new fsaUtils_4.FsaState("overridable operator");
        let typeParams = this.typeParamsState = new fsaUtils_4.FsaState("type params");
        let functionArgList = this.functionArgListState = new fsaUtils_4.FsaState("function arg list"); // the entire handling of the arg list will be handled by a sub fsa
        let functionBody = this.functionBodyState = new fsaUtils_4.FsaState("function body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions"); // state after an expression has been read
        let allStatesExceptStop = [startState, name, nameDot, overridableOperator, typeParams, functionArgList, functionBody, betweenExpressions];
        // ignore new lines between parts of the function declaration
        for (let state of [startState, name, nameDot, typeParams]) {
            state.addArc(state, streamConditions_3.streamAtNewLine, skipOneToken);
        }
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_10.streamAtComment, skipOneToken);
        }
        // function name can be skipped if anonymous
        startState.addArc(name, streamConditions_4.streamAtIdentifier, readFunctionName);
        startState.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        startState.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        // name can have multiple parts if referring to a function name in another module
        name.addArc(nameDot, streamConditions_2.streamAtDot, skipOneToken);
        nameDot.addArc(name, streamConditions_4.streamAtIdentifier, readFunctionName);
        nameDot.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, readFunctionNameAsOverridableOperator);
        // type params only allowed if there was a function name
        name.addArc(typeParams, streamConditions_6.streamAtOpenCurlyBraces, readFunctionGenericParams);
        overridableOperator.addArc(typeParams, streamConditions_6.streamAtOpenCurlyBraces, readFunctionGenericParams);
        // must be followed by function arg list
        name.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        overridableOperator.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        typeParams.addArc(functionArgList, streamConditions_5.streamAtOpenParenthesis, readFunctionArgList);
        // rest must be function body
        functionArgList.addArc(functionBody, streamConditions_7.alwaysPasses, doNothing);
        // 0 or more expressions in body
        functionBody.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
        functionBody.addArc(functionBody, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        functionBody.addArc(betweenExpressions, streamConditions_7.alwaysPasses, readBodyExpression);
        // expressions must be delimited
        betweenExpressions.addArc(functionBody, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        // last expression does not need delimiter
        betweenExpressions.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
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
var fsaFunctionDef = new FunctionDefFsa();
function parseWholeFunctionDef(tree, wholeState) {
    if (tree.openToken.str !== "function")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(tree.contents, tree.openToken);
    let node = new nodes_1.FunctionDefNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        fsaFunctionDef.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseWholeFunctionDef = parseWholeFunctionDef;
//# sourceMappingURL=FunctionDefFsa.js.map