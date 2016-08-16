"use strict";
/// <reference path="./../defs/atom/atom.d.ts" />
const tok = require("../tokens/Token");
const atomModule = require("atom");
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
var mockedOpenFiles = null;
function mockOpenFiles(openFiles) {
    mockedOpenFiles = openFiles;
}
exports.mockOpenFiles = mockOpenFiles;
function unmockOpenFiles() {
    mockedOpenFiles = null;
}
exports.unmockOpenFiles = unmockOpenFiles;
function atomGetOpenFiles() {
    if (mockedOpenFiles !== null)
        return mockedOpenFiles;
    let paths = [];
    let editors = atom.workspace.getTextEditors();
    for (let editor of editors) {
        paths.push(editor.getPath());
    }
    return paths;
}
exports.atomGetOpenFiles = atomGetOpenFiles;
//# sourceMappingURL=atomApi.js.map