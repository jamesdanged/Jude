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
var assert_1 = require("../utils/assert");
var Resolve_1 = require("../nameResolution/Resolve");
var arrayUtils_1 = require("../utils/arrayUtils");
var Resolve_2 = require("../nameResolution/Resolve");
var atomApi_1 = require("../utils/atomApi");
var nodepath = require("path");
var atomApi_2 = require("../utils/atomApi");
var arrayUtils_2 = require("../utils/arrayUtils");
var Resolve_3 = require("../nameResolution/Resolve");
var Resolve_4 = require("../nameResolution/Resolve");
var Resolve_5 = require("../nameResolution/Resolve");
var Resolve_6 = require("../nameResolution/Resolve");
var Resolve_7 = require("../nameResolution/Resolve");
class JumpController {
    constructor(sessionModel) {
        this.sessionModel = sessionModel;
        this.jumpHistory = [];
        this.currJumpHistoryIndex = -1;
        this.lastKnownCursorPosition = null;
        this.currentlyJumping = false;
    }
    jumpToDefinitionAsync(editor) {
        return __awaiter(this, void 0, Promise, function* () {
            let path = editor.getPath();
            let identifiers = arrayUtils_1.getFromHash(this.sessionModel.parseSet.identifiers, path);
            let atomPoint = editor.getCursorBufferPosition();
            let point = atomApi_1.toPoint(atomPoint);
            let identNode = null;
            let resolve = null;
            for (let kv of identifiers.map) {
                let iIdentNode = kv[0];
                let iResolve = kv[1];
                if (iIdentNode.token.range.pointWithin(point)) {
                    identNode = iIdentNode;
                    resolve = iResolve;
                    break;
                }
            }
            if (resolve === null) {
                console.log("Must select an identifier.");
                return [];
            }
            if (!resolve.resolvesInWorkspace()) {
                console.log(identNode.name + " is not in workspace.");
                return [];
            }
            if (resolve instanceof Resolve_7.ImportedResolve)
                resolve = resolve.ref;
            let destPath = null;
            let destPoint = null;
            if (resolve instanceof Resolve_3.TypeResolve) {
                destPath = resolve.filePath;
                destPoint = resolve.typeDefNode.name.token.range.start;
            }
            else if (resolve instanceof Resolve_4.VariableResolve) {
                destPath = resolve.filePath;
                destPoint = resolve.token.range.start;
            }
            else if (resolve instanceof Resolve_5.FunctionResolve) {
                let paths = [];
                let nodes = [];
                for (let tup of resolve.functionDefs) {
                    let iPath = tup[0];
                    let funcDefNode = tup[1];
                    if (iPath !== null) {
                        paths.push(iPath);
                        nodes.push(funcDefNode);
                    }
                }
                if (paths.length === 0) {
                    console.error(identNode.name + " is not in project.");
                    return [];
                }
                else if (paths.length === 1) {
                    destPath = paths[0];
                    destPoint = nodes[0].name[0].token.range.start;
                }
                else {
                    console.log("There are " + paths.length + " functions in project matching the signature.");
                    let suggestions = [];
                    for (let tupIndex = 0; tupIndex < paths.length; tupIndex++) {
                        let path = paths[tupIndex];
                        let funcDefNode = nodes[tupIndex];
                        let sig = funcDefNode.toSignatureString();
                        suggestions.push({
                            text: sig,
                            //displayText: sig,
                            type: "function",
                            //leftLabel: "Any",
                            rightLabel: nodepath.basename(path),
                            description: sig,
                            node: funcDefNode,
                            destPath: path,
                            isJumpToDefinition: true
                        });
                    }
                    //console.error(identNode.name + " has multiple definitions.") // TODO
                    return suggestions;
                }
            }
            else if (resolve instanceof Resolve_6.MacroResolve) {
                destPath = resolve.filePath;
                destPoint = resolve.node.name.token.range.start;
            }
            else if (resolve instanceof Resolve_2.LocalModuleResolve) {
                destPath = resolve.filePath;
                destPoint = resolve.moduleDefNode.name.token.range.start;
            }
            else if (resolve instanceof Resolve_1.ModuleResolve) {
                console.error("Not supported for modules outside workspace.");
                return [];
            }
            else {
                throw new assert_1.AssertError("");
            }
            yield this.jumpAsync(destPath, destPoint);
            return [];
        });
    }
    onAutoCompleteDidInsertSuggestionsAsync(options) {
        return __awaiter(this, void 0, Promise, function* () {
            options.editor.undo();
            let destPath = options.suggestion.destPath;
            let node = options.suggestion.node;
            if (!node)
                return;
            if (!destPath)
                return;
            let destPoint = arrayUtils_2.last(node.name).token.range.start;
            yield this.jumpAsync(destPath, destPoint);
        });
    }
    jumpAsync(destPath, destPoint) {
        return __awaiter(this, void 0, Promise, function* () {
            let destAtomPoint = atomApi_2.toAtomPoint(destPoint);
            let oldPoint = this.getCurrentPosition();
            this.currentlyJumping = true;
            try {
                let matchingEditor = yield atom.workspace.open(destPath);
                matchingEditor.setCursorBufferPosition(destAtomPoint);
                matchingEditor.scrollToCursorPosition();
                let newPoint = this.getCurrentPosition();
                if (oldPoint)
                    this.addToJumpHistory(oldPoint);
                if (newPoint)
                    this.addToJumpHistory(newPoint);
                if (this.jumpHistory.length > 0) {
                    this.currJumpHistoryIndex = this.jumpHistory.length - 1;
                }
            }
            catch (err) {
                console.error("Error opening " + destPath + ": ", err);
            }
            this.currentlyJumping = false;
        });
    }
    goBackAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            if (this.jumpHistory.length === 0)
                return;
            if (this.currJumpHistoryIndex === 0)
                return;
            let index = this.currJumpHistoryIndex - 1;
            let jumpPoint = this.jumpHistory[index];
            let destPath = jumpPoint.path;
            let destPoint = atomApi_2.toAtomPoint(jumpPoint.point);
            try {
                let matchingEditor = yield atom.workspace.open(destPath);
                matchingEditor.setCursorBufferPosition(destPoint);
                matchingEditor.scrollToCursorPosition();
                this.currJumpHistoryIndex = index;
            }
            catch (err) {
                console.error("Error opening " + destPath + ": ", err);
            }
        });
    }
    goForwardAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            if (this.jumpHistory.length < 2)
                return;
            if (this.currJumpHistoryIndex === this.jumpHistory.length - 1)
                return;
            let index = this.currJumpHistoryIndex + 1;
            let jumpPoint = this.jumpHistory[index];
            let destPath = jumpPoint.path;
            let destPoint = atomApi_2.toAtomPoint(jumpPoint.point);
            try {
                let matchingEditor = yield atom.workspace.open(destPath);
                matchingEditor.setCursorBufferPosition(destPoint);
                matchingEditor.scrollToCursorPosition();
                this.currJumpHistoryIndex = index;
            }
            catch (err) {
                console.error("Error opening " + destPath + ": ", err);
            }
        });
    }
    /**
     * Returns the current position as a JumpPoint or null if a valid editor not open.
     */
    getCurrentPosition() {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor)
            return null;
        let path = editor.getPath();
        if (!path)
            return null;
        let atomPoint = editor.getCursorBufferPosition();
        let point = atomApi_1.toPoint(atomPoint);
        return new JumpPoint(path, point);
    }
    updateLastKnownCursorPosition() {
        let currPos = this.getCurrentPosition();
        if (currPos !== null) {
            //console.log("updating cursor to (" + currPos.point.row + "," + currPos.point.column + ")")
            this.lastKnownCursorPosition = currPos;
        }
    }
    /**
     * Adds point in history.
     * Only add if doesn't match last point.
     * Also truncates anything forward in the history.
     */
    addToJumpHistory(point) {
        if (this.jumpHistory.length > 0) {
            let idx = this.currJumpHistoryIndex;
            let lastPoint = this.jumpHistory[idx];
            if (!lastPoint.equals(point)) {
                let newIdx = idx + 1;
                this.jumpHistory.splice(newIdx, this.jumpHistory.length - newIdx, point);
                this.currJumpHistoryIndex = newIdx;
            }
        }
        else {
            this.jumpHistory.push(point);
            this.currJumpHistoryIndex = 0;
        }
    }
    onSwitchedTab() {
        // simply logs the position in the jump history
        let currPos = this.getCurrentPosition();
        if (!currPos)
            return; // not an editor tab or not a saved file
        //console.log("switched tab to (" + currPos.point.row + "," + currPos.point.column + ")")
        if (this.currentlyJumping)
            return;
        if (this.lastKnownCursorPosition !== null) {
            this.addToJumpHistory(this.lastKnownCursorPosition);
        }
        this.addToJumpHistory(currPos);
    }
}
exports.JumpController = JumpController;
class JumpPoint {
    constructor(path, point) {
        this.path = path;
        this.point = point;
    }
    equals(other) {
        return this.path === other.path && this.point.equals(other.point);
    }
}
//# sourceMappingURL=JumpController.js.map