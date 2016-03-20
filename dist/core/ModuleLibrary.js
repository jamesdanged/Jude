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
var Resolve_1 = require("../nameResolution/Resolve");
var PrefixTree_1 = require("../nameResolution/PrefixTree");
var PrefixTree_2 = require("../nameResolution/PrefixTree");
var Resolve_2 = require("../nameResolution/Resolve");
var nodepath = require("path");
var nodes_1 = require("../parseTree/nodes");
var Scope_1 = require("../nameResolution/Scope");
var taskUtils_1 = require("../utils/taskUtils");
var juliaChildProcess_1 = require("../utils/juliaChildProcess");
var nodes_2 = require("../parseTree/nodes");
var operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
var Resolve_3 = require("./../nameResolution/Resolve");
var assert_1 = require("../utils/assert");
var juliaChildProcess_2 = require("../utils/juliaChildProcess");
var Token_1 = require("../tokens/Token");
var Token_2 = require("../tokens/Token");
var FunctionDefFsa_1 = require("../fsas/declarations/FunctionDefFsa");
var ModuleContentsFsa_1 = require("../fsas/general/ModuleContentsFsa");
var assert_2 = require("../utils/assert");
var BracketGrouper_1 = require("../parseTree/BracketGrouper");
var Tokenizer_1 = require("../tokens/Tokenizer");
var Resolve_4 = require("./../nameResolution/Resolve");
var StringSet_1 = require("../utils/StringSet");
var TypeDefFsa_1 = require("../fsas/declarations/TypeDefFsa");
var nodes_3 = require("../parseTree/nodes");
var Token_3 = require("../tokens/Token");
var Resolve_5 = require("./../nameResolution/Resolve");
var atomModule = require("atom");
/**
 * Contains summary info for all modules registered in the system.
 * Modules may be in the workspace or not.
 *
 * Excludes modules not findable along the julia module path.
 * Excludes inner modules.
 */
class ModuleLibrary {
    constructor() {
        this.loadPaths = [];
        this.serializedLines = {};
        this.modules = {};
        this.prefixTrees = {};
        this.workspaceModulePaths = {};
    }
    initialize() {
        // restore state
        for (let moduleName in this.serializedLines) {
            let scope = new Scope_1.ModuleScope();
            scope.isLibraryReference = true;
            scope.moduleName = moduleName;
            scope.moduleLibrary = this;
            this.modules[moduleName] = scope;
            this.prefixTrees[moduleName] = PrefixTree_2.createPrefixTree(scope.names);
        }
    }
    refreshLoadPathsAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            let loadPaths = yield juliaChildProcess_1.runJuliaToGetLoadPathsAsync();
            this.loadPaths = loadPaths;
        });
    }
    addModuleFromJuliaAsync(moduleName) {
        return __awaiter(this, void 0, Promise, function* () {
            try {
                console.log("Fetching module '" + moduleName + "' from Julia process to get type and function information.");
                let linesList = (yield juliaChildProcess_2.runJuliaToGetModuleDataAsync(moduleName));
                let moduleLines = {};
                for (let line of linesList) {
                    if (line.length < 3)
                        throw new assert_2.AssertError("");
                    let name = line[1];
                    if (!(name in moduleLines)) {
                        moduleLines[name] = [];
                    }
                    moduleLines[name].push(line);
                }
                let scope = new Scope_1.ModuleScope();
                scope.isLibraryReference = true;
                scope.moduleName = moduleName;
                scope.moduleLibrary = this;
                this.serializedLines[moduleName] = moduleLines;
                this.modules[moduleName] = scope;
                this.prefixTrees[moduleName] = PrefixTree_2.createPrefixTree(scope.names);
                console.log("Successfully retrieved '" + moduleName + "' from Julia process.");
            }
            catch (err) {
                assert_1.throwErrorFromTimeout(err);
            }
        });
    }
    /**
     * Converts contents to a JSON object for storage when Atom is closed.
     * Avoid having to query Julia every startup.
     */
    serialize() {
        return {
            loadPaths: this.loadPaths,
            serializedLines: this.serializedLines
        };
        //let json = gLibrarySerializer.serialize(this)
        //return { moduleLibrary: json }
    }
}
exports.ModuleLibrary = ModuleLibrary;
/**
 * Searches for the module through the julia LOAD_PATH and installs it into the library.
 * If the module exists in the workspace, will reference the parse.
 * Otherwise will fetch function and type information from a Julia session.
 *
 * Parse sets must already be built before this is run.
 *
 * @param moduleName
 * @return ??
 */
function resolveModuleForLibrary(moduleName, sessionModel) {
    return __awaiter(this, void 0, Promise, function* () {
        let moduleLibrary = sessionModel.moduleLibrary;
        if (moduleName in moduleLibrary.modules)
            throw new assert_2.AssertError("");
        if (moduleName === "Base" || moduleName === "Core") {
            yield moduleLibrary.addModuleFromJuliaAsync(moduleName);
            return;
        }
        // search for a matching file in the file system
        let foundPath = null;
        for (let loadPath of moduleLibrary.loadPaths) {
            let path = nodepath.resolve(loadPath, moduleName, "src", moduleName + ".jl");
            let file = new atomModule.File(path, false);
            let exists = yield file.exists();
            if (exists) {
                foundPath = yield file.getRealPath();
                break;
            }
        }
        if (foundPath === null) {
            // module doesn't exist
            return; // TODO return an error?
        }
        // see if the file is one in the workspace
        if (foundPath in sessionModel.parseSet.fileLevelNodes) {
            let fileLevelNode = sessionModel.parseSet.fileLevelNodes[foundPath];
            // look for a module inside with the same name
            for (let expr of fileLevelNode.expressions) {
                if (expr instanceof nodes_1.ModuleDefNode) {
                    let moduleDefNode = expr;
                    if (moduleDefNode.name.name === moduleName) {
                        // get the matching scope
                        let resolveRoot = sessionModel.parseSet.getResolveRoot(moduleDefNode);
                        let moduleScope = resolveRoot.scope;
                        // register it in the module library
                        //console.log("Registering workspace module '" + moduleName + "' in the library." )
                        moduleLibrary.modules[moduleName] = moduleScope;
                        moduleLibrary.prefixTrees[moduleName] = PrefixTree_2.createPrefixTree(moduleScope.names);
                        moduleLibrary.workspaceModulePaths[foundPath] = moduleName;
                        return;
                    }
                }
            }
            // if reached here, no matching module, even though there should be one
            return; // TODO return an error?
        }
        // otherwise, just load the definition from julia
        yield sessionModel.moduleLibrary.addModuleFromJuliaAsync(moduleName);
    });
}
exports.resolveModuleForLibrary = resolveModuleForLibrary;
/**
 * simply loads exported names into the export list of the scope
 *
 */
function initializeLibraryReference(moduleName, moduleLibrary) {
    let scope = moduleLibrary.modules[moduleName];
    if (!scope)
        throw new assert_2.AssertError("");
    if (!(scope instanceof Scope_1.ModuleScope))
        throw new assert_2.AssertError("");
    let moduleScope = scope;
    let serNames = moduleLibrary.serializedLines[moduleName];
    if (!serNames)
        throw new assert_2.AssertError("");
    for (let name in serNames) {
        let arr = serNames[name];
        for (let line of arr) {
            if (line[2] === "exported") {
                StringSet_1.addToSet(moduleScope.exportedNames, name);
                break;
            }
            else if (line[2] === "hidden") {
            }
            else {
                throw new assert_2.AssertError("");
            }
        }
    }
    scope.initializedLibraryReference = true;
}
exports.initializeLibraryReference = initializeLibraryReference;
function tryAddNameFromSerializedState(name, moduleName, moduleLibrary) {
    let scope = moduleLibrary.modules[moduleName];
    if (!scope)
        throw new assert_2.AssertError("");
    if (!(scope instanceof Scope_1.ModuleScope))
        throw new assert_2.AssertError("");
    let moduleScope = scope;
    let serNames = moduleLibrary.serializedLines[moduleName];
    if (!serNames)
        throw new assert_2.AssertError("");
    let arr = serNames[name];
    if (!arr)
        return; // name not in module
    for (let line of arr) {
        if (line[0] === "function") {
            addFunctionToScope(line, moduleScope);
        }
        else if (line[0] === "type") {
            addTypeToScope(line, moduleScope);
        }
        else if (line[0] === "variable") {
            addVariableToScope(line, moduleScope);
        }
        else if (line[0] === "macro") {
            addMacroToScope(line, moduleScope);
        }
    }
}
exports.tryAddNameFromSerializedState = tryAddNameFromSerializedState;
function addVariableToScope(parts, scope) {
    if (parts.length !== 3)
        throw new assert_2.AssertError("");
    let name = parts[1];
    // store it
    if (name in scope.names) {
        assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
    }
    scope.names[name] = new Resolve_5.VariableResolve(Token_3.Token.createEmptyIdentifier(name), null);
}
function addMacroToScope(parts, scope) {
    if (parts.length !== 3)
        throw new assert_2.AssertError("");
    let name = parts[1];
    // store it
    if (name in scope.names) {
        assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
    }
    scope.names[name] = new Resolve_1.MacroResolve(name);
}
function addTypeToScope(parts, scope) {
    if (parts.length !== 4)
        throw new assert_2.AssertError("");
    let name = parts[1];
    // parse the type def block
    let code = parts[3];
    let tokens = Tokenizer_1.Tokenizer.tokenizeThrowIfError(code);
    if (tokens[1].type !== operatorsAndKeywords_1.TokenType.Identifier) {
        console.log("Skipping type due to name: " + code);
        return;
    }
    let tree = BracketGrouper_1.BracketGrouper.groupIntoOneThrowIfError(tokens);
    let wholeState = new ModuleContentsFsa_1.WholeFileParseState();
    let node = TypeDefFsa_1.parseWholeTypeDef(tree, wholeState);
    if (wholeState.parseErrors.length > 0) {
    }
    // store it
    if (name in scope.names) {
        assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
    }
    scope.names[name] = new Resolve_3.TypeResolve(node, null);
}
function addFunctionToScope(parts, scope) {
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
    let resolve = scope.names[name];
    if (resolve) {
        if (!(resolve instanceof Resolve_4.FunctionResolve)) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared both as function and as " +
                Resolve_2.getResolveInfoType(resolve) + " in module loaded from Julia??"));
            return;
        }
    }
    else {
        resolve = new Resolve_4.FunctionResolve(name);
        scope.names[name] = resolve;
    }
    let functionResolve = resolve;
    if (signature.length === 0) {
        // no info on function signature. But we still want to recognize the name exists.
        // Just put in an empty function.
        let node = new nodes_2.FunctionDefNode();
        node.name = [new nodes_3.IdentifierNode(Token_3.Token.createEmptyIdentifier(name))];
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
                range = Token_2.Range.createEmptyRange();
            }
            else {
                range = new Token_2.Range(new Token_1.Point(lineNumber - 1, 0), new Token_1.Point(lineNumber - 1, 1));
            }
            node.name[0].token.range = range;
        }
        else {
            console.error("Operator need to handle: " + name);
        }
        functionResolve.functionDefs.push([path, node]);
    }
}
function refreshPrefixTreesAsync(moduleLibrary, refreshFromSerialized) {
    return __awaiter(this, void 0, Promise, function* () {
        // TODO option to just refresh certain prefix trees that need to be refreshed
        let t0 = Date.now();
        // refresh prefix trees first time
        // this will load up all names that had been accessed in the module
        // but not any that were never accessed from the serialized state
        for (let moduleName in moduleLibrary.modules) {
            let moduleScope = moduleLibrary.modules[moduleName];
            if (!moduleScope.isLibraryReference) {
                let prefixTree = moduleLibrary.prefixTrees[moduleName];
                if (!prefixTree)
                    throw new assert_2.AssertError("");
                PrefixTree_1.reinitializePrefixTree(moduleScope.names, prefixTree);
            }
        }
        // asynchronously load up prefix tree with entire serialized contents of module
        // may be a bit slower
        if (refreshFromSerialized) {
            for (let moduleName in moduleLibrary.modules) {
                let moduleScope = moduleLibrary.modules[moduleName];
                if (moduleScope.isLibraryReference) {
                    if (moduleName in moduleLibrary.serializedLines) {
                        yield taskUtils_1.runDelayed(() => {
                            let lineSet = moduleLibrary.serializedLines[moduleName];
                            let prefixTree = moduleLibrary.prefixTrees[moduleName];
                            if (!prefixTree)
                                throw new assert_2.AssertError("");
                            let namesObj = {};
                            for (let name in lineSet) {
                                StringSet_1.addToSet(namesObj, name);
                            }
                            PrefixTree_1.reinitializePrefixTree(namesObj, prefixTree);
                        });
                    }
                }
            }
        }
        let t1 = Date.now();
        console.log("Refreshed prefix trees: " + (t1 - t0) + " ms");
    });
}
exports.refreshPrefixTreesAsync = refreshPrefixTreesAsync;
//# sourceMappingURL=ModuleLibrary.js.map