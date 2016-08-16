"use strict";
const assert_1 = require("../utils/assert");
const atomApi_1 = require("../utils/atomApi");
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