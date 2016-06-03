"use strict"

import {clearArray} from "../utils/arrayUtils";
import {resetHash} from "../utils/arrayUtils";
import {Node} from "../parseTree/nodes";
import {ModuleScope} from "../nameResolution/Scope";
import {ModuleContentsNode} from "../parseTree/nodes";
import {ModuleLibrary} from "./ModuleLibrary";
import {addToSet} from "../utils/StringSet";
import {FunctionResolve} from "../nameResolution/Resolve";
import {parseWholeFileContents} from "../fsas/general/ModuleContentsFsa";
import {AssertError} from "../utils/assert";
import {FileLevelNode} from "../parseTree/nodes";
import {Scope} from "../nameResolution/Scope";
import {Point} from "../tokens/Token";
import {Range} from "../tokens/Token";
import {IdentifierNode} from "../parseTree/nodes";
import {Resolve} from "../nameResolution/Resolve";
import {NameError} from "../utils/errors";
import {InvalidParseError} from "../utils/errors";
import {Tokenizer} from "../tokens/Tokenizer";
import {TokenStream} from "../tokens/TokenStream";
import {BracketGrouper} from "../parseTree/BracketGrouper";
import {throwErrorFromTimeout} from "../utils/assert";
import {getFromHash} from "../utils/arrayUtils";
import {WholeFileParseState} from "../fsas/general/ModuleContentsFsa";
import {parseWholeFunctionDef} from "../fsas/declarations/FunctionDefFsa";
import {TreeToken} from "../tokens/Token";
import {runJuliaToGetModuleDataAsync} from "./../utils/juliaChildProcess";
import {ScopeType} from "../nameResolution/Scope";

/**
 * Stores the parses from the files.
 * Stores names resolved from modules in library.
 * Only one for whole session.
 */
export class SessionModel {

  parseSet: ParseSet
  moduleLibrary: ModuleLibrary
  partiallyResolved: boolean

  constructor() {
    this.parseSet = new ParseSet()
    this.moduleLibrary = new ModuleLibrary()
    this.partiallyResolved = false
  }
}




/**
 * Contains parsing information for a whole set of files.
 */
export class ParseSet {
  // per file items
  fileLevelNodes: {[file:string]: FileLevelNode}
  scopes: {[file:string]: FileScopes}
  identifiers: {[file:string]: FileIdentifiers}
  errors: {[file:string]:FileErrors}

  moduleResolveInfos: ModuleResolveInfo[]  // one for every module and top level file
  compileRoots: ModuleResolveInfo[]  // only the top level files

  constructor() {
    this.fileLevelNodes = {}
    this.scopes = {}
    this.identifiers = {}
    this.errors = {}
    this.moduleResolveInfos = []
    this.compileRoots = []
  }

  createEntriesForFile(path: string): void {
    this.fileLevelNodes[path] = new FileLevelNode(path)
    this.scopes[path] = new FileScopes()
    this.identifiers[path] = new FileIdentifiers()
    this.errors[path] = new FileErrors()
  }

  reset(): void {
    resetHash(this.fileLevelNodes)
    resetHash(this.scopes)
    resetHash(this.identifiers)
    resetHash(this.errors)
    clearArray(this.moduleResolveInfos)
    clearArray(this.compileRoots)
  }

  /**
   * Clears node contents, and all logged scopes, logged identifiers, and logged errors related to a file.
   */
  resetFile(path: string): void {
    let node = this.fileLevelNodes[path]
    if (!node) throw new AssertError("")
    node.reset() // reset the node, but leave the same object in place
    this.scopes[path] = new FileScopes()
    this.identifiers[path] = new FileIdentifiers()
    this.errors[path] = new FileErrors()
  }

  /**
   * Clears logged scopes, logged identifiers, and logged name errors related to a file.
   */
  resetNamesForFile(path: string): void {
    let node = this.fileLevelNodes[path]
    if (!node) throw new AssertError("")
    this.scopes[path] = new FileScopes()
    this.identifiers[path] = new FileIdentifiers()
    this.errors[path].nameErrors = []
  }

  getModuleResolveInfo(rootNode: ModuleContentsNode): ModuleResolveInfo {
    let res = this.tryGetModuleResolveInfo(rootNode)
    if (res === null) {
      throw new AssertError("")
    }
    return res
  }
  tryGetModuleResolveInfo(rootNode: ModuleContentsNode): ModuleResolveInfo {
    let idx = this.moduleResolveInfos.findIndex((pr: ModuleResolveInfo) => { return pr.root === rootNode})
    if (idx < 0) return null
    return this.moduleResolveInfos[idx]
  }



}

/**
 * All contextual information needed to resolve a module.
 *
 * There is one of these for every declared module...end.
 * There is also one of these for every top level file (ie a file not included in any other files).
 *
 */
export class ModuleResolveInfo {
  root: ModuleContentsNode  // the module node or the top level file
  relateds: FileLevelNode[]  // any file referenced via 'include'. Not the root file.
  containingFile: string
  scope: ModuleScope
  imports: string[]  // Names imported by this module. Only holds the first name of any multi-part name.
  parentModule: ModuleContentsNode  // null for top level files, but not for anything else
  childrenModules: ModuleContentsNode[]

  constructor() {
    this.root = null
    this.relateds = []
    this.containingFile = null
    this.scope = null
    this.imports = []
    this.parentModule = null
    this.childrenModules = []
  }

  reset(): void {
    this.scope.reset()
    this.imports = []
  }
}


/**
 * Contains all the scopes created in the file.
 * One for each file.
 *
 * Used to resolve available names while typing.
 *
 * If this file was included in another file, this does not contain the module level scope that wraps the whole file.
 */
export class FileScopes {
  private _scopes: Scope[]


  constructor() {
    this._scopes = []
  }

  addScope(scope: Scope): void {
    this._scopes.push(scope)
  }

  /**
   * Search scopes that were created within the file.
   * Returns the narrowest scope that contains the point.
   * If the point is at the top level of the file (ie not inside any scope other than the module level scope),
   * will return null.
   */
  getScope(point: Point): Scope {

    let narrowestScope: Scope = null
    for (let scope of this._scopes) {

      // check whether the scope contains the point
      // allow for null points due to bad parses
      let startPoint: Point = null
      let endPoint: Point = null
      if (scope.tokenStart !== null) startPoint = scope.tokenStart.range.start
      if (scope.tokenEnd !== null) endPoint = scope.tokenEnd.range.end
      if (startPoint !== null && point.isBefore(startPoint)) continue
      if (endPoint !== null && endPoint.isBefore(point)) continue

      // compare to see if this is narrower
      if (narrowestScope === null) {
        narrowestScope = scope
      } else {
        if (narrowestScope.tokenStart !== null && scope.tokenStart !== null) {
          if (narrowestScope.tokenStart.range.start.isBefore(scope.tokenStart.range.start)) {
            narrowestScope = scope
          }
        }
        if (narrowestScope.tokenEnd !== null && scope.tokenEnd !== null) {
          if (scope.tokenEnd.range.end.isBefore(narrowestScope.tokenEnd.range.end)) {
            narrowestScope = scope
          }
        }
      }
    }

    return narrowestScope
  }

  reset(): void {
    this._scopes = []
  }
}

/**
 * Tracks all the identifiers in a file and what they resolve to.
 * One for each file.
 */
export class FileIdentifiers {
  map: Map<IdentifierNode, Resolve>

  constructor() {
    this.map = new Map()
  }

  /**
   * Returns the identifier that is found at the cursor point. Null if no corresponding match.
   */
  getIdentifierForPoint(point: Point): IdentifierNode {
    for (let kv of this.map) {
      let iIdentNode: IdentifierNode = kv[0]
      if (iIdentNode.token.range.pointWithin(point)) {
        return iIdentNode
      }
    }
    return null
  }

}

/**
 * Tracks all the errors in the file.
 * One for each file.
 */
export class FileErrors {
  nameErrors: NameError[]
  parseErrors: InvalidParseError[]

  constructor() {
    this.nameErrors = []
    this.parseErrors = []
  }
}



