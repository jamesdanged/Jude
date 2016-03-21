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
var ModuleLibrary_1 = require("../core/ModuleLibrary");
var Resolve_1 = require("./Resolve");
var assert_1 = require("../utils/assert");
var errors_1 = require("../utils/errors");
var Resolve_2 = require("./Resolve");
var ModuleLibrary_2 = require("../core/ModuleLibrary");
var PrefixTree_1 = require("./PrefixTree");
var PrefixTree_2 = require("./PrefixTree");
class Scope {
    constructor(type) {
        this.type = type;
        this.type = type;
        this.names = {};
        this.parent = null;
        this.tokenStart = null;
        this.tokenEnd = null;
    }
    createChild(type) {
        let child = new Scope(type);
        child.parent = this;
        return child;
    }
    tryResolveNameThroughParentScopes(name, haltSearchAtOuterFunctionScope) {
        let currScope = this;
        while (currScope !== null) {
            let resolve = currScope.tryResolveNameThisLevel(name);
            if (resolve !== null)
                return resolve;
            if (haltSearchAtOuterFunctionScope && currScope.type === ScopeType.Function)
                return null;
            currScope = currScope.parent;
        }
        return null;
    }
    /**
     * Resolves only at this scope, not a parent scope.
     *
     * @param name
     * @returns Null if not found.
     */
    tryResolveNameThisLevel(name) {
        // this level
        if (name in this.names) {
            return this.names[name];
        }
        return null;
    }
    /**
     * Resolves the module qualified name. Returns the resolve, or returns an error if any part along the way not found.
     */
    tryResolveMultiPartName(multiPartName) {
        if (multiPartName.length === 0)
            throw new assert_1.AssertError("Zero length name");
        let currScope = this;
        for (let idx = 0; idx < multiPartName.length; idx++) {
            let identNode = multiPartName[idx];
            let namePart = identNode.name;
            let isLastPart = idx === multiPartName.length - 1;
            let resolve = currScope.tryResolveNameThroughParentScopes(namePart, false);
            if (resolve !== null) {
                if (isLastPart)
                    return resolve;
                if (resolve instanceof Resolve_1.ModuleResolve) {
                    currScope = resolve.moduleRootScope;
                }
                else {
                    return new errors_1.NameError("Expected '" + resolve.name + "' to be a module, but was already declared as " +
                        Resolve_2.getResolveInfoType(resolve) + " in this scope.", identNode.token);
                }
            }
            else {
                return new errors_1.NameError("Could not find name: '" + namePart + "'.", identNode.token);
            }
        }
        throw new assert_1.AssertError(""); // should not reach here
    }
    getMatchingNames(prefix) {
        let matchingNames = [];
        for (let name in this.names) {
            if (name.toLowerCase().startsWith(prefix)) {
                matchingNames.push(name);
            }
        }
        return matchingNames;
    }
}
exports.Scope = Scope;
class ModuleScope extends Scope {
    constructor() {
        super(ScopeType.Module);
        this._usingModules = [];
        this._importAllModules = [];
        this.exportedNames = {};
        this.prefixTree = PrefixTree_2.createPrefixTree({});
        this.moduleShortName = null;
        this.isExternal = false;
        this.moduleFullName = null;
        this.moduleLibrary = null;
        this.initializedLibraryReference = false;
    }
    get usingModules() { return this._usingModules.slice(); }
    get importAllModules() { return this._importAllModules.slice(); }
    reset() {
        if (this.isExternal)
            throw new assert_1.AssertError("");
        this.names = {};
        this._usingModules = [];
        this._importAllModules = [];
        this.exportedNames = {};
        this.refreshPrefixTree();
    }
    addUsingModule(scope) {
        if (this.isExternal)
            throw new assert_1.AssertError("");
        // do not add duplicate
        if (this._usingModules.findIndex((iScope) => { return iScope.moduleShortName === scope.moduleShortName; }) >= 0)
            return;
        this._usingModules.push(scope);
    }
    addImportAllModule(scope) {
        if (this.isExternal)
            throw new assert_1.AssertError("");
        // do not add duplicate
        if (this._importAllModules.findIndex((iScope) => { return iScope.moduleShortName === scope.moduleShortName; }) >= 0)
            return;
        this._importAllModules.push(scope);
    }
    refreshPrefixTree() {
        PrefixTree_1.reinitializePrefixTree(this.names, this.prefixTree);
    }
    /**
     * Returns the matching resolve info, searching all using and importall modules.
     *
     * When a module is importall'd, it takes precedence over used modules.
     * If multiple modules importall'd export the same name, only the first module's is used.
     *
     * If multiple modules used export the same name, an error is reported to console. Not a clean way to propogate the
     * error back to user yet.
     */
    searchUsedImportAlldModules(name) {
        for (let scope of this._importAllModules) {
            let resolve = scope.tryResolveExportedName(name);
            if (resolve !== null)
                return resolve;
        }
        let matchingUsings = [];
        for (let scope of this._usingModules) {
            let resolve = scope.tryResolveExportedName(name);
            if (resolve !== null) {
                matchingUsings.push([scope, resolve]);
            }
        }
        if (matchingUsings.length === 0) {
            return null;
        }
        if (matchingUsings.length === 1) {
            return matchingUsings[0][1];
        }
        // conflicts between multiple usings
        let msg = "Modules used (";
        msg += matchingUsings.map((item) => { return item[0].moduleShortName; }).join(", ");
        msg += ") all export '" + name + "'. Must invoke qualify with module name.";
        console.error(msg);
        return null;
    }
    tryResolveExportedName(name) {
        if (this.isExternal && !this.initializedLibraryReference)
            ModuleLibrary_1.initializeLibraryReference(this.moduleFullName, this.moduleLibrary);
        if (!(name in this.exportedNames)) {
            return null;
        }
        return this.tryResolveNameThisLevel(name);
    }
    /**
     * Resolves only at this scope, not a parent scope.
     * Also resolves to used modules.
     * For modules outside workspace, their scopes are lazy populated. This populates only the requested name.
     *
     * @param name
     * @returns Matching resolve. Null if not found.
     */
    tryResolveNameThisLevel(name) {
        if (this.isExternal && !this.initializedLibraryReference)
            ModuleLibrary_1.initializeLibraryReference(this.moduleFullName, this.moduleLibrary);
        if (name in this.names)
            return this.names[name];
        if (this.isExternal) {
            ModuleLibrary_2.tryAddNameFromSerializedState(name, this.moduleFullName, this.moduleLibrary);
            if (name in this.names)
                return this.names[name];
        }
        let result = this.searchUsedImportAlldModules(name);
        if (result === null)
            return null;
        return result;
    }
    getMatchingNames(prefix) {
        return this.prefixTree.getMatchingNames(prefix);
    }
}
exports.ModuleScope = ModuleScope;
(function (ScopeType) {
    ScopeType[ScopeType["Module"] = 0] = "Module";
    ScopeType[ScopeType["Function"] = 1] = "Function";
    ScopeType[ScopeType["InnerFunction"] = 2] = "InnerFunction";
    ScopeType[ScopeType["TypeDef"] = 3] = "TypeDef";
    ScopeType[ScopeType["Block"] = 4] = "Block";
})(exports.ScopeType || (exports.ScopeType = {}));
var ScopeType = exports.ScopeType;
//# sourceMappingURL=Scope.js.map