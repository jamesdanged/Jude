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
function isWhiteSpaceNotNewLine(char) {
    return char === " " || char === "\t" || char === "\r"; // include carriage return
}
exports.isWhiteSpaceNotNewLine = isWhiteSpaceNotNewLine;
function isNewLine(char) {
    return char === "\n";
}
exports.isNewLine = isNewLine;
function isWhiteSpace(char) {
    return char === " " || char === "\t" || char === "\n" || char === "\r";
}
exports.isWhiteSpace = isWhiteSpace;
function isValidIdentifierStart(char) {
    // TODO  http://julia.readthedocs.org/en/release-0.4/manual/variables/
    return isAlpha(char) || isUnicodeAbove00A0(char) || char === "_";
}
exports.isValidIdentifierStart = isValidIdentifierStart;
function isValidIdentifierContinuation(char) {
    // TODO
    return isAlpha(char) || char === "_" || char === "!" || isNumeric(char) || isUnicodeAbove00A0(char);
}
exports.isValidIdentifierContinuation = isValidIdentifierContinuation;
function isAlpha(char) {
    return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
}
exports.isAlpha = isAlpha;
function isNumeric(char) {
    return char >= '0' && char <= '9';
}
exports.isNumeric = isNumeric;
function isUnicodeAbove00A0(char) {
    return char > '\u00A0';
}
exports.isUnicodeAbove00A0 = isUnicodeAbove00A0;
function isBracket(char) {
    return char === "(" || char === ")" || char === "[" || char === "]" || char === "{" || char === "}";
}
exports.isBracket = isBracket;
//# sourceMappingURL=charUtils.js.map