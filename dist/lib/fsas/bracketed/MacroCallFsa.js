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
var ExpressionFsa_1 = require("../general/ExpressionFsa");
var streamConditions_2 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var streamConditions_6 = require("../../tokens/streamConditions");
var nodes_1 = require("../../parseTree/nodes");
var nodes_2 = require("../../parseTree/nodes");
var streamConditions_7 = require("../../tokens/streamConditions");
var ExpressionFsa_2 = require("./../general/ExpressionFsa");
var ExpressionFsa_3 = require("../general/ExpressionFsa");
var streamConditions_8 = require("../../tokens/streamConditions");
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
class MacroCallFsa {
    constructor() {
        let startState = new fsaUtils_1.FsaState("start");
        let stopState = new fsaUtils_1.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let macroNameWithSpace = new fsaUtils_1.FsaState("macro name with space");
        let macroNameWithoutSpace = new fsaUtils_1.FsaState("macro name without space");
        let spaceDelimitedArgList = new fsaUtils_1.FsaState("space delimited arg list");
        let commaDelimitedArgList = new fsaUtils_1.FsaState("comma delimited arg list");
        let commaDelimitedArg = new fsaUtils_1.FsaState("comma delimited arg");
        let comma = new fsaUtils_1.FsaState("comma");
        // space delimited
        startState.addArc(macroNameWithSpace, streamConditions_1.streamAtMacroWithSpace, readMacroName);
        macroNameWithSpace.addArc(spaceDelimitedArgList, streamConditions_3.alwaysPasses, doNothing);
        // spaces were already removed from stream, so just keep reading expressions until end of line or ;
        spaceDelimitedArgList.addArc(stopState, streamConditions_4.streamAtNewLineOrSemicolon, doNothing);
        spaceDelimitedArgList.addArc(stopState, streamConditions_2.streamAtComment, doNothing);
        spaceDelimitedArgList.addArc(spaceDelimitedArgList, streamConditions_3.alwaysPasses, readSpaceDelimitedArg);
        // comma delimited
        startState.addArc(macroNameWithoutSpace, streamConditions_8.streamAtMacroWithoutSpace, readMacroName);
        macroNameWithoutSpace.addArc(commaDelimitedArgList, streamConditions_6.streamAtOpenParenthesis, switchToParenStream);
        // 0 or more args
        commaDelimitedArgList.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        commaDelimitedArgList.addArc(commaDelimitedArg, streamConditions_3.alwaysPasses, readCommaDelimitedArg);
        // must have comma to continue list
        commaDelimitedArg.addArc(stopState, streamConditions_5.streamAtEof, doNothing);
        commaDelimitedArg.addArc(comma, streamConditions_7.streamAtComma, skipOneToken);
        // must have arg after a comma
        comma.addArc(commaDelimitedArg, streamConditions_3.alwaysPasses, readCommaDelimitedArg);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_2.runFsaStartToStop(this, parseState);
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
function switchToParenStream(state) {
    let tokenTree = state.ts.read();
    state.ts = new TokenStream_1.TokenStream(tokenTree.contents, tokenTree.openToken);
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
//# sourceMappingURL=MacroCallFsa.js.map