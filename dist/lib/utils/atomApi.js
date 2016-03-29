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
/// <reference path="./../defs/atom/atom.d.ts" />
var tok = require("../tokens/Token");
var atomModule = require("atom");
function toAtomPoint(pt) {
    return new atomModule.Point(pt.row, pt.column);
}
exports.toAtomPoint = toAtomPoint;
function toAtomRange(range) {
    return new atomModule.Range(toAtomPoint(range.start), toAtomPoint(range.end));
}
exports.toAtomRange = toAtomRange;
function toPoint(pt) {
    return new tok.Point(pt.row, pt.column);
}
exports.toPoint = toPoint;
function toRange(range) {
    return new tok.Range(toPoint(range.start), toPoint(range.end));
}
exports.toRange = toRange;
function atomGetOpenFiles() {
    let paths = [];
    let editors = atom.workspace.getTextEditors();
    for (let editor of editors) {
        paths.push(editor.getPath());
    }
    return paths;
}
exports.atomGetOpenFiles = atomGetOpenFiles;
//# sourceMappingURL=atomApi.js.map