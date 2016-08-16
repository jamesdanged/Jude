"use strict";
const ExpressionFsa_1 = require("../general/ExpressionFsa");
const fsaUtils_1 = require("../general/fsaUtils");
const streamConditions_1 = require("./../../tokens/streamConditions");
const nodes_1 = require("./../../parseTree/nodes");
const TokenStream_1 = require("./../../tokens/TokenStream");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("./../general/fsaUtils");
const fsaUtils_3 = require("./../general/fsaUtils");
const fsaUtils_4 = require("./../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const fsaUtils_5 = require("../general/fsaUtils");
const ExpressionFsa_2 = require("../general/ExpressionFsa");
/**
 * Recognizes a type parameter list (within { ... } )
 * for invocations of a generic function or for instantiations of a generic type,
 * not for a declaration of either.
 */
class GenericArgListFsa extends fsaUtils_2.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let typeExpression = new fsaUtils_3.FsaState("type expression");
        let comma = new fsaUtils_3.FsaState("comma");
        let allStatesExceptStop = [startState, stopState, typeExpression, comma];
        // ignore new lines and comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // 0 or more types
        startState.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        startState.addArc(typeExpression, streamConditions_3.alwaysPasses, readTypeExpression);
        typeExpression.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        typeExpression.addArc(comma, streamConditions_5.streamAtComma, skipOneToken);
        comma.addArc(typeExpression, streamConditions_3.alwaysPasses, readTypeExpression);
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
var fsaTypeAnnotationExpression = null; // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readTypeExpression(state) {
    if (fsaTypeAnnotationExpression === null) {
        // Used to read expressions within {} which evaluate to types.
        // Commas must be treated specially as an escape, not a binary operator.
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaTypeAnnotationExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    let node = fsaTypeAnnotationExpression.runStartToStop(state.ts, state.wholeState);
    state.nodeToFill.params.push(node);
}
var fsaGenericArgList = new GenericArgListFsa();
function parseGenericArgList(curlyTree, wholeState) {
    if (curlyTree.openToken.str !== "{")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(curlyTree.contents, curlyTree.openToken);
    let node = new nodes_1.GenericArgListNode();
    try {
        fsaGenericArgList.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_5.handleParseErrorOnly(err, node, curlyTree.contents, wholeState);
    }
    return node;
}
exports.parseGenericArgList = parseGenericArgList;
//# sourceMappingURL=GenericArgListFsa.js.map