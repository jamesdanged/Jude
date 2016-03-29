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
var fsaUtils_1 = require("./fsaUtils");
var ModuleContentsFsa_1 = require("./ModuleContentsFsa");
var fsaUtils_2 = require("./fsaUtils");
var fsaUtils_3 = require("./fsaUtils");
var TokenStream_1 = require("../../tokens/TokenStream");
var nodes_1 = require("../../parseTree/nodes");
var fsaUtils_4 = require("./fsaUtils");
var streamConditions_1 = require("../../tokens/streamConditions");
var streamConditions_2 = require("../../tokens/streamConditions");
var streamConditions_3 = require("../../tokens/streamConditions");
var nodes_2 = require("../../parseTree/nodes");
var streamConditions_4 = require("../../tokens/streamConditions");
var assert_1 = require("../../utils/assert");
class ModuleDefFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start");
        let stopState = new fsaUtils_3.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let nameState = new fsaUtils_3.FsaState("name");
        let bodyState = new fsaUtils_3.FsaState("body");
        let allStatesExceptStop = [startState, nameState, bodyState];
        // ignore comments and new lines everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
        }
        startState.addArc(nameState, streamConditions_3.streamAtIdentifier, readModuleName);
        nameState.addArc(bodyState, streamConditions_4.alwaysPasses, readBody);
        bodyState.addArc(stopState, streamConditions_4.alwaysPasses, doNothing);
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
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readModuleName(state) {
    let nameToken = state.ts.read();
    state.nodeToFill.name = new nodes_2.IdentifierNode(nameToken);
}
function readBody(state) {
    ModuleContentsFsa_1.parseModuleContents(state.ts, state.nodeToFill, state.wholeState);
}
var fsaModuleDef = new ModuleDefFsa();
function parseWholeModuleDef(tree, wholeState) {
    if (tree.openToken.str !== "module" && tree.openToken.str !== "baremodule")
        throw new assert_1.AssertError("");
    let tokens = tree.contents;
    let ts = new TokenStream_1.TokenStream(tokens, tree.openToken);
    let node = new nodes_1.ModuleDefNode();
    if (tree.openToken.str === "baremodule") {
        node.isBareModule = true;
    }
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        fsaModuleDef.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tokens, wholeState);
    }
    return node;
}
exports.parseWholeModuleDef = parseWholeModuleDef;
//# sourceMappingURL=ModuleDefFsa.js.map