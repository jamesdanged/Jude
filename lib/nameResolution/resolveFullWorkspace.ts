"use strict"

import * as nodepath from "path"
import {SessionModel} from "../core/SessionModel";
import {atomGetOpenFiles} from "../utils/atomApi";
import {ModuleScope} from "./Scope";
import {ScopeRecurser} from "./ScopeRecurser";
import {createStringSet} from "../utils/StringSet";
import {addToSet} from "../utils/StringSet";
import {resolveModuleForLibrary} from "../core/ModuleLibrary";
import {ResolveRoot} from "../core/SessionModel";
import {ModuleDefNode} from "../parseTree/nodes";
import {AssertError} from "../utils/assert";
import {FileLevelNode} from "../parseTree/nodes";
import {ModuleContentsNode} from "../parseTree/nodes";
import {IncludeNode} from "../parseTree/nodes";
import {InvalidParseError} from "../utils/errors";




export async function resolveFullWorkspaceAsync(sessionModel: SessionModel) {
  let parseSet = sessionModel.parseSet

  // map out the inclusion trees
  let t0 = Date.now()
  populateRoots(sessionModel)
  let t1 = Date.now()
  console.log("Mapped inclusion trees: " + (t1 - t0) + " ms")

  // This pass will get a list of imports each module has.
  // We will discard the names resolved.
  t0 = Date.now()
  let openFiles = atomGetOpenFiles()
  let alreadyInitializedRoots: ModuleScope[] = []
  for (let resolveRoot of parseSet.resolveRoots) {
    // already done in one of the previous recursive buildouts.
    // A file level scope which is a root is by definition not included anywhere, so is not a problem for
    // being included in multiple places.
    if (alreadyInitializedRoots.indexOf(resolveRoot.scope) >= 0) {
      continue
    }
    let recurser = new ScopeRecurser(parseSet, sessionModel.moduleLibrary, true, alreadyInitializedRoots, openFiles)
    recurser.resolveRecursively(resolveRoot)
  }
  t1 = Date.now()
  console.log("First resolve: " + (t1 - t0) + " ms")


  // refresh julia load paths if necessary
  if (sessionModel.moduleLibrary.loadPaths.length === 0) {
    t0 = Date.now()
    await sessionModel.moduleLibrary.refreshLoadPathsAsync()
    t1 = Date.now()
    console.log("Refreshed load paths from Julia: " + (t1 - t0) + " ms")
  }


  // load all modules that were imported but could not be found
  t0 = Date.now()
  let unresolvedModuleImports = createStringSet([])
  for (let root of parseSet.resolveRoots) {
    for (let mod of root.unresolvedImports) {
      addToSet(unresolvedModuleImports, mod)
    }
  }
  for (let moduleName in unresolvedModuleImports) {
    //console.log("loading unresolved module import: " + moduleName + "...")
    await resolveModuleForLibrary(moduleName, sessionModel)
  }
  t1 = Date.now()
  console.log("Loaded unresolved modules: " + (t1 - t0) + " ms")



  // now re-resolve all the scopes a second time
  t0 = Date.now()

  // determine sequence to resolve, starting with dependencies first
  // relies upon list of unresolved imports... TODO
  let isDependencyOf = (mod1: ResolveRoot, mod2: ResolveRoot): boolean => {
    for (let importName of mod2.imports) {
      if (importName in sessionModel.moduleLibrary.modules) {
        let scope = sessionModel.moduleLibrary.modules[importName]
        if (mod1.scope === scope) return true
      } else {
        // may be error in locating the module or may be an inner module
        // just skip
      }
    }
    return false
  }
  let rootsOrderedByDependencies: ResolveRoot[] = []
  for (let resolveRoot of parseSet.resolveRoots) {
    // search for any dependencies
    // be sure to insert after the last dependency found
    let indexToInsert = 0
    for (let i = 0; i < rootsOrderedByDependencies.length; i++) {
      let iRoot = rootsOrderedByDependencies[i]
      if (isDependencyOf(iRoot, resolveRoot)) {
        indexToInsert = i + 1
      }
    }
    rootsOrderedByDependencies.splice(indexToInsert, 0, resolveRoot)
  }
  // store them back in that order
  parseSet.resolveRoots = rootsOrderedByDependencies

  // clear previous errors and name resolutions
  for (let fileName in parseSet.fileLevelNodes) {
    parseSet.errors[fileName].nameErrors = []
    parseSet.identifiers[fileName].map.clear()
    parseSet.scopes[fileName].reset()
  }
  for (let resolveRoot of parseSet.resolveRoots) {
    resolveRoot.reset()
  }

  // resolve
  alreadyInitializedRoots = []
  for (let resolveRoot of parseSet.resolveRoots) {
    if (alreadyInitializedRoots.indexOf(resolveRoot.scope) >= 0) {
      continue
    }
    let recurser = new ScopeRecurser(parseSet, sessionModel.moduleLibrary, false, alreadyInitializedRoots, openFiles)
    recurser.resolveRecursively(resolveRoot)
  }

  sessionModel.partiallyResolved = false

  t1 = Date.now()
  console.log("Second resolve: " + (t1 - t0) + " ms")
}




function populateRoots(sessionModel: SessionModel): void {
  let parseSet = sessionModel.parseSet
  let fileLevelNodes: {[file:string]: FileLevelNode} = parseSet.fileLevelNodes
  let candidateRoots: ResolveRoot[] = []

  // All module declarations are roots.
  // All files not included by another file are roots.
  // A file may contain a module declaration. Then the module is not considered a child of the file, but forming its own root.


  let startNodesQueue: [ModuleContentsNode, string][] = [] // [node, containing file path]
  for (let file in fileLevelNodes) {
    startNodesQueue.push([fileLevelNodes[file], file])
  }

  let fileIsRoot: {[file:string]: boolean} = {}
  for (let file in fileLevelNodes) {
    fileIsRoot[file] = true
  }

  let badIncludeNodes: IncludeNode[] = []

  // recurse through each root, finding any inner modules which will then be new roots
  // as well as finding any inclusions, which define relateds
  while (startNodesQueue.length > 0) {

    let tup = startNodesQueue.shift()
    let startNode: ModuleContentsNode = tup[0]
    let startPath: string = tup[1]
    let relateds: FileLevelNode[] = []
    let inclusionsToSearchQueue: FileLevelNode[] = []

    let findInclusions = (nodeToSearch: ModuleContentsNode, containingFilePath: string) => {
      for (let expr of nodeToSearch.expressions) {
        if (expr instanceof IncludeNode) {
          let inclNode = expr as IncludeNode
          if (badIncludeNodes.indexOf(inclNode) >= 0) continue

          let inclFullPath = nodepath.resolve(nodepath.dirname(containingFilePath), inclNode.relativePath) // these nodepath calls do not fail regardless of string
          if (!(inclFullPath in fileLevelNodes)) {
            badIncludeNodes.push(inclNode)
            parseSet.errors[containingFilePath].parseErrors.push(new InvalidParseError("File not found in workspace.", inclNode.includeString.token))
            continue
          }

          let inclFileNode = fileLevelNodes[inclFullPath]
          if (relateds.indexOf(inclFileNode) >= 0 || inclFullPath === startPath) {
            badIncludeNodes.push(inclNode)
            parseSet.errors[containingFilePath].parseErrors.push(new InvalidParseError("Circular includes.", inclNode.includeString.token))
            continue
          }

          relateds.push(inclFileNode)
          fileIsRoot[inclFullPath] = false

          // queue up to later recurse through this included file
          inclusionsToSearchQueue.push(inclFileNode)
        } else if (expr instanceof ModuleDefNode) {
          // an inner module
          // this is a new root which must be searched separately
          startNodesQueue.push([expr, containingFilePath])
        }
      }
    }

    findInclusions(startNode, startPath)
    // recurse
    while (inclusionsToSearchQueue.length > 0) {
      let fileNode: FileLevelNode = inclusionsToSearchQueue.shift()
      findInclusions(fileNode, fileNode.path)
    }

    let resolveRoot = new ResolveRoot()
    resolveRoot.root = startNode
    resolveRoot.containingFile = startPath
    resolveRoot.relateds = relateds
    resolveRoot.scope = new ModuleScope()
    resolveRoot.scope.tokenStart = startNode.scopeStartToken
    resolveRoot.scope.tokenEnd = startNode.scopeEndToken
    // leave resolving imports for later
    candidateRoots.push(resolveRoot)
  }

  // remove any non roots
  for (let filePath in fileIsRoot) {
    if (!fileIsRoot[filePath]) {
      let fileLevelNode = fileLevelNodes[filePath]
      let index = candidateRoots.findIndex((item) => { return item.root === fileLevelNode })
      if (index < 0) throw new AssertError("")
      candidateRoots.splice(index, 1)
    }
  }

  parseSet.resolveRoots = candidateRoots

  // update the module library
  let moduleLibrary = sessionModel.moduleLibrary
  for (let resolveRoot of parseSet.resolveRoots) {
    let path = resolveRoot.containingFile
    if (path in moduleLibrary.workspaceModulePaths) {
      let moduleName = moduleLibrary.workspaceModulePaths[path]
      if (resolveRoot.root instanceof ModuleDefNode) {
        let moduleDefNode = resolveRoot.root as ModuleDefNode
        if (moduleDefNode.name.name === moduleName) {
          // is a match
          moduleLibrary.modules[moduleName] = resolveRoot.scope
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
export function resolveScopesInWorkspaceInvolvingFile(path: string, sessionModel: SessionModel): void {
  let t0 = Date.now()

  let parseSet = sessionModel.parseSet
  let fileLevelNode = parseSet.fileLevelNodes[path]
  if (!fileLevelNode) throw new AssertError("")

  // gather list of roots involving the file
  let rootsInvolvingFile: ResolveRoot[] = []
  for (let resolveRoot of parseSet.resolveRoots) {
    if (resolveRoot.containingFile === path) {
      rootsInvolvingFile.push(resolveRoot)
    } else {
      if (resolveRoot.relateds.indexOf(fileLevelNode) >= 0) {
        rootsInvolvingFile.push(resolveRoot)
      }
    }
  }

  // reset them all
  for (let resolveRoot of rootsInvolvingFile) {
    resolveRoot.scope.reset()
    parseSet.resetNamesForFile(resolveRoot.containingFile)
    for (let relatedFileNode of resolveRoot.relateds) {
      parseSet.resetNamesForFile(relatedFileNode.path)
    }
  }

  // re resolve them all
  let openFiles = atomGetOpenFiles()
  let alreadyInitializedRoots: ModuleScope[] = []
  for (let resolveRoot of rootsInvolvingFile) {
    if (alreadyInitializedRoots.indexOf(resolveRoot.scope) >= 0) continue
    let recurser = new ScopeRecurser(parseSet, sessionModel.moduleLibrary, false, alreadyInitializedRoots, openFiles)
    recurser.resolveRecursively(resolveRoot)
  }


  //let indexFirstDependency = resolveRoots.findIndex((o) => {
  //  if (o.root === fileLevelNode) return true
  //  return o.relateds.indexOf(fileLevelNode) >= 0
  //})
  //if (indexFirstDependency < 0) throw new AssertError("")
  //
  //let openFiles = atomGetOpenFiles()
  //let alreadyInitializedRoots: ModuleScope[] = []
  //for (let i = indexFirstDependency; i < resolveRoots.length; i++) {
  //  let resolveRoot = resolveRoots[i]
  //  resolveRoot.scope.reset()
  //
  //  if (alreadyInitializedRoots.indexOf(resolveRoot.scope) >= 0) continue
  //  let recurser = new ScopeRecurser(parseSet, sessionModel.moduleLibrary, false, alreadyInitializedRoots, openFiles)
  //  recurser.resolveRecursively(resolveRoot)
  //}

  sessionModel.partiallyResolved = true

  let t1 = Date.now()
  console.log("Refreshed related scopes: " + (t1 - t0) + " ms")
}


