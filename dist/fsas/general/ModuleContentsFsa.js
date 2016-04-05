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
var streamConditions_2 = require("../../tokens/streamConditions");
var streamConditions_3 = require("../../tokens/streamConditions");
var nodes_1 = require("../../parseTree/nodes");
var streamConditions_4 = require("../../tokens/streamConditions");
var streamConditions_5 = require("../../tokens/streamConditions");
var fsaUtils_1 = require("./fsaUtils");
var ExpressionFsa_1 = require("./ExpressionFsa");
var fsaUtils_2 = require("./fsaUtils");
var TokenStream_1 = require("../../tokens/TokenStream");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var streamConditions_8 = require("./../../tokens/streamConditions");
var streamConditions_9 = require("./../../tokens/streamConditions");
var streamConditions_10 = require("./../../tokens/streamConditions");
var streamConditions_11 = require("./../../tokens/streamConditions");
var streamConditions_12 = require("./../../tokens/streamConditions");
var streamConditions_13 = require("./../../tokens/streamConditions");
var nodes_2 = require("../../parseTree/nodes");
var nodes_3 = require("../../parseTree/nodes");
var nodes_4 = require("../../parseTree/nodes");
var nodes_5 = require("../../parseTree/nodes");
var streamConditions_14 = require("./../../tokens/streamConditions");
var streamConditions_15 = require("./../../tokens/streamConditions");
var operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
var errors_1 = require("../../utils/errors");
var streamConditions_16 = require("./../../tokens/streamConditions");
var streamConditions_17 = require("./../../tokens/streamConditions");
var fsaUtils_3 = require("./fsaUtils");
var fsaUtils_4 = require("./fsaUtils");
var fsaUtils_5 = require("./fsaUtils");
var streamConditions_18 = require("../../tokens/streamConditions");
var streamConditions_19 = require("../../tokens/streamConditions");
var nodes_6 = require("../../parseTree/nodes");
var nodes_7 = require("../../parseTree/nodes");
var nodes_8 = require("../../parseTree/nodes");
var Token_1 = require("../../tokens/Token");
var streamConditions_20 = require("../../tokens/streamConditions");
var streamConditions_21 = require("../../tokens/streamConditions");
var streamConditions_22 = require("../../tokens/streamConditions");
var streamConditions_23 = require("../../tokens/streamConditions");
var TypeDefFsa_1 = require("../declarations/TypeDefFsa");
var MacroDefFsa_1 = require("../declarations/MacroDefFsa");
var streamConditions_24 = require("../../tokens/streamConditions");
var streamConditions_25 = require("../../tokens/streamConditions");
var ModuleDefFsa_1 = require("./ModuleDefFsa");
var streamConditions_26 = require("../../tokens/streamConditions");
var assert_1 = require("../../utils/assert");
var nodes_9 = require("../../parseTree/nodes");
var GenericDefArgListFsa_1 = require("../declarations/GenericDefArgListFsa");
var Token_2 = require("../../tokens/Token");
var Token_3 = require("../../tokens/Token");
var operatorsAndKeywords_2 = require("../../tokens/operatorsAndKeywords");
/**
 * Recognizes the contents of a module.
 * Can be used for statements in the top level module or
 * for contents of a file which are included in a module
 * (both of which aren't surrounded by module...end).
 * This is the only FSA allowed to recognize import, importall, export, and using statements.
 */
class ModuleContentsFsa extends fsaUtils_3.BaseFsa {
    constructor() {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let body = new fsaUtils_4.FsaState("body");
        let betweenExpressions = new fsaUtils_4.FsaState("between expressions");
        let abstractKeyword = new fsaUtils_4.FsaState("abstract");
        let abstractTypeName = new fsaUtils_4.FsaState("abstract type name");
        let abstractGenericParams = new fsaUtils_4.FsaState("abstract generic params");
        let abstractLessThanColon = new fsaUtils_4.FsaState("abstract <:");
        let abstractParentType = new fsaUtils_4.FsaState("abstract parent type");
        let bitsTypeKeyword = new fsaUtils_4.FsaState("bitstype keyword");
        let bitsTypeNumBits = new fsaUtils_4.FsaState("bitstype num bits");
        let bitsTypeName = new fsaUtils_4.FsaState("bitstype name");
        let bitsTypeLessThanColon = new fsaUtils_4.FsaState("bitstype <:");
        let bitsTypeParentType = new fsaUtils_4.FsaState("bitstype parent type");
        let macro = new fsaUtils_4.FsaState("macro");
        let moduleDef = new fsaUtils_4.FsaState("module def");
        let typeDefState = new fsaUtils_4.FsaState("type def");
        // imp == [import | importall | using]
        let impStart = new fsaUtils_4.FsaState("imp start");
        let impFirstName = new fsaUtils_4.FsaState("imp first name");
        let impColon = new fsaUtils_4.FsaState("imp colon");
        let impNamesList = new fsaUtils_4.FsaState("imp names list");
        let impComma = new fsaUtils_4.FsaState("imp comma");
        let exportStart = new fsaUtils_4.FsaState("export start");
        let exportNamesList = new fsaUtils_4.FsaState("export names list");
        let exportComma = new fsaUtils_4.FsaState("export comma");
        let includeWord = new fsaUtils_4.FsaState("include word");
        let includeParen = new fsaUtils_4.FsaState("include paren");
        // used to skip comments
        let allStatesExceptStop = [startState, body, betweenExpressions,
            abstractKeyword, abstractTypeName, abstractGenericParams, abstractLessThanColon, abstractParentType,
            bitsTypeKeyword, macro, moduleDef, typeDefState,
            impStart, impFirstName, impColon, impNamesList, impComma,
            exportStart, exportNamesList, exportComma, includeWord, includeParen];
        // skip comments
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_6.streamAtComment, skipOneToken);
        }
        // new lines have no effect at various points
        for (let state of [impStart, impColon, impComma, exportStart, exportComma]) {
            state.addArc(state, streamConditions_15.streamAtNewLine, skipOneToken);
        }
        startState.addArc(body, streamConditions_7.alwaysPasses, doNothing);
        body.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
        body.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        // handle abstract declarations
        body.addArc(abstractKeyword, streamConditions_5.streamAtAbstract, skipOneToken);
        abstractKeyword.addArc(abstractTypeName, streamConditions_17.streamAtIdentifier, readAbstractName);
        abstractTypeName.addArc(abstractGenericParams, streamConditions_3.streamAtOpenCurlyBraces, readAbstractGenericParams);
        abstractTypeName.addArc(abstractLessThanColon, streamConditions_26.streamAtLessThanColon, skipOneToken);
        abstractTypeName.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        abstractGenericParams.addArc(abstractLessThanColon, streamConditions_26.streamAtLessThanColon, skipOneToken);
        abstractGenericParams.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        abstractLessThanColon.addArc(abstractLessThanColon, streamConditions_15.streamAtNewLine, skipOneToken);
        abstractLessThanColon.addArc(abstractParentType, streamConditions_7.alwaysPasses, readAbstractParentType);
        abstractParentType.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        // handle bitstype declarations
        body.addArc(bitsTypeKeyword, streamConditions_20.streamAtBitsType, skipOneToken);
        bitsTypeKeyword.addArc(bitsTypeNumBits, streamConditions_4.streamAtNumber, readBitsTypeNumBits);
        bitsTypeNumBits.addArc(bitsTypeName, streamConditions_17.streamAtIdentifier, readBitsTypeName);
        bitsTypeName.addArc(bitsTypeLessThanColon, streamConditions_26.streamAtLessThanColon, skipOneToken);
        bitsTypeName.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        bitsTypeLessThanColon.addArc(bitsTypeLessThanColon, streamConditions_15.streamAtNewLine, skipOneToken);
        bitsTypeLessThanColon.addArc(bitsTypeParentType, streamConditions_7.alwaysPasses, readBitsTypeParentType);
        bitsTypeParentType.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        // handle declarations of macros, modules, types
        body.addArc(macro, streamConditions_22.streamAtMacroKeyword, readMacroDef);
        body.addArc(moduleDef, streamConditions_24.streamAtModule, readModuleDef);
        body.addArc(moduleDef, streamConditions_25.streamAtBareModule, readModuleDef);
        body.addArc(typeDefState, streamConditions_21.streamAtImmutable, readTypeDef);
        body.addArc(typeDefState, streamConditions_23.streamAtType, readTypeDef);
        macro.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        moduleDef.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        typeDefState.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        // handle import, importall, using, export, include
        body.addArc(impStart, streamConditions_10.streamAtImport, newImport);
        body.addArc(impStart, streamConditions_11.streamAtImportAll, newImportAll);
        body.addArc(impStart, streamConditions_13.streamAtUsing, newUsing);
        body.addArc(exportStart, streamConditions_12.streamAtExport, newExport);
        body.addArc(includeWord, streamConditions_18.streamAtInclude, skipOneToken);
        // otherwise must be an expression
        body.addArc(betweenExpressions, streamConditions_7.alwaysPasses, readBodyExpression);
        // require a delimiter between expressions
        betweenExpressions.addArc(body, streamConditions_9.streamAtNewLineOrSemicolon, skipOneToken);
        betweenExpressions.addArc(stopState, streamConditions_8.streamAtEof, doNothing);
        // handle import, importall, using statements
        // read the first name, which could be a prefix or part of the names list
        impStart.addArc(impFirstName, streamConditions_7.alwaysPasses, readImpName);
        // if we encounter a ':', then it was actually a prefix
        impFirstName.addArc(impColon, streamConditions_16.streamAtColon, changeImpNameToPrefix);
        impFirstName.addArc(impComma, streamConditions_14.streamAtComma, skipOneToken);
        impFirstName.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing); // otherwise end of the import|importall|using statement
        // must be at least one name after a colon
        impColon.addArc(impNamesList, streamConditions_7.alwaysPasses, readImpName);
        // must have a comma to continue, or else end of the import/importall/using statement
        impNamesList.addArc(impComma, streamConditions_14.streamAtComma, skipOneToken);
        impNamesList.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        impComma.addArc(impNamesList, streamConditions_7.alwaysPasses, readImpName);
        // handle export statement
        // must have at least one name
        exportStart.addArc(exportNamesList, streamConditions_17.streamAtIdentifier, readExportedName);
        exportStart.addArc(exportNamesList, streamConditions_1.streamAtMacroIdentifier, readExportedName);
        // comma continues list, else end of export statement
        exportNamesList.addArc(exportComma, streamConditions_14.streamAtComma, skipOneToken);
        exportNamesList.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
        exportComma.addArc(exportNamesList, streamConditions_17.streamAtIdentifier, readExportedName);
        exportComma.addArc(exportNamesList, streamConditions_1.streamAtMacroIdentifier, readExportedName);
        // handle include call
        includeWord.addArc(includeParen, streamConditions_19.streamAtOpenParenthesis, readIncludePath);
        includeParen.addArc(betweenExpressions, streamConditions_7.alwaysPasses, doNothing);
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
        this.lastImp = null;
        this.lastExportNode = null;
        this.lastTypeDef = null;
    }
}
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readAbstractName(state) {
    let abstractNode = new nodes_1.TypeDefNode();
    abstractNode.name = new nodes_8.IdentifierNode(state.ts.read());
    state.lastTypeDef = abstractNode;
    state.nodeToFill.expressions.push(abstractNode);
}
function readAbstractGenericParams(state) {
    let curlyBraceTokTree = state.ts.read();
    state.lastTypeDef.genericArgs = GenericDefArgListFsa_1.parseGenericDefArgList(curlyBraceTokTree, state.wholeState);
}
function readAbstractParentType(state) {
    if (state.lastTypeDef === null)
        throw new assert_1.AssertError("");
    state.lastTypeDef.parentType = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readBitsTypeNumBits(state) {
    let node = new nodes_1.TypeDefNode();
    node.numbits = new nodes_9.NumberNode(state.ts.read());
    state.lastTypeDef = node;
}
function readBitsTypeName(state) {
    if (state.lastTypeDef === null)
        throw new assert_1.AssertError("");
    state.lastTypeDef.name = new nodes_8.IdentifierNode(state.ts.read());
    // now safe to store
    state.nodeToFill.expressions.push(state.lastTypeDef);
}
function readBitsTypeParentType(state) {
    if (state.lastTypeDef === null)
        throw new assert_1.AssertError("");
    state.lastTypeDef.parentType = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
}
function readMacroDef(state) {
    let unparsedTree = state.ts.read();
    let node = MacroDefFsa_1.parseWholeMacroDef(unparsedTree, state.wholeState);
    state.nodeToFill.expressions.push(node);
}
function readModuleDef(state) {
    let unparsedTree = state.ts.read();
    let node = ModuleDefFsa_1.parseWholeModuleDef(unparsedTree, state.wholeState);
    state.nodeToFill.expressions.push(node);
}
function readTypeDef(state) {
    let unparsedTree = state.ts.read();
    let node = TypeDefFsa_1.parseWholeTypeDef(unparsedTree, state.wholeState);
    state.nodeToFill.expressions.push(node);
}
function newImport(state) {
    state.ts.read(); // skip the import token
    let node = new nodes_2.ImportNode();
    state.lastImp = node;
    state.nodeToFill.expressions.push(node);
}
function newImportAll(state) {
    state.ts.read(); // skip the importall token
    let node = new nodes_3.ImportAllNode();
    state.lastImp = node;
    state.nodeToFill.expressions.push(node);
}
function newUsing(state) {
    state.ts.read(); // skip the using token
    let node = new nodes_5.UsingNode();
    state.lastImp = node;
    state.nodeToFill.expressions.push(node);
}
function newExport(state) {
    let exportToken = state.ts.read(); // skip the export token
    let node = new nodes_4.ExportNode(exportToken.range.start);
    state.lastExportNode = node;
    state.nodeToFill.expressions.push(node);
}
function readBodyExpression(state) {
    let expr = ExpressionFsa_1.parseGeneralBlockExpression(state.ts, state.wholeState);
    state.nodeToFill.expressions.push(expr);
}
function readImpName(state) {
    let name = readMultiPartName(state);
    state.lastImp.names.push(name);
}
function changeImpNameToPrefix(state) {
    state.ts.read(); // discard ':'
    // convert previous name to be a prefix
    state.lastImp.prefix = state.lastImp.names.pop();
}
function readMultiPartName(state) {
    let ts = state.ts;
    let name = [];
    let readNamePart = () => {
        let tok = null;
        if (streamConditions_2.streamAtOverridableOperator(state.ts)) {
            // convert operator to an identifer
            tok = ts.read();
            tok.type = operatorsAndKeywords_1.TokenType.Identifier;
        }
        else if (streamConditions_1.streamAtMacroIdentifier(state.ts)) {
            tok = ts.read();
        }
        else {
            tok = ts.read();
            if (tok.type !== operatorsAndKeywords_1.TokenType.Identifier) {
                throw new errors_1.InvalidParseError("Expected an identifier, got " + tok.str, tok);
            }
        }
        name.push(new nodes_8.IdentifierNode(tok));
    };
    // at least one name part
    readNamePart();
    // try to read any further parts
    while (!ts.eof()) {
        let tok = ts.peek();
        if (tok.type === operatorsAndKeywords_1.TokenType.Operator && tok.str[0] === ".") {
            // deal with situations like 'import Base.+'  since '.+' is treated as a single operator
            if (tok.str.length > 1) {
                let dotStart = tok.range.start;
                let dotEnd = new Token_2.Point(dotStart.row, dotStart.column + 1);
                let tokDot = new Token_1.Token(".", operatorsAndKeywords_1.TokenType.Operator, new Token_3.Range(dotStart, dotEnd));
                let opStart = new Token_2.Point(dotEnd.row, dotEnd.column);
                let opEnd = tok.range.end;
                let tokOp = new Token_1.Token(tok.str.slice(1), operatorsAndKeywords_1.TokenType.Operator, new Token_3.Range(opStart, opEnd));
                ts.splice(ts.index, 1, tokDot, tokOp);
            }
            ts.read(); // skip the dot
            ts.skipToNextNonWhitespace();
            readNamePart();
        }
        else {
            break;
        }
    }
    // notify if operator is an interior part
    // Should only be the last part
    for (let i = 0; i < name.length - 1; i++) {
        let tok = name[i].token;
        if (tok.str in operatorsAndKeywords_2.overridableBinaryOperators) {
            state.wholeState.parseErrors.push(new errors_1.InvalidParseError("Cannot have an operator as a module name.", tok));
        }
    }
    return name;
}
function readExportedName(state) {
    let tok = state.ts.read();
    state.lastExportNode.names.push(new nodes_8.IdentifierNode(tok));
}
function readIncludePath(state) {
    let treeToken = state.ts.read();
    let innerTs = new TokenStream_1.TokenStream(treeToken.contents, treeToken.openToken);
    innerTs.skipToNextNonWhitespace();
    if (innerTs.eof())
        throw new errors_1.InvalidParseError("Expected include path.", innerTs.getLastToken());
    let quoteToken = innerTs.read();
    if (quoteToken.type !== operatorsAndKeywords_1.TokenType.Quote && quoteToken.str !== "\"")
        throw new errors_1.InvalidParseError("Expected double quotes.", quoteToken);
    treeToken = quoteToken;
    innerTs = new TokenStream_1.TokenStream(treeToken.contents, treeToken.openToken);
    if (innerTs.eof())
        throw new errors_1.InvalidParseError("Expected include path.", innerTs.getLastToken());
    let pathToken = innerTs.read();
    if (pathToken.type !== operatorsAndKeywords_1.TokenType.StringLiteralContents)
        throw new errors_1.InvalidParseError("Expected include path.", pathToken);
    let includeNode = new nodes_6.IncludeNode(new nodes_7.StringLiteralNode(pathToken));
    state.nodeToFill.expressions.push(includeNode);
    innerTs.skipToNextNonWhitespace();
    if (!innerTs.eof())
        throw new errors_1.InvalidParseError("Unexpected token.", innerTs.read());
}
var fsaModuleContents = new ModuleContentsFsa();
function parseModuleContents(ts, nodeToFill, wholeState) {
    fsaModuleContents.runStartToStop(ts, nodeToFill, wholeState);
}
exports.parseModuleContents = parseModuleContents;
/**
 * State that accumulates over a full file parse.
 * May eventually have more state, such as parsing options.
 */
class WholeFileParseState {
    constructor() {
        this.parseErrors = [];
    }
}
exports.WholeFileParseState = WholeFileParseState;
/**
 *
 *
 * @param nodeToFill
 * @param fileContents  Should already be grouped into trees by brackets.
 * @returns {FileLevelNode}
 */
function parseWholeFileContents(nodeToFill, fileContents) {
    let wholeState = new WholeFileParseState();
    let tokenMinus1 = new Token_1.Token("", operatorsAndKeywords_1.TokenType.LineWhiteSpace, new Token_3.Range(new Token_2.Point(0, 0), new Token_2.Point(0, 1)));
    let ts = new TokenStream_1.TokenStream(fileContents, tokenMinus1);
    try {
        fsaModuleContents.runStartToStop(ts, nodeToFill, wholeState);
        fsaUtils_1.expectNoMoreExpressions(ts);
    }
    catch (err) {
        if (err instanceof errors_1.InvalidParseError) {
            fsaUtils_2.handleParseErrorOnly(err, nodeToFill, fileContents, wholeState);
        }
        else {
            console.error("Unexpected error while parsing file " + nodeToFill.path, err);
        }
    }
    return wholeState;
}
exports.parseWholeFileContents = parseWholeFileContents;
//# sourceMappingURL=ModuleContentsFsa.js.map