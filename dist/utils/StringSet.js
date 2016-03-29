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
function createStringSet(strings) {
    let d = {};
    for (let s of strings) {
        d[s] = 1;
    }
    return d;
}
exports.createStringSet = createStringSet;
/**
 * Returns a new set containing merger of input sets
 * @param sets
 */
function mergeSets(sets) {
    let d = {};
    for (let iset of sets) {
        for (let jstr in iset) {
            d[jstr] = 1;
        }
    }
    return d;
}
exports.mergeSets = mergeSets;
function stringSetToArray(stringSet) {
    let arr = [];
    for (let s in stringSet) {
        arr.push(s);
    }
    return arr;
}
exports.stringSetToArray = stringSetToArray;
function addToSet(stringSet, s) {
    stringSet[s] = 1;
}
exports.addToSet = addToSet;
//# sourceMappingURL=StringSet.js.map