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
var Resolve_6 = require("./../nameResolution/Resolve");
var atomModule = require("atom");
/**
 * Contains summary info for all modules registered in the system.
 * Modules may be in the workspace or not.
 *
 * Excludes modules not findable along the julia module path.
 */
class ModuleLibrary {
    constructor() {
        this.loadPaths = [];
        this.serializedLines = {};
        this.modules = {};
        this.prefixTrees = {};
        this.workspaceModulePaths = {};
        this.toQueryFromJulia = {};
    }
    initialize() {
        // restore state
        for (let moduleFullName in this.serializedLines) {
            let scope = new Scope_1.ModuleScope();
            scope.isLibraryReference = true;
            scope.moduleFullName = moduleFullName;
            scope.moduleLibrary = this;
            this.modules[moduleFullName] = scope;
            this.prefixTrees[moduleFullName] = PrefixTree_2.createPrefixTree(scope.names);
        }
    }
    refreshLoadPathsAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            let loadPaths = yield juliaChildProcess_1.runJuliaToGetLoadPathsAsync();
            this.loadPaths = loadPaths;
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
 * If the module is found to have inner modules, those are loaded too.
 *
 * Parse sets must already be built before this is run.
 */
function resolveModuleForLibrary(fullModuleName, sessionModel) {
    return __awaiter(this, void 0, Promise, function* () {
        let moduleLibrary = sessionModel.moduleLibrary;
        if (fullModuleName in moduleLibrary.modules)
            throw new assert_2.AssertError("");
        let outerModuleName = fullModuleName.split(".")[0];
        if (outerModuleName !== "Base" && outerModuleName !== "Core") {
            // search for a matching file in the file system
            let foundPath = null;
            for (let loadPath of moduleLibrary.loadPaths) {
                let path = nodepath.resolve(loadPath, outerModuleName, "src", outerModuleName + ".jl");
                let file = new atomModule.File(path, false);
                let exists = yield file.exists();
                if (exists) {
                    foundPath = yield file.getRealPath();
                    break;
                }
            }
            if (foundPath === null) {
                // this can happen eg import LinAlg, which is actually an inner module of Base
                console.error("Module '" + outerModuleName + "' was not found in the file system.");
                return;
            }
            // see if the file is one in the workspace
            if (foundPath in sessionModel.parseSet.fileLevelNodes) {
                let fileLevelNode = sessionModel.parseSet.fileLevelNodes[foundPath];
                // look for a module inside with the same name
                for (let expr of fileLevelNode.expressions) {
                    if (expr instanceof nodes_1.ModuleDefNode) {
                        let moduleDefNode = expr;
                        if (moduleDefNode.name.name === outerModuleName) {
                            // get the matching scope
                            let resolveRoot = sessionModel.parseSet.getResolveRoot(moduleDefNode);
                            let moduleScope = resolveRoot.scope;
                            // register it in the module library
                            //console.log("Registering workspace module '" + moduleName + "' in the library." )
                            moduleLibrary.modules[outerModuleName] = moduleScope;
                            moduleLibrary.prefixTrees[outerModuleName] = PrefixTree_2.createPrefixTree(moduleScope.names);
                            moduleLibrary.workspaceModulePaths[foundPath] = outerModuleName;
                            return;
                        }
                    }
                }
                // if reached here, no matching module, even though there should be one
                console.error("Module '" + outerModuleName + "' should be in the workspace at " + foundPath +
                    " but the file did not declare a module with name '" + outerModuleName + "'.");
                return;
            }
        }
        yield addModuleFromJuliaAsync(moduleLibrary, fullModuleName);
    });
}
exports.resolveModuleForLibrary = resolveModuleForLibrary;
///**
// * Adds the module, and then any inner modules.
// */
//async function recursivelyAddModulesFromJulia(moduleLibrary: ModuleLibrary, moduleFullName: string) {
//  // load the definition from julia
//  await addModuleFromJuliaAsync(moduleLibrary, moduleFullName)
//
//  if (!(moduleFullName in moduleLibrary.modules)) {
//    // Failed to load the module??
//    return
//  }
//
//  let moduleLinesByName = moduleLibrary.serializedLines[moduleFullName]
//  if (!moduleLinesByName) throw new AssertError("")
//  for (let name in moduleLinesByName) {
//    let arr: string[][] = moduleLinesByName[name]
//    for (let line of arr) {
//      if (line[0] === "module") {
//        let innerModuleName = line[1]
//        let innerModuleFullName = moduleFullName + "." + innerModuleName
//        await recursivelyAddModulesFromJulia(moduleLibrary, innerModuleFullName)
//      }
//    }
//  }
//}
/**
 *
 * @param moduleLibrary
 * @param moduleFullName  '.' delimited name
 */
function addModuleFromJuliaAsync(moduleLibrary, moduleFullName) {
    return __awaiter(this, void 0, Promise, function* () {
        try {
            console.log("Fetching module '" + moduleFullName + "' from Julia process to get type and function information.");
            let linesList = (yield juliaChildProcess_2.runJuliaToGetModuleDataAsync(moduleFullName));
            // convert array into a hash indexed by the name
            let moduleLinesByName = {};
            for (let line of linesList) {
                if (line.length < 2)
                    throw new assert_2.AssertError("");
                if (line[0] === "cancel") {
                    // if a module declares
                    //   import LinAlg
                    // This should not be queried directly, but as Base.LinAlg.
                    // But this cannot be known until Julia responds by resolving the path for us.
                    console.log("Skipping resolving '" + moduleFullName + ": " + line[1]);
                    return;
                }
                if (line.length < 3)
                    throw new assert_2.AssertError("");
                let name = line[1];
                if (!(name in moduleLinesByName)) {
                    moduleLinesByName[name] = [];
                }
                moduleLinesByName[name].push(line);
            }
            // The scope is lazily populated.
            let scope = new Scope_1.ModuleScope();
            scope.isLibraryReference = true;
            scope.moduleFullName = moduleFullName;
            scope.moduleLibrary = moduleLibrary;
            moduleLibrary.serializedLines[moduleFullName] = moduleLinesByName;
            moduleLibrary.modules[moduleFullName] = scope;
            // the prefix tree is ready immediately
            moduleLibrary.prefixTrees[moduleFullName] = PrefixTree_2.createPrefixTree(scope.names);
            console.log("Successfully retrieved '" + moduleFullName + "' from Julia process.");
        }
        catch (err) {
            assert_1.throwErrorFromTimeout(err);
        }
    });
}
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
    let moduleLinesByName = moduleLibrary.serializedLines[moduleName];
    if (!moduleLinesByName)
        throw new assert_2.AssertError("");
    for (let name in moduleLinesByName) {
        let arr = moduleLinesByName[name];
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
    let moduleLinesByName = moduleLibrary.serializedLines[moduleName];
    if (!moduleLinesByName)
        throw new assert_2.AssertError("");
    let arr = moduleLinesByName[name];
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
        else if (line[0] === "module") {
            addModuleToScope(line, moduleScope, moduleLibrary);
        }
    }
}
exports.tryAddNameFromSerializedState = tryAddNameFromSerializedState;
function addModuleToScope(parts, outerModuleScope, moduleLibrary) {
    if (parts.length !== 4)
        throw new assert_2.AssertError("");
    let name = parts[1];
    let fullModulePath = parts[3];
    if (name in outerModuleScope.names) {
        assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
    }
    if (fullModulePath in moduleLibrary.modules) {
        let innerModuleScope = moduleLibrary.modules[fullModulePath];
        outerModuleScope.names[name] = new Resolve_5.ModuleResolve(name, innerModuleScope);
    }
    else {
        // module hasn't been retrieved from Julia yet
        StringSet_1.addToSet(moduleLibrary.toQueryFromJulia, fullModulePath);
    }
}
function addVariableToScope(parts, scope) {
    if (parts.length !== 3)
        throw new assert_2.AssertError("");
    let name = parts[1];
    // store it
    if (name in scope.names) {
        assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
    }
    scope.names[name] = new Resolve_6.VariableResolve(Token_3.Token.createEmptyIdentifier(name), null);
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