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
var Scope_1 = require("./Scope");
var Resolve_1 = require("./Resolve");
var errors_1 = require("../utils/errors");
var arrayUtils_1 = require("../utils/arrayUtils");
var assert_1 = require("../utils/assert");
var nodes_1 = require("../parseTree/nodes");
var Resolve_2 = require("./Resolve");
var Resolve_3 = require("./Resolve");
var Resolve_4 = require("./Resolve");
var Resolve_5 = require("./Resolve");
var Resolve_6 = require("./Resolve");
var Resolve_7 = require("./Resolve");
var Resolve_8 = require("./Resolve");
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
        let unresolvedList = this._recurser.currResolveRoot.unresolvedImports;
        if (unresolvedList.indexOf(moduleName) < 0) {
            unresolvedList.push(moduleName);
        }
    }
    logImport(moduleName) {
        let importList = this._recurser.currResolveRoot.imports;
        if (importList.indexOf(moduleName) < 0) {
            importList.push(moduleName);
        }
    }
    registerImportedName(multiPartName) {
        if (!(this.currScope instanceof Scope_1.ModuleScope))
            throw new assert_1.AssertError("");
        if (multiPartName.length == 0)
            throw new assert_1.AssertError("");
        let identNode = arrayUtils_1.last(multiPartName);
        let name = identNode.name;
        if (name in this.currScope.names) {
            this.logNameError(new errors_1.NameError("Conflicting import: '" + name + "' already declared as " +
                Resolve_3.getResolveInfoType(this.currScope.names[name]) + " in this scope.", identNode.token));
            return;
        }
        // if the first part is not already imported, must be imported
        let firstPart = multiPartName[0];
        let firstName = firstPart.name;
        this.logImport(firstName);
        let firstPartResolve = this.currScope.tryResolveNameThisLevel(firstName);
        if (firstPartResolve === null) {
            let rootScope = this.moduleLibrary.modules[firstName];
            if (!rootScope) {
                // log for later resolution any modules that fail to import
                this.logUnresolvedImport(firstName);
                return;
            }
            this.registerModuleNameFromLibrary(firstPart);
        }
        // finally, try to search through modules for the name
        let resolveOrError = this.currScope.tryResolveMultiPartName(multiPartName);
        if (resolveOrError instanceof errors_1.NameError) {
            this.logNameError(resolveOrError);
            return;
        }
        let res = resolveOrError;
        if (multiPartName.length === 1) {
            if (!(res instanceof Resolve_1.ModuleResolve)) {
                this.logNameError(new errors_1.NameError("Cannot import a " + Resolve_3.getResolveInfoType(res), firstPart.token));
                return;
            }
            return; // first part was imported above
        }
        if (res instanceof Resolve_2.LocalModuleResolve) {
            this.currScope.names[name] = new Resolve_2.LocalModuleResolve(res.moduleDefNode, res.filePath, res.moduleRootScope);
            return;
        }
        if (res instanceof Resolve_1.ModuleResolve) {
            this.currScope.names[name] = new Resolve_1.ModuleResolve(res.name, res.moduleRootScope);
            return;
        }
        if (res instanceof Resolve_4.ImportedResolve) {
            // importing an import. Copy the structure.
            this.currScope.names[name] = new Resolve_4.ImportedResolve(res.ref, res.module);
            return;
        }
        if (res instanceof Resolve_5.FunctionResolve || res instanceof Resolve_6.TypeResolve || res instanceof Resolve_7.VariableResolve || res instanceof Resolve_8.MacroResolve) {
            // get the module that contains the function/type/variable/macro
            let concatNameToImportMinusEnd = multiPartName.slice(0, multiPartName.length - 1);
            if (concatNameToImportMinusEnd.length === 0)
                throw new assert_1.AssertError("");
            let containingModule = this.currScope.tryResolveMultiPartName(concatNameToImportMinusEnd);
            if (!(containingModule instanceof Resolve_1.ModuleResolve))
                throw new assert_1.AssertError("");
            // store the reference
            this.currScope.names[name] = new Resolve_4.ImportedResolve(res, containingModule);
            return;
        }
        throw new assert_1.AssertError(""); // should not get here
    }
    registerImportAllUsingHelper(multiPartName, isUsing) {
        if (!(this.currScope instanceof Scope_1.ModuleScope))
            throw new assert_1.AssertError("");
        let moduleScope = this.currScope;
        let lastIdent = arrayUtils_1.last(multiPartName);
        // register the name itself
        this.registerImportedName(multiPartName);
        // if it refers to a module, add to list of used modules, so names can resolve against it
        let res = moduleScope.tryResolveMultiPartName(multiPartName);
        if (res instanceof errors_1.NameError) {
            this.logNameError(res);
            return;
        }
        let moduleResolveInfo = res;
        if (moduleResolveInfo instanceof Resolve_2.LocalModuleResolve) {
            let scopeToUse = this.parseSet.getResolveRoot(moduleResolveInfo.moduleDefNode).scope;
            if (isUsing) {
                moduleScope.addUsingModule(lastIdent.name, scopeToUse);
            }
            else {
                moduleScope.addImportAllModule(lastIdent.name, scopeToUse);
            }
        }
        else if (moduleResolveInfo instanceof Resolve_1.ModuleResolve) {
            if (isUsing) {
                moduleScope.addUsingModule(lastIdent.name, moduleResolveInfo.moduleRootScope);
            }
            else {
                moduleScope.addImportAllModule(lastIdent.name, moduleResolveInfo.moduleRootScope);
            }
        }
        else {
        }
    }
    /**
     * Assignment can create a name in the current scope.
     * But if the name already exists up to the outermost function, then it doesn't create the name, but just references
     * the existing name.
     *
     * Also resolves the identifier node.
     */
    createNameByAssignmentIfNecessary(identNode) {
        //if (identNode === null) return
        let name = identNode.name;
        if (identNode.isEndIndex()) {
            this.logNameError(new errors_1.NameError("Cannot assign to end keyword.", identNode.token));
            return;
        }
        let resolve = this.currScope.tryResolveNameThroughParentScopes(name, true);
        if (resolve === null) {
            this.registerVariableName(identNode);
        }
        else {
            if (!(resolve instanceof Resolve_7.VariableResolve)) {
                this.logNameError(new errors_1.NameError("'" + name + "' already declared as " +
                    Resolve_3.getResolveInfoType(resolve) + " in this scope.", identNode.token));
                return;
            }
            else {
            }
        }
    }
    registerVariableName(identifierNode) {
        let name = identifierNode.name;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_7.VariableResolve(identifierNode.token, this.currFile);
    }
    registerFunctionName(functionDefNode) {
        if (functionDefNode.name.length === 1) {
            let identifierNode = functionDefNode.name[0];
            let name = identifierNode.name;
            // register the function definition
            let resolve = this.currScope.tryResolveNameThisLevel(name);
            if (resolve === null) {
                resolve = new Resolve_5.FunctionResolve(identifierNode.name);
                this.currScope.names[name] = resolve;
            }
            else if (resolve instanceof Resolve_6.TypeResolve) {
                // a special constructor function for the type
                return;
            }
            else if (!(resolve instanceof Resolve_5.FunctionResolve)) {
                this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_3.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
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
                this.logNameError(new errors_1.NameError("'" + lastPart.name + "' not found in module '" + modulePath + "'", lastPart.token));
            }
            else {
                let resolve = res;
                if (!(resolve instanceof Resolve_5.FunctionResolve)) {
                    this.logNameError(new errors_1.NameError("'" + lastPart.name + "' already declared as " + Resolve_3.getResolveInfoType(resolve) +
                        " in module '" + modulePath + "'", lastPart.token));
                }
                else {
                }
            }
        }
    }
    registerTypeName(typeDefNode) {
        let identifierNode = typeDefNode.name;
        let name = identifierNode.name;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_3.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_6.TypeResolve(typeDefNode, this.currFile);
    }
    registerMacroName(macroDefNode) {
        let nameTok = macroDefNode.name.token;
        let name = macroDefNode.name.name;
        if (name[0] === "@")
            throw new assert_1.AssertError("");
        name = "@" + name;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_3.getResolveInfoType(resolve) + " in this scope.", nameTok));
            return;
        }
        let macroResolve = new Resolve_8.MacroResolve(name);
        macroResolve.node = macroDefNode;
        macroResolve.filePath = this.currFile;
        this.currScope.names[name] = macroResolve;
    }
    /**
     * Registers a module that is declared in the file itself, not found via module library.
     */
    registerModuleName(moduleDefNode, moduleRootScope) {
        let identifierNode = moduleDefNode.name;
        let name = identifierNode.name;
        let resolve = this.currScope.tryResolveNameThisLevel(name);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + name + "' already declared as " + Resolve_3.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
            return;
        }
        this.currScope.names[name] = new Resolve_2.LocalModuleResolve(moduleDefNode, this.currFile, moduleRootScope);
    }
    /**
     * Registers the module into this scope.
     * Should not be called if the name already exists in the scope.
     */
    registerModuleNameFromLibrary(identifierNode) {
        let moduleName = identifierNode.name;
        let rootScope = this.moduleLibrary.modules[moduleName];
        if (!rootScope)
            throw new assert_1.AssertError("");
        let resolve = this.currScope.tryResolveNameThisLevel(moduleName);
        if (resolve !== null) {
            this.logNameError(new errors_1.NameError("'" + moduleName + "' already declared as " + Resolve_3.getResolveInfoType(resolve) + " in this scope.", identifierNode.token));
            return;
        }
        // get corresponding node if in the workspace
        let resolveRoot = this.parseSet.resolveRoots.find((o) => { return o.scope === rootScope; });
        if (resolveRoot) {
            let rootNode = resolveRoot.root;
            if (!(rootNode instanceof nodes_1.ModuleDefNode))
                throw new assert_1.AssertError(""); // cannot be in the module library if it is a file level node
            let moduleDefNode = rootNode;
            this.currScope.names[moduleName] = new Resolve_2.LocalModuleResolve(moduleDefNode, resolveRoot.containingFile, rootScope);
        }
        else {
            this.currScope.names[moduleName] = new Resolve_1.ModuleResolve(moduleName, rootScope);
        }
    }
}
exports.ScopeBuilder = ScopeBuilder;
//# sourceMappingURL=ScopeBuilder.js.map