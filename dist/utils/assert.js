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
var taskUtils_1 = require("./taskUtils");
/**
 * Denotes an error that should not happen unless programmer error.
 */
class AssertError extends Error {
    constructor(msg) {
        super(msg);
    }
}
exports.AssertError = AssertError;
function assert(condition) {
    if (!condition) {
        throw new AssertError("Assertion failed");
    }
}
exports.assert = assert;
function throwErrorFromTimeout(err) {
    taskUtils_1.runDelayed(() => {
        throw err;
    });
}
exports.throwErrorFromTimeout = throwErrorFromTimeout;
//# sourceMappingURL=assert.js.map