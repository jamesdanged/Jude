"use strict";
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