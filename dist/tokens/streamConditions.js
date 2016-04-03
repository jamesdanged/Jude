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
var Token_1 = require("./Token");
var operatorsAndKeywords_1 = require("./operatorsAndKeywords");
var operatorsAndKeywords_2 = require("./operatorsAndKeywords");
var operatorsAndKeywords_3 = require("./operatorsAndKeywords");
var operatorsAndKeywords_4 = require("./operatorsAndKeywords");
var operatorsAndKeywords_5 = require("./operatorsAndKeywords");
var operatorsAndKeywords_6 = require("./operatorsAndKeywords");
// Helper methods for conditions.
function alwaysPasses(ts) {
    return true;
}
exports.alwaysPasses = alwaysPasses;
function streamAtEof(ts) {
    return ts.eof();
}
exports.streamAtEof = streamAtEof;
function streamAtComment(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Comment;
}
exports.streamAtComment = streamAtComment;
function streamAtReturn(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "return";
}
exports.streamAtReturn = streamAtReturn;
function streamAtBreak(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "break";
}
exports.streamAtBreak = streamAtBreak;
function streamAtContinue(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "continue";
}
exports.streamAtContinue = streamAtContinue;
function streamAtUnaryOp(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && (tok.str in operatorsAndKeywords_4.unaryOperators);
}
exports.streamAtUnaryOp = streamAtUnaryOp;
function streamAtTernaryOp(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "?";
}
exports.streamAtTernaryOp = streamAtTernaryOp;
function streamAtPostFixOp(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && (tok.str in operatorsAndKeywords_3.postFixOperators);
}
exports.streamAtPostFixOp = streamAtPostFixOp;
function streamAtNumber(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Number;
}
exports.streamAtNumber = streamAtNumber;
function streamAtSymbol(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Symbol;
}
exports.streamAtSymbol = streamAtSymbol;
function streamAtIdentifier(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Identifier;
}
exports.streamAtIdentifier = streamAtIdentifier;
function streamAtMacroIdentifier(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Macro || tok.type === operatorsAndKeywords_6.TokenType.MacroWithSpace;
}
exports.streamAtMacroIdentifier = streamAtMacroIdentifier;
function streamAtMacroWithSpace(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.MacroWithSpace;
}
exports.streamAtMacroWithSpace = streamAtMacroWithSpace;
function streamAtMacroWithoutSpace(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Macro;
}
exports.streamAtMacroWithoutSpace = streamAtMacroWithoutSpace;
function streamAtOpenParenthesis(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Bracket && tok.str === "(";
}
exports.streamAtOpenParenthesis = streamAtOpenParenthesis;
function streamAtOpenSquareBracket(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Bracket && tok.str === "[";
}
exports.streamAtOpenSquareBracket = streamAtOpenSquareBracket;
function streamAtOpenCurlyBraces(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Bracket && tok.str === "{";
}
exports.streamAtOpenCurlyBraces = streamAtOpenCurlyBraces;
function streamAtOpenBlockKeyword(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && (tok.str in operatorsAndKeywords_5.keywordsNeedEnd);
}
exports.streamAtOpenBlockKeyword = streamAtOpenBlockKeyword;
function streamAtKeywordBlock(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    if (tok.type !== operatorsAndKeywords_6.TokenType.Keyword)
        return false;
    if (!(tok instanceof Token_1.TreeToken))
        return false;
    return tok.str === "function" || tok.str === "quote" || tok.str === "begin" || tok.str === "if" ||
        tok.str === "for" || tok.str === "while" || tok.str === "let" || tok.str === "try";
}
exports.streamAtKeywordBlock = streamAtKeywordBlock;
function streamAtAnyQuote(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Quote;
}
exports.streamAtAnyQuote = streamAtAnyQuote;
function streamAtStringLiteral(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.StringLiteralContents;
}
exports.streamAtStringLiteral = streamAtStringLiteral;
function streamAtInterpolationStart(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.StringInterpolationStart;
}
exports.streamAtInterpolationStart = streamAtInterpolationStart;
function streamAtNewLine(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.NewLine;
}
exports.streamAtNewLine = streamAtNewLine;
function streamAtSemicolon(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.SemiColon;
}
exports.streamAtSemicolon = streamAtSemicolon;
function streamAtDoubleColon(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "::";
}
exports.streamAtDoubleColon = streamAtDoubleColon;
function streamAtNewLineOrSemicolon(ts) {
    return streamAtNewLine(ts) || streamAtSemicolon(ts);
}
exports.streamAtNewLineOrSemicolon = streamAtNewLineOrSemicolon;
function streamAtEquals(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "=";
}
exports.streamAtEquals = streamAtEquals;
function streamAtComma(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === ",";
}
exports.streamAtComma = streamAtComma;
function streamAtDot(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === ".";
}
exports.streamAtDot = streamAtDot;
function streamAtColon(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === ":";
}
exports.streamAtColon = streamAtColon;
function streamAtLessThanColon(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "<:";
}
exports.streamAtLessThanColon = streamAtLessThanColon;
function streamAtIn(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "in";
}
exports.streamAtIn = streamAtIn;
function streamAtTripleDot(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str === "...";
}
exports.streamAtTripleDot = streamAtTripleDot;
function streamAtOverridableBinaryOperator(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str in operatorsAndKeywords_2.overridableBinaryOperators;
}
exports.streamAtOverridableBinaryOperator = streamAtOverridableBinaryOperator;
function streamAtOverridableUnaryOperator(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Operator && tok.str in operatorsAndKeywords_1.overridableUnaryOperators;
}
exports.streamAtOverridableUnaryOperator = streamAtOverridableUnaryOperator;
function streamAtOverridableOperator(ts) {
    return streamAtOverridableBinaryOperator(ts) || streamAtOverridableUnaryOperator(ts);
}
exports.streamAtOverridableOperator = streamAtOverridableOperator;
function streamAtRegex(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Regex;
}
exports.streamAtRegex = streamAtRegex;
function streamAtLocal(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "local";
}
exports.streamAtLocal = streamAtLocal;
function streamAtGlobal(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "global";
}
exports.streamAtGlobal = streamAtGlobal;
function streamAtConst(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "const";
}
exports.streamAtConst = streamAtConst;
function streamAtFor(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "for";
}
exports.streamAtFor = streamAtFor;
function streamAtElseIf(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "elseif";
}
exports.streamAtElseIf = streamAtElseIf;
function streamAtElse(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "else";
}
exports.streamAtElse = streamAtElse;
function streamAtCatch(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "catch";
}
exports.streamAtCatch = streamAtCatch;
function streamAtFinally(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "finally";
}
exports.streamAtFinally = streamAtFinally;
function streamAtDo(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "do";
}
exports.streamAtDo = streamAtDo;
function streamAtMacroKeyword(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "macro";
}
exports.streamAtMacroKeyword = streamAtMacroKeyword;
function streamAtModule(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "module";
}
exports.streamAtModule = streamAtModule;
function streamAtBareModule(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "baremodule";
}
exports.streamAtBareModule = streamAtBareModule;
function streamAtType(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "type";
}
exports.streamAtType = streamAtType;
function streamAtImmutable(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "immutable";
}
exports.streamAtImmutable = streamAtImmutable;
function streamAtAbstract(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "abstract";
}
exports.streamAtAbstract = streamAtAbstract;
function streamAtBitsType(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "bitstype";
}
exports.streamAtBitsType = streamAtBitsType;
function streamAtTypeAlias(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "typealias";
}
exports.streamAtTypeAlias = streamAtTypeAlias;
function streamAtImport(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "import";
}
exports.streamAtImport = streamAtImport;
function streamAtImportAll(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "importall";
}
exports.streamAtImportAll = streamAtImportAll;
function streamAtExport(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "export";
}
exports.streamAtExport = streamAtExport;
function streamAtUsing(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Keyword && tok.str === "using";
}
exports.streamAtUsing = streamAtUsing;
function streamAtInclude(ts) {
    if (ts.eof())
        return false;
    let tok = ts.peek();
    return tok.type === operatorsAndKeywords_6.TokenType.Identifier && tok.str === "include";
}
exports.streamAtInclude = streamAtInclude;
/**
 * True if the stream is at a compact function declaration such as
 *  f(val) = 2*val
 */
function streamAtFunctionCompactDeclaration(ts) {
    // could have done identifier check after peekUpTo4 but this saves having to do the slice by checking the identifier first
    if (ts.eof())
        return false;
    let tok = ts.peek();
    if (tok.type !== operatorsAndKeywords_6.TokenType.Identifier && !streamAtOverridableOperator(ts)) {
        return false;
    }
    // TODO handle multi part names
    let next4 = ts.peekUpToX(4);
    if (next4 === null)
        return false;
    // function with type parameters
    if (next4[1].type === operatorsAndKeywords_6.TokenType.Bracket && next4[1].str === "{" &&
        next4[2].type === operatorsAndKeywords_6.TokenType.Bracket && next4[2].str === "(" &&
        next4[3].type === operatorsAndKeywords_6.TokenType.Operator && next4[3].str === "=")
        return true;
    // function without type parameters
    if (next4[1].type === operatorsAndKeywords_6.TokenType.Bracket && next4[1].str === "(" &&
        next4[2].type === operatorsAndKeywords_6.TokenType.Operator && next4[2].str === "=")
        return true;
    return false;
}
exports.streamAtFunctionCompactDeclaration = streamAtFunctionCompactDeclaration;
function streamAtAnonymousFunction(ts) {
    let next2 = ts.peekUpToX(2);
    if (next2 === null)
        return false;
    let argsTok = next2[0];
    let arrowTok = next2[1];
    if (argsTok.type === operatorsAndKeywords_6.TokenType.Identifier ||
        (argsTok.type === operatorsAndKeywords_6.TokenType.Bracket && argsTok.str === "(")) {
        if (arrowTok.type === operatorsAndKeywords_6.TokenType.Operator && arrowTok.str === "->") {
            return true;
        }
        return false;
    }
    else {
        return false;
    }
}
exports.streamAtAnonymousFunction = streamAtAnonymousFunction;
function streamAtIdentifierEquals(ts) {
    if (ts.eof())
        return false;
    ts = ts.shallowCopy();
    let tokens = [];
    while (tokens.length < 2) {
        if (ts.eof())
            return false;
        let tok = ts.read();
        if (tok.type !== operatorsAndKeywords_6.TokenType.NewLine) {
            tokens.push(tok);
        }
    }
    if (tokens[0].type === operatorsAndKeywords_6.TokenType.Identifier && tokens[1].type === operatorsAndKeywords_6.TokenType.Operator && tokens[1].str === "=") {
        return true;
    }
    return false;
}
exports.streamAtIdentifierEquals = streamAtIdentifierEquals;
//# sourceMappingURL=streamConditions.js.map