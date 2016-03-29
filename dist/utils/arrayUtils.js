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
function last(array) {
    if (array.length === 0)
        throw new assert_1.AssertError("Array is empty.");
    return array[array.length - 1];
}
exports.last = last;
function clearArray(array) {
    array.splice(0, array.length);
}
exports.clearArray = clearArray;
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
function resetHash(obj) {
    let keys = [];
    for (let key in obj) {
        keys.push(key);
    }
    for (let key of keys) {
        delete obj[key];
    }
}
exports.resetHash = resetHash;
//# sourceMappingURL=arrayUtils.js.map