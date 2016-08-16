"use strict"


import {MacroDefNode} from "../parseTree/nodes";
import {ModuleScope} from "./ModuleScope";
import {Token} from "../tokens/Token";
import {FunctionDefNode} from "../parseTree/nodes";
import {Scope} from "./Scope";
import {TypeDefNode} from "../parseTree/nodes";
import {ModuleDefNode} from "../parseTree/nodes";
import {AssertError} from "../utils/assert";



export abstract class Resolve {
  name: string
  constructor(name: string) {
    this.name = name
  }
  abstract resolvesInWorkspace(): boolean
}

export class VariableResolve extends Resolve {
  filePath: string // null if source not in workspace
  token: Token
  constructor(token: Token, filePath: string) {
    super(token.str)
    this.token = token
    this.filePath = filePath
  }
  resolvesInWorkspace(): boolean {
    return this.filePath !== null
  }
}

export class FunctionResolve extends Resolve {
  functionDefs: [string, FunctionDefNode][] // [filePath, node]   path may be null

  constructor(name: string) {
    super(name)
    this.functionDefs = []
  }

  resolvesInWorkspace(): boolean {
    let anyParsed = false
    for (let def of this.functionDefs) {
      let filePath = def[0]
      let funcDefNode = def[1]
      if (filePath !== null) {
        anyParsed = true
        break
      }
    }
    return anyParsed
  }

}

export class TypeResolve extends Resolve {
  filePath: string  // null if source not in workspace
  typeDefNode: TypeDefNode
  constructor(node: TypeDefNode, filePath: string) {
    super(node.name.str)
    this.filePath = filePath
    this.typeDefNode = node
  }
  resolvesInWorkspace(): boolean {
    return this.filePath !== null
  }

}

export class MacroResolve extends Resolve {
  filePath: string    // null if source not in workspace
  node: MacroDefNode  // null if source not in workspace
  constructor(name: string) { // name includes @
    super(name)
    if (name[0] !== "@") throw new AssertError("")
    this.filePath = null
    this.node = null
  }
  resolvesInWorkspace(): boolean {
    return this.filePath !== null
  }
}

export abstract class ModuleResolve extends Resolve {
  constructor(moduleShortName: string, public moduleRootScope: ModuleScope) {
    super(moduleShortName) // short name is just the module name, no prefixes. Such as 'InnerMod' in Mod1.Mod2.InnerMod
  }
}


/**
 * Resolves to a module external to the workspace.
 * Only contains scope resolutions, not any expression tree.
 */
export class ExternalModuleResolve extends ModuleResolve {
  constructor(public fullModulePath: string, moduleRootScope: ModuleScope) {
    super(fullModulePath.split(".")[0], moduleRootScope)
  }

  resolvesInWorkspace(): boolean {
    return false
  }
  shallowCopy(): ExternalModuleResolve {
    return new ExternalModuleResolve(this.fullModulePath, this.moduleRootScope)
  }
}



/**
 * Resolves to a module which has been read from files and parsed here.
 * Contains the parsed expression tree contents of the module.
 */
export class LocalModuleResolve extends ModuleResolve {
  constructor(public moduleDefNode: ModuleDefNode, public filePath: string, moduleRootScope: ModuleScope) {
    super(moduleDefNode.name.str, moduleRootScope)
  }
  resolvesInWorkspace(): boolean {
    return true
  }
  shallowCopy(): LocalModuleResolve {
    return new LocalModuleResolve(this.moduleDefNode, this.filePath, this.moduleRootScope )
  }
}


/**
 * For imported variables, functions, types, macros.
 * Imported modules should be unwrapped.
 */
export class ImportedResolve extends Resolve {
  constructor(public ref: Resolve) {
    super(ref.name)
    if (!(ref instanceof FunctionResolve || ref instanceof VariableResolve || ref instanceof TypeResolve || ref instanceof MacroResolve)) {
      throw new AssertError("")
    }
  }
  resolvesInWorkspace(): boolean {
    if (this.ref === null) return false
    return this.ref.resolvesInWorkspace()
  }
  shallowCopy(): ImportedResolve {
    return new ImportedResolve(this.ref)
  }

}

export function getResolveInfoType(resolve: Resolve): string {
  if (resolve instanceof FunctionResolve) return "function"
  if (resolve instanceof VariableResolve) return "variable"
  if (resolve instanceof ModuleResolve) return "module"
  if (resolve instanceof TypeResolve) return "type"
  if (resolve instanceof MacroResolve) return "macro"
  if (resolve instanceof ImportedResolve) return getResolveInfoType(resolve.ref)
  throw new AssertError("")
}




export enum NameDeclType {
  Local,
  Global,
  Const,
  ArgList,
  ImpliedByAssignment // names have local scope when assigned to, unless explicitly declared global.
}
