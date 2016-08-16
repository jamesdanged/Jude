"use strict";
const Resolve_1 = require("./Resolve");
const StringSet_1 = require("../utils/StringSet");
const ModuleScope_1 = require("./ModuleScope");
const Resolve_2 = require("./Resolve");
const errors_1 = require("../utils/errors");
const arrayUtils_1 = require("../utils/arrayUtils");
const assert_1 = require("../utils/assert");
const nodes_1 = require("../parseTree/nodes");
const Resolve_3 = require("./Resolve");
const Resolve_4 = require("./Resolve");
const Resolve_5 = require("./Resolve");
const Resolve_6 = require("./Resolve");
const Resolve_7 = require("./Resolve");
const Resolve_8 = require("./Resolve");
const Resolve_9 = require("./Resolve");
/**
 * Works with the ScopeRecurser to build out a scope tree.
 * The recurser does the navigation through the node tree.
 * The builder checks and registers names.
 *
 */
class ScopeBuilder {
    constructor(recurser) {
        this._recurser = recurser;
    }
    get currFile() { return this._recurser.currFile; }
    get currScope() { return this._recurser.currScope; }
    get moduleLibrary() { return this._recurser.moduleLibrary; }
    get parseSet() { return this._recurser.parseSet; }
    logNameError(err) {
        this._recurser.logNameError(err);
    }
    logUnresolvedImport(moduleName) {
        StringSet_1.addToSet(this.moduleLibrary.toQueryFromJulia, moduleName);
    }
    logSingleImportName(moduleName) {
        if (moduleName.split(".").length > 1)
            throw new assert_1.AssertError("");
        let importList = this._recurser.currModuleResolveInfo.imports;
        if (importList.indexOf(moduleName) < 0) {
            importList.push(moduleName);
        }
    }
    registerImportAllOrUsing(multiPartName, isUsing) {
        if (!(this.currScope instanceof ModuleScope_1.ModuleScope))
            throw new assert_1.AssertError("");
        let scope = this.currScope;
        // register the name itself
        this.registerImport(multiPartName);
        // if it refers to a module, add to list of used modules, so names can resolve against it
        let result = scope.tryResolveMultiPartName(multiPartName);
        if (result instanceof errors_1.NameError) {
            this.logNameError(result);
            return;
        }
        let resolve = result;
        if (!(resolve instanceof Resolve_2.ModuleResolve))
            return;
        let referencedScope = resolve.moduleRootScope;
        if (isUsing) {
            scope.addUsingModule(referencedScope);
        }
        else {
            scope.addImportAllModule(referencedScope);
        }
    }
    registerImport(multiPartName) {
        if (!(this.currScope instanceof ModuleScope_1.ModuleScope))
            throw new assert_1.AssertError("");
        if (multiPartName.length == 0)
            throw new assert_1.AssertError("");
        // If the first part is not already imported, must be imported.
        let firstPart = multiPartName[0];
        if (firstPart.token.str !== ".") {
            if (this.registerSingleNameImport(firstPart)) {
                if (multiPartName.length === 1) {
                    return; // no more name parts to register
                }
                else {
                }
            }
            else {
                return;
            }
        }
        // try to search through modules for the full multi part name
        let resolveOrError = this.currScope.tryResolveMultiPartName(multiPartName);
        if (resolveOrError instanceof errors_1.NameError) {
            this.logNameError(resolveOrError);
            return;
        }
        let resolve = resolveOrError;
        let lastIdentNode = arrayUtils_1.last(multiPartName);
        let name = lastIdentNode.str;
        let existingResolve = this.currScope.tryResolveNameThisLevel(name);
        if (existingResolve !== null) {
            // if because the exact same reference already imported, then this is not a problem
            if (existingResolve instanceof Resolve_2.ModuleResolve && resolve instanceof Resolve_2.ModuleResolve) {
                let existingModuleResolve = existingResolve;
                let newModuleResolve = resolve;
                if (existingModuleResolve.moduleRootScope === newModuleResolve.moduleRootScope) {
                    // ok
                    return;
                }
                else {
                    this.logNameError(new errors_1.NameError("Conflicting import: '" + name + "' already refers to a different module in this scope.", lastIdentNode.token));
                    return;
                }
            }
            // else an error
            this.logNameError(new errors_1.NameError("Conflicting import: '" + name + "' already declared in this scope.", lastIdentNode.token));
            return;
        }
        if (resolve instanceof Resolve_3.LocalModuleResolve) {
            this.currScope.names[name] = resolve.shallowCopy();
            return;
        }
        if (resolve instanceof Resolve_1.ExternalModuleResolve) {
            this.currScope.names[name] = resolve.shallowCopy();
            return;
        }
        if (resolve instanceof Resolve_5.ImportedResolve) {
            // importing an import. Copy the structure.
            this.currScope.names[name] = resolve.shallowCopy();
            return;
        }
        if (resolve instanceof Resolve_6.FunctionResolve || resolve instanceof Resolve_7.TypeResolve || resolve instanceof Resolve_8.VariableResolve || resolve instanceof Resolve_9.MacroResolve) {
            // get the module that contains the function/type/variable/macro
            let concatNameToImportMinusEnd = multiPartName.slice(0, multiPartName.length - 1);
            if (concatNameToImportMinusEnd.length === 0)
                throw new assert_1.AssertError("");
            let containingModule = this.currScope.tryResolveMultiPartName(concatNameToImportMinusEnd);
            if (!(containingModule instanceof Resolve_2.ModuleResolve))
                throw new assert_1.AssertError("");
            // store the reference
            this.currScope.names[name] = new Resolve_5.ImportedResolve(resolve);
            return;
        }
        throw new assert_1.AssertError(""); // should not get here
    }
    /**
     *
     * @returns True if name is successfully registered. False if name not resolved.
     */
    registerSingleNameImport(singlePartName) {
        let name = singlePartName.str;
        this.logSingleImportName(name);
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            if (resolve instanceof Resolve_2.ModuleResolve) {
                // already imported
                return true;
            }
            else {
                this.logNameError(new errors_1.NameError("Cannot import a " + Resolve_4.getResolveInfoType(resolve), singlePartName.token));
                return false;
            }
        }
        let rootScope = this.moduleLibrary.modules[name];
        if (!rootScope) {
            // log for later resolution any modules that fail to import
            this.logUnresolvedImport(name);
            return false;
        }
        // register the imported module
        // get corresponding node if in the workspace
        let mri = this.parseSet.moduleResolveInfos.find((o) => { return o.scope === rootScope; });
        if (mri) {
            let rootNode = mri.root;
            if (!(rootNode instanceof nodes_1.ModuleDefNode))
                throw new assert_1.AssertError(""); // cannot be in the module library if it is a file level node
            let moduleDefNode = rootNode;
            this.currScope.names[name] = new Resolve_3.LocalModuleResolve(moduleDefNode, mri.containingFile, rootScope);
        }
        else {
            this.currScope.names[name] = new Resolve_1.ExternalModuleResolve(name, rootScope);
        }
        return true;
    }
    /**
     * Assignment can create a name in the current scope.
     * But if the name already exists up to the outermost function, then it doesn't create the name, but just references
     * the existing name.
     */
    createNameByAssignmentIfNecessary(identNode) {
        let name = identNode.str;
        if (identNode.isEndIndex()) {
            this.logNameError(new errors_1.NameError("Cannot assign to end keyword.", identNode.token));
            return;
        }
        let resolve = this.currScope.tryResolveNameThroughParentScopes(name, true);
        if (resolve === null || resolve instanceof Resolve_5.ImportedResolve) {
            this.registerVariable(identNode);
        }
        else {
            if (!(resolve instanceof Resolve_8.VariableResolve)) {
                this.logNameError(new errors_1.NameError("'" + name + "' already declared as " +
                    Resolve_4.getResolveInfoType(resolve) + " in this scope.", identNode.token));
                return;
            }
            else {
            }
        }
    }
    registerVariable(identifierNode) {
        let name = identifierNode.str;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null && !(resolve instanceof Resolve_5.ImportedResolve)) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_8.VariableResolve(identifierNode.token, this.currFile);
    }
    registerFunction(functionDefNode) {
        if (functionDefNode.name.length === 1) {
            let identifierNode = functionDefNode.name[0];
            let name = identifierNode.str;
            // register the function definition
            let resolve = this.currScope.tryResolveNameThisLevel(name);
            if (resolve === null || resolve instanceof Resolve_5.ImportedResolve) {
                resolve = new Resolve_6.FunctionResolve(identifierNode.str);
                this.currScope.names[name] = resolve;
            }
            else if (resolve instanceof Resolve_7.TypeResolve) {
                // a special constructor function for the type
                return;
            }
            else if (!(resolve instanceof Resolve_6.FunctionResolve)) {
                this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_4.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
                return;
            }
            let functionResolve = resolve;
            functionResolve.functionDefs.push([this.currFile, functionDefNode]);
        }
        else if (functionDefNode.name.length >= 2) {
            // compound names, like 'Base.println'
            // have to search within another module
            let modulePath = functionDefNode.name.join(".");
            let lastPart = arrayUtils_1.last(functionDefNode.name);
            let res = this.currScope.tryResolveMultiPartName(functionDefNode.name);
            if (res instanceof errors_1.NameError) {
                this.logNameError(new errors_1.NameError("'" + lastPart.str + "' not found in module '" + modulePath + "'", lastPart.token));
            }
            else {
                let resolve = res;
                if (!(resolve instanceof Resolve_6.FunctionResolve)) {
                    this.logNameError(new errors_1.NameError("'" + lastPart.str + "' already declared as " + Resolve_4.getResolveInfoType(resolve) +
                        " in module '" + modulePath + "'", lastPart.token));
                }
                else {
                }
            }
        }
    }
    registerType(typeDefNode) {
        let identifierNode = typeDefNode.name;
        let name = identifierNode.str;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null && !(resolve instanceof Resolve_5.ImportedResolve)) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_4.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_7.TypeResolve(typeDefNode, this.currFile);
    }
    registerMacro(macroDefNode) {
        let identifierNode = macroDefNode.name;
        let nameTok = identifierNode.token;
        let name = identifierNode.str;
        if (name[0] === "@")
            throw new assert_1.AssertError("");
        name = "@" + name;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null && !(resolve instanceof Resolve_5.ImportedResolve)) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_4.getResolveInfoType(resolve) + " in this scope.", nameTok));
            return;
        }
        let macroResolve = new Resolve_9.MacroResolve(name);
        macroResolve.node = macroDefNode;
        macroResolve.filePath = this.currFile;
        this.currScope.names[name] = macroResolve;
    }
    /**
     * Registers a module that is declared in the file itself, not found via module library.
     */
    registerModule(moduleDefNode, moduleRootScope) {
        let identifierNode = moduleDefNode.name;
        if (!identifierNode)
            return; // parse failure
        let name = identifierNode.str;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_4.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_3.LocalModuleResolve(moduleDefNode, this.currFile, moduleRootScope);
    }
}
exports.ScopeBuilder = ScopeBuilder;
//# sourceMappingURL=ScopeBuilder.js.map