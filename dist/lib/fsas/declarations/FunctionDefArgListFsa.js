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
var streamConditions_1 = require("../../tokens/streamConditions");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var streamConditions_4 = require("./../../tokens/streamConditions");
var TokenStream_1 = require("./../../tokens/TokenStream");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var streamConditions_8 = require("./../../tokens/streamConditions");
var nodes_1 = require("./../../parseTree/nodes");
var streamConditions_9 = require("./../../tokens/streamConditions");
var streamConditions_10 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("../general/fsaUtils");
var fsaUtils_4 = require("../general/fsaUtils");
var nodes_2 = require("../../parseTree/nodes");
var ExpressionFsa_2 = require("../general/ExpressionFsa");
/**
 * An automaton that recognizes the entire contents within the parentheses of a function's arg list declaration.
 */
class FunctionDefArgListFsa {
    constructor() {
        let startState = new fsaUtils_3.FsaState("start");
        let stopState = new fsaUtils_3.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let orderedArgName = new fsaUtils_3.FsaState("ordered arg name");
        let orderedArgType = new fsaUtils_3.FsaState("ordered arg type");
        let orderedArgTypeCannotBeOptional = new fsaUtils_3.FsaState("ordered arg type, cannot be optional");
        let orderedArgComma = new fsaUtils_3.FsaState("ordered arg comma");
        // optional args are ordered args, but from this point forward, all args will require a default value
        let optionalArgName = new fsaUtils_3.FsaState("optional arg name");
        let optionalArgType = new fsaUtils_3.FsaState("optional arg type");
        let optionalArgEqualSign = new fsaUtils_3.FsaState("optional arg =");
        let optionalArgDefaultValue = new fsaUtils_3.FsaState("optional arg default value");
        let optionalArgComma = new fsaUtils_3.FsaState("optional arg comma");
        let varArgs = new fsaUtils_3.FsaState("var args");
        let semicolonState = new fsaUtils_3.FsaState("semicolon");
        let keywordArgName = new fsaUtils_3.FsaState("keyword arg name");
        let keywordArgType = new fsaUtils_3.FsaState("keyword arg type");
        let keywordArgEqualSign = new fsaUtils_3.FsaState("keyword arg equal sign");
        let keywordArgDefaultValue = new fsaUtils_3.FsaState("keyword arg default value");
        let keywordArgComma = new fsaUtils_3.FsaState("keyword arg comma");
        let allStatesExceptStop = [startState, orderedArgName, orderedArgType, orderedArgTypeCannotBeOptional, orderedArgComma,
            optionalArgName, optionalArgType, optionalArgEqualSign, optionalArgDefaultValue, optionalArgComma, varArgs,
            semicolonState, keywordArgName, keywordArgType, keywordArgEqualSign, keywordArgDefaultValue, keywordArgComma];
        // add arcs to skip newlines and comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_9.streamAtNewLine, skipOneToken);
            state.addArc(state, streamConditions_10.streamAtComment, skipOneToken);
        }
        // Can start with nothing (no params), a semicolon, an ordered arg, an unnamed ordered arg (ie ::Type{T}).
        // There is ambiguity about whether an ordered arg is actually an optional arg.
        // But rather than use a non deterministic FSA, we will just store both ordered args and optional args
        // together, and then simply have the default value for ordered args be null.
        startState.addArc(stopState, streamConditions_4.streamAtEof, doNothing); // passes if EOF
        startState.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        startState.addArc(orderedArgName, streamConditions_5.streamAtIdentifier, readOrderedArgName);
        startState.addArc(orderedArgTypeCannotBeOptional, streamConditions_6.streamAtDoubleColon, readUnnamedOrderedArgTypeDeclaration);
        // ordered args can have a type annotation
        orderedArgName.addArc(orderedArgType, streamConditions_6.streamAtDoubleColon, readTypeDeclaration);
        // an ordered arg can actually be an optional arg
        // in which case, all future args before ';' will be optional args
        // unnamed ordered args cannot be optional
        orderedArgName.addArc(optionalArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        orderedArgType.addArc(optionalArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        // delimiter
        orderedArgName.addArc(orderedArgComma, streamConditions_8.streamAtComma, skipOneToken);
        orderedArgType.addArc(orderedArgComma, streamConditions_8.streamAtComma, skipOneToken);
        orderedArgTypeCannotBeOptional.addArc(orderedArgComma, streamConditions_8.streamAtComma, skipOneToken);
        orderedArgName.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        orderedArgType.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        orderedArgTypeCannotBeOptional.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        orderedArgName.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        orderedArgType.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        orderedArgTypeCannotBeOptional.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        // proceed to next ordered arg
        orderedArgComma.addArc(orderedArgName, streamConditions_5.streamAtIdentifier, readOrderedArgName);
        orderedArgComma.addArc(orderedArgTypeCannotBeOptional, streamConditions_6.streamAtDoubleColon, readUnnamedOrderedArgTypeDeclaration);
        // optional args can have a type annotation
        optionalArgName.addArc(optionalArgType, streamConditions_6.streamAtDoubleColon, readTypeDeclaration);
        // optional args must specify a default value
        optionalArgName.addArc(optionalArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        optionalArgType.addArc(optionalArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        // read the default value
        optionalArgEqualSign.addArc(optionalArgDefaultValue, streamConditions_2.alwaysPasses, readExpressionForDefaultValue); // add last as always passes
        // delimiter
        optionalArgDefaultValue.addArc(optionalArgComma, streamConditions_8.streamAtComma, skipOneToken);
        optionalArgDefaultValue.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        optionalArgDefaultValue.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        // proceed to next optional arg
        optionalArgComma.addArc(optionalArgName, streamConditions_5.streamAtIdentifier, readOrderedArgName);
        // the last ordered arg or optional args can be a varargs
        // ie foo(a, b=2, c...)
        orderedArgName.addArc(varArgs, streamConditions_1.streamAtTripleDot, markArgAsVarArgs);
        optionalArgName.addArc(varArgs, streamConditions_1.streamAtTripleDot, markArgAsVarArgs);
        orderedArgType.addArc(varArgs, streamConditions_1.streamAtTripleDot, markArgAsVarArgs);
        optionalArgType.addArc(varArgs, streamConditions_1.streamAtTripleDot, markArgAsVarArgs);
        varArgs.addArc(semicolonState, streamConditions_3.streamAtSemicolon, skipOneToken);
        varArgs.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        // after semicolon
        semicolonState.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        semicolonState.addArc(keywordArgName, streamConditions_5.streamAtIdentifier, readKeywordArgName);
        // keyword arg can have a type annotation
        keywordArgName.addArc(keywordArgType, streamConditions_6.streamAtDoubleColon, readTypeDeclaration);
        // keyword args must specify a default value
        keywordArgName.addArc(keywordArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        keywordArgType.addArc(keywordArgEqualSign, streamConditions_7.streamAtEquals, skipOneToken);
        // read the default value
        keywordArgEqualSign.addArc(keywordArgDefaultValue, streamConditions_2.alwaysPasses, readExpressionForDefaultValue); // add last as always passes
        // delimiter
        keywordArgDefaultValue.addArc(keywordArgComma, streamConditions_8.streamAtComma, skipOneToken);
        keywordArgDefaultValue.addArc(stopState, streamConditions_4.streamAtEof, doNothing);
        // proceed to next keyword arg
        keywordArgComma.addArc(keywordArgName, streamConditions_5.streamAtIdentifier, readKeywordArgName);
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
// parse callbacks
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readOrderedArgName(state) {
    let token = state.ts.read();
    let arg = new nodes_1.FunctionDefArgNode();
    arg.name = new nodes_2.IdentifierNode(token);
    state.nodeToFill.orderedArgs.push(arg);
    state.mostRecentParam = arg;
}
function readKeywordArgName(state) {
    let token = state.ts.read();
    let arg = new nodes_1.FunctionDefArgNode();
    arg.name = new nodes_2.IdentifierNode(token);
    state.nodeToFill.keywordArgs.push(arg);
    state.mostRecentParam = arg;
}
var fsaTypeAnnotationInFunctionDefArgListExpression = null;
function parseTypeAnnotationExpressionWithinFunctionDefArgList(ts, wholeState) {
    if (fsaTypeAnnotationInFunctionDefArgListExpression === null) {
        // Used to read type annotations in function definition arg lists.
        // An '=' sign denotes the default value
        // and a ',' denotes another arg
        // so they must be ignored.
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [",", "="];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaOptions.allowReturn = false;
        fsaTypeAnnotationInFunctionDefArgListExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    return fsaTypeAnnotationInFunctionDefArgListExpression.runStartToStop(ts, wholeState);
}
function readUnnamedOrderedArgTypeDeclaration(state) {
    state.ts.read(); // discard ::
    let arg = new nodes_1.FunctionDefArgNode();
    state.nodeToFill.orderedArgs.push(arg);
    state.mostRecentParam = arg;
    arg.type = parseTypeAnnotationExpressionWithinFunctionDefArgList(state.ts, state.wholeState);
}
function readTypeDeclaration(state) {
    if (state.mostRecentParam === null)
        throw new assert_1.AssertError("");
    state.ts.read(); // discard the ::
    state.mostRecentParam.type = parseTypeAnnotationExpressionWithinFunctionDefArgList(state.ts, state.wholeState);
}
function markArgAsVarArgs(state) {
    if (state.mostRecentParam == null)
        throw new assert_1.AssertError("");
    state.ts.read(); // discard the ...
    state.mostRecentParam.isVarArgs = true;
}
var fsaDefaultValueExpressions = null;
function readExpressionForDefaultValue(state) {
    if (fsaDefaultValueExpressions === null) {
        // Used to read expressions for default value
        // commas must be treated specially as an escape, not a binary operator
        let fsaOptions = new ExpressionFsa_2.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaOptions.newLineInMiddleDoesNotEndExpression = true;
        fsaOptions.allowSplat = true;
        fsaDefaultValueExpressions = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentParam == null)
        throw new assert_1.AssertError("");
    state.mostRecentParam.defaultValue = fsaDefaultValueExpressions.runStartToStop(state.ts, state.wholeState);
}
var fsaFunctionDefArgList = new FunctionDefArgListFsa();
function parseFunctionDefArgList(node, tree, wholeState) {
    if (tree.openToken.str !== "(")
        throw new assert_1.AssertError("");
    let ts = new TokenStream_1.TokenStream(tree.contents, tree.openToken);
    //let node = new FunctionDefArgListNode()
    try {
        //if (wholeState.onlyParseTopLevel) {
        //  skipParse(node, parenTree.contents)
        //} else {
        fsaFunctionDefArgList.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
}
exports.parseFunctionDefArgList = parseFunctionDefArgList;
//# sourceMappingURL=FunctionDefArgListFsa.js.map