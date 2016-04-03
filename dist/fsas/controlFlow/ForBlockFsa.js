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
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var streamConditions_2 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var streamConditions_8 = require("./../../tokens/streamConditions");
var streamConditions_9 = require("./../../tokens/streamConditions");
var streamConditions_10 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var fsaUtils_5 = require("../general/fsaUtils");
var nodes_2 = require("../../parseTree/nodes");
var assert_1 = require("../../utils/assert");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
var operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
var errors_1 = require("../../utils/errors");
class ForBlockFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let iterVariable = new fsaUtils_4.FsaState("iter variable");
        let equals = new fsaUtils_4.FsaState("equals");
        let inKeyword = new fsaUtils_4.FsaState("in keyword");
        let iterRange = new fsaUtils_4.FsaState("iter range");
        let body = new fsaUtils_4.FsaState("body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
        let allStatesExceptStop = [startState, iterVariable, equals, inKeyword, iterRange, body, betweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // allow new lines in certain areas
        // \n not allowed between iter variable and in/=
        for (let state of [startState, equals, inKeyword, iterRange, body]) {
            state.addArc(state, streamConditions_3.streamAtNewLine, skipOneToken);
        }
        // can have a single iteration variable or a tuple of destructured variables
        startState.addArc(iterVariable, streamConditions_4.streamAtIdentifier, readIterVariable);
        startState.addArc(iterVariable, streamConditions_1.streamAtOpenParenthesis, readMultipleIterVariables);
        // either = or in
        iterVariable.addArc(equals, streamConditions_5.streamAtEquals, skipOneToken);
        iterVariable.addArc(inKeyword, streamConditions_6.streamAtIn, skipOneToken);
        equals.addArc(iterRange, streamConditions_7.alwaysPasses, readIterRange);
        inKeyword.addArc(iterRange, streamConditions_7.alwaysPasses, readIterRange);
        iterRange.addArc(body, streamConditions_7.alwaysPasses, doNothing);
        body.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
        body.addArc(body, streamConditions_9.streamAtSemicolon, doNothing);
        body.addArc(betweenExpressions, streamConditions_7.alwaysPasses, readBodyExpression);
        betweenExpressions.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
        betweenExpressions.addArc(body, streamConditions_10.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
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
function readIterVariable(state) {
    let tok = state.ts.read();
    state.nodeToFill.iterVariable.push(new nodes_2.IdentifierNode(tok));
}
function readMultipleIterVariables(state) {
    let parenTok = state.ts.read();
    let ts = new TokenStream_1.TokenStream(parenTok.contents, parenTok.openToken);
    ts.skipNewLinesAndComments();
    while (!ts.eof()) {
        let tok = ts.read();
        if (tok.type !== operatorsAndKeywords_1.TokenType.Identifier) {
            state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Expecting an identifier.", tok));
            return;
        }
        state.nodeToFill.iterVariable.push(new nodes_2.IdentifierNode(tok));
        ts.skipNewLinesAndComments();
        if (ts.eof())
            break;
        tok = ts.read();
        if (!(tok.type === operatorsAndKeywords_1.TokenType.Operator && tok.str === ",")) {
            state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Expecting ','", tok));
            return;
        }
        ts.skipNewLinesAndComments();
    }
    if (state.nodeToFill.iterVariable.length === 0) {
        state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Must have at least one name.", parenTok));
    }
}
function readIterRange(state) {
    state.nodeToFill.range = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
var fsaForBlock = new ForBlockFsa();
function parseWholeForBlock(tree, wholeState) {
    if (tree.openToken.str !== "for")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.ForBlockNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, tokens)
        //} else {
        fsaForBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeForBlock = parseWholeForBlock;
//# sourceMappingURL=ForBlockFsa.js.map