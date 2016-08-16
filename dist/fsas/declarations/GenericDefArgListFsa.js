"use strict";
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const fsaUtils_1 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const nodes_1 = require("./../../parseTree/nodes");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_2 = require("./../../parseTree/nodes");
const streamConditions_1 = require("./../../tokens/streamConditions");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const streamConditions_7 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("../general/fsaUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const nodes_3 = require("../../parseTree/nodes");
const fsaUtils_5 = require("../general/fsaUtils");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
/**
 * An automaton that recognizes the entire contents within {...} of a type parameter list declaration
 * of a generic function or a generic type.
 */
class GenericDefArgListFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let argName = new fsaUtils_3.FsaState("arg name");
        let lessThanColon = new fsaUtils_3.FsaState("<:");
        let typeRestriction = new fsaUtils_3.FsaState("type restriction");
        let comma = new fsaUtils_3.FsaState("comma");
        let allStatesExceptStop = [startState, argName, lessThanColon, typeRestriction, comma];
        // skip new lines and comments
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // 0 or more args
        startState.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        startState.addArc(argName, streamConditions_3.streamAtIdentifier, readArgName);
        // type restriction is optional
        argName.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        argName.addArc(comma, streamConditions_5.streamAtComma, skipOneToken);
        argName.addArc(lessThanColon, streamConditions_6.streamAtLessThanColon, skipOneToken);
        lessThanColon.addArc(typeRestriction, streamConditions_7.alwaysPasses, readTypeRestriction);
        typeRestriction.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        typeRestriction.addArc(comma, streamConditions_5.streamAtComma, skipOneToken);
        // must be another arg after a comma
        comma.addArc(argName, streamConditions_3.streamAtIdentifier, readArgName);
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
        this.mostRecentParam = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readArgName(state) {
    let token = state.ts.read();
    let arg = new nodes_1.GenericArgNode(new nodes_3.IdentifierNode(token));
    state.nodeToFill.args.push(arg);
    state.mostRecentParam = arg;
}
var fsaTypeAnnotationExpression = null;
function readTypeRestriction(state) {
    if (fsaTypeAnnotationExpression === null) {
        // Used to read expressions within {} which evaluate to types.
        // Commas must be treated specially as an escape, not a binary operator.
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaTypeAnnotationExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentParam === null)
        throw new assert_1.AssertError("");
    state.mostRecentParam.restriction = fsaTypeAnnotationExpression.runStartToStop(state.ts, state.wholeState);
}
var fsaGenericDefArgList = new GenericDefArgListFsa();
function parseGenericDefArgList(tree, wholeState) {
    if (tree.openToken.str !== "{")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(tree.contents, tree.openToken);
    let node = new nodes_2.GenericDefArgListNode();
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, curlyTree.contents)
        //} else {
        fsaGenericDefArgList.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseGenericDefArgList = parseGenericDefArgList;
//# sourceMappingURL=GenericDefArgListFsa.js.map