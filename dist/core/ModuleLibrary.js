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
var atomModule = require("atom");
var nodepath = require("path");
var Scope_1 = require("../nameResolution/Scope");
var juliaChildProcess_1 = require("../utils/juliaChildProcess");
var assert_1 = require("../utils/assert");
var nodes_1 = require("../parseTree/nodes");
var juliaChildProcess_2 = require("../utils/juliaChildProcess");
var assert_2 = require("../utils/assert");
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
        this.workspaceModulePaths = {};
        this.toQueryFromJulia = {};
    }
    initialize() {
        // restore state, assuming the controller or main procedure already set this.serializedLines
        for (let moduleFullName in this.serializedLines) {
            this.modules[moduleFullName] = new Scope_1.ExternalModuleScope(moduleFullName, this.serializedLines[moduleFullName], this);
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
            throw new assert_1.AssertError("");
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
        yield addExternalModuleAsync(moduleLibrary, fullModuleName);
    });
}
exports.resolveModuleForLibrary = resolveModuleForLibrary;
/**
 *
 * @param moduleLibrary
 * @param moduleFullName  '.' delimited name
 */
function addExternalModuleAsync(moduleLibrary, moduleFullName) {
    return __awaiter(this, void 0, Promise, function* () {
        try {
            console.log("Fetching module '" + moduleFullName + "' from Julia process to get type and function information.");
            let linesList = (yield juliaChildProcess_2.runJuliaToGetModuleDataAsync(moduleFullName));
            // convert array into a hash indexed by the name
            let moduleLinesByName = {};
            for (let line of linesList) {
                if (line.length < 2)
                    throw new assert_1.AssertError("");
                if (line[0] === "cancel") {
                    // if a module declares
                    //   import LinAlg
                    // This should not be queried directly, but as Base.LinAlg.
                    // But this cannot be known until Julia responds by resolving the path for us.
                    console.log("Skipping resolving '" + moduleFullName + ": " + line[1]);
                    return;
                }
                if (line.length < 3)
                    throw new assert_1.AssertError("");
                let name = line[1];
                if (!(name in moduleLinesByName)) {
                    moduleLinesByName[name] = [];
                }
                moduleLinesByName[name].push(line);
            }
            // The scope is lazily populated
            // but the prefix tree is ready immediately
            let scope = new Scope_1.ExternalModuleScope(moduleFullName, moduleLinesByName, moduleLibrary);
            moduleLibrary.serializedLines[moduleFullName] = moduleLinesByName;
            moduleLibrary.modules[moduleFullName] = scope;
            console.log("Successfully retrieved '" + moduleFullName + "' from Julia process.");
        }
        catch (err) {
            assert_2.throwErrorFromTimeout(err);
        }
    });
}
//# sourceMappingURL=ModuleLibrary.js.map