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
var assert_1 = require("../../utils/assert");
var streamConditions_1 = require("../../tokens/streamConditions");
var streamConditions_2 = require("../../tokens/streamConditions");
var ExpressionFsa_1 = require("../general/ExpressionFsa");
var streamConditions_3 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var fsaUtils_3 = require("../general/fsaUtils");
var streamConditions_7 = require("../../tokens/streamConditions");
var nodes_1 = require("../../parseTree/nodes");
var nodes_2 = require("../../parseTree/nodes");
var streamConditions_8 = require("../../tokens/streamConditions");
var ExpressionFsa_2 = require("./../general/ExpressionFsa");
var ExpressionFsa_3 = require("../general/ExpressionFsa");
var streamConditions_9 = require("../../tokens/streamConditions");
var fsaUtils_4 = require("../general/fsaUtils");
var fsaUtils_5 = require("../general/fsaUtils");
/**
 * Parses a macro invocation.
 *
 * Since we removed all spaces except \n from the token stream, we introduce the possibility of misparsing
 * the macro invocation. ie
 *
 *   @sprintf("%d", 5)
 *   @sprintf ("%d, 5)  <-- this should be treated as a single argument
 *
 * But without redoing everything to handle whitespace everywhere, we can just ignore this rare issue for now.
 * People rarely will use the space delimited form with multiple arguments with the first argument in parentheses.
 */
class MacroCallFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let macroNameWithSpace = new fsaUtils_2.FsaState("macro name with space");
        let macroNameWithoutSpace = new fsaUtils_2.FsaState("macro name without space");
        let spaceDelimitedArgList = new fsaUtils_2.FsaState("space delimited arg list");
        let commaDelimitedArgList = new fsaUtils_2.FsaState("comma delimited arg list");
        // space delimited
        startState.addArc(macroNameWithSpace, streamConditions_2.streamAtMacroWithSpace, readMacroName);
        macroNameWithSpace.addArc(spaceDelimitedArgList, streamConditions_4.alwaysPasses, doNothing);
        // spaces were already removed from stream, so just keep reading expressions until end of line or ;
        spaceDelimitedArgList.addArc(stopState, streamConditions_5.streamAtNewLineOrSemicolon, doNothing);
        spaceDelimitedArgList.addArc(stopState, streamConditions_3.streamAtComment, doNothing);
        spaceDelimitedArgList.addArc(spaceDelimitedArgList, streamConditions_4.alwaysPasses, readSpaceDelimitedArg);
        // comma delimited
        startState.addArc(macroNameWithoutSpace, streamConditions_9.streamAtMacroWithoutSpace, readMacroName);
        macroNameWithoutSpace.addArc(commaDelimitedArgList, streamConditions_7.streamAtOpenParenthesis, readCommaArgList);
        commaDelimitedArgList.addArc(stopState, streamConditions_4.alwaysPasses, doNothing);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_3.runFsaStartToStop(this, parseState);
    }
}
class MacroCommaArgListFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let commaDelimitedArg = new fsaUtils_2.FsaState("comma delimited arg");
        let comma = new fsaUtils_2.FsaState("comma");
        for (let state of [comma, commaDelimitedArg]) {
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
        }
        // 0 or more args
        startState.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        startState.addArc(commaDelimitedArg, streamConditions_4.alwaysPasses, readCommaDelimitedArg);
        // must have comma to continue list
        commaDelimitedArg.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        commaDelimitedArg.addArc(comma, streamConditions_8.streamAtComma, skipOneToken);
        // must have arg after a comma
        comma.addArc(commaDelimitedArg, streamConditions_4.alwaysPasses, readCommaDelimitedArg);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let state = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_3.runFsaStartToStop(this, state);
    }
}
class ParseState {
    constructor(ts, // note the stream will get switched to another stream if comma delimited list of args
        nodeToFill, wholeState) {
        this.ts = ts;
        this.nodeToFill = nodeToFill;
        this.wholeState = wholeState;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readMacroName(state) {
    let tok = state.ts.read();
    state.nodeToFill.name = new nodes_2.IdentifierNode(tok);
}
function readCommaArgList(state) {
    let tokenTree = state.ts.read();
    parseCommaArgList(tokenTree, state.nodeToFill, state.wholeState);
}
var fsaMacroCallExpressions = null; // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readCommaDelimitedArg(state) {
    if (fsaMacroCallExpressions === null) {
        // Used to read expressions within a function call body
        // commas must be treated specially as an escape, not a binary operator
        let fsaOptions = new ExpressionFsa_1.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaOptions.allowSplat = true;
        fsaMacroCallExpressions = new ExpressionFsa_3.ExpressionFsa(fsaOptions);
    }
    let expr = fsaMacroCallExpressions.runStartToStop(state.ts, state.wholeState);
    state.nodeToFill.params.push(expr);
}
function readSpaceDelimitedArg(state) {
    let expr = ExpressionFsa_2.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.params.push(expr);
}
var fsaMacroCall = new MacroCallFsa();
/**
 *
 * @param ts Stream should be scrolled back to be at the macro name.
 * @param wholeState
 */
function parseMacroCall(ts, wholeState) {
    // TODO catch parse errors if the macro was invoked with parentheses
    // may even be able to catch parse errors if macro invoked with space delimited params
    // Just keep reading expressions until end of line
    let node = new nodes_1.MacroInvocationNode();
    fsaMacroCall.runStartToStop(ts, node, wholeState);
    return node;
}
exports.parseMacroCall = parseMacroCall;
var fsaMacroCommaArgList = new MacroCommaArgListFsa();
function parseCommaArgList(bracketTree, node, wholeState) {
    if (bracketTree.openToken.str !== "(")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(bracketTree.contents, bracketTree.openToken);
    try {
        fsaMacroCommaArgList.runStartToStop(ts, node, wholeState);
        fsaUtils_4.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, bracketTree.contents, wholeState);
    }
}
exports.parseCommaArgList = parseCommaArgList;
//# sourceMappingURL=MacroCallFsa.js.map