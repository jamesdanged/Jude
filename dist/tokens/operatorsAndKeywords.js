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
var StringSet_1 = require("./../utils/StringSet");
var StringSet_2 = require("./../utils/StringSet");
var StringSet_3 = require("./../utils/StringSet");
var assert_1 = require("../utils/assert");
(function (TokenType) {
    TokenType[TokenType["Identifier"] = 0] = "Identifier";
    TokenType[TokenType["Number"] = 1] = "Number";
    TokenType[TokenType["LineWhiteSpace"] = 2] = "LineWhiteSpace";
    TokenType[TokenType["NewLine"] = 3] = "NewLine";
    TokenType[TokenType["Keyword"] = 4] = "Keyword";
    TokenType[TokenType["Operator"] = 5] = "Operator";
    TokenType[TokenType["Bracket"] = 6] = "Bracket";
    TokenType[TokenType["Quote"] = 7] = "Quote";
    TokenType[TokenType["SemiColon"] = 8] = "SemiColon";
    TokenType[TokenType["Comment"] = 9] = "Comment";
    TokenType[TokenType["StringLiteralContents"] = 10] = "StringLiteralContents";
    TokenType[TokenType["StringInterpolationStart"] = 11] = "StringInterpolationStart";
    TokenType[TokenType["CharacterLiteralContents"] = 12] = "CharacterLiteralContents";
    TokenType[TokenType["Macro"] = 13] = "Macro";
    TokenType[TokenType["StringMacro"] = 14] = "StringMacro";
    TokenType[TokenType["Symbol"] = 15] = "Symbol"; // eg :foo
})(exports.TokenType || (exports.TokenType = {}));
var TokenType = exports.TokenType;
exports.arithmeticOperators = StringSet_1.createStringSet([
    "+", "-", "*", "/",
    "\\",
    "%",
    "÷",
    "//",
    "^"
]);
exports.comparisonOperators = StringSet_1.createStringSet([
    "==", "!=",
    ">", ">=", "<=", "<",
    "≠", "≤", "≥",
    "===",
    "!==",
    "<:" // type inheritance comparison
]);
exports.assignmentOperators = StringSet_1.createStringSet([
    "=",
    "+=", "-=", "*=", "/=",
    "\\=", "%=", "÷=", "//=",
    "^=",
    "&=", "|=", "$=",
    ">>>=", ">>=", "<<="
]);
exports.logicalOperators = StringSet_1.createStringSet([
    "&&", "||", "!",
    "&", "|", "~", "$",
]);
exports.bitshiftOperators = StringSet_1.createStringSet([
    ">>>", ">>", "<<"
]);
exports.elementWiseOperators = StringSet_1.createStringSet([
    ".+", ".-", ".*", "./", ".\\", ".%", ".^",
    ".==", ".!=", ".>", ".>=", ".<=", ".<",
    ".<<", ".>>", ".>>>" // bitshifts
]);
exports.elementWiseAssignmentOperators = StringSet_1.createStringSet([
    ".+=", ".-=", ".*=", "./=", ".\\=", ".//=", ".%=", ".÷=", ".^=" // assignment
]);
var specialBinaryOperators = StringSet_1.createStringSet([
    ".",
    "::",
    ":",
    // It can also be used as an indexing expression by itself, ie arr[3, :]
    "..",
    "|>",
    ",",
    "=>" // constructs pairs
]);
// need special tokenizing logic to avoid treating as identifier
exports.binaryOperatorsLikeIdentifiers = StringSet_1.createStringSet([
    "in", "∈", "∋", "∉", "∌"
]);
var specialOperators = StringSet_1.createStringSet([
    "?",
    "...",
    "->",
    "'" // transpose operator in certain contexts
]);
exports.allOperators = StringSet_2.mergeSets([exports.arithmeticOperators, exports.comparisonOperators, exports.assignmentOperators,
    exports.logicalOperators, exports.bitshiftOperators, exports.elementWiseOperators, exports.elementWiseAssignmentOperators, specialBinaryOperators,
    exports.binaryOperatorsLikeIdentifiers, specialOperators]);
exports.longestOperatorLength = 4; // >>>= and .>>>
// assert the first char of all operators is an operator
// The tokenizer relies on this to recognize when a character is starting an operator.
// One exception for binaryOperatorsLikeIdentifiers, as they are parsed earlier in the identifier rule.
for (let op in exports.allOperators) {
    if (!(op[0] in exports.allOperators)) {
        if (op in exports.binaryOperatorsLikeIdentifiers) {
        }
        else {
            throw new assert_1.AssertError("The first character of " + op + " is not an operator!");
        }
    }
}
exports.unaryOperators = StringSet_1.createStringSet([
    "+", "-",
    "!", "~",
    "&" // address of operator only allowed within ccall
]);
exports.binaryOperators = StringSet_2.mergeSets([exports.arithmeticOperators, exports.comparisonOperators, exports.assignmentOperators, exports.elementWiseOperators, exports.elementWiseAssignmentOperators,
    exports.bitshiftOperators, specialBinaryOperators, exports.binaryOperatorsLikeIdentifiers]);
for (let op in exports.logicalOperators) {
    if (!(op in exports.unaryOperators))
        StringSet_3.addToSet(exports.binaryOperators, op);
}
exports.binaryOperatorsMayOmitArg2 = StringSet_1.createStringSet([","]);
exports.postFixOperators = StringSet_1.createStringSet([
    "'"
]);
// note, many operators can be overridden
//   eg +(a, b) = a + b
// That is ok, but changing '+' from binary to some other function or a variable is beyond
// our ability to statically parse.
//   eg + = 5
// We will just throw parse errors when that happens.
exports.overridableBinaryOperators = StringSet_2.mergeSets([exports.arithmeticOperators, exports.comparisonOperators, exports.bitshiftOperators, exports.elementWiseOperators, exports.binaryOperatorsLikeIdentifiers]);
StringSet_3.addToSet(exports.overridableBinaryOperators, "|>");
StringSet_3.addToSet(exports.overridableBinaryOperators, "&");
StringSet_3.addToSet(exports.overridableBinaryOperators, "|");
StringSet_3.addToSet(exports.overridableBinaryOperators, "$");
exports.overridableUnaryOperators = StringSet_2.mergeSets([exports.unaryOperators]);
exports.operatorsThatAreIdentifiers = StringSet_2.mergeSets([exports.arithmeticOperators, exports.comparisonOperators, exports.bitshiftOperators, exports.elementWiseOperators,
    exports.binaryOperatorsLikeIdentifiers]);
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "!");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "&");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "|");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "~");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "$");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, ":");
StringSet_3.addToSet(exports.operatorsThatAreIdentifiers, "|>");
exports.regexFlags = StringSet_1.createStringSet((["i", "m", "s", "x"]));
exports.keywords = StringSet_1.createStringSet([
    "function", "macro", "quote",
    "module", "baremodule",
    "type", "abstract", "typealias", "bitstype", "immutable",
    "const", "let", "local", "global",
    "export", "import", "importall", "using",
    "begin", "end",
    "if", "else", "elseif",
    "for", "while", "do",
    "try", "catch", "finally",
    "return", "break", "continue",
    "stagedfunction" // deprecated
]);
exports.keywordsNeedEnd = StringSet_1.createStringSet([
    "function", "macro", "quote",
    "module", "baremodule",
    "type", "immutable",
    "begin", "if", "for", "while", "do", "let", "try"
]);
exports.keywordValues = StringSet_1.createStringSet([
    "true", "false", "NaN", "Inf", "nothing"
]);
exports.allBrackets = StringSet_1.createStringSet([
    "(", ")",
    "[", "]",
    "{", "}",
]);
exports.allQuotes = StringSet_1.createStringSet([
    "\"",
    "'",
    "`",
    "\"\"\""
]);
(function (Escapes) {
    Escapes[Escapes["End"] = 0] = "End";
    Escapes[Escapes["Parenthesis"] = 1] = "Parenthesis";
    Escapes[Escapes["SquareBracket"] = 2] = "SquareBracket";
    Escapes[Escapes["CurlyBracket"] = 3] = "CurlyBracket";
    // other keywords for next section
    Escapes[Escapes["Catch"] = 4] = "Catch";
    Escapes[Escapes["Finally"] = 5] = "Finally";
    Escapes[Escapes["ElseIf"] = 6] = "ElseIf";
    Escapes[Escapes["Else"] = 7] = "Else";
    //Return,
    //Break,
    //Continue
    Escapes[Escapes["Colon"] = 8] = "Colon";
    Escapes[Escapes["Comma"] = 9] = "Comma";
})(exports.Escapes || (exports.Escapes = {}));
var Escapes = exports.Escapes;
function toEscapeString(esc) {
    switch (esc) {
        case Escapes.End:
            return "end";
        case Escapes.Parenthesis:
            return ")";
        case Escapes.SquareBracket:
            return "]";
        case Escapes.CurlyBracket:
            return "}";
        case Escapes.Else:
            return "else";
        case Escapes.ElseIf:
            return "elseif";
        case Escapes.Catch:
            return "catch";
        case Escapes.Finally:
            return "finally";
        case Escapes.Comma:
            return ",";
        case Escapes.Colon:
            return ":";
        default:
            throw new assert_1.AssertError("Unexpected escape type: " + esc);
    }
}
exports.toEscapeString = toEscapeString;
//# sourceMappingURL=operatorsAndKeywords.js.map