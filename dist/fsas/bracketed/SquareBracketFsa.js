"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const nodes_1 = require("../../parseTree/nodes");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const fsaUtils_1 = require("../general/fsaUtils");
const streamConditions_2 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("./../general/fsaUtils");
const fsaUtils_3 = require("./../general/fsaUtils");
const fsaUtils_4 = require("./../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const fsaUtils_5 = require("../general/fsaUtils");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
const streamConditions_7 = require("../../tokens/streamConditions");
const nodes_2 = require("../../parseTree/nodes");
const streamConditions_8 = require("../../tokens/streamConditions");
const streamConditions_9 = require("../../tokens/streamConditions");
const streamConditions_10 = require("../../tokens/streamConditions");
const streamConditions_11 = require("../../tokens/streamConditions");
const nodes_3 = require("../../parseTree/nodes");
const operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
const errors_1 = require("../../utils/errors");
const ExpressionFsa_3 = require("../general/ExpressionFsa");
/**
 * Recognizes an array literal or list comprehension, eg
 *   [1, 2, 3]
 *   [1 2; 3 4]
 *   [val+1 for val in arr]
 * Also recognizes an any array literal, eg
 *   {1, 2, 3}
 *   {1 2; 3 4}
 *   {val+1 for val in arr}
 *
 * Also recognizes an indexing operation, eg
 *   arr[1, 2]
 * which is indistinguishable from a typed hcat/vcat operation, eg
 *   Float32[1, 2]
 *
 * Doesn't bother distinguishing whether result is a row vector, col vector, 2d array, etc
 * nor validates the dimensions.
 */
class SquareBracketFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let firstExpr = new fsaUtils_3.FsaState("first expression");
        let expr = new fsaUtils_3.FsaState("expression");
        let delimiter = new fsaUtils_3.FsaState("between expressions");
        // for list comprehensions
        let forState = new fsaUtils_3.FsaState("for");
        let iterVariable = new fsaUtils_3.FsaState("iter variable");
        let equals = new fsaUtils_3.FsaState("equals");
        let inKeyword = new fsaUtils_3.FsaState("in keyword");
        let iterRange = new fsaUtils_3.FsaState("iter range");
        let allStatesExceptStop = [startState, firstExpr, expr, delimiter, forState, iterVariable, equals, inKeyword, iterRange];
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_3.streamAtComment, skipOneToken);
        }
        // zero or more expressions
        startState.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        startState.addArc(startState, streamConditions_2.streamAtNewLine, skipOneToken);
        startState.addArc(firstExpr, streamConditions_4.alwaysPasses, readExpression);
        // the first expression can be part of a list comprehension
        // or else just treat as any other expression
        firstExpr.addArc(firstExpr, streamConditions_2.streamAtNewLine, skipOneToken);
        firstExpr.addArc(forState, streamConditions_7.streamAtFor, startListComprehension);
        firstExpr.addArc(expr, streamConditions_4.alwaysPasses, doNothing);
        // commas, semicolons, spaces, and new lines are delimiters
        expr.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        expr.addArc(expr, streamConditions_2.streamAtNewLine, skipOneToken);
        expr.addArc(delimiter, streamConditions_6.streamAtComma, skipOneToken);
        expr.addArc(delimiter, streamConditions_1.streamAtSemicolon, skipOneToken);
        expr.addArc(delimiter, streamConditions_4.alwaysPasses, doNothing); // spaces are implicit, so always otherwise go to next expression
        // after a delimiter, have to have another expression
        delimiter.addArc(delimiter, streamConditions_2.streamAtNewLine, skipOneToken); // allow extra spacing
        delimiter.addArc(expr, streamConditions_4.alwaysPasses, readExpression);
        // handle list comprehension
        // allow new lines in certain areas
        // \n not allowed between iter variable and in/=
        for (let state of [forState, equals, inKeyword, iterRange]) {
            state.addArc(state, streamConditions_2.streamAtNewLine, skipOneToken);
        }
        // can have a single iteration variable or a tuple of destructured variables
        forState.addArc(iterVariable, streamConditions_8.streamAtIdentifier, readIterVariable);
        forState.addArc(iterVariable, streamConditions_9.streamAtOpenParenthesis, readMultipleIterVariables);
        // either = or in
        iterVariable.addArc(equals, streamConditions_10.streamAtEquals, skipOneToken);
        iterVariable.addArc(inKeyword, streamConditions_11.streamAtIn, skipOneToken);
        equals.addArc(iterRange, streamConditions_4.alwaysPasses, readIterRange);
        inKeyword.addArc(iterRange, streamConditions_4.alwaysPasses, readIterRange);
        iterRange.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
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
        this.listComprehensionNode = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
var fsaArrayLiteralExpression = null; // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readExpression(state) {
    if (fsaArrayLiteralExpression === null) {
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.allowSplat = true;
        fsaOptions.allowSingleColon = true;
        fsaArrayLiteralExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    let node = fsaArrayLiteralExpression.runStartToStop(state.ts, state.wholeState);
    state.nodeToFill.contents.push(node);
}
function startListComprehension(state) {
    state.ts.read(); // discard 'for'
    // replace the expression with a for node which represents the list comprehension
    let firstExpression = state.nodeToFill.contents.pop();
    let forNode = new nodes_2.ForBlockNode();
    state.nodeToFill.contents.push(forNode);
    forNode.expressions.push(firstExpression);
    state.listComprehensionNode = forNode;
}
function readIterVariable(state) {
    let tok = state.ts.read();
    state.listComprehensionNode.iterVariable.push(new nodes_3.IdentifierNode(tok));
}
function readMultipleIterVariables(state) {
    let parenTok = state.ts.read();
    let ts = new TokenStream_1.TokenStream(parenTok.contents, parenTok.openToken);
    ts.skipToNextNonWhitespace();
    while (!ts.eof()) {
        let tok = ts.read();
        if (tok.type !== operatorsAndKeywords_1.TokenType.Identifier) {
            state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Expecting an identifier.", tok));
            return;
        }
        state.listComprehensionNode.iterVariable.push(new nodes_3.IdentifierNode(tok));
        ts.skipToNextNonWhitespace();
        if (ts.eof())
            break;
        tok = ts.read();
        if (!(tok.type === operatorsAndKeywords_1.TokenType.Operator && tok.str === ",")) {
            state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Expecting ','", tok));
            return;
        }
        ts.skipToNextNonWhitespace();
    }
    if (state.listComprehensionNode.iterVariable.length === 0) {
        state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Must have at least one name.", parenTok));
    }
}
function readIterRange(state) {
    state.listComprehensionNode.range = ExpressionFsa_3.parseGeneralBlockExpression(state.ts, state.wholeState);
}
var squareBracketFsa = new SquareBracketFsa();
function parseSquareBracket(bracketTree, wholeState) {
    if (bracketTree.openToken.str !== "[")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(bracketTree.contents, bracketTree.openToken);
    let node = new nodes_1.SquareBracketNode();
    try {
        squareBracketFsa.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, bracketTree.contents, wholeState);
    }
    return node;
}
exports.parseSquareBracket = parseSquareBracket;
function parseAnyArrayLiteral(bracketTree, wholeState) {
    if (bracketTree.openToken.str !== "{")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(bracketTree.contents, bracketTree.openToken);
    let node = new nodes_1.SquareBracketNode();
    node.isAnyArray = true;
    try {
        squareBracketFsa.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, bracketTree.contents, wholeState);
    }
    return node;
}
exports.parseAnyArrayLiteral = parseAnyArrayLiteral;
//# sourceMappingURL=SquareBracketFsa.js.map