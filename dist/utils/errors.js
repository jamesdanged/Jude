"use strict";
const assert_1 = require("./assert");
class InvalidParseError extends Error {
    constructor(message, token) {
        super(message);
        this.token = token;
        if (!token) {
            throw new assert_1.AssertError("Invalid parse error needs token");
        }
        this.detailedMessage = null;
    }
}
exports.InvalidParseError = InvalidParseError;
class NameError {
    constructor(message, token) {
        this.message = message;
        this.token = token;
        //super(message)
        if (!token) {
            throw new assert_1.AssertError("Name error needs token");
        }
    }
}
exports.NameError = NameError;
//# sourceMappingURL=errors.js.map