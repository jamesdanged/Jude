"use strict";
var assert_1 = require("./assert");
function last(array) {
    if (array.length === 0)
        throw new assert_1.AssertError("Array is empty.");
    return array[array.length - 1];
}
exports.last = last;
function getFromHash(obj, key) {
    if (!(key in obj))
        throw new assert_1.AssertError("Key '" + key + "' not found in object.");
    return obj[key];
}
exports.getFromHash = getFromHash;
function getAllFromHash(obj) {
    let arr = [];
    for (let key in obj) {
        arr.push(obj[key]);
    }
    return arr;
}
exports.getAllFromHash = getAllFromHash;
//# sourceMappingURL=arrayUtils.js.map