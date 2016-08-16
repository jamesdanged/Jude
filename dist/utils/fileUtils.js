"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/// <reference path="./../defs/atom/atom.d.ts" />
const assert_1 = require("./assert");
// these are atom API related file and dir objects
function getEntriesInDir(dir) {
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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