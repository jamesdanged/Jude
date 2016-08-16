"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const taskUtils_1 = require("../utils/taskUtils");
const fileUtils_1 = require("../utils/fileUtils");
const resolveFullWorkspace_1 = require("../nameResolution/resolveFullWorkspace");
const nodepath = require("path");
const taskUtils_2 = require("../utils/taskUtils");
const parseFile_1 = require("../parseTree/parseFile");
const resolveFullWorkspace_2 = require("../nameResolution/resolveFullWorkspace");
const assert_1 = require("../utils/assert");
const nodes_1 = require("../parseTree/nodes");
function parseFullWorkspaceAsync(sessionModel) {
    return __awaiter(this, void 0, void 0, function* () {
        sessionModel.parseSet.reset();
        let t0 = Date.now();
        let allContents = yield loadProjectFiles();
        let t1 = Date.now();
        taskUtils_1.logElapsed("Successfully read project files from disk: " + (t1 - t0) + " ms");
        // parse all the files into expression trees
        t0 = Date.now();
        for (let path in allContents) {
            let fileContents = allContents[path];
            // break into smaller tasks to allow smooth GUI interaction
            yield taskUtils_2.runDelayed(() => {
                sessionModel.parseSet.createEntriesForFile(path);
                parseFile_1.parseFile(path, fileContents, sessionModel);
            });
        }
        t1 = Date.now();
        taskUtils_1.logElapsed("Parsed expression trees: " + (t1 - t0) + " ms");
        yield resolveFullWorkspace_2.resolveFullWorkspaceAsync(sessionModel);
        // report parse errors to console
        for (let path in sessionModel.parseSet.errors) {
            let errorSet = sessionModel.parseSet.errors[path];
            for (let err of errorSet.parseErrors) {
                console.log("Parse error in " + path + ":\n", err);
            }
        }
        //console.log("Reparsed whole workspace.")
    });
}
exports.parseFullWorkspaceAsync = parseFullWorkspaceAsync;
function refreshFileAsync(path, fileContents, sessionModel) {
    return __awaiter(this, void 0, void 0, function* () {
        if (nodepath.extname(path) !== ".jl")
            throw new assert_1.AssertError("");
        let mustReparseFullWorkspace = false;
        // If module declaration involved before, must reparse whole workspace.
        let fileLevelNode = sessionModel.parseSet.fileLevelNodes[path];
        if (!fileLevelNode)
            throw new assert_1.AssertError("");
        if (fileLevelNode.expressions.findIndex((o) => { return o instanceof nodes_1.ModuleDefNode; }) >= 0)
            mustReparseFullWorkspace = true;
        let t0 = Date.now();
        parseFile_1.parseFile(path, fileContents, sessionModel);
        let t1 = Date.now();
        taskUtils_1.logElapsed("Reparsed one file: " + (t1 - t0) + " ms");
        // If module declaration involved after, also must reparse whole workspace.
        // The node object stays the same, just its contents changed.
        if (fileLevelNode.expressions.findIndex((o) => { return o instanceof nodes_1.ModuleDefNode; }) >= 0)
            mustReparseFullWorkspace = true;
        if (mustReparseFullWorkspace) {
            yield resolveFullWorkspace_2.resolveFullWorkspaceAsync(sessionModel);
        }
        else {
            yield resolveFullWorkspace_1.resolveScopesInWorkspaceInvolvingFile(path, sessionModel);
        }
        // report parse errors to console
        let errorSet = sessionModel.parseSet.errors[path];
        for (let err of errorSet.parseErrors) {
            console.log("Parse error in " + path + ":\n", err);
        }
    });
}
exports.refreshFileAsync = refreshFileAsync;
/**
 * Loads all .jl files in project.
 * @returns Hash path -> contents
 */
function loadProjectFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        if (mockedProjectFiles !== null)
            return mockedProjectFiles;
        let projectDirs = atom.project.getDirectories();
        let allContents = {};
        for (let dir of projectDirs) {
            let fileSet = yield fileUtils_1.getAllFilesInAllSubDirectories(dir);
            // read all their contents
            // node doesn't like too many files open simultaneously. Just read one by one.
            for (let file of fileSet) {
                let path = yield file.getRealPath();
                if (nodepath.extname(path) === ".jl") {
                    allContents[path] = yield file.read();
                }
            }
        }
        return allContents;
    });
}
var mockedProjectFiles = null;
function mockProjectFiles(mock) {
    mockedProjectFiles = mock;
}
exports.mockProjectFiles = mockProjectFiles;
function unmockProjectFiles() {
    mockedProjectFiles = null;
}
exports.unmockProjectFiles = unmockProjectFiles;
//# sourceMappingURL=parseWorkspace.js.map