"use strict";
//class AssertError {
//  message: string
//  constructor() {
//    this.message = "Assertion Failed"
//  }
//}
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
    window.setTimeout(() => {
        throw err;
    });
}
exports.throwErrorFromTimeout = throwErrorFromTimeout;
//# sourceMappingURL=assert.js.map