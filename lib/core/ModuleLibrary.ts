"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />


import {MacroResolve} from "../nameResolution/Resolve";
import {reinitializePrefixTree} from "../nameResolution/PrefixTree";
import {PrefixTreeNode} from "../nameResolution/PrefixTree";
import {createPrefixTree} from "../nameResolution/PrefixTree";
import {NameDeclType} from "../nameResolution/Resolve";
import {getResolveInfoType} from "../nameResolution/Resolve";
import * as nodepath from "path"
import {ModuleDefNode} from "../parseTree/nodes";
import {ModuleScope} from "../nameResolution/Scope";
import {runDelayed} from "../utils/taskUtils";
import {runJuliaToGetLoadPathsAsync} from "../utils/juliaChildProcess";
import {BinaryOpNode} from "../parseTree/nodes";
import {InvalidParseError} from "../utils/errors";
import {GenericArgListNode} from "../parseTree/nodes";
import {DecyclingSerializer} from "../utils/serializer";
import {FunctionDefNode} from "../parseTree/nodes";
import {TokenType} from "../tokens/operatorsAndKeywords";
import {TypeResolve} from "./../nameResolution/Resolve";
import {throwErrorFromTimeout} from "../utils/assert";
import {Scope} from "./../nameResolution/Scope";
import {runJuliaToGetModuleDataAsync} from "../utils/juliaChildProcess";
import {ScopeType} from "./../nameResolution/Scope";
import {Point} from "../tokens/Token";
import {Range} from "../tokens/Token";
import {TreeToken} from "../tokens/Token";
import {parseWholeFunctionDef} from "../fsas/declarations/FunctionDefFsa";
import {FileLevelNode} from "../parseTree/nodes";
import {WholeFileParseState} from "../fsas/general/ModuleContentsFsa";
import {AssertError} from "../utils/assert";
import {BracketGrouper} from "../parseTree/BracketGrouper";
import {Tokenizer} from "../tokens/Tokenizer";
import {FunctionResolve} from "./../nameResolution/Resolve";
import {addToSet} from "../utils/StringSet";
import {TypeDefNode} from "../parseTree/nodes";
import {parseWholeTypeDef} from "../fsas/declarations/TypeDefFsa";
import {IdentifierNode} from "../parseTree/nodes";
import {Token} from "../tokens/Token";
import {Indent} from "../tokens/Token";
import {ImportedResolve} from "./../nameResolution/Resolve";
import {LocalModuleResolve} from "./../nameResolution/Resolve";
import {ModuleResolve} from "./../nameResolution/Resolve";
import {VariableResolve} from "./../nameResolution/Resolve";
import {GenericDefArgListNode} from "../parseTree/nodes";
import {FunctionDefArgListNode} from "../parseTree/nodes";
import {GenericArgNode} from "../parseTree/nodes";
import {FunctionDefArgNode} from "../parseTree/nodes";
import {FieldNode} from "../parseTree/nodes";
import {NumberNode} from "../parseTree/nodes";
import {Resolve} from "../nameResolution/Resolve";
import {SessionModel} from "./SessionModel";
import {StringSet} from "../utils/StringSet";  // TODO update atom TypeScript defs
import * as atomModule from "atom"

type ModuleLineSet = {[name: string]: string[][]}

/**
 * Contains summary info for all modules registered in the system.
 * Modules may be in the workspace or not.
 *
 * Excludes modules not findable along the julia module path.
 * Excludes inner modules.
 */
export class ModuleLibrary {

  loadPaths: string[]
  serializedLines: {[moduleName: string]: ModuleLineSet}  // module name -> module member name -> lines, split by tab
  modules: {[moduleName: string]: ModuleScope}   // module name -> root scope of module
  prefixTrees: {[moduleName: string]: PrefixTreeNode}
  workspaceModulePaths: {[filePath: string]: string} // file path -> module name. Set of files that are recognized as modules.

  constructor() {
    this.loadPaths = []
    this.serializedLines = {}
    this.modules = {}
    this.prefixTrees = {}
    this.workspaceModulePaths = {}
  }

  initialize() {
    // restore state
    for (let moduleName in this.serializedLines) {
      let scope = new ModuleScope()
      scope.isLibraryReference = true
      scope.moduleName = moduleName
      scope.moduleLibrary = this
      this.modules[moduleName] = scope
      this.prefixTrees[moduleName] = createPrefixTree(scope.names)
    }
  }

  async refreshLoadPathsAsync() {
    let loadPaths = await runJuliaToGetLoadPathsAsync()
    this.loadPaths = loadPaths as string[]
  }

  async addModuleFromJuliaAsync(moduleName: string) {
    try {
      console.log("Fetching module '" + moduleName + "' from Julia process to get type and function information.")
      let linesList = (await runJuliaToGetModuleDataAsync(moduleName)) as string[][]
      let moduleLines: ModuleLineSet = {}
      for (let line of linesList) {
        if (line.length < 3) throw new AssertError("")
        let name = line[1]
        if (!(name in moduleLines)) {
          moduleLines[name] = []
        }
        moduleLines[name].push(line)
      }


      let scope = new ModuleScope()
      scope.isLibraryReference = true
      scope.moduleName = moduleName
      scope.moduleLibrary = this

      this.serializedLines[moduleName] = moduleLines
      this.modules[moduleName] = scope
      this.prefixTrees[moduleName] = createPrefixTree(scope.names)

      console.log("Successfully retrieved '" + moduleName + "' from Julia process.")
    } catch (err) {
      throwErrorFromTimeout(err)
    }
  }




  /**
   * Converts contents to a JSON object for storage when Atom is closed.
   * Avoid having to query Julia every startup.
   */
  serialize() {
    return {
      loadPaths: this.loadPaths,
      serializedLines: this.serializedLines
    }
    //let json = gLibrarySerializer.serialize(this)
    //return { moduleLibrary: json }
  }

  //var gLibrarySerializer = new DecyclingSerializer([
  //  ModuleLibrary, Scope, VariableResolve, FunctionResolve, TypeResolve, ModuleResolve, ImportedResolve, // LocalModuleResolve,
  //  Token, UnparsedTreeToken, Indent, Range, Point, FunctionDefNode, IdentifierNode, GenericDefArgListNode, FunctionDefArgListNode,
  //  GenericArgNode, FunctionDefArgNode, TypeDefNode, FieldNode, GenericArgListNode, NumberNode, BinaryOpNode,
  //  InvalidParseError
  //])

  //static createFromSerializedState(state): ModuleLibrary {
  //  //return gLibrarySerializer.deserialize(state) as ModuleLibrary
  //}

}







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
export async function resolveModuleForLibrary(moduleName: string, sessionModel: SessionModel) {
  let moduleLibrary = sessionModel.moduleLibrary
  if (moduleName in moduleLibrary.modules) throw new AssertError("")

  if (moduleName === "Base" || moduleName === "Core") {
    await moduleLibrary.addModuleFromJuliaAsync(moduleName)
    return
  }

  // search for a matching file in the file system
  let foundPath: string = null
  for (let loadPath of moduleLibrary.loadPaths) {
    let path = nodepath.resolve(loadPath, moduleName, "src", moduleName + ".jl")
    let file = new atomModule.File(path, false)
    let exists = await file.exists()
    if (exists) {
      foundPath = await file.getRealPath()
      break
    }
  }
  if (foundPath === null) {
    // module doesn't exist
    return // TODO return an error?
  }

  // see if the file is one in the workspace
  if (foundPath in sessionModel.parseSet.fileLevelNodes) {
    let fileLevelNode = sessionModel.parseSet.fileLevelNodes[foundPath]
    // look for a module inside with the same name
    for (let expr of fileLevelNode.expressions) {
      if (expr instanceof ModuleDefNode) {
        let moduleDefNode = expr as ModuleDefNode
        if (moduleDefNode.name.name === moduleName) {
          // get the matching scope
          let resolveRoot = sessionModel.parseSet.getResolveRoot(moduleDefNode)
          let moduleScope = resolveRoot.scope

          // register it in the module library
          //console.log("Registering workspace module '" + moduleName + "' in the library." )
          moduleLibrary.modules[moduleName] = moduleScope
          moduleLibrary.prefixTrees[moduleName] = createPrefixTree(moduleScope.names)
          moduleLibrary.workspaceModulePaths[foundPath] = moduleName
          return
        }
      }
    }
    // if reached here, no matching module, even though there should be one
    return // TODO return an error?
  }


  // otherwise, just load the definition from julia
  await sessionModel.moduleLibrary.addModuleFromJuliaAsync(moduleName)
}


/**
 * simply loads exported names into the export list of the scope
 *
 */
export function initializeLibraryReference(moduleName: string, moduleLibrary: ModuleLibrary): void {
  let scope = moduleLibrary.modules[moduleName]
  if (!scope) throw new AssertError("")
  if (!(scope instanceof ModuleScope)) throw new AssertError("")
  let moduleScope = scope as ModuleScope

  let serNames = moduleLibrary.serializedLines[moduleName]
  if (!serNames) throw new AssertError("")

  for (let name in serNames) {
    let arr: string[][] = serNames[name]
    for (let line of arr) {
      if (line[2] === "exported") {
        addToSet(moduleScope.exportedNames, name)
        break
      } else if (line[2] === "hidden") {
        // do nothing
      } else {
        throw new AssertError("")
      }
    }
  }

  scope.initializedLibraryReference = true
}

export function tryAddNameFromSerializedState(name: string, moduleName: string, moduleLibrary: ModuleLibrary): void {
  let scope = moduleLibrary.modules[moduleName]
  if (!scope) throw new AssertError("")
  if (!(scope instanceof ModuleScope)) throw new AssertError("")
  let moduleScope = scope as ModuleScope

  let serNames = moduleLibrary.serializedLines[moduleName]
  if (!serNames) throw new AssertError("")

  let arr: string[][] = serNames[name]
  if (!arr) return // name not in module

  for (let line of arr) {
    if (line[0] === "function") {
      addFunctionToScope(line, moduleScope)
    } else if (line[0] === "type") {
      addTypeToScope(line, moduleScope)
    } else if (line[0] === "variable") {
      addVariableToScope(line, moduleScope)
    } else if (line[0] === "macro") {
      addMacroToScope(line, moduleScope)
    }
  }
}


function addVariableToScope(parts: string[], scope: ModuleScope): void {
  if (parts.length !== 3) throw new AssertError("")
  let name = parts[1]
  // store it
  if (name in scope.names) {
    throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
  }
  scope.names[name] = new VariableResolve(Token.createEmptyIdentifier(name), null)
}

function addMacroToScope(parts: string[], scope: ModuleScope): void {
  if (parts.length !== 3) throw new AssertError("")
  let name = parts[1]
  // store it
  if (name in scope.names) {
    throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
  }
  scope.names[name] = new MacroResolve(name)
}


function addTypeToScope(parts: string[], scope: ModuleScope): void {
  if (parts.length !== 4) throw new AssertError("")

  let name = parts[1]

  // parse the type def block
  let code = parts[3]
  let tokens = Tokenizer.tokenizeThrowIfError(code)
  if (tokens[1].type !== TokenType.Identifier) {
    console.log("Skipping type due to name: " + code)
    return
  }
  let tree = BracketGrouper.groupIntoOneThrowIfError(tokens)
  let wholeState = new WholeFileParseState()
  let node = parseWholeTypeDef(tree, wholeState)
  if (wholeState.parseErrors.length > 0) {
    // TODO improve parsing
    // console.error("Failed to parse type def from julia: " + code)
  }

  // store it
  if (name in scope.names) {
    throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
  }
  scope.names[name] = new TypeResolve(node, null)
}



function addFunctionToScope(parts: string[], scope: Scope): void {
  if (parts.length !== 6) throw new AssertError("")

  let name = parts[1]

  let signature = parts[3]

  let path = parts[4]
  if (path === "") path = null

  let lineNumber = 0
  if (parts[5] !== "") lineNumber = parseInt(parts[5])

  let resolve = scope.names[name]
  if (resolve) {
    if (!(resolve instanceof FunctionResolve)) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared both as function and as " +
        getResolveInfoType(resolve) + " in module loaded from Julia??"))
      return
    }
  } else {
    resolve = new FunctionResolve(name)
    scope.names[name] = resolve
  }
  let functionResolve = resolve as FunctionResolve

  if (signature.length === 0) {
    // no info on function signature. But we still want to recognize the name exists.
    // Just put in an empty function.
    let node = new FunctionDefNode()
    node.name = [new IdentifierNode(Token.createEmptyIdentifier(name))]
    functionResolve.functionDefs.push([path, node])

  } else {
    // create parsable code, and simply parse as a function definition node
    let code = "function " + signature + "\nend"
    let tokens = Tokenizer.tokenizeThrowIfError(code)
    let tree = BracketGrouper.groupIntoOneThrowIfError(tokens)
    let wholeState = new WholeFileParseState()
    let node = parseWholeFunctionDef(tree, wholeState)
    if (wholeState.parseErrors.length > 0) {
      // TODO improve parsing
      // console.error("Failed to parse function def from julia: " + code)
    }

    // update where the name token points to
    if (node.name.length > 0) {  // may have been a parse failure
      let range: Range = null
      if (lineNumber === 0) {
        range = Range.createEmptyRange()
      } else {
        range = new Range(new Point(lineNumber - 1, 0), new Point(lineNumber - 1, 1))
      }
      node.name[0].token.range = range
    } else {
      console.error("Operator need to handle: " + name)
    }

    functionResolve.functionDefs.push([path, node])
  }

}


export async function refreshPrefixTreesAsync(moduleLibrary: ModuleLibrary, refreshFromSerialized: boolean) {
  // TODO option to just refresh certain prefix trees that need to be refreshed

  let t0 = Date.now()

  // refresh prefix trees first time
  // this will load up all names that had been accessed in the module
  // but not any that were never accessed from the serialized state
  for (let moduleName in moduleLibrary.modules) {
    let moduleScope = moduleLibrary.modules[moduleName]
    if (!moduleScope.isLibraryReference) {
      let prefixTree = moduleLibrary.prefixTrees[moduleName]
      if (!prefixTree) throw new AssertError("")
      reinitializePrefixTree(moduleScope.names, prefixTree)
    }
  }

  // asynchronously load up prefix tree with entire serialized contents of module
  // may be a bit slower
  if (refreshFromSerialized) {
    for (let moduleName in moduleLibrary.modules) {
      let moduleScope = moduleLibrary.modules[moduleName]
      if (moduleScope.isLibraryReference) {
        if (moduleName in moduleLibrary.serializedLines) {
          await runDelayed(() => {
            let lineSet: ModuleLineSet = moduleLibrary.serializedLines[moduleName]
            let prefixTree = moduleLibrary.prefixTrees[moduleName]
            if (!prefixTree) throw new AssertError("")
            let namesObj: StringSet = {}
            for (let name in lineSet) {
              addToSet(namesObj, name)
            }
            reinitializePrefixTree(namesObj, prefixTree)
          })
        }
      }
    }
  }

  let t1 = Date.now()
  console.log("Refreshed prefix trees: " + (t1 - t0) + " ms")
}



