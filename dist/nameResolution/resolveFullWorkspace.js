"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const taskUtils_1 = require("../utils/taskUtils");
const nodepath = require("path");
const atomApi_1 = require("../utils/atomApi");
const ScopeRecurser_1 = require("./ScopeRecurser");
const StringSet_1 = require("../utils/StringSet");
const ModuleLibrary_1 = require("../core/ModuleLibrary");
const SessionModel_1 = require("../core/SessionModel");
const nodes_1 = require("../parseTree/nodes");
const assert_1 = require("../utils/assert");
const nodes_2 = require("../parseTree/nodes");
const nodes_3 = require("../parseTree/nodes");
const errors_1 = require("../utils/errors");
const StringSet_2 = require("../utils/StringSet");
const ModuleScope_1 = require("./ModuleScope");
function resolveFullWorkspaceAsync(sessionModel) {
    return __awaiter(this, void 0, void 0, function* () {
        let parseSet = sessionModel.parseSet;
        let moduleLibrary = sessionModel.moduleLibrary;
        // map out the inclusion trees
        let t0 = Date.now();
        populateModuleResolveInfos(sessionModel);
        let t1 = Date.now();
        taskUtils_1.logElapsed("Mapped inclusion trees: " + (t1 - t0) + " ms");
        // This pass will get a list of imports each module has.
        // Variable, function, type names are not resolved yet.
        t0 = Date.now();
        moduleLibrary.toQueryFromJulia = {};
        let alreadyInitializedRoots = [];
        for (let mri of parseSet.compileRoots) {
            // already done in one of the previous recursive buildouts.
            if (alreadyInitializedRoots.indexOf(mri.scope) >= 0) {
                continue;
            }
            let recurser = new ScopeRecurser_1.ScopeRecurser(parseSet, moduleLibrary, true, alreadyInitializedRoots, []);
            recurser.resolveRecursively(mri);
        }
        t1 = Date.now();
        taskUtils_1.logElapsed("Gather import list: " + (t1 - t0) + " ms");
        // refresh julia load paths if necessary
        if (moduleLibrary.loadPaths.length === 0) {
            t0 = Date.now();
            yield moduleLibrary.refreshLoadPathsAsync();
            t1 = Date.now();
            taskUtils_1.logElapsed("Refreshed load paths from Julia: " + (t1 - t0) + " ms");
        }
        // load all top level modules that were imported but could not be found
        t0 = Date.now();
        for (let moduleName in moduleLibrary.toQueryFromJulia) {
            //console.log("loading unresolved module import: " + moduleName + "...")
            yield ModuleLibrary_1.resolveModuleForLibrary(moduleName, sessionModel);
        }
        t1 = Date.now();
        taskUtils_1.logElapsed("Loaded unresolved modules: " + (t1 - t0) + " ms");
        // now that all available external modules from Julia have been loaded,
        // resolve all the scopes
        //
        // Need to determine which modules in the workspace are dependent on other modules
        // so they are resolved in correct order.
        t0 = Date.now();
        sortCompileRootsByDependencyOrder(sessionModel);
        yield resolveRepeatedlyAsync(sessionModel);
        parseSet.moduleResolveInfos.forEach((o) => { o.scope.refreshPrefixTree(); });
        sessionModel.partiallyResolved = false;
        t1 = Date.now();
        taskUtils_1.logElapsed("Resolve names fully: " + (t1 - t0) + " ms");
    });
}
exports.resolveFullWorkspaceAsync = resolveFullWorkspaceAsync;
function sortCompileRootsByDependencyOrder(sessionModel) {
    let parseSet = sessionModel.parseSet;
    let moduleLibrary = sessionModel.moduleLibrary;
    // gather all descendent mri's for each compile root
    let mapNodeToModuleResolveInfo = new Map();
    let mapCompileRootToAllDescendents = new Map();
    for (let mri of parseSet.moduleResolveInfos) {
        mapNodeToModuleResolveInfo.set(mri.root, mri);
    }
    for (let compileRoot of parseSet.compileRoots) {
        let descendents = [];
        mapCompileRootToAllDescendents.set(compileRoot, descendents);
        let toRecurse = [];
        toRecurse.push(compileRoot);
        while (toRecurse.length > 0) {
            let mri = toRecurse.shift();
            for (let childModuleNode of mri.childrenModules) {
                let childMri = mapNodeToModuleResolveInfo.get(childModuleNode);
                if (!childMri)
                    throw new assert_1.AssertError("");
                descendents.push(childMri);
                toRecurse.push(childMri);
            }
        }
    }
    // what global module name (if any) is each compile root associated with
    let nameToCompileRoot = {};
    for (let moduleFullName in moduleLibrary.modules) {
        if (moduleFullName.split(".").length != 1)
            continue;
        let scope = moduleLibrary.modules[moduleFullName];
        let foundMatchingCompileRoot = false;
        for (let compileRoot of parseSet.compileRoots) {
            let descendents = mapCompileRootToAllDescendents.get(compileRoot);
            for (let mri of descendents) {
                if (mri.scope === scope) {
                    nameToCompileRoot[moduleFullName] = compileRoot;
                    foundMatchingCompileRoot = true;
                    break;
                }
            }
            if (foundMatchingCompileRoot)
                break;
        }
    }
    let mapCompileRootToAllImportedNames = new Map();
    for (let compileRoot of parseSet.compileRoots) {
        let names = [];
        mapCompileRootToAllImportedNames.set(compileRoot, names);
        for (let iimport of compileRoot.imports)
            names.push(iimport);
        for (let desc of mapCompileRootToAllDescendents.get(compileRoot)) {
            for (let iimport of desc.imports)
                names.push(iimport);
        }
    }
    let isDependencyOf = (compileRoot1, compileRoot2) => {
        for (let iimport of mapCompileRootToAllImportedNames.get(compileRoot2)) {
            if (nameToCompileRoot[iimport] === compileRoot1) {
                return true;
            }
        }
        return false;
    };
    let compileRootsOrderedByDependencies = [];
    for (let mri of parseSet.compileRoots) {
        // search for any dependencies
        // be sure to insert after the last dependency found
        let indexToInsert = 0;
        for (let i = 0; i < compileRootsOrderedByDependencies.length; i++) {
            let iRoot = compileRootsOrderedByDependencies[i];
            if (isDependencyOf(iRoot, mri)) {
                indexToInsert = i + 1;
            }
        }
        compileRootsOrderedByDependencies.splice(indexToInsert, 0, mri);
    }
    // store them back in that order
    parseSet.compileRoots = compileRootsOrderedByDependencies;
}
/**
 * Runs a resolve, then if any modules outside of workspace are needed, loads them from Julia, then
 * repeats.
 *
 * This progressively will properly resolve inner modules, ie Base.LinAlg.
 * It allows us to only query from Julia the modules actively used in the workspace.
 *
 * The compileRoots and moduleResolveInfos need to already be set up.
 */
function resolveRepeatedlyAsync(sessionModel) {
    return __awaiter(this, void 0, void 0, function* () {
        let parseSet = sessionModel.parseSet;
        let moduleLibrary = sessionModel.moduleLibrary;
        let openFiles = atomApi_1.atomGetOpenFiles();
        let alreadyTriedToQuery = {};
        while (true) {
            // clear previous errors and name resolutions
            moduleLibrary.toQueryFromJulia = {};
            for (let fileName in parseSet.fileLevelNodes) {
                parseSet.resetNamesForFile(fileName);
            }
            for (let mri of parseSet.moduleResolveInfos) {
                mri.reset();
            }
            // resolve
            let alreadyInitializedRoots = [];
            for (let mri of parseSet.compileRoots) {
                if (alreadyInitializedRoots.indexOf(mri.scope) >= 0) {
                    continue;
                }
                let recurser = new ScopeRecurser_1.ScopeRecurser(parseSet, moduleLibrary, false, alreadyInitializedRoots, openFiles);
                recurser.resolveRecursively(mri);
            }
            // if any modules need to load from Julia, load them, and then do another round of resolving
            let needAnotherRound = false;
            for (let fullModuleName in moduleLibrary.toQueryFromJulia) {
                if (fullModuleName in alreadyTriedToQuery)
                    continue;
                StringSet_1.addToSet(alreadyTriedToQuery, fullModuleName);
                yield ModuleLibrary_1.resolveModuleForLibrary(fullModuleName, sessionModel);
            }
            if (!needAnotherRound)
                break;
        }
    });
}
function populateModuleResolveInfos(sessionModel) {
    let parseSet = sessionModel.parseSet;
    let fileLevelNodes = parseSet.fileLevelNodes;
    let moduleResolveInfos = [];
    // ModuleContentsNodes can be broken down into three sets:
    //   ModuleDefNodes: There will be a ModuleResolveInfo for all modules.
    //   FileLevelNodes: There will also be a ModuleResolveInfo for all top level files (ie files not included by any other file)
    //   FileLevelNodes: if included by any other file, not considered top level.
    // A file may contain a module declaration. Then the module is not considered a child of the file,
    // but will have its own info.
    let modulesToSearchQueue = []; // [root node, containing file path, parent module]
    for (let file in fileLevelNodes) {
        modulesToSearchQueue.push([fileLevelNodes[file], file, null]);
    }
    let fileIsRoot = {};
    for (let file in fileLevelNodes) {
        fileIsRoot[file] = true;
    }
    // track which includes point to files which don't exist
    // and also which includes are duplicates or create a circular inclusion loop
    let badIncludeNodes = [];
    // recurse through each file or module, finding any inner modules which will then be new roots
    // as well as finding any inclusions, which define relateds
    while (modulesToSearchQueue.length > 0) {
        let tup = modulesToSearchQueue.shift();
        let rootNode = tup[0];
        let rootContainingFile = tup[1];
        let parent = tup[2];
        let relateds = [];
        let inclusionsToSearchQueue = [];
        let children = [];
        let findInclusions = (nodeToSearch, containingFilePath) => {
            for (let expr of nodeToSearch.expressions) {
                if (expr instanceof nodes_3.IncludeNode) {
                    let inclNode = expr;
                    if (badIncludeNodes.indexOf(inclNode) >= 0)
                        continue;
                    let inclFullPath = nodepath.resolve(nodepath.dirname(containingFilePath), inclNode.relativePath); // these nodepath calls do not fail regardless of string
                    // mark if included file doesn't exist
                    if (!(inclFullPath in fileLevelNodes)) {
                        badIncludeNodes.push(inclNode);
                        parseSet.errors[containingFilePath].parseErrors.push(new errors_1.InvalidParseError("File not found in workspace: " + inclFullPath, inclNode.includeString.token));
                        continue;
                    }
                    // mark if include file is duplicate or circular
                    let inclFileNode = fileLevelNodes[inclFullPath];
                    if (relateds.indexOf(inclFileNode) >= 0 || inclFullPath === rootContainingFile) {
                        badIncludeNodes.push(inclNode);
                        parseSet.errors[containingFilePath].parseErrors.push(new errors_1.InvalidParseError("Duplicate or circular include.", inclNode.includeString.token));
                        continue;
                    }
                    // the included file is considered related to the current root
                    relateds.push(inclFileNode);
                    // mark that the included file is not itself a root
                    fileIsRoot[inclFullPath] = false;
                    // queue up to later recurse through this included file
                    inclusionsToSearchQueue.push(inclFileNode);
                }
                else if (expr instanceof nodes_1.ModuleDefNode) {
                    // an inner module
                    // this is a new root which must be searched separately
                    let innerModule = expr;
                    modulesToSearchQueue.push([innerModule, containingFilePath, rootNode]); // parent of the inner module is this root
                    children.push(innerModule);
                }
            } // for expr
        }; // findInclusions
        // find inclusions
        // initialize
        findInclusions(rootNode, rootContainingFile);
        // recurse
        while (inclusionsToSearchQueue.length > 0) {
            let fileNode = inclusionsToSearchQueue.shift();
            findInclusions(fileNode, fileNode.path);
        }
        let moduleResolveInfo = new SessionModel_1.ModuleResolveInfo();
        moduleResolveInfo.root = rootNode;
        moduleResolveInfo.containingFile = rootContainingFile;
        moduleResolveInfo.relateds = relateds;
        moduleResolveInfo.scope = new ModuleScope_1.ModuleScope();
        moduleResolveInfo.scope.tokenStart = rootNode.scopeStartToken;
        moduleResolveInfo.scope.tokenEnd = rootNode.scopeEndToken;
        moduleResolveInfo.parentModule = parent;
        moduleResolveInfo.childrenModules = children;
        if (rootNode instanceof nodes_1.ModuleDefNode)
            moduleResolveInfo.scope.moduleShortName = rootNode.name.str;
        if (parent !== null) {
            let parentMri = moduleResolveInfos.find((o) => o.root === parent);
            if (!parentMri)
                throw new assert_1.AssertError("");
            moduleResolveInfo.scope.parentModuleScope = parentMri.scope;
        }
        moduleResolveInfos.push(moduleResolveInfo);
    } // moduleToSearchQueue
    // The above recursions would have encountered a file more than once if it was not really a root, but rather
    // was included by other roots.
    // Remove these non roots.
    // This should deduplicate all files.
    for (let filePath in fileIsRoot) {
        if (!fileIsRoot[filePath]) {
            let fileLevelNode = fileLevelNodes[filePath];
            let index = moduleResolveInfos.findIndex((item) => { return item.root === fileLevelNode; });
            if (index < 0)
                throw new assert_1.AssertError("");
            moduleResolveInfos.splice(index, 1);
        }
    }
    parseSet.moduleResolveInfos = moduleResolveInfos;
    parseSet.compileRoots = [];
    for (let mri of parseSet.moduleResolveInfos) {
        if (mri.parentModule === null) {
            if (!(mri.root instanceof nodes_2.FileLevelNode))
                throw new assert_1.AssertError("");
            parseSet.compileRoots.push(mri);
        }
    }
    // update the module library
    let moduleLibrary = sessionModel.moduleLibrary;
    for (let mri of parseSet.moduleResolveInfos) {
        let path = mri.containingFile;
        if (path in moduleLibrary.workspaceModulePaths) {
            let moduleName = moduleLibrary.workspaceModulePaths[path];
            if (mri.root instanceof nodes_1.ModuleDefNode) {
                let moduleDefNode = mri.root;
                if (moduleDefNode.name.str === moduleName) {
                    // is a match
                    moduleLibrary.modules[moduleName] = mri.scope;
                }
            }
        }
    }
}
/**
 * Shortcut resolve for when a file changes. Speeds up reparsing significantly.
 *
 * Re-resolves only modules that directly involve the file.
 * Does not resolve other downstream modules that may have imported those modules.
 *
 * Also doesn't handle well the situation where we changed a file included in a module, but
 * another file included in that module created a submodule...
 *
 * Will have to do a full resolve at some point after doing this partial resolve
 * to correct the inconsistencies. A good time to do that is when switching tabs.
 */
function resolveScopesInWorkspaceInvolvingFile(path, sessionModel) {
    return __awaiter(this, void 0, void 0, function* () {
        let t0 = Date.now();
        let parseSet = sessionModel.parseSet;
        let fileLevelNode = parseSet.fileLevelNodes[path];
        if (!fileLevelNode)
            throw new assert_1.AssertError("");
        // gather list of roots involving the file
        let modulesInvolvingFile = [];
        for (let mri of parseSet.moduleResolveInfos) {
            if (mri.containingFile === path) {
                modulesInvolvingFile.push(mri);
            }
            else {
                if (mri.relateds.indexOf(fileLevelNode) >= 0) {
                    modulesInvolvingFile.push(mri);
                }
            }
        }
        // reset modules that involve the file directly
        for (let mri of modulesInvolvingFile) {
            mri.scope.reset();
            parseSet.resetNamesForFile(mri.containingFile);
            for (let relatedFileNode of mri.relateds) {
                parseSet.resetNamesForFile(relatedFileNode.path);
            }
        }
        sessionModel.moduleLibrary.toQueryFromJulia = {};
        // re resolve them
        let openFiles = atomApi_1.atomGetOpenFiles();
        let alreadyInitializedRoots = [];
        for (let mri of modulesInvolvingFile) {
            if (alreadyInitializedRoots.indexOf(mri.scope) >= 0)
                continue;
            let recurser = new ScopeRecurser_1.ScopeRecurser(parseSet, sessionModel.moduleLibrary, false, alreadyInitializedRoots, openFiles);
            recurser.resolveRecursively(mri);
            mri.scope.refreshPrefixTree();
        }
        // if any inner modules newly need to be queried from julia, retrieve them
        if (StringSet_2.stringSetToArray(sessionModel.moduleLibrary.toQueryFromJulia).length > 0) {
            yield resolveRepeatedlyAsync(sessionModel);
            parseSet.moduleResolveInfos.forEach((o) => { o.scope.refreshPrefixTree(); });
        }
        sessionModel.partiallyResolved = true;
        let t1 = Date.now();
        taskUtils_1.logElapsed("Refreshed related scopes: " + (t1 - t0) + " ms");
    });
}
exports.resolveScopesInWorkspaceInvolvingFile = resolveScopesInWorkspaceInvolvingFile;
//# sourceMappingURL=resolveFullWorkspace.js.map