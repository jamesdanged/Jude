"use strict"

import {throwErrorFromTimeout} from "../utils/assert";
import {ModuleLineSet} from "../core/ModuleLibrary";
import {PrefixTreeNode} from "./PrefixTree";
import {ModuleResolve} from "./Resolve";
import {ModuleLibrary} from "./../core/ModuleLibrary";
import {StringSet} from "../utils/StringSet";
import {AssertError} from "../utils/assert";
import {Point} from "../tokens/Token";
import {FunctionDefNode} from "../parseTree/nodes";
import {Token} from "../tokens/Token";
import {Range} from "../tokens/Token";
import {TypeDefNode} from "../parseTree/nodes";
import {ModuleDefNode} from "../parseTree/nodes";
import {last} from "../utils/arrayUtils";
import {addToSet} from "../utils/StringSet";
import {IdentifierNode} from "../parseTree/nodes";
import {NameError} from "../utils/errors";
import {getResolveInfoType} from "./Resolve";
import {Resolve} from "./Resolve";
import {reinitializePrefixTree} from "./PrefixTree";
import {createPrefixTree} from "./PrefixTree";
import {ExternalModuleResolve} from "./Resolve";
import {VariableResolve} from "./Resolve";
import {MacroResolve} from "./Resolve";
import {Tokenizer} from "../tokens/Tokenizer";
import {TokenType} from "../tokens/operatorsAndKeywords";
import {BracketGrouper} from "../parseTree/BracketGrouper";
import {WholeFileParseState} from "../fsas/general/ModuleContentsFsa";
import {parseWholeTypeDef} from "../fsas/declarations/TypeDefFsa";
import {TypeResolve} from "./Resolve";
import {FunctionResolve} from "./Resolve";
import {parseWholeFunctionDef} from "../fsas/declarations/FunctionDefFsa";


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
      let namePart = identNode.str
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


  constructor() {
    super(ScopeType.Module)
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
    this.prefixTree = createPrefixTree({})
    this.moduleShortName = null
  }

  get usingModules(): ModuleScope[] { return this._usingModules.slice() }
  get importAllModules(): ModuleScope[] { return this._importAllModules.slice() }

  reset(): void {
    this.names = {}
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
    this.refreshPrefixTree()
  }

  addUsingModule(scope: ModuleScope): void {
    // do not add duplicate
    if (this._usingModules.findIndex((iScope: ModuleScope) => { return iScope.moduleShortName === scope.moduleShortName}) >= 0) return
    this._usingModules.push(scope)
  }

  addImportAllModule(scope: ModuleScope): void {
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
    console.log(msg)
    return null
  }

  tryResolveExportedName(name: string): Resolve {
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
    if (name in this.names) return this.names[name]

    let result = this.searchUsedImportAlldModules(name)
    if (result === null) return null
    return result as Resolve
  }

  getMatchingNames(prefix: string): string[] {
    return this.prefixTree.getMatchingNames(prefix)
  }

}


/**
 * For modules external to the project.
 */
export class ExternalModuleScope extends ModuleScope {
  private moduleFullName: string
  private initializedLibraryReference: boolean  // delayed init to save startup time
  private serializedLines: ModuleLineSet
  private moduleLibrary: ModuleLibrary  // need to notify the library when unresolved inner module

  /**
   * The module scope is not fully populated initially. Names are lazily loaded from the serializedLines.
   * The names are all immediately loaded into prefix trees.
   *
   * @param moduleFullName  Can have '.'
   * @param serializedLines
   * @param moduleLibrary
   */
  constructor(moduleFullName: string, serializedLines: ModuleLineSet, moduleLibrary: ModuleLibrary) {
    super()
    this.moduleFullName = moduleFullName
    this.serializedLines = serializedLines
    this.initializedLibraryReference = false
    this.moduleShortName = last(moduleFullName.split("."))
    this.prefixTree = createPrefixTree(serializedLines)
    this.moduleLibrary = moduleLibrary
  }

  reset(): void { throw new AssertError("")}
  getSerializedLines(): ModuleLineSet { return this.serializedLines }  // just for serialization

  addUsingModule(scope: ModuleScope): void { throw new AssertError("") }
  addImportAllModule(scope: ModuleScope): void { throw new AssertError("") }

  tryResolveExportedName(name: string): Resolve {
    if (!this.initializedLibraryReference)
      this.initializeLibraryReference()

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
    if (!this.initializedLibraryReference)
      this.initializeLibraryReference()

    if (name in this.names) return this.names[name]

    this.tryAddNameFromSerializedState(name)
    if (name in this.names) return this.names[name]

    let result = this.searchUsedImportAlldModules(name)
    if (result === null) return null
    return result as Resolve
  }


  /**
   * simply loads exported names into the export list of the scope
   *
   */
  private initializeLibraryReference(): void {
    for (let name in this.serializedLines) {
      let arr: string[][] = this.serializedLines[name]
      for (let line of arr) {
        if (line[2] === "exported") {
          addToSet(this.exportedNames, name)
          break
        } else if (line[2] === "hidden") {
          // do nothing
        } else {
          throw new AssertError("")
        }
      }
    }

    this.initializedLibraryReference = true
  }

  private tryAddNameFromSerializedState(name: string): void {
    let arr: string[][] = this.serializedLines[name]
    if (!arr) return // name not in module

    for (let line of arr) {
      if (line[0] === "function") {
        this.addFunctionFromSerialized(line)
      } else if (line[0] === "type") {
        this.addTypeFromSerialized(line)
      } else if (line[0] === "variable") {
        this.addVariableFromSerialized(line)
      } else if (line[0] === "macro") {
        this.addMacroFromSerialized(line)
      } else if (line[0] === "module") {
        this.addModuleFromSerialized(line)
      }
    }
  }


  private addModuleFromSerialized(parts: string[]) {
    if (parts.length !== 4) throw new AssertError("")
    let name = parts[1]
    let fullModulePath = parts[3]
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    if (fullModulePath in this.moduleLibrary.modules) {
      let innerModuleScope = this.moduleLibrary.modules[fullModulePath]
      this.names[name] = new ExternalModuleResolve(fullModulePath, innerModuleScope)
    } else {
      // module hasn't been retrieved from Julia yet
      addToSet(this.moduleLibrary.toQueryFromJulia, fullModulePath)
    }
  }

  private addVariableFromSerialized(parts: string[]): void {
    if (parts.length !== 3) throw new AssertError("")
    let name = parts[1]
    // store it
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new VariableResolve(Token.createEmptyIdentifier(name), null)
  }

  private addMacroFromSerialized(parts: string[]): void {
    if (parts.length !== 3) throw new AssertError("")
    let name = parts[1]
    // store it
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new MacroResolve(name)
  }


  private addTypeFromSerialized(parts: string[]): void {
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
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new TypeResolve(node, null)
  }



  private addFunctionFromSerialized(parts: string[]): void {
    if (parts.length !== 6) throw new AssertError("")

    let name = parts[1]
    let signature = parts[3]
    let path = parts[4]
    if (path === "") path = null
    let lineNumber = 0
    if (parts[5] !== "") lineNumber = parseInt(parts[5])

    let resolve = this.names[name]
    if (resolve) {
      if (!(resolve instanceof FunctionResolve)) {
        throwErrorFromTimeout(new AssertError("'" + name + "' declared both as function and as " +
          getResolveInfoType(resolve) + " in module loaded from Julia??"))
        return
      }
    } else {
      resolve = new FunctionResolve(name)
      this.names[name] = resolve
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


}




export enum ScopeType {
  Module, // module scopes are the root. In a naked file which is not itself a module, the scope is considered for the global module.
  Function,
  InnerFunction, // functions inside functions can close over the outer functions variables. They need to take into account when assigning variables.
  TypeDef,
  Block
  //MultiFile
}






