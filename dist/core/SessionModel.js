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
var ModuleLibrary_1 = require("./ModuleLibrary");
var assert_1 = require("../utils/assert");
var nodes_1 = require("../parseTree/nodes");
/**
 * Stores the parses from the files.
 * Stores names resolved from modules in library.
 * Only one for whole session.
 */
class SessionModel {
    constructor() {
        this.parseSet = new ParseSet();
        this.moduleLibrary = new ModuleLibrary_1.ModuleLibrary();
        this.partiallyResolved = false;
    }
}
exports.SessionModel = SessionModel;
/**
 * Contains parsing information for a whole set of files.
 */
class ParseSet {
    constructor() {
        this.reset();
    }
    createEntriesForFile(path) {
        this.fileLevelNodes[path] = new nodes_1.FileLevelNode(path);
        this.scopes[path] = new FileScopes();
        this.identifiers[path] = new FileIdentifiers();
        this.errors[path] = new FileErrors();
    }
    reset() {
        this.fileLevelNodes = {};
        this.scopes = {};
        this.identifiers = {};
        this.errors = {};
        this.resolveRoots = [];
    }
    /**
     * Clears node contents, and all logged scopes, logged identifiers, and logged errors related to a file.
     */
    resetFile(path) {
        let node = this.fileLevelNodes[path];
        if (!node)
            throw new assert_1.AssertError("");
        node.reset(); // reset the node, but leave the same object in place
        this.scopes[path] = new FileScopes();
        this.identifiers[path] = new FileIdentifiers();
        this.errors[path] = new FileErrors();
    }
    /**
     * Clears logged scopes, logged identifiers, and logged name errors related to a file.
     */
    resetNamesForFile(path) {
        let node = this.fileLevelNodes[path];
        if (!node)
            throw new assert_1.AssertError("");
        this.scopes[path] = new FileScopes();
        this.identifiers[path] = new FileIdentifiers();
        this.errors[path].nameErrors = [];
    }
    getResolveRoot(rootNode) {
        let res = this.tryGetResolveRoot(rootNode);
        if (res === null) {
            throw new assert_1.AssertError("");
        }
        return res;
    }
    tryGetResolveRoot(rootNode) {
        let idx = this.resolveRoots.findIndex((pr) => { return pr.root === rootNode; });
        if (idx < 0)
            return null;
        return this.resolveRoots[idx];
    }
}
exports.ParseSet = ParseSet;
/**
 * A parse root corresponds to a module.
 * Every declared module...end is a root.
 * Top level files (ie not included in any other files) are themselves roots.
 *
 */
class ResolveRoot {
    constructor() {
        this.root = null;
        this.relateds = [];
        this.containingFile = null;
        this.scope = null;
        this.imports = [];
    }
    reset() {
        this.scope.reset();
        this.imports = [];
    }
}
exports.ResolveRoot = ResolveRoot;
/**
 * Contains all the scopes created in the file.
 * One for each file.
 *
 * Used to resolve available names while typing.
 *
 * If this file was included in another file, this does not contain the module level scope that wraps the whole file.
 */
class FileScopes {
    constructor() {
        this._scopes = [];
    }
    addScope(scope) {
        this._scopes.push(scope);
    }
    /**
     * Search scopes that were created within the file.
     * Returns the narrowest scope that contains the point.
     * If the point is at the top level of the file (ie not inside any scope other than the module level scope),
     * will return null.
     */
    getScope(point) {
        let narrowestScope = null;
        for (let scope of this._scopes) {
            // check whether the scope contains the point
            // allow for null points due to bad parses
            let startPoint = null;
            let endPoint = null;
            if (scope.tokenStart !== null)
                startPoint = scope.tokenStart.range.start;
            if (scope.tokenEnd !== null)
                endPoint = scope.tokenEnd.range.end;
            if (startPoint !== null && point.isBefore(startPoint))
                continue;
            if (endPoint !== null && endPoint.isBefore(point))
                continue;
            // compare to see if this is narrower
            if (narrowestScope === null) {
                narrowestScope = scope;
            }
            else {
                if (narrowestScope.tokenStart !== null && scope.tokenStart !== null) {
                    if (narrowestScope.tokenStart.range.start.isBefore(scope.tokenStart.range.start)) {
                        narrowestScope = scope;
                    }
                }
                if (narrowestScope.tokenEnd !== null && scope.tokenEnd !== null) {
                    if (scope.tokenEnd.range.end.isBefore(narrowestScope.tokenEnd.range.end)) {
                        narrowestScope = scope;
                    }
                }
            }
        }
        return narrowestScope;
    }
    reset() {
        this._scopes = [];
    }
}
exports.FileScopes = FileScopes;
/**
 * Tracks all the identifiers in a file and what they resolve to.
 * One for each file.
 */
class FileIdentifiers {
    constructor() {
        this.map = new Map();
    }
}
exports.FileIdentifiers = FileIdentifiers;
/**
 * Tracks all the errors in the file.
 * One for each file.
 */
class FileErrors {
    constructor() {
        this.nameErrors = [];
        this.parseErrors = [];
    }
}
exports.FileErrors = FileErrors;
//# sourceMappingURL=SessionModel.js.map