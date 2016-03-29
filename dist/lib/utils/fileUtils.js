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
var assert_1 = require("./assert");
var nodepath = require("path");
// these are atom API related file and dir objects
/**
 * Loads all .jl files.
 * @returns array of arrays with tuples [path, contents]
 */
function loadAllFilesInAllProjectDirs() {
    return __awaiter(this, void 0, Promise, function* () {
        let projectDirs = atom.project.getDirectories();
        let projectDirsContents = [];
        for (let dir of projectDirs) {
            // separate file set for each project dir
            let pathsAndContents = yield loadAllFilesInProjectDir(dir);
            projectDirsContents.push(pathsAndContents);
        }
        return projectDirsContents;
    });
}
exports.loadAllFilesInAllProjectDirs = loadAllFilesInAllProjectDirs;
/**
 *
 * @returns Array with tuples: [path, contents] for all files
 */
function loadAllFilesInProjectDir(dir) {
    return __awaiter(this, void 0, Promise, function* () {
        let fileSet = yield getAllFilesInAllSubDirectories(dir);
        // read all their contents
        let filePathsAndContents = [];
        // node doesn't like too many files open simultaneously. Just read one by one.
        for (let file of fileSet) {
            let path = yield file.getRealPath();
            if (nodepath.extname(path) === ".jl") {
                let contents = yield file.read();
                filePathsAndContents.push([path, contents]);
            }
        }
        return filePathsAndContents;
    });
}
exports.loadAllFilesInProjectDir = loadAllFilesInProjectDir;
function getEntriesInDir(dir) {
    return __awaiter(this, void 0, Promise, function* () {
        return yield new Promise((resolve, reject) => {
            dir.getEntries((error, entries) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(entries);
                }
            });
        });
    });
}
exports.getEntriesInDir = getEntriesInDir;
function getAllFilesInAllSubDirectories(dir) {
    return __awaiter(this, void 0, Promise, function* () {
        // could be done faster if launch all reads at same time and wait for response
        // but harder to program
        let files = [];
        let dirsToSearch = [];
        dirsToSearch.push(dir);
        while (dirsToSearch.length > 0) {
            let iDir = dirsToSearch.shift();
            let entries = (yield getEntriesInDir(iDir));
            for (let entry of entries) {
                if (entry.isFile()) {
                    files.push(entry);
                }
                else if (entry.isDirectory()) {
                    dirsToSearch.push(entry);
                }
                else {
                    throw new assert_1.AssertError("");
                }
            }
        }
        return files;
    });
}
exports.getAllFilesInAllSubDirectories = getAllFilesInAllSubDirectories;
//# sourceMappingURL=fileUtils.js.map