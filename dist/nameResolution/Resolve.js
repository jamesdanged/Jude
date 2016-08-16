"use strict";
const assert_1 = require("../utils/assert");
class Resolve {
    constructor(name) {
        this.name = name;
    }
}
exports.Resolve = Resolve;
class VariableResolve extends Resolve {
    constructor(token, filePath) {
        super(token.str);
        this.token = token;
        this.filePath = filePath;
    }
    resolvesInWorkspace() {
        return this.filePath !== null;
    }
}
exports.VariableResolve = VariableResolve;
class FunctionResolve extends Resolve {
    constructor(name) {
        super(name);
        this.functionDefs = [];
    }
    resolvesInWorkspace() {
        let anyParsed = false;
        for (let def of this.functionDefs) {
            let filePath = def[0];
            let funcDefNode = def[1];
            if (filePath !== null) {
                anyParsed = true;
                break;
            }
        }
        return anyParsed;
    }
}
exports.FunctionResolve = FunctionResolve;
class TypeResolve extends Resolve {
    constructor(node, filePath) {
        super(node.name.str);
        this.filePath = filePath;
        this.typeDefNode = node;
    }
    resolvesInWorkspace() {
        return this.filePath !== null;
    }
}
exports.TypeResolve = TypeResolve;
class MacroResolve extends Resolve {
    constructor(name) {
        super(name);
        if (name[0] !== "@")
            throw new assert_1.AssertError("");
        this.filePath = null;
        this.node = null;
    }
    resolvesInWorkspace() {
        return this.filePath !== null;
    }
}
exports.MacroResolve = MacroResolve;
class ModuleResolve extends Resolve {
    constructor(moduleShortName, moduleRootScope) {
        super(moduleShortName); // short name is just the module name, no prefixes. Such as 'InnerMod' in Mod1.Mod2.InnerMod
        this.moduleRootScope = moduleRootScope;
    }
}
exports.ModuleResolve = ModuleResolve;
/**
 * Resolves to a module external to the workspace.
 * Only contains scope resolutions, not any expression tree.
 */
class ExternalModuleResolve extends ModuleResolve {
    constructor(fullModulePath, moduleRootScope) {
        super(fullModulePath.split(".")[0], moduleRootScope);
        this.fullModulePath = fullModulePath;
    }
    resolvesInWorkspace() {
        return false;
    }
    shallowCopy() {
        return new ExternalModuleResolve(this.fullModulePath, this.moduleRootScope);
    }
}
exports.ExternalModuleResolve = ExternalModuleResolve;
/**
 * Resolves to a module which has been read from files and parsed here.
 * Contains the parsed expression tree contents of the module.
 */
class LocalModuleResolve extends ModuleResolve {
    constructor(moduleDefNode, filePath, moduleRootScope) {
        super(moduleDefNode.name.str, moduleRootScope);
        this.moduleDefNode = moduleDefNode;
        this.filePath = filePath;
    }
    resolvesInWorkspace() {
        return true;
    }
    shallowCopy() {
        return new LocalModuleResolve(this.moduleDefNode, this.filePath, this.moduleRootScope);
    }
}
exports.LocalModuleResolve = LocalModuleResolve;
/**
 * For imported variables, functions, types, macros.
 * Imported modules should be unwrapped.
 */
class ImportedResolve extends Resolve {
    constructor(ref) {
        super(ref.name);
        this.ref = ref;
        if (!(ref instanceof FunctionResolve || ref instanceof VariableResolve || ref instanceof TypeResolve || ref instanceof MacroResolve)) {
            throw new assert_1.AssertError("");
        }
    }
    resolvesInWorkspace() {
        if (this.ref === null)
            return false;
        return this.ref.resolvesInWorkspace();
    }
    shallowCopy() {
        return new ImportedResolve(this.ref);
    }
}
exports.ImportedResolve = ImportedResolve;
function getResolveInfoType(resolve) {
    if (resolve instanceof FunctionResolve)
        return "function";
    if (resolve instanceof VariableResolve)
        return "variable";
    if (resolve instanceof ModuleResolve)
        return "module";
    if (resolve instanceof TypeResolve)
        return "type";
    if (resolve instanceof MacroResolve)
        return "macro";
    if (resolve instanceof ImportedResolve)
        return getResolveInfoType(resolve.ref);
    throw new assert_1.AssertError("");
}
exports.getResolveInfoType = getResolveInfoType;
(function (NameDeclType) {
    NameDeclType[NameDeclType["Local"] = 0] = "Local";
    NameDeclType[NameDeclType["Global"] = 1] = "Global";
    NameDeclType[NameDeclType["Const"] = 2] = "Const";
    NameDeclType[NameDeclType["ArgList"] = 3] = "ArgList";
    NameDeclType[NameDeclType["ImpliedByAssignment"] = 4] = "ImpliedByAssignment"; // names have local scope when assigned to, unless explicitly declared global.
})(exports.NameDeclType || (exports.NameDeclType = {}));
var NameDeclType = exports.NameDeclType;
//# sourceMappingURL=Resolve.js.map