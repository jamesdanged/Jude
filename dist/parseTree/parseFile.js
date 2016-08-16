"use strict";
const Tokenizer_1 = require("../tokens/Tokenizer");
const arrayUtils_1 = require("../utils/arrayUtils");
const Token_1 = require("../tokens/Token");
const operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
const Token_2 = require("../tokens/Token");
const Token_3 = require("../tokens/Token");
const TokenStream_1 = require("../tokens/TokenStream");
const BracketGrouper_1 = require("./BracketGrouper");
const ModuleContentsFsa_1 = require("../fsas/general/ModuleContentsFsa");
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