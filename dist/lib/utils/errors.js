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
var assert_1 = require("./assert");
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