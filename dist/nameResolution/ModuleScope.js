"use strict";
const Resolve_1 = require("./Resolve");
const PrefixTree_1 = require("./PrefixTree");
const Resolve_2 = require("./Resolve");
const PrefixTree_2 = require("./PrefixTree");
const Scope_1 = require("./Scope");
class ModuleScope extends Scope_1.Scope {
    constructor() {
        super(Scope_1.ScopeType.Module);
        this._usingModules = [];
        this._importAllModules = [];
        this.exportedNames = {};
        this.prefixTree = PrefixTree_2.createPrefixTree({});
        this.moduleShortName = null;
        this.parentModuleScope = null;
    }
    get usingModules() { return this._usingModules.slice(); }
    get importAllModules() { return this._importAllModules.slice(); }
    reset() {
        this.names = {};
        this._usingModules = [];
        this._importAllModules = [];
        this.exportedNames = {};
        this.refreshPrefixTree();
    }
    addUsingModule(scope) {
        // do not add duplicate
        if (this._usingModules.findIndex((iScope) => { return iScope.moduleShortName === scope.moduleShortName; }) >= 0)
            return;
        this._usingModules.push(scope);
    }
    addImportAllModule(scope) {
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
                return wrapInImportIfNecessary(resolve);
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
            return wrapInImportIfNecessary(matchingUsings[0][1]);
        }
        // conflicts between multiple usings
        let msg = "Modules used (";
        msg += matchingUsings.map((item) => { return item[0].moduleShortName; }).join(", ");
        msg += ") all export '" + name + "'. Must invoke qualify with module name.";
        console.log(msg);
        return null;
    }
    tryResolveExportedName(name) {
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
        if (name in this.names)
            return this.names[name];
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
function wrapInImportIfNecessary(resolve) {
    if (resolve instanceof Resolve_2.ImportedResolve)
        return resolve;
    if (resolve instanceof Resolve_1.ModuleResolve)
        return resolve;
    return new Resolve_2.ImportedResolve(resolve);
}
//# sourceMappingURL=ModuleScope.js.map