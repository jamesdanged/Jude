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
var Resolve_1 = require("../../nameResolution/Resolve");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var fsaUtils_1 = require("../general/fsaUtils");
var fsaUtils_2 = require("../general/fsaUtils");
var assert_1 = require("../../utils/assert");
var ExpressionFsa_2 = require("../general/ExpressionFsa");
var streamConditions_4 = require("../../tokens/streamConditions");
var streamConditions_5 = require("../../tokens/streamConditions");
var streamConditions_6 = require("../../tokens/streamConditions");
var streamConditions_7 = require("../../tokens/streamConditions");
var nodes_1 = require("../../parseTree/nodes");
var nodes_2 = require("../../parseTree/nodes");
var nodes_3 = require("../../parseTree/nodes");
var ExpressionFsa_3 = require("../general/ExpressionFsa");
/**
 * Recognizes a variable declaration like
 *   local ...
 *   global...
 *   const...
 *
 * Expects the stream to already be past the local/global/const keyword.
 *
 * Doesn't consume \n or any token after the variable declaration.
 */
class VarDeclarationFsa {
    constructor(varType) {
        this.varType = varType;
        if (varType === Resolve_1.NameDeclType.ImpliedByAssignment || varType === Resolve_1.NameDeclType.ArgList)
            throw new assert_1.AssertError("");
        let startState = new fsaUtils_1.FsaState("start");
        let stopState = new fsaUtils_1.FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
        let name = new fsaUtils_1.FsaState("name");
        let doubleColon = new fsaUtils_1.FsaState("::");
        let typeState = new fsaUtils_1.FsaState("type");
        let equals = new fsaUtils_1.FsaState("equals");
        let value = new fsaUtils_1.FsaState("value");
        let comma = new fsaUtils_1.FsaState("comma");
        let allowMoreThanOneVar = true;
        let requireAssignment = false;
        if (varType === Resolve_1.NameDeclType.Const) {
            allowMoreThanOneVar = false;
            requireAssignment = true;
        }
        // allow comments and newlines between certain states
        for (let state of [doubleColon, equals, comma]) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
            state.addArc(state, streamConditions_7.streamAtNewLine, skipOneToken);
        }
        // at least one variable
        startState.addArc(name, streamConditions_4.streamAtIdentifier, readVariableName);
        // the variable name can be by itself, or can have an assignment
        // and optionally multiple variables declared at once.
        // Multiple variables requires the comma to be on the same line.
        name.addArc(doubleColon, streamConditions_1.streamAtDoubleColon, skipOneToken);
        name.addArc(equals, streamConditions_5.streamAtEquals, skipOneToken);
        doubleColon.addArc(typeState, streamConditions_3.alwaysPasses, readTypeExpression);
        typeState.addArc(equals, streamConditions_5.streamAtEquals, skipOneToken);
        if (!requireAssignment) {
            if (allowMoreThanOneVar) {
                name.addArc(comma, streamConditions_6.streamAtComma, skipOneToken);
                typeState.addArc(comma, streamConditions_6.streamAtComma, skipOneToken);
            }
            name.addArc(stopState, streamConditions_3.alwaysPasses, doNothing);
            typeState.addArc(stopState, streamConditions_3.alwaysPasses, doNothing);
        }
        // must have expression for value after '='
        // The expression cannot have commas if it is a local/global variable.
        if (varType === Resolve_1.NameDeclType.Const) {
            equals.addArc(value, streamConditions_3.alwaysPasses, readVariableValue);
        }
        else {
            equals.addArc(value, streamConditions_3.alwaysPasses, readLocalGlobalVariableValue);
        }
        // local and global statements can have multiple variables declared at once
        if (allowMoreThanOneVar) {
            value.addArc(comma, streamConditions_6.streamAtComma, skipOneToken);
        }
        value.addArc(stopState, streamConditions_3.alwaysPasses, doNothing);
        // must follow comma with another variable
        comma.addArc(name, streamConditions_4.streamAtIdentifier, readVariableName);
    }
    runStartToStop(ts, wholeState) {
        let nodeToFill = new nodes_1.VarDeclarationNode(this.varType);
        let parseState = new ParseState(ts, nodeToFill, wholeState);
        fsaUtils_2.runFsaStartToStop(this, parseState);
        return parseState.nodeToFill;
    }
}
class ParseState {
    constructor(ts, nodeToFill, wholeState) {
        this.ts = ts;
        this.nodeToFill = nodeToFill;
        this.wholeState = wholeState;
        this.mostRecentVar = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readVariableName(state) {
    let tok = state.ts.read();
    let varNode = new nodes_2.VarDeclItemNode(new nodes_3.IdentifierNode(tok));
    state.mostRecentVar = varNode;
    state.nodeToFill.names.push(varNode);
}
var fsaTypeAnnotationInLocalGlobalConst = null;
function readTypeExpression(state) {
    if (fsaTypeAnnotationInLocalGlobalConst === null) {
        // Used to read type annotations in local/global/const lists.
        // An '=' sign denotes the default value and a ',' denotes another arg so they must be ignored.
        let fsaOptions = new ExpressionFsa_3.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [",", "="];
        fsaOptions.allowReturn = false;
        fsaTypeAnnotationInLocalGlobalConst = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentVar === null)
        throw new assert_1.AssertError("");
    state.mostRecentVar.type = fsaTypeAnnotationInLocalGlobalConst.runStartToStop(state.ts, state.wholeState);
}
function readVariableValue(state) {
    if (state.mostRecentVar === null)
        throw new assert_1.AssertError("");
    state.mostRecentVar.value = ExpressionFsa_2.parseGeneralBlockExpression(state.ts, state.wholeState);
}
var fsaLocalGlobalVarValueExpression = null;
function readLocalGlobalVariableValue(state) {
    if (fsaLocalGlobalVarValueExpression === null) {
        // Used to read the expression for the variable's value in a local/global variable declaration
        // as a ',' will indicate the start of another variable
        let fsaOptions = new ExpressionFsa_3.ExpressionFsaOptions();
        fsaOptions.binaryOpsToIgnore = [","];
        fsaLocalGlobalVarValueExpression = new ExpressionFsa_1.ExpressionFsa(fsaOptions);
    }
    if (state.mostRecentVar === null)
        throw new assert_1.AssertError("");
    state.mostRecentVar.value = fsaLocalGlobalVarValueExpression.runStartToStop(state.ts, state.wholeState);
}
var fsaLocalDeclaration = new VarDeclarationFsa(Resolve_1.NameDeclType.Local);
var fsaGlobalDeclaration = new VarDeclarationFsa(Resolve_1.NameDeclType.Global);
var fsaConstDeclaration = new VarDeclarationFsa(Resolve_1.NameDeclType.Const);
function parseLocalStatement(ts, wholeState) {
    return fsaLocalDeclaration.runStartToStop(ts, wholeState);
}
exports.parseLocalStatement = parseLocalStatement;
function parseGlobalStatement(ts, wholeState) {
    return fsaGlobalDeclaration.runStartToStop(ts, wholeState);
}
exports.parseGlobalStatement = parseGlobalStatement;
function parseConstStatement(ts, wholeState) {
    return fsaConstDeclaration.runStartToStop(ts, wholeState);
}
exports.parseConstStatement = parseConstStatement;
//# sourceMappingURL=VarDeclarationFsa.js.map