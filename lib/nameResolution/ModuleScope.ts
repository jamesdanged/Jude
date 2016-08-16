import {ModuleResolve} from "./Resolve";
import {reinitializePrefixTree} from "./PrefixTree";
import {ImportedResolve} from "./Resolve";
import {createPrefixTree} from "./PrefixTree";
import {PrefixTreeNode} from "./PrefixTree";
import {StringSet} from "../utils/StringSet";
import {Scope, ScopeType} from "./Scope"
import {Resolve} from "./Resolve";


export class ModuleScope extends Scope {

  private _usingModules: ModuleScope[]
  private _importAllModules: ModuleScope[]
  exportedNames: StringSet        // List of all explicitly exported names.
  prefixTree: PrefixTreeNode      // Stores all the names in the scope in an easily searchable manner. Doesn't include names in using/importall modules
  moduleShortName: string         // Can be null if this is a file level scope. Just the short name, not the full path.
  parentModuleScope: ModuleScope       // Can be null

  constructor() {
    super(ScopeType.Module)
    this._usingModules = []
    this._importAllModules = []
    this.exportedNames = {}
    this.prefixTree = createPrefixTree({})
    this.moduleShortName = null
    this.parentModuleScope = null
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
      if (resolve !== null) return wrapInImportIfNecessary(resolve)
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
      return wrapInImportIfNecessary(matchingUsings[0][1])
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



function wrapInImportIfNecessary(resolve: Resolve): Resolve {
  if (resolve instanceof ImportedResolve) return resolve
  if (resolve instanceof ModuleResolve) return resolve
  return new ImportedResolve(resolve)
}
