"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/// <reference path="./../defs/atom/atom.d.ts" />
const atomModule = require("atom");
const nodepath = require("path");
const ExternalModuleScope_1 = require("../nameResolution/ExternalModuleScope");
const juliaChildProcess_1 = require("../utils/juliaChildProcess");
const assert_1 = require("../utils/assert");
const nodes_1 = require("../parseTree/nodes");
const juliaChildProcess_2 = require("../utils/juliaChildProcess");
const assert_2 = require("../utils/assert");
/**
 * Contains summary info for all modules registered in the system.
 * Modules may be in the workspace or not.
 *
 * Excludes modules not findable along the julia module path.
 */
class ModuleLibrary {
    constructor() {
        this.loadPaths = [];
        this.modules = {};
        this.workspaceModulePaths = {};
        this.toQueryFromJulia = {};
    }
    initializeFromSerialized(state) {
        if ("loadPaths" in state) {
            this.loadPaths = state["loadPaths"];
        }
        if ("serializedLines" in state) {
            for (let moduleFullName in state.serializedLines) {
                this.modules[moduleFullName] = new ExternalModuleScope_1.ExternalModuleScope(moduleFullName, state.serializedLines[moduleFullName], this);
            }
        }
    }
    refreshLoadPathsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            let loadPaths = yield juliaChildProcess_1.runJuliaToGetLoadPathsAsync();
            this.loadPaths = loadPaths;
        });
    }
    /**
     * Converts contents to a JSON object for storage when Atom is closed.
     * Avoid having to query Julia every startup.
     */
    serialize() {
        let state = new LibrarySerialized();
        state.loadPaths = this.loadPaths.slice();
        for (let moduleName in this.modules) {
            let scope = this.modules[moduleName];
            if (scope instanceof ExternalModuleScope_1.ExternalModuleScope) {
                state.serializedLines[moduleName] = scope.getSerializedLines();
            }
        }
        return state;
        //let json = gLibrarySerializer.serialize(this)
        //return { moduleLibrary: json }
    }
}
exports.ModuleLibrary = ModuleLibrary;
class LibrarySerialized {
    constructor() {
        this.serializedLines = {};
        this.loadPaths = [];
    }
}
exports.LibrarySerialized = LibrarySerialized;
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
    return __awaiter(this, void 0, void 0, function* () {
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
                console.log("Module '" + outerModuleName + "' was not found in the file system.");
                return;
            }
            // see if the file is one in the workspace
            if (foundPath in sessionModel.parseSet.fileLevelNodes) {
                let fileLevelNode = sessionModel.parseSet.fileLevelNodes[foundPath];
                // look for a module inside with the same name
                for (let expr of fileLevelNode.expressions) {
                    if (expr instanceof nodes_1.ModuleDefNode) {
                        let moduleDefNode = expr;
                        if (moduleDefNode.name.str === outerModuleName) {
                            // get the matching scope
                            let moduleResolveInfo = sessionModel.parseSet.getModuleResolveInfo(moduleDefNode);
                            let moduleScope = moduleResolveInfo.scope;
                            // register it in the module library
                            //console.log("Registering workspace module '" + moduleName + "' in the library." )
                            moduleLibrary.modules[outerModuleName] = moduleScope;
                            moduleLibrary.workspaceModulePaths[foundPath] = outerModuleName;
                            return;
                        }
                    }
                }
                // if reached here, no matching module, even though there should be one
                console.log("Module '" + outerModuleName + "' should be in the workspace at " + foundPath +
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
    return __awaiter(this, void 0, void 0, function* () {
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
                if (!(name in moduleLinesByName))
                    moduleLinesByName[name] = [];
                // ccall is a special 'intrinsic' function which is defined in Core but not exported.
                // To allow name resolution, we can just label it as exported.
                if (moduleFullName === "Core" && name === "ccall")
                    line[2] = "exported";
                moduleLinesByName[name].push(line);
            }
            moduleLibrary.modules[moduleFullName] = new ExternalModuleScope_1.ExternalModuleScope(moduleFullName, moduleLinesByName, moduleLibrary);
            console.log("Successfully retrieved '" + moduleFullName + "' from Julia process.");
        }
        catch (err) {
            assert_2.throwErrorFromTimeout(err);
        }
    });
}
//# sourceMappingURL=ModuleLibrary.js.map