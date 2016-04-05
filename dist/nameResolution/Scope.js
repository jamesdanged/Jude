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
var Resolve_1 = require("./Resolve");
var assert_1 = require("../utils/assert");
var Resolve_2 = require("./Resolve");
var assert_2 = require("../utils/assert");
var Token_1 = require("../tokens/Token");
var nodes_1 = require("../parseTree/nodes");
var Token_2 = require("../tokens/Token");
var Token_3 = require("../tokens/Token");
var arrayUtils_1 = require("../utils/arrayUtils");
var StringSet_1 = require("../utils/StringSet");
var nodes_2 = require("../parseTree/nodes");
var errors_1 = require("../utils/errors");
var Resolve_3 = require("./Resolve");
var PrefixTree_1 = require("./PrefixTree");
var PrefixTree_2 = require("./PrefixTree");
var Resolve_4 = require("./Resolve");
var Resolve_5 = require("./Resolve");
var Resolve_6 = require("./Resolve");
var Tokenizer_1 = require("../tokens/Tokenizer");
var operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
var BracketGrouper_1 = require("../parseTree/BracketGrouper");
var ModuleContentsFsa_1 = require("../fsas/general/ModuleContentsFsa");
var TypeDefFsa_1 = require("../fsas/declarations/TypeDefFsa");
var Resolve_7 = require("./Resolve");
var Resolve_8 = require("./Resolve");
var FunctionDefFsa_1 = require("../fsas/declarations/FunctionDefFsa");
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
            throw new assert_2.AssertError("Zero length name");
        let currScope = this;
        for (let idx = 0; idx < multiPartName.length; idx++) {
            let identNode = multiPartName[idx];
            let namePart = identNode.str;
            let isLastPart = idx === multiPartName.length - 1;
            let resolve = currScope.tryResolveNameThroughParentScopes(namePart, false);
            if (resolve !== null) {
                if (isLastPart)
                    return resolve;
                if (resolve instanceof Resolve_2.ModuleResolve) {
                    currScope = resolve.moduleRootScope;
                }
                else {
                    return new errors_1.NameError("Expected '" + resolve.name + "' to be a module, but was already declared as " +
                        Resolve_3.getResolveInfoType(resolve) + " in this scope.", identNode.token);
                }
            }
            else {
                return new errors_1.NameError("Could not find name: '" + namePart + "'.", identNode.token);
            }
        }
        throw new assert_2.AssertError(""); // should not reach here
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
/**
 * For modules external to the project.
 */
class ExternalModuleScope extends ModuleScope {
    /**
     * The module scope is not fully populated initially. Names are lazily loaded from the serializedLines.
     * The names are all immediately loaded into prefix trees.
     *
     * @param moduleFullName  Can have '.'
     * @param serializedLines
     * @param moduleLibrary
     */
    constructor(moduleFullName, serializedLines, moduleLibrary) {
        super();
        this.moduleFullName = moduleFullName;
        this.serializedLines = serializedLines;
        this.initializedLibraryReference = false;
        this.moduleShortName = arrayUtils_1.last(moduleFullName.split("."));
        this.prefixTree = PrefixTree_2.createPrefixTree(serializedLines);
        this.moduleLibrary = moduleLibrary;
    }
    reset() { throw new assert_2.AssertError(""); }
    getSerializedLines() { return this.serializedLines; } // just for serialization
    addUsingModule(scope) { throw new assert_2.AssertError(""); }
    addImportAllModule(scope) { throw new assert_2.AssertError(""); }
    tryResolveExportedName(name) {
        if (!this.initializedLibraryReference)
            this.initializeLibraryReference();
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
        if (!this.initializedLibraryReference)
            this.initializeLibraryReference();
        if (name in this.names)
            return this.names[name];
        this.tryAddNameFromSerializedState(name);
        if (name in this.names)
            return this.names[name];
        let result = this.searchUsedImportAlldModules(name);
        if (result === null)
            return null;
        return result;
    }
    /**
     * simply loads exported names into the export list of the scope
     *
     */
    initializeLibraryReference() {
        for (let name in this.serializedLines) {
            let arr = this.serializedLines[name];
            for (let line of arr) {
                if (line[2] === "exported") {
                    StringSet_1.addToSet(this.exportedNames, name);
                    break;
                }
                else if (line[2] === "hidden") {
                }
                else {
                    throw new assert_2.AssertError("");
                }
            }
        }
        this.initializedLibraryReference = true;
    }
    tryAddNameFromSerializedState(name) {
        let arr = this.serializedLines[name];
        if (!arr)
            return; // name not in module
        for (let line of arr) {
            if (line[0] === "function") {
                this.addFunctionFromSerialized(line);
            }
            else if (line[0] === "type") {
                this.addTypeFromSerialized(line);
            }
            else if (line[0] === "variable") {
                this.addVariableFromSerialized(line);
            }
            else if (line[0] === "macro") {
                this.addMacroFromSerialized(line);
            }
            else if (line[0] === "module") {
                this.addModuleFromSerialized(line);
            }
        }
    }
    addModuleFromSerialized(parts) {
        if (parts.length !== 4)
            throw new assert_2.AssertError("");
        let name = parts[1];
        let fullModulePath = parts[3];
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        if (fullModulePath in this.moduleLibrary.modules) {
            let innerModuleScope = this.moduleLibrary.modules[fullModulePath];
            this.names[name] = new Resolve_4.ExternalModuleResolve(fullModulePath, innerModuleScope);
        }
        else {
            // module hasn't been retrieved from Julia yet
            StringSet_1.addToSet(this.moduleLibrary.toQueryFromJulia, fullModulePath);
        }
    }
    addVariableFromSerialized(parts) {
        if (parts.length !== 3)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_5.VariableResolve(Token_2.Token.createEmptyIdentifier(name), null);
    }
    addMacroFromSerialized(parts) {
        if (parts.length !== 3)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_6.MacroResolve(name);
    }
    addTypeFromSerialized(parts) {
        if (parts.length !== 4)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // parse the type def block
        let code = parts[3];
        let tokens = Tokenizer_1.Tokenizer.tokenizeThrowIfError(code);
        if (tokens[2].type !== operatorsAndKeywords_1.TokenType.Identifier) {
            console.log("Skipping type due to name: " + code);
            return;
        }
        let tree = BracketGrouper_1.BracketGrouper.groupIntoOneThrowIfError(tokens);
        let wholeState = new ModuleContentsFsa_1.WholeFileParseState();
        let node = TypeDefFsa_1.parseWholeTypeDef(tree, wholeState);
        if (wholeState.parseErrors.length > 0) {
        }
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_7.TypeResolve(node, null);
    }
    addFunctionFromSerialized(parts) {
        if (parts.length !== 6)
            throw new assert_2.AssertError("");
        let name = parts[1];
        let signature = parts[3];
        let path = parts[4];
        if (path === "")
            path = null;
        let lineNumber = 0;
        if (parts[5] !== "")
            lineNumber = parseInt(parts[5]);
        let resolve = this.names[name];
        if (resolve) {
            if (!(resolve instanceof Resolve_8.FunctionResolve)) {
                assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared both as function and as " +
                    Resolve_3.getResolveInfoType(resolve) + " in module loaded from Julia??"));
                return;
            }
        }
        else {
            resolve = new Resolve_8.FunctionResolve(name);
            this.names[name] = resolve;
        }
        let functionResolve = resolve;
        if (signature.length === 0) {
            // no info on function signature. But we still want to recognize the name exists.
            // Just put in an empty function.
            let node = new nodes_1.FunctionDefNode();
            node.name = [new nodes_2.IdentifierNode(Token_2.Token.createEmptyIdentifier(name))];
            functionResolve.functionDefs.push([path, node]);
        }
        else {
            // create parsable code, and simply parse as a function definition node
            let code = "function " + signature + "\nend";
            let tokens = Tokenizer_1.Tokenizer.tokenizeThrowIfError(code);
            let tree = BracketGrouper_1.BracketGrouper.groupIntoOneThrowIfError(tokens);
            let wholeState = new ModuleContentsFsa_1.WholeFileParseState();
            let node = FunctionDefFsa_1.parseWholeFunctionDef(tree, wholeState);
            if (wholeState.parseErrors.length > 0) {
            }
            // update where the name token points to
            if (node.name.length > 0) {
                let range = null;
                if (lineNumber === 0) {
                    range = Token_3.Range.createEmptyRange();
                }
                else {
                    range = new Token_3.Range(new Token_1.Point(lineNumber - 1, 0), new Token_1.Point(lineNumber - 1, 1));
                }
                node.name[0].token.range = range;
            }
            else {
                console.error("Operator need to handle: " + name);
            }
            functionResolve.functionDefs.push([path, node]);
        }
    }
}
exports.ExternalModuleScope = ExternalModuleScope;
function wrapInImportIfNecessary(resolve) {
    if (resolve instanceof Resolve_1.ImportedResolve)
        return resolve;
    if (resolve instanceof Resolve_2.ModuleResolve)
        return resolve;
    return new Resolve_1.ImportedResolve(resolve);
}
(function (ScopeType) {
    ScopeType[ScopeType["Module"] = 0] = "Module";
    ScopeType[ScopeType["Function"] = 1] = "Function";
    ScopeType[ScopeType["InnerFunction"] = 2] = "InnerFunction";
    ScopeType[ScopeType["TypeDef"] = 3] = "TypeDef";
    ScopeType[ScopeType["Block"] = 4] = "Block";
})(exports.ScopeType || (exports.ScopeType = {}));
var ScopeType = exports.ScopeType;
//# sourceMappingURL=Scope.js.map