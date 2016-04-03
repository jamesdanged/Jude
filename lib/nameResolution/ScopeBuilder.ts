"use strict"

import {ExternalModuleResolve} from "./Resolve";
import {addToSet} from "../utils/StringSet";
import {MacroDefNode} from "../parseTree/nodes";
import {MultiPartName} from "../parseTree/nodes";
import {ModuleScope} from "./Scope";
import {ModuleResolve} from "./Resolve";
import {ScopeRecurser} from "./ScopeRecurser";
import {Scope} from "./Scope";
import {ModuleLibrary} from "./../core/ModuleLibrary";
import {NameError} from "../utils/errors";
import {IdentifierNode} from "../parseTree/nodes";
import {last} from "../utils/arrayUtils";
import {AssertError} from "../utils/assert";
import {FunctionDefNode} from "../parseTree/nodes";
import {TypeDefNode} from "../parseTree/nodes";
import {ModuleDefNode} from "../parseTree/nodes";
import {LocalModuleResolve} from "./Resolve";
import {getResolveInfoType} from "./Resolve";
import {ImportedResolve} from "./Resolve";
import {FunctionResolve} from "./Resolve";
import {TypeResolve} from "./Resolve";
import {VariableResolve} from "./Resolve";
import {NameDeclType} from "./Resolve";
import {Resolve} from "./Resolve";
import {ParseSet} from "../core/SessionModel";
import {ScopeType} from "./Scope";
import {MacroResolve} from "./Resolve";


/**
 * Works with the ScopeRecurser to build out a scope tree.
 * The recurser does the navigation through the node tree.
 * The builder checks and registers names.
 *
 */
export class ScopeBuilder {

  _recurser: ScopeRecurser
  constructor(recurser: ScopeRecurser) {
    this._recurser = recurser
  }

  get currFile(): string { return this._recurser.currFile }
  get currScope(): Scope { return this._recurser.currScope }
  get moduleLibrary(): ModuleLibrary { return this._recurser.moduleLibrary }
  get parseSet(): ParseSet { return this._recurser.parseSet }
  logNameError(err: NameError): void {
    this._recurser.logNameError(err)
  }
  logUnresolvedImport(moduleName: string): void {
    addToSet(this.moduleLibrary.toQueryFromJulia, moduleName)
  }
  logImport(moduleName: string): void {
    let importList = this._recurser.currResolveRoot.imports
    if (importList.indexOf(moduleName) < 0) {
      importList.push(moduleName)
    }
  }



  registerImportAllOrUsing(multiPartName: MultiPartName, isUsing: boolean): void {
    if (!(this.currScope instanceof ModuleScope)) throw new AssertError("")
    let scope = this.currScope as ModuleScope

    // register the name itself
    this.registerImport(multiPartName)

    // if it refers to a module, add to list of used modules, so names can resolve against it
    let result = scope.tryResolveMultiPartName(multiPartName)
    if (result instanceof NameError) {
      this.logNameError(result as NameError)
      return
    }
    let resolve = result as Resolve
    if (!(resolve instanceof ModuleResolve)) return
    let referencedScope = (resolve as ModuleResolve).moduleRootScope
    if (isUsing) {
      scope.addUsingModule(referencedScope)
    } else {
      scope.addImportAllModule(referencedScope)
    }
  }

  registerImport(multiPartName: IdentifierNode[]): void {
    if (!(this.currScope instanceof ModuleScope)) throw new AssertError("")
    if (multiPartName.length == 0) throw new AssertError("")

    let identNode = last(multiPartName)
    let name = identNode.name
    if (name in this.currScope.names) {
      this.logNameError(new NameError("Conflicting import: '" + name + "' already declared as " +
        getResolveInfoType(this.currScope.names[name]) + " in this scope.", identNode.token ))
      return
    }

    // If the first part is not already imported, must be imported.
    let firstPart = multiPartName[0]
    let firstName = firstPart.name
    this.logImport(firstName)
    let firstPartResolve = this.currScope.tryResolveNameThisLevel(firstName)
    if (firstPartResolve === null) {
      let rootScope = this.moduleLibrary.modules[firstName]
      if (!rootScope) {
        // log for later resolution any modules that fail to import
        this.logUnresolvedImport(firstName)
        return
      }

      // register the imported module
      // get corresponding node if in the workspace
      let resolveRoot = this.parseSet.resolveRoots.find((o) => { return o.scope === rootScope})
      if (resolveRoot) {
        let rootNode = resolveRoot.root
        if (!(rootNode instanceof ModuleDefNode)) throw new AssertError("")  // cannot be in the module library if it is a file level node
        let moduleDefNode = rootNode as ModuleDefNode
        this.currScope.names[firstName] = new LocalModuleResolve(moduleDefNode, resolveRoot.containingFile, rootScope)
      } else {
        this.currScope.names[firstName] = new ExternalModuleResolve(firstName, rootScope)
      }
    }

    // finally, try to search through modules for the full multi part name
    let resolveOrError = this.currScope.tryResolveMultiPartName(multiPartName)
    if (resolveOrError instanceof NameError) {
      this.logNameError(resolveOrError)
      return
    }
    let res = resolveOrError as Resolve

    if (multiPartName.length === 1) {
      if (!(res instanceof ModuleResolve)) {
        this.logNameError(new NameError("Cannot import a " + getResolveInfoType(res), firstPart.token))
        return
      }
      return // first part was imported above
    }

    if (res instanceof LocalModuleResolve) {
      this.currScope.names[name] = res.shallowCopy()
      return
    }
    if (res instanceof ExternalModuleResolve) {
      this.currScope.names[name] = res.shallowCopy()
      return
    }
    if (res instanceof ImportedResolve) {
      // importing an import. Copy the structure.
      this.currScope.names[name] = res.shallowCopy()
      return
    }
    if (res instanceof FunctionResolve || res instanceof TypeResolve || res instanceof VariableResolve || res instanceof MacroResolve) {
      // get the module that contains the function/type/variable/macro
      let concatNameToImportMinusEnd = multiPartName.slice(0, multiPartName.length - 1)
      if (concatNameToImportMinusEnd.length === 0) throw new AssertError("")
      let containingModule = this.currScope.tryResolveMultiPartName(concatNameToImportMinusEnd)
      if (!(containingModule instanceof ModuleResolve)) throw new AssertError("")

      // store the reference
      this.currScope.names[name] = new ImportedResolve(res, containingModule as ModuleResolve)
      return
    }
    throw new AssertError("") // should not get here
  }


  /**
   * Assignment can create a name in the current scope.
   * But if the name already exists up to the outermost function, then it doesn't create the name, but just references
   * the existing name.
   */
  createNameByAssignmentIfNecessary(identNode: IdentifierNode): void {
    let name = identNode.name

    if (identNode.isEndIndex()) {
      this.logNameError(new NameError("Cannot assign to end keyword.", identNode.token))
      return
    }

    let resolve = this.currScope.tryResolveNameThroughParentScopes(name, true)
    if (resolve === null) {
      this.registerVariable(identNode)
    } else {
      if (!(resolve instanceof VariableResolve)) {
        this.logNameError(new NameError("'" + name + "' already declared as " +
          getResolveInfoType(resolve) + " in this scope.", identNode.token))
        return
      } else {
        // name resolves ok
      }
    }
  }

  registerVariable(identifierNode: IdentifierNode): void {
    let name = identifierNode.name
    let resolve = this.currScope.tryResolveNameThisLevel(name)
    if (resolve !== null) {
      this.logNameError(new NameError("'" + name + "' already declared in this scope.", identifierNode.token))
      return
    }
    this.currScope.names[name] = new VariableResolve(identifierNode.token, this.currFile)
  }

  registerFunction(functionDefNode: FunctionDefNode): void {


    if (functionDefNode.name.length === 1) {
      let identifierNode = functionDefNode.name[0]
      let name = identifierNode.name

      // register the function definition
      let resolve = this.currScope.tryResolveNameThisLevel(name)
      if (resolve === null) {
        resolve = new FunctionResolve(identifierNode.name)
        this.currScope.names[name] = resolve
      } else if (resolve instanceof TypeResolve) {
        // a special constructor function for the type
        return
      } else if (!(resolve instanceof FunctionResolve)) {
        this.logNameError(new NameError("'" + name + "' already declared as " + getResolveInfoType(resolve) + " in this scope.", identifierNode.token))
        return
      }
      let functionResolve = resolve as FunctionResolve
      functionResolve.functionDefs.push([this.currFile, functionDefNode])

    } else if (functionDefNode.name.length >= 2) {
      // compound names, like 'Base.println'
      // have to search within another module
      let modulePath = functionDefNode.name.join(".")
      let lastPart = last(functionDefNode.name)
      let res = this.currScope.tryResolveMultiPartName(functionDefNode.name)
      if (res instanceof NameError) {
        this.logNameError(new NameError("'" + lastPart.name + "' not found in module '" + modulePath + "'", lastPart.token))
      } else {
        let resolve = res as Resolve
        if (!(resolve instanceof FunctionResolve)) {
          this.logNameError(new NameError("'" + lastPart.name + "' already declared as " + getResolveInfoType(resolve) +
            " in module '" + modulePath + "'", lastPart.token))
        } else {
          // add this function definition to the external module
          // TODO need to prevent this state from serializing and being readded?
          //let funcResolve = resolve as FunctionResolve
          //funcResolve.functionDefs.push([this.currFile, functionDefNode])
        }
      }
    }
  }

  registerType(typeDefNode: TypeDefNode): void {
    let identifierNode = typeDefNode.name
    let name = identifierNode.name
    let resolve = this.currScope.tryResolveNameThisLevel(name)
    if (resolve !== null) {
      this.logNameError(new NameError("'" + name + "' already declared as " + getResolveInfoType(resolve) + " in this scope.", identifierNode.token))
      return
    }
    this.currScope.names[name] = new TypeResolve(typeDefNode, this.currFile)
  }

  registerMacro(macroDefNode: MacroDefNode): void {
    let identifierNode = macroDefNode.name
    let nameTok = identifierNode.token
    let name = identifierNode.name
    if (name[0] === "@") throw new AssertError("")
    name = "@" + name
    let resolve = this.currScope.tryResolveNameThisLevel(name)
    if (resolve !== null) {
      this.logNameError(new NameError("'" + name + "' already declared as " + getResolveInfoType(resolve) + " in this scope.", nameTok))
      return
    }
    let macroResolve = new MacroResolve(name)
    macroResolve.node = macroDefNode
    macroResolve.filePath = this.currFile
    this.currScope.names[name] = macroResolve
  }

  /**
   * Registers a module that is declared in the file itself, not found via module library.
   */
  registerModule(moduleDefNode: ModuleDefNode, moduleRootScope: ModuleScope): void {
    let identifierNode = moduleDefNode.name
    if (!identifierNode) return // parse failure

    let name = identifierNode.name
    let resolve = this.currScope.tryResolveNameThisLevel(name)
    if (resolve !== null) {
      this.logNameError(new NameError("'" + name + "' already declared as " + getResolveInfoType(resolve) + " in this scope.", identifierNode.token))
      return
    }
    this.currScope.names[name] = new LocalModuleResolve(moduleDefNode,this.currFile, moduleRootScope)
  }



}






