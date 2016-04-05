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
var Tokenizer_1 = require("../tokens/Tokenizer");
var arrayUtils_1 = require("../utils/arrayUtils");
var Token_1 = require("../tokens/Token");
var operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
var Token_2 = require("../tokens/Token");
var Token_3 = require("../tokens/Token");
var TokenStream_1 = require("../tokens/TokenStream");
var BracketGrouper_1 = require("./BracketGrouper");
var ModuleContentsFsa_1 = require("../fsas/general/ModuleContentsFsa");
function parseFile(path, fileContents, sessionModel) {
    let parseSet = sessionModel.parseSet;
    parseSet.resetFile(path);
    let fileLevelNode = parseSet.fileLevelNodes[path];
    let fileErrors = parseSet.errors[path];
    // convert string to stream of tokens
    let tokenizer = new Tokenizer_1.Tokenizer();
    tokenizer.tokenize(fileContents);
    if (tokenizer.errors.length > 0) {
        for (let err of tokenizer.errors) {
            fileErrors.parseErrors.push(err);
        }
    }
    let tokens = tokenizer.parsedTokens;
    if (tokens.length > 0) {
        fileLevelNode.scopeStartToken = tokens[0];
        fileLevelNode.scopeEndToken = arrayUtils_1.last(tokens);
    }
    // convert tokens to tree of tokens, grouped by brackets and blocks
    let tokenMinus1 = new Token_1.Token("", operatorsAndKeywords_1.TokenType.LineWhiteSpace, new Token_3.Range(new Token_2.Point(0, 0), new Token_2.Point(0, 1)));
    let tokenStream = new TokenStream_1.TokenStream(tokens, tokenMinus1);
    let tokenTreeBuilder = new BracketGrouper_1.BracketGrouper();
    tokenTreeBuilder.runGrouping(tokenStream);
    if (tokenTreeBuilder.errors.length > 0) {
        for (let err of tokenTreeBuilder.errors) {
            fileErrors.parseErrors.push(err);
        }
    }
    // parse token tree into expression tree
    let groupedTokens = tokenTreeBuilder.tree;
    let wholeFileParseState = ModuleContentsFsa_1.parseWholeFileContents(fileLevelNode, groupedTokens);
    for (let err of wholeFileParseState.parseErrors) {
        fileErrors.parseErrors.push(err);
    }
}
exports.parseFile = parseFile;
//# sourceMappingURL=parseFile.js.map