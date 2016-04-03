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
var assert_1 = require("../utils/assert");
var atomApi_1 = require("../utils/atomApi");
// TODO need to warn/document that sometimes linting doesn't work
// and need to switch between tabs at least once to show any lints??
class Linter {
    constructor(sessionModel) {
        this.sessionModel = sessionModel;
    }
    lint(path) {
        let parseSet = this.sessionModel.parseSet;
        if (!(path in parseSet.fileLevelNodes))
            throw new assert_1.AssertError("");
        let errors = parseSet.errors[path];
        if (!errors)
            throw new assert_1.AssertError("");
        let lintMessages = [];
        for (let err of errors.parseErrors) {
            lintMessages.push({
                type: "Error",
                text: err.message,
                range: atomApi_1.toAtomRange(err.token.range),
                filePath: path
            });
        }
        for (let err of errors.nameErrors) {
            lintMessages.push({
                type: "Warning",
                text: err.message,
                range: atomApi_1.toAtomRange(err.token.range),
                filePath: path
            });
        }
        return lintMessages;
    }
}
exports.Linter = Linter;
//# sourceMappingURL=Linter.js.map