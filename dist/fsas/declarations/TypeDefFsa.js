"use strict";
const nodes_1 = require("../../parseTree/nodes");
const fsaUtils_1 = require("../general/fsaUtils");
const GenericDefArgListFsa_1 = require("./GenericDefArgListFsa");
const fsaUtils_2 = require("../general/fsaUtils");
const assert_1 = require("../../utils/assert");
const TokenStream_1 = require("./../../tokens/TokenStream");
const nodes_2 = require("./../../parseTree/nodes");
const streamConditions_1 = require("./../../tokens/streamConditions");
const streamConditions_2 = require("./../../tokens/streamConditions");
const streamConditions_3 = require("./../../tokens/streamConditions");
const streamConditions_4 = require("./../../tokens/streamConditions");
const streamConditions_5 = require("./../../tokens/streamConditions");
const streamConditions_6 = require("./../../tokens/streamConditions");
const nodes_3 = require("./../../parseTree/nodes");
const streamConditions_7 = require("./../../tokens/streamConditions");
const streamConditions_8 = require("./../../tokens/streamConditions");
const fsaUtils_3 = require("../general/fsaUtils");
const fsaUtils_4 = require("../general/fsaUtils");
const fsaUtils_5 = require("../general/fsaUtils");
const nodes_4 = require("../../parseTree/nodes");
const streamConditions_9 = require("../../tokens/streamConditions");
const ExpressionFsa_1 = require("../general/ExpressionFsa");
/**
 * Recognizes the body of a type...end declaration.
 */
class TypeDefFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let typeDefName = new fsaUtils_4.FsaState("type def name");
        let genericParams = new fsaUtils_4.FsaState("generic params");
        let lessThanColon = new fsaUtils_4.FsaState("<:");
        let parentType = new fsaUtils_4.FsaState("parent type");
        let body = new fsaUtils_4.FsaState("body");
        //let fieldName = new FsaState("field name")
        //let doubleColon = new FsaState("::")
        //let fieldType = new FsaState("file type")
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions"); // state after a field has been read
        let generalExpression = new fsaUtils_4.FsaState("general expression");
        // TODO what about new()
        let allStatesExceptStop = [startState, typeDefName, genericParams, lessThanColon, parentType,
            body,
            //fieldName, doubleColon, fieldType,
            betweenExpressions, generalExpression];
        // ignore new lines at various points
        for (let state of [startState, typeDefName, genericParams, lessThanColon, parentType, body]) {
            state.addArc(state, streamConditions_1.streamAtNewLine, skipOneToken);
        }
        // ignore comments everywhere
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_2.streamAtComment, skipOneToken);
        }
        // name is required
        startState.addArc(typeDefName, streamConditions_3.streamAtIdentifier, readTypeDefName);
        // optional generic params
        typeDefName.addArc(genericParams, streamConditions_4.streamAtOpenCurlyBraces, readTypeGenericParams);
        // optional parent type
        typeDefName.addArc(lessThanColon, streamConditions_9.streamAtLessThanColon, skipOneToken);
        genericParams.addArc(lessThanColon, streamConditions_9.streamAtLessThanColon, skipOneToken);
        // if there was a <:, must have the parent typenow
        lessThanColon.addArc(parentType, streamConditions_5.alwaysPasses, readParentType);
        // otherwise jump to body
        typeDefName.addArc(body, streamConditions_5.alwaysPasses, doNothing);
        genericParams.addArc(body, streamConditions_5.alwaysPasses, doNothing);
        parentType.addArc(body, streamConditions_5.alwaysPasses, doNothing);
        // zero or more expressions, some of which are fields
        body.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
        body.addArc(body, streamConditions_7.streamAtSemicolon, skipOneToken);
        body.addArc(betweenExpressions, streamConditions_5.alwaysPasses, readBodyExpression); // otherwise must be an expression
        //// zero or more fields
        //body.addArc(stopState, streamAtEof, doNothing)
        //body.addArc(fieldName, streamAtIdentifier, readFieldName)
        //
        //// optional field type annotation
        //fieldName.addArc(doubleColon, streamAtDoubleColon, skipOneToken)
        //doubleColon.addArc(fieldType, alwaysPasses, readFieldTypeExpression)
        //fieldName.addArc(betweenExpressions, alwaysPasses, doNothing)
        //fieldType.addArc(betweenExpressions, alwaysPasses, doNothing)
        // after each expression must be delimited
        betweenExpressions.addArc(body, streamConditions_8.streamAtNewLineOrSemicolon, skipOneToken);
        // last expression does not need delimiter
        betweenExpressions.addArc(stopState, streamConditions_6.streamAtEof, doNothing);
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
        this.mostRecentField = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readTypeDefName(state) {
    let tok = state.ts.read();
    state.nodeToFill.name = new nodes_4.IdentifierNode(tok);
}
function readTypeGenericParams(state) {
    let curlyBracesToken = state.ts.read();
    state.nodeToFill.genericArgs = GenericDefArgListFsa_1.parseGenericDefArgList(curlyBracesToken, state.wholeState);
}
function readParentType(state) {
    state.nodeToFill.parentType = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    let isField = false;
    if (expr instanceof nodes_4.IdentifierNode) {
        // is a field without a type annotation
        isField = true;
        let field = new nodes_3.FieldNode(expr);
        state.nodeToFill.fields.push(field);
    }
    else if (expr instanceof nodes_1.BinaryOpNode) {
        if (expr.op === "::" && expr.arg1 instanceof nodes_4.IdentifierNode) {
            // is a field with a type annotation
            isField = true;
            let identNode = expr.arg1;
            let field = new nodes_3.FieldNode(identNode);
            field.type = expr.arg2;
            state.nodeToFill.fields.push(field);
        }
    }
    if (!isField) {
        state.nodeToFill.bodyContents.push(expr);
    }
}
//function readFieldName(state: ParseState): void {
//  let tok = state.ts.read()
//  let field = new FieldNode(new IdentifierNode(tok))
//  state.nodeToFill.fields.push(field)
//  state.mostRecentField = field
//}
//
//function readFieldTypeExpression(state: ParseState): void {
//  if (state.mostRecentField === null) throw new AssertError("")
//  state.mostRecentField.type = parseGeneralBlockExpression(state.ts, state.wholeState)
//}
var fsaTypeDef = new TypeDefFsa();
function parseWholeTypeDef(tree, wholeState) {
    let ts = new TokenStream_1.TokenStream(tree.contents, tree.openToken);
    let node = new nodes_2.TypeDefNode();
    if (tree.openToken.str === "type") {
        node.isImmutable = false;
    }
    else if (tree.openToken.str === "immutable") {
        node.isImmutable = true;
    }
    else {
        throw new assert_1.AssertError("");
    }
    node.scopeStartToken = tree.openToken;
    node.scopeEndToken = tree.closeToken;
    try {
        fsaTypeDef.runStartToStop(ts, node, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        fsaUtils_2.handleParseErrorOnly(err, node, tree.contents, wholeState);
    }
    return node;
}
exports.parseWholeTypeDef = parseWholeTypeDef;
//# sourceMappingURL=TypeDefFsa.js.map