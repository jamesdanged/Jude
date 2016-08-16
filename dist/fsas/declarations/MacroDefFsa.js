"use strict";
const streamConditions_1 = require("../../tokens/streamConditions");
const nodes_1 = require("../../parseTree/nodes");
const fsaUtils_1 = require("../general/fsaUtils");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("../general/fsaUtils");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const nodes_2 = require("../../parseTree/nodes");
/**
 * Recognizes the body of a macro...end declaration.
 *
 * Not fully implemented. Just stores everything inside the node.
 */
class MacroDefFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let macroName = new fsaUtils_3.FsaState("macro name");
        let argList = new fsaUtils_3.FsaState("arg list");
        let body = new fsaUtils_3.FsaState("body");
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
        fsaUtils_4.runFsaStartToStop(fsaMacroDef, parseState);
    }
    catch (err) {
        fsaUtils_1.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseWholeMacroDef = parseWholeMacroDef;
//# sourceMappingURL=MacroDefFsa.js.map