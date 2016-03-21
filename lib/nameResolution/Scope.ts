"use strict"

import {PrefixTreeNode} from "./PrefixTree";
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
import {reinitializePrefixTree} from "./PrefixTree";
import {createPrefixTree} from "./PrefixTree";


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

  getMatchingNames(prefix: string): string[] {
    let matchingNames = []
    for (let name in this.names) {
      if (name.toLowerCase().startsWith(prefix)) {
        matchingNames.push(name)
      }
    }
    return matchingNames
  }


}


export class ModuleScope extends Scope {

  private _usingModules: ModuleScope[]
  private _importAllModules: ModuleScope[]
  exportedNames: StringSet        // List of all explicitly exported names.
  prefixTree: PrefixTreeNode      // Stores all the names in the scope in an easily searchable manner. Doesn't include names in using/importall modules
  moduleShortName: string         // Can be null if this is a file level scope. Just the short name, not the full path.


  isExternal: boolean // true if a module not in the worksapce
  // below only populated if isExternal
  moduleFullName: string
  moduleLibrary: ModuleLibrary
  initializedLibraryReference: boolean  // delayed init to save startup time

  constructor() {
    super(ScopeType.Module)
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
    this.prefixTree = createPrefixTree({})
    this.moduleShortName = null

    this.isExternal = false
    this.moduleFullName = null
    this.moduleLibrary = null
    this.initializedLibraryReference = false
  }

  get usingModules(): ModuleScope[] { return this._usingModules.slice() }
  get importAllModules(): ModuleScope[] { return this._importAllModules.slice() }



  reset(): void {
    if (this.isExternal) throw new AssertError("")

    this.names = {}
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
    this.refreshPrefixTree()
  }

  addUsingModule(scope: ModuleScope): void {
    if (this.isExternal) throw new AssertError("")

    // do not add duplicate
    if (this._usingModules.findIndex((iScope: ModuleScope) => { return iScope.moduleShortName === scope.moduleShortName}) >= 0) return
    this._usingModules.push(scope)
  }

  addImportAllModule(scope: ModuleScope): void {
    if (this.isExternal) throw new AssertError("")

    // do not add duplicate
    if (this._importAllModules.findIndex((iScope: ModuleScope) => { return iScope.moduleShortName === scope.moduleShortName}) >= 0) return
    this._importAllModules.push(scope)
  }

  refreshPrefixTree(): void {
    reinitializePrefixTree(this.names, this.prefixTree)
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
  searchUsedImportAlldModules(name: string): Resolve {

    for (let scope of this._importAllModules) {
      let resolve = scope.tryResolveExportedName(name)
      if (resolve !== null) return resolve
    }

    let matchingUsings: [ModuleScope, Resolve][] = []
    for (let scope of this._usingModules) {
      let resolve = scope.tryResolveExportedName(name)
      if (resolve !== null) {
        matchingUsings.push([scope, resolve])
      }
    }
    if (matchingUsings.length === 0) {
      return null
    }
    if (matchingUsings.length === 1) {
      return matchingUsings[0][1]
    }
    // conflicts between multiple usings
    let msg = "Modules used ("
    msg += matchingUsings.map((item) => { return item[0].moduleShortName}).join(", ")
    msg += ") all export '" + name + "'. Must invoke qualify with module name."
    console.error(msg)
    return null
  }

  tryResolveExportedName(name: string): Resolve {
    if (this.isExternal && !this.initializedLibraryReference)
      initializeLibraryReference(this.moduleFullName, this.moduleLibrary)

    if (!(name in this.exportedNames)) {
      return null
    }
    return this.tryResolveNameThisLevel(name)
  }

  /**
   * Resolves only at this scope, not a parent scope.
   * Also resolves to used modules.
   * For modules outside workspace, their scopes are lazy populated. This populates only the requested name.
   *
   * @param name
   * @returns Matching resolve. Null if not found.
   */
  tryResolveNameThisLevel(name: string): Resolve {
    if (this.isExternal && !this.initializedLibraryReference)
      initializeLibraryReference(this.moduleFullName, this.moduleLibrary)

    if (name in this.names) return this.names[name]

    if (this.isExternal) {
      tryAddNameFromSerializedState(name, this.moduleFullName, this.moduleLibrary)
      if (name in this.names) return this.names[name]
    }

    let result = this.searchUsedImportAlldModules(name)
    if (result === null) return null
    return result as Resolve
  }

  getMatchingNames(prefix: string): string[] {
    return this.prefixTree.getMatchingNames(prefix)
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






