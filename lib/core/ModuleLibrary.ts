"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />


import * as atomModule from "atom"
import * as nodepath from "path"
import {StringSet} from "../utils/StringSet";
import {ExternalModuleScope} from "../nameResolution/Scope";
import {runJuliaToGetLoadPathsAsync} from "../utils/juliaChildProcess";
import {AssertError} from "../utils/assert";
import {SessionModel} from "./SessionModel";
import {ModuleDefNode} from "../parseTree/nodes";
import {runJuliaToGetModuleDataAsync} from "../utils/juliaChildProcess";
import {throwErrorFromTimeout} from "../utils/assert";
import {ModuleScope} from "../nameResolution/Scope";
import {Token} from "../tokens/Token";
import {VariableResolve} from "../nameResolution/Resolve";

export type ModuleLineSet = {[name: string]: string[][]}  // function/type/variable name -> all related lines, split by tab

/**
 * Contains summary info for all modules registered in the system.
 * Modules may be in the workspace or not.
 *
 * Excludes modules not findable along the julia module path.
 */
export class ModuleLibrary {

  loadPaths: string[]
  modules: {[moduleFullName: string]: ModuleScope}   // module full name -> root scope of module

  // facilitate fast reparses and name resolution
  workspaceModulePaths: {[filePath: string]: string} // file path -> module full name. Set of files that are recognized as modules.
  toQueryFromJulia: StringSet  // full module path of modules to query from julia

  constructor() {
    this.loadPaths = []
    this.modules = {}
    this.workspaceModulePaths = {}
    this.toQueryFromJulia = {}
  }

  initializeFromSerialized(state: any) {
    if ("loadPaths" in state) {
      this.loadPaths = state["loadPaths"]
    }
    if ("serializedLines" in state) {
      for (let moduleFullName in state.serializedLines) {
        this.modules[moduleFullName] = new ExternalModuleScope(moduleFullName, state.serializedLines[moduleFullName], this)
      }
    }
  }

  async refreshLoadPathsAsync() {
    let loadPaths = await runJuliaToGetLoadPathsAsync()
    this.loadPaths = loadPaths as string[]
  }

  /**
   * Converts contents to a JSON object for storage when Atom is closed.
   * Avoid having to query Julia every startup.
   */
  serialize(): LibrarySerialized {
    let state = new LibrarySerialized()
    state.loadPaths = this.loadPaths.slice()
    for (let moduleName in this.modules) {
      let scope = this.modules[moduleName]
      if (scope instanceof ExternalModuleScope) {
        state.serializedLines[moduleName] = scope.getSerializedLines()
      }
    }
    return state
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


export class LibrarySerialized {
  serializedLines: {[name:string]: ModuleLineSet}
  loadPaths: string[]
  constructor() {
    this.serializedLines = {}
    this.loadPaths = []
  }
}






/**
 * Searches for the module through the julia LOAD_PATH and installs it into the library.
 * If the module exists in the workspace, will reference the parse.
 * Otherwise will fetch function and type information from a Julia session.
 *
 * If the module is found to have inner modules, those are loaded too.
 *
 * Parse sets must already be built before this is run.
 */
export async function resolveModuleForLibrary(fullModuleName: string, sessionModel: SessionModel) {
  let moduleLibrary = sessionModel.moduleLibrary
  if (fullModuleName in moduleLibrary.modules) throw new AssertError("")
  let outerModuleName = fullModuleName.split(".")[0]

  if (outerModuleName !== "Base" && outerModuleName !== "Core") {
    // search for a matching file in the file system
    let foundPath: string = null
    for (let loadPath of moduleLibrary.loadPaths) {
      let path = nodepath.resolve(loadPath, outerModuleName, "src", outerModuleName + ".jl")
      let file = new atomModule.File(path, false)
      let exists = await file.exists()
      if (exists) {
        foundPath = await file.getRealPath()
        break
      }
    }
    if (foundPath === null) {
      // this can happen eg import LinAlg, which is actually an inner module of Base
      console.log("Module '" + outerModuleName + "' was not found in the file system.")
      return
    }

    // see if the file is one in the workspace
    if (foundPath in sessionModel.parseSet.fileLevelNodes) {
      let fileLevelNode = sessionModel.parseSet.fileLevelNodes[foundPath]
      // look for a module inside with the same name
      for (let expr of fileLevelNode.expressions) {
        if (expr instanceof ModuleDefNode) {
          let moduleDefNode = expr as ModuleDefNode
          if (moduleDefNode.name.name === outerModuleName) {
            // get the matching scope
            let resolveRoot = sessionModel.parseSet.getResolveRoot(moduleDefNode)
            let moduleScope = resolveRoot.scope

            // register it in the module library
            //console.log("Registering workspace module '" + moduleName + "' in the library." )
            moduleLibrary.modules[outerModuleName] = moduleScope
            moduleLibrary.workspaceModulePaths[foundPath] = outerModuleName
            return
          }
        }
      }
      // if reached here, no matching module, even though there should be one
      console.log("Module '" + outerModuleName + "' should be in the workspace at " + foundPath +
        " but the file did not declare a module with name '" + outerModuleName + "'.")
      return
    }
  }

  await addExternalModuleAsync(moduleLibrary, fullModuleName)
}




/**
 *
 * @param moduleLibrary
 * @param moduleFullName  '.' delimited name
 */
async function addExternalModuleAsync(moduleLibrary: ModuleLibrary, moduleFullName: string) {
  try {
    console.log("Fetching module '" + moduleFullName + "' from Julia process to get type and function information.")
    let linesList = (await runJuliaToGetModuleDataAsync(moduleFullName)) as string[][]

    // convert array into a hash indexed by the name
    let moduleLinesByName: ModuleLineSet = {}

    for (let line of linesList) {
      if (line.length < 2) throw new AssertError("")
      if (line[0] === "cancel") {
        // if a module declares
        //   import LinAlg
        // This should not be queried directly, but as Base.LinAlg.
        // But this cannot be known until Julia responds by resolving the path for us.
        console.log("Skipping resolving '" + moduleFullName + ": " + line[1])
        return
      }

      if (line.length < 3) throw new AssertError("")
      let name = line[1]

      if (!(name in moduleLinesByName)) moduleLinesByName[name] = []

      // ccall is a special 'intrinsic' function which is defined in Core but not exported.
      // To allow name resolution, we can just label it as exported.
      if (moduleFullName === "Core" && name === "ccall") line[2] = "exported"

      moduleLinesByName[name].push(line)
    }

    moduleLibrary.modules[moduleFullName] = new ExternalModuleScope(moduleFullName, moduleLinesByName, moduleLibrary)


    console.log("Successfully retrieved '" + moduleFullName + "' from Julia process.")
  } catch (err) {
    throwErrorFromTimeout(err)
  }
}


