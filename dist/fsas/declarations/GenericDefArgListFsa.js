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
var assert_1 = require("../../utils/assert");
var nodes_1 = require("./../../parseTree/nodes");
var TokenStream_1 = require("./../../tokens/TokenStream");
var nodes_2 = require("./../../parseTree/nodes");
var streamConditions_1 = require("./../../tokens/streamConditions");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var fsaUtils_2 = require("../general/fsaUtils");
var fsaUtils_3 = require("../general/fsaUtils");
var nodes_3 = require("../../parseTree/nodes");
var fsaUtils_4 = require("../general/fsaUtils");
var ExpressionFsa_2 = require("../general/ExpressionFsa");
/**
 * An automaton that recognizes the entire contents within {...} of a type parameter list declaration
 * of a generic function or a generic type.
 */
class GenericDefArgListFsa {
    constructor() {
        let startState = new fsaUtils_2.FsaState("start");
        let stopState = new fsaUtils_2.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let argName = new fsaUtils_2.FsaState("arg name");
        let lessThanColon = new fsaUtils_2.FsaState("<:");
        let typeRestriction = new fsaUtils_2.FsaState("type restriction");
        let comma = new fsaUtils_2.FsaState("comma");
        let allStatesExceptStop = [startState, argName, lessThanColon, typeRestriction, comma];
        // skip new lines and comments
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // at least one arg
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
        fsaUtils_3.runFsaStartToStop(this, parseState);
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
        fsaUtils_4.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseGenericDefArgList = parseGenericDefArgList;
//# sourceMappingURL=GenericDefArgListFsa.js.map