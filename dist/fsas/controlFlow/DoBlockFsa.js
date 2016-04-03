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
var ExpressionFsa_1 = require("../general/ExpressionFsa");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
var streamConditions_1 = require("./../../tokens/streamConditions");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_1 = require("./../../parseTree/nodes");
var nodes_2 = require("./../../parseTree/nodes");
var streamConditions_8 = require("./../../tokens/streamConditions");
var streamConditions_9 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var fsaUtils_5 = require("../general/fsaUtils");
var nodes_3 = require("../../parseTree/nodes");
var ExpressionFsa_2 = require("../general/ExpressionFsa");
var ExpressionFsa_3 = require("../general/ExpressionFsa");
class DoBlockFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        // similar to function definition's arg list, but cannot have default values or keyword args
        let argList = new fsaUtils_4.FsaState("arg list");
        let argName = new fsaUtils_4.FsaState("arg name");
        let argDoubleColon = new fsaUtils_4.FsaState("arg ::");
        let argTypeAnnotation = new fsaUtils_4.FsaState("arg type annotation");
        let argListComma = new fsaUtils_4.FsaState("arg list comma");
        let body = new fsaUtils_4.FsaState("body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
        let allStatesExceptStop = [startState, argList, argName, argDoubleColon, argTypeAnnotation, argListComma, body, betweenExpressions];
        // allow comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtComment, skipOneToken);
        }
        // ignore new lines in certain locations
        for (let state of [argDoubleColon, argListComma, body]) {
            state.addArc(state, streamConditions_2.streamAtNewLine, skipOneToken);
        }
        startState.addArc(argList, streamConditions_4.alwaysPasses, doNothing);
        // arg list has 0 or more args
        argList.addArc(body, streamConditions_7.streamAtNewLineOrSemicolon, skipOneToken); // end of arg list
        argList.addArc(argName, streamConditions_3.streamAtIdentifier, readArgName);
        // optional type annotation
        argName.addArc(argDoubleColon, streamConditions_8.streamAtDoubleColon, skipOneToken);
        argDoubleColon.addArc(argTypeAnnotation, streamConditions_4.alwaysPasses, readArgTypeExpression);
        // after an arg, can have another arg or go straight to body
        argName.addArc(argListComma, streamConditions_9.streamAtComma, skipOneToken);
        argName.addArc(body, streamConditions_7.streamAtNewLineOrSemicolon, skipOneToken); // end of arg list
        argTypeAnnotation.addArc(argListComma, streamConditions_9.streamAtComma, skipOneToken);
        argTypeAnnotation.addArc(body, streamConditions_7.streamAtNewLineOrSemicolon, skipOneToken);
        // must have another arg after comma
        argListComma.addArc(argName, streamConditions_3.streamAtIdentifier, readArgName);
        // body can have 0 or more expressions
        body.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        body.addArc(body, streamConditions_6.streamAtSemicolon, doNothing);
        body.addArc(betweenExpressions, streamConditions_4.alwaysPasses, readBodyExpression); // otherwise must be an expression
        betweenExpressions.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        betweenExpressions.addArc(body, streamConditions_7.streamAtNewLineOrSemicolon, skipOneToken); // require delimiter
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
        this.mostRecentArg = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readArgName(state) {
    let tok = state.ts.read();
    let arg = new nodes_2.DoBlockArgNode(new nodes_3.IdentifierNode(tok));
    state.mostRecentArg = arg;
    state.nodeToFill.argList.push(arg);
}
var fsaDoBlockArgListExpression = null;
function readArgTypeExpression(state) {
    if (fsaDoBlockArgListExpression === null) {
        // Used to read expressions within the arg list of a do block.
        // Commas must be treated specially as an escape, not a binary operator.
        // But new lines should not continue an expression (unless after a unary/binary/ternary operator)
        let fsaOptions = new ExpressionFsa_3.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaDoBlockArgListExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentArg === null)
        throw new assert_1.AssertError("");
    state.mostRecentArg.type = fsaDoBlockArgListExpression.runStartToStop(state.ts, state.wholeState);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_2.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
var fsaDoBlock = new DoBlockFsa();
function parseWholeDoBlock(tree, wholeState) {
    if (tree.openToken.str !== "do")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.DoBlockNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, tokens)
        //} else {
        fsaDoBlock.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeDoBlock = parseWholeDoBlock;
//# sourceMappingURL=DoBlockFsa.js.map