"use strict";
const fsaUtils_1 = require("./fsaUtils");
const ModuleContentsFsa_1 = require("./ModuleContentsFsa");
const fsaUtils_2 = require("./fsaUtils");
const fsaUtils_3 = require("./fsaUtils");
const fsaUtils_4 = require("./fsaUtils");
const TokenStream_1 = require("../../tokens/TokenStream");
const nodes_1 = require("../../parseTree/nodes");
const fsaUtils_5 = require("./fsaUtils");
const streamConditions_1 = require("../../tokens/streamConditions");
const streamConditions_2 = require("../../tokens/streamConditions");
const streamConditions_3 = require("../../tokens/streamConditions");
const nodes_2 = require("../../parseTree/nodes");
const streamConditions_4 = require("../../tokens/streamConditions");
const assert_1 = require("../../utils/assert");
class ModuleDefFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let nameState = new fsaUtils_4.FsaState("name");
        let bodyState = new fsaUtils_4.FsaState("body");
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