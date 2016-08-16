"use strict";
const Resolve_1 = require("./Resolve");
const assert_1 = require("../utils/assert");
const errors_1 = require("../utils/errors");
const Resolve_2 = require("./Resolve");
const ModuleScope_1 = require("./ModuleScope");
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
            let namePart = identNode.str;
            let isLastPart = idx === multiPartName.length - 1;
            if (namePart === ".") {
                if (idx === 0) {
                    continue;
                }
                else {
                    // go up through parent scopes until encounter module level scope
                    while (!(currScope instanceof ModuleScope_1.ModuleScope)) {
                        currScope = currScope.parent;
                        if (currScope === null)
                            throw new assert_1.AssertError("No parent module level scope??");
                    }
                    currScope = currScope.parentModuleScope;
                    if (currScope === null)
                        return new errors_1.NameError("No further parent modules", identNode.token);
                    continue;
                }
            }
            let resolve = currScope.tryResolveNameThroughParentScopes(namePart, false);
            if (resolve === null) {
                return new errors_1.NameError("Could not find name: '" + namePart + "'.", identNode.token);
            }
            else if (isLastPart) {
                return resolve;
            }
            else if (resolve instanceof Resolve_1.ModuleResolve) {
                currScope = resolve.moduleRootScope;
            }
            else {
                return new errors_1.NameError("Expected '" + resolve.name + "' to be a module, but was already declared as " +
                    Resolve_2.getResolveInfoType(resolve) + " in this scope.", identNode.token);
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
(function (ScopeType) {
    ScopeType[ScopeType["Module"] = 0] = "Module";
    ScopeType[ScopeType["Function"] = 1] = "Function";
    ScopeType[ScopeType["InnerFunction"] = 2] = "InnerFunction";
    ScopeType[ScopeType["TypeDef"] = 3] = "TypeDef";
    ScopeType[ScopeType["Block"] = 4] = "Block";
})(exports.ScopeType || (exports.ScopeType = {}));
var ScopeType = exports.ScopeType;
//# sourceMappingURL=Scope.js.map