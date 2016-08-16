"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const fsaUtils_1 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const streamConditions_2 = require("../../tokens/streamConditions");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const streamConditions_3 = require("../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("../general/fsaUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const streamConditions_8 = require("../../tokens/streamConditions");
const nodes_1 = require("../../parseTree/nodes");
const nodes_2 = require("../../parseTree/nodes");
const streamConditions_9 = require("../../tokens/streamConditions");
const ExpressionFsa_2 = require("./../general/ExpressionFsa");
const ExpressionFsa_3 = require("../general/ExpressionFsa");
const fsaUtils_5 = require("../general/fsaUtils");
const fsaUtils_6 = require("../general/fsaUtils");
const streamConditions_10 = require("../../tokens/streamConditions");
const streamConditions_11 = require("../../tokens/streamConditions");
/**
 * Parses a macro invocation.
 */
class MacroCallFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        // for @Base.time
        // or @time
        let firstNameWithAt = new fsaUtils_3.FsaState("first name with @");
        let suffix = new fsaUtils_3.FsaState("suffix"); // no names should have @
        let dotSuffix = new fsaUtils_3.FsaState(". suffix");
        // for Base.@time
        let prefix = new fsaUtils_3.FsaState("prefix"); // no names should have @
        let dotPrefix = new fsaUtils_3.FsaState(". prefix");
        let lastNameWithAt = new fsaUtils_3.FsaState("last name with @");
        let space = new fsaUtils_3.FsaState("space");
        let spaceDelimitedArg = new fsaUtils_3.FsaState("space delimited arg");
        let commaDelimitedArgList = new fsaUtils_3.FsaState("comma delimited arg list");
        start.addArc(firstNameWithAt, streamConditions_3.streamAtMacroIdentifier, readMacroNamePart);
        firstNameWithAt.addArc(dotSuffix, streamConditions_11.streamAtDot, skipOneToken);
        dotSuffix.addArc(suffix, streamConditions_10.streamAtIdentifier, readMacroNamePart);
        suffix.addArc(dotSuffix, streamConditions_11.streamAtDot, skipOneToken);
        start.addArc(prefix, streamConditions_10.streamAtIdentifier, readMacroNamePart);
        prefix.addArc(dotPrefix, streamConditions_11.streamAtDot, skipOneToken);
        dotPrefix.addArc(prefix, streamConditions_10.streamAtIdentifier, readMacroNamePart);
        dotPrefix.addArc(lastNameWithAt, streamConditions_3.streamAtMacroIdentifier, readMacroNamePart);
        // valid name ending states
        for (let state of [firstNameWithAt, suffix, lastNameWithAt]) {
            // start a space delimited arg list
            state.addArc(space, streamConditions_1.streamAtLineWhitespace, skipOneToken);
            // start a comma delimited arg list
            state.addArc(commaDelimitedArgList, streamConditions_8.streamAtOpenParenthesis, readCommaArgList);
            // no args nor parentheses before new line
            state.addArc(stop, streamConditions_6.streamAtNewLineOrSemicolon, doNothing);
            state.addArc(stop, streamConditions_4.streamAtComment, doNothing);
            state.addArc(stop, streamConditions_7.streamAtEof, doNothing);
        }
        // handle space delimited arg list
        space.addArc(stop, streamConditions_6.streamAtNewLineOrSemicolon, doNothing);
        space.addArc(stop, streamConditions_4.streamAtComment, doNothing);
        space.addArc(spaceDelimitedArg, streamConditions_5.alwaysPasses, readSpaceDelimitedArg);
        // reading expressions for space delimited args will already skip past spaces
        // so don't need to specifically require a space between args
        spaceDelimitedArg.addArc(stop, streamConditions_6.streamAtNewLineOrSemicolon, doNothing);
        spaceDelimitedArg.addArc(stop, streamConditions_4.streamAtComment, doNothing);
        spaceDelimitedArg.addArc(stop, streamConditions_7.streamAtEof, doNothing);
        spaceDelimitedArg.addArc(spaceDelimitedArg, streamConditions_5.alwaysPasses, readSpaceDelimitedArg);
        // handle comma delimited arg list
        commaDelimitedArgList.addArc(stop, streamConditions_5.alwaysPasses, doNothing);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_1.runFsaStartToStopAllowWhitespace(this, parseState);
    }
}
class MacroCommaArgListFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let commaDelimitedArg = new fsaUtils_3.FsaState("comma delimited arg");
        let comma = new fsaUtils_3.FsaState("comma");
        for (let state of [comma, commaDelimitedArg]) {
            state.addArc(state, streamConditions_2.streamAtNewLine, skipOneToken);
        }
        // 0 or more args
        startState.addArc(stopState, streamConditions_7.streamAtEof, doNothing);
        startState.addArc(commaDelimitedArg, streamConditions_5.alwaysPasses, readCommaDelimitedArg);
        // must have comma to continue list
        commaDelimitedArg.addArc(stopState, streamConditions_7.streamAtEof, doNothing);
        commaDelimitedArg.addArc(comma, streamConditions_9.streamAtComma, skipOneToken);
        // must have arg after a comma
        comma.addArc(commaDelimitedArg, streamConditions_5.alwaysPasses, readCommaDelimitedArg);
    }
    runStartToStop(ts, nodeToFill, wholeState) {
        let state = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_4.runFsaStartToStop(this, state);
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
function readMacroNamePart(state) {
    let tok = state.ts.read();
    state.nodeToFill.name.push(new nodes_2.IdentifierNode(tok));
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
        fsaUtils_5.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_6.handleParseErrorOnly(err, node, bracketTree.contents, wholeState);
    }
}
exports.parseCommaArgList = parseCommaArgList;
//# sourceMappingURL=MacroCallFsa.js.map