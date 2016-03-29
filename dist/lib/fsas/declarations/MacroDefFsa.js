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
var nodes_1 = require("../../parseTree/nodes");
var fsaUtils_1 = require("../general/fsaUtils");
var TokenStream_1 = require("./../../tokens/TokenStream");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var fsaUtils_2 = require("../general/fsaUtils");
var fsaUtils_3 = require("../general/fsaUtils");
var nodes_2 = require("../../parseTree/nodes");
/**
 * Recognizes the body of a macro...end declaration.
 *
 * Not fully implemented. Just stores everything inside the node.
 */
class MacroDefFsa {
    constructor() {
        let startState = new fsaUtils_2.FsaState("start");
        let stopState = new fsaUtils_2.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let macroName = new fsaUtils_2.FsaState("macro name");
        let argList = new fsaUtils_2.FsaState("arg list");
        let body = new fsaUtils_2.FsaState("body");
        let allStatesExceptStop = [startState, macroName, argList, body];
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        startState.addArc(macroName, streamConditions_3.streamAtIdentifier, readMacroName);
        macroName.addArc(argList, streamConditions_1.streamAtOpenParenthesis, readArgList);
        argList.addArc(body, streamConditions_4.alwaysPasses, doNothing);
        body.addArc(stopState, streamConditions_4.alwaysPasses, doNothing); // simply discard the macro body contents for now
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
function readMacroName(state) {
    let tok = state.ts.read();
    state.nodeToFill.name = new nodes_2.IdentifierNode(tok);
}
function readArgList(state) {
    let tree = state.ts.read();
    // just discard
}
var fsaMacroDef = new MacroDefFsa();
function parseWholeMacroDef(tree, wholeState) {
    let ts = new TokenStream_1.TokenStream(tree.contents, tree.openToken);
    let node = new nodes_1.MacroDefNode();
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    let parseState = new ParseState(ts, node, wholeState);
    try {
        fsaUtils_3.runFsaStartToStop(fsaMacroDef, parseState);
    }
    catch (err) {
        fsaUtils_1.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseWholeMacroDef = parseWholeMacroDef;
//# sourceMappingURL=MacroDefFsa.js.map