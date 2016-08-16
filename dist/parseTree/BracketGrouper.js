"use strict";
const assert_1 = require("../utils/assert");
const TokenStream_1 = require("./../tokens/TokenStream");
const operatorsAndKeywords_1 = require("./../tokens/operatorsAndKeywords");
const errors_1 = require("./../utils/errors");
const operatorsAndKeywords_2 = require("./../tokens/operatorsAndKeywords");
const Token_1 = require("./../tokens/Token");
const Token_2 = require("./../tokens/Token");
const Token_3 = require("../tokens/Token");
const Token_4 = require("../tokens/Token");
/**
 * Runs a partial parse of the token sequence, merely
 * grouping tokens within
 *  brackets () [] {}
 *  quotes "" '' ``
 *  and various xxx...end blocks
 */
class BracketGrouper {
    constructor() {
        this.ts = null;
        this.openTokenStack = null;
        this.errors = null;
        this.tree = null;
    }
    /**
     * If any open token fails to close, there will be parse errors stored in 'errors'.
     */
    runGrouping(ts) {
        this.ts = ts;
        this.tree = [];
        this.errors = [];
        this.openTokenStack = [];
        this.openTokenStack.push(null); // null will be placeholder for the outermost node, which has no open/close bracket
        try {
            this._buildSubTree(null, this.tree);
            return;
        }
        catch (err) {
            if (err instanceof errors_1.InvalidParseError) {
                this.errors.push(err);
                return;
            }
            else {
                throw err;
            }
        }
    }
    /**
     * @param parentOpenToken  Can be null for top level.
     * @param children  Array to populate with the children of the given parent.
     */
    _buildSubTree(parentOpenToken, children) {
        let ts = this.ts;
        //let children: Token[] = []
        while (!ts.eof()) {
            // read contents
            let token = ts.read();
            if (isOpenToken(token)) {
                if (token.type === operatorsAndKeywords_2.TokenType.Keyword && token.str === "for" && parentOpenToken !== null && parentOpenToken.str === "[") {
                    // for inside brackets indicates a list comprehension
                    // not a for...end block
                    children.push(token);
                    continue;
                }
                if (token.type === operatorsAndKeywords_2.TokenType.Quote && isOpenCloseMatch(parentOpenToken, token)) {
                    // actually is a close
                    ts.unread();
                    return;
                }
                // create a new sub tree and populate recursively for everything up to the matching close
                let innerTree = new Token_2.TreeToken(token);
                children.push(innerTree);
                this.openTokenStack.push(token);
                this._buildSubTree(token, innerTree.contents);
                this.openTokenStack.pop();
                // get the close token
                if (ts.eof())
                    throw new errors_1.InvalidParseError("Failed to find close token before EOF", parentOpenToken);
                innerTree.closeToken = ts.read();
                continue;
            }
            if (isCloseToken(token)) {
                // If we are inside [] then the keyword 'end' no longer counts as a close
                if (token.type === operatorsAndKeywords_2.TokenType.Keyword && token.str === "end" && this.endCountsAsIndex()) {
                    // alter the token so it now counts as an identifier. Name resolution will have to handle it specially.
                    token.type = operatorsAndKeywords_2.TokenType.Identifier;
                    children.push(token);
                    continue;
                }
                if (!isOpenCloseMatch(parentOpenToken, token)) {
                    if (parentOpenToken === null) {
                        throw new errors_1.InvalidParseError("Unexpected close: '" + token.str +
                            "'. Context: '..." + ts.getContext() + "...'", token);
                    }
                    else {
                        throw new errors_1.InvalidParseError("Expected to close: '" + parentOpenToken.str + "' but found: '" + token.str +
                            "'. Context: '..." + ts.getContext() + "...'", parentOpenToken);
                    }
                }
                // is the correct closing token
                // end recursion
                ts.unread();
                return;
            }
            children.push(token);
        }
        // reached EOF without a close token
        // OK if top level
        if (parentOpenToken === null) {
            return;
        }
        throw new errors_1.InvalidParseError("Failed to find close token before EOF", parentOpenToken);
    }
    /**
     * The keyword 'end' actually can be used as an indexing arg, eg arr[1:end].
     *
     * True if we are inside [] (immediate parent or distant parent)
     * but not inside any xxx...end block.
     * Can be inside (), such as arr[1:(end-1)]
     */
    endCountsAsIndex() {
        if (this.openTokenStack.length === 1)
            return false; // only null is on stack
        for (let i = this.openTokenStack.length - 1; i >= 0; i--) {
            let tok = this.openTokenStack[i];
            if (tok.str === "(") {
                continue;
            }
            if (tok.str === "[") {
                return true;
            }
            return false;
        }
        return false;
    }
    static groupIntoOneThrowIfError(tokens) {
        let tokenMinus1 = new Token_1.Token("", operatorsAndKeywords_2.TokenType.LineWhiteSpace, new Token_4.Range(new Token_3.Point(0, 0), new Token_3.Point(0, 1)));
        let tokenStream = new TokenStream_1.TokenStream(tokens, tokenMinus1);
        let treeBuilder = new BracketGrouper();
        treeBuilder.runGrouping(tokenStream);
        if (treeBuilder.errors.length > 0)
            throw new assert_1.AssertError(treeBuilder.errors[0].message);
        if (treeBuilder.tree.length !== 1)
            throw new assert_1.AssertError("");
        return treeBuilder.tree[0];
    }
}
exports.BracketGrouper = BracketGrouper;
// helper functions
function isOpenToken(token) {
    return (token.type === operatorsAndKeywords_2.TokenType.Bracket && (token.str === "(" || token.str === "[" || token.str === "{")) ||
        (token.type === operatorsAndKeywords_2.TokenType.Quote) ||
        (token.type === operatorsAndKeywords_2.TokenType.Keyword && (token.str in operatorsAndKeywords_1.keywordsNeedEnd));
}
function isCloseToken(token) {
    return (token.type === operatorsAndKeywords_2.TokenType.Bracket && (token.str === ")" || token.str === "]" || token.str === "}")) ||
        (token.type === operatorsAndKeywords_2.TokenType.Quote) ||
        (token.type === operatorsAndKeywords_2.TokenType.Keyword && token.str === "end");
}
function isOpenCloseMatch(openToken, closeToken) {
    if (openToken === null)
        return false;
    if (openToken.type === operatorsAndKeywords_2.TokenType.Bracket && closeToken.type === operatorsAndKeywords_2.TokenType.Bracket) {
        if (openToken.str === "(" && closeToken.str === ")")
            return true;
        if (openToken.str === "[" && closeToken.str === "]")
            return true;
        if (openToken.str === "{" && closeToken.str === "}")
            return true;
    }
    if (openToken.type === operatorsAndKeywords_2.TokenType.Quote && closeToken.type === operatorsAndKeywords_2.TokenType.Quote) {
        if (openToken.str === "\"" && closeToken.str === "\"")
            return true;
        if (openToken.str === "'" && closeToken.str === "'")
            return true;
        if (openToken.str === "`" && closeToken.str === "`")
            return true;
        if (openToken.str === '"""' && closeToken.str === '"""')
            return true;
    }
    if (openToken.type === operatorsAndKeywords_2.TokenType.Keyword && closeToken.type == operatorsAndKeywords_2.TokenType.Keyword) {
        if ((openToken.str in operatorsAndKeywords_1.keywordsNeedEnd) && closeToken.str === "end") {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=BracketGrouper.js.map