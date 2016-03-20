"use strict"

import {initializeLibraryReference} from "../core/ModuleLibrary";
import {ModuleResolve} from "./Resolve";
import {ModuleLibrary} from "./../core/ModuleLibrary";
import {StringSet} from "../utils/StringSet";
import {AssertError} from "../utils/assert";
import {Point} from "../tokens/Token";
import {FunctionDefNode} from "../parseTree/nodes";
import {Token} from "../tokens/Token";
import {TypeDefNode} from "../parseTree/nodes";
import {ModuleDefNode} from "../parseTree/nodes";
import {last} from "../utils/arrayUtils";
import {addToSet} from "../utils/StringSet";
import {IdentifierNode} from "../parseTree/nodes";
import {NameError} from "../utils/errors";
import {getResolveInfoType} from "./Resolve";
import {Resolve} from "./Resolve";
import {tryAddNameFromSerializedState} from "../core/ModuleLibrary";


export type NameSet = {[name:string]: Resolve}

export class Scope {

  parent: Scope
  names: NameSet
  tokenStart: Token  // may be null if a library module scope or if error during parsing
  tokenEnd: Token    // may be null if a library module scope or if error during parsing

  constructor(public type: ScopeType) {
    this.type = type
    this.names = {}
    this.parent = null
    this.tokenStart = null
    this.tokenEnd = null
  }

  createChild(type: ScopeType): Scope {
    let child =
      new Scope(type)
    child.parent = this
    return child
  }


  tryResolveNameThroughParentScopes(name: string, haltSearchAtOuterFunctionScope: boolean): Resolve {
    let currScope: Scope = this
    while (currScope !== null) {
      let resolve = currScope.tryResolveNameThisLevel(name)
      if (resolve !== null) return resolve

      if (haltSearchAtOuterFunctionScope && currScope.type === ScopeType.Function) return null

      currScope = currScope.parent
    }
    return null
  }

  /**
   * Resolves only at this scope, not a parent scope.
   *
   * @param name
   * @returns Null if not found.
   */
  tryResolveNameThisLevel(name: string): Resolve {
    // this level
    if (name in this.names) {
      return this.names[name]
    }
    return null
  }



  /**
   * Resolves the module qualified name. Returns the resolve, or returns an error if any part along the way not found.
   */
  tryResolveMultiPartName(multiPartName: IdentifierNode[]): (Resolve | NameError) {

    if (multiPartName.length === 0) throw new AssertError("Zero length name")

    let currScope: Scope = this

    for (let idx = 0; idx < multiPartName.length; idx++) {
      let identNode = multiPartName[idx]
      let namePart = identNode.name
      let isLastPart = idx === multiPartName.length - 1

      let resolve = currScope.tryResolveNameThroughParentScopes(namePart, false)
      if (resolve !== null) {
        if (isLastPart) return resolve
        if (resolve instanceof ModuleResolve) {
          currScope = resolve.moduleRootScope
        } else {
          return new NameError("Expected '" + resolve.name + "' to be a module, but was already declared as " +
            getResolveInfoType(resolve) + " in this scope.", identNode.token)
        }
      } else {
        return new NameError("Could not find name: '" + namePart + "'.", identNode.token)
      }
    }

    throw new AssertError("") // should not reach here
  }




}


export class ModuleScope extends Scope {

  _usingModules: [string, ModuleScope][]      // name string, only the used module's name, not path along parent modules
  _importAllModules: [string, ModuleScope][]  // name string, only the included module's name, not path along parent modules
  exportedNames: StringSet        // List of all explicitly exported names.
  //isInitialized: boolean  // false until visited during scope recursing

  isLibraryReference: boolean // true if a module populated by querying julia rather than one based on workspace files
  // below only populated if isLibraryReference
  moduleName: string
  moduleLibrary: ModuleLibrary
  initializedLibraryReference: boolean  // delayed init to save startup time


  constructor() {
    super(ScopeType.Module)
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}


    this.isLibraryReference = false
    this.moduleName = null
    this.moduleLibrary = null
    this.initializedLibraryReference = false
  }

  get usingModules(): [string, ModuleScope][] { return this._usingModules.slice() }
  get importAllModules(): [string, ModuleScope][] { return this._importAllModules.slice() }



  reset(): void {
    if (this.isLibraryReference) throw new AssertError("")

    this.names = {}
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
  }

  addUsingModule(moduleName: string, scope: ModuleScope): void {
    if (this.isLibraryReference) throw new AssertError("")

    // do not add duplicate
    if (this._usingModules.findIndex((tup) => { return tup[0] === moduleName}) >= 0) return
    this._usingModules.push([moduleName, scope])
  }

  addImportAllModule(moduleName: string, scope: ModuleScope): void {
    if (this.isLibraryReference) throw new AssertError("")

    // do not add duplicate
    if (this._importAllModules.findIndex((tup) => { return tup[0] === moduleName}) >= 0) return
    this._importAllModules.push([moduleName, scope])
  }

  /**
   * Returns the matching resolve info, searching all using and importall modules.
   *
   * When a module is importall'd, it takes precedence over used modules.
   * If multiple modules importall'd export the same name, only the first module's is used.
   *
   * If multiple modules used export the same name, an error is given.
   */
  searchUsedImportAlldModules(name: string): (Resolve | string) {

    for (let tup of this._importAllModules) {
      let scope: ModuleScope = tup[1]
      let resolve = scope.tryResolveExportedName(name)
      if (resolve !== null) return resolve
    }

    let matchingUsings: [string, Scope, Resolve][] = []
    for (let tup of this._usingModules) {
      let modName: string = tup[0]
      let usedScope: ModuleScope = tup[1]
      let resolve = usedScope.tryResolveExportedName(name)
      if (resolve !== null) {
        matchingUsings.push([modName, usedScope, resolve])
      }
    }
    if (matchingUsings.length === 0) {
      return null
    }
    if (matchingUsings.length === 1) {
      return matchingUsings[0][2]
    }
    // conflicts between multiple usings
    let msg = "Modules used ("
    msg += matchingUsings.map((item) => { return item[0]}).join(", ")
    msg += ") all export '" + name + "'. Must invoke qualify with module name."
    console.error(msg)
    return msg
  }

  tryResolveExportedName(name: string): Resolve {
    if (this.isLibraryReference && !this.initializedLibraryReference)
      initializeLibraryReference(this.moduleName, this.moduleLibrary)

    if (!(name in this.exportedNames)) {
      return null
    }
    return this.tryResolveNameThisLevel(name)
  }

  /**
   * Resolves only at this scope, not a parent scope.
   * Also resolves to used modules.
   *
   * @param name
   * @returns (matching info | error message) Null if not found. Error message is only if conflict to report.
   */
  tryResolveNameThisLevel(name: string): Resolve {
    if (this.isLibraryReference && !this.initializedLibraryReference)
      initializeLibraryReference(this.moduleName, this.moduleLibrary)

    if (name in this.names) return this.names[name]

    if (this.isLibraryReference) {
      tryAddNameFromSerializedState(name, this.moduleName, this.moduleLibrary)
      if (name in this.names) return this.names[name]
    }

    let result = this.searchUsedImportAlldModules(name)
    if (result === null) return null
    if (typeof(result) === "string") return null // discard msg. Have to call searchUsedModules directly to get error.
    return result as Resolve
  }


}





export enum ScopeType {
  Module, // module scopes are the root. In a naked file which is not itself a module, the scope is considered for the global module.
  Function,
  InnerFunction, // functions inside functions can close over the outer functions variables. They need to take into account when assigning variables.
  TypeDef,
  Block
  //MultiFile
}






