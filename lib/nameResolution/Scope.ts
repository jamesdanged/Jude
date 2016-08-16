"use strict"

import {ModuleResolve} from "./Resolve";
import {AssertError} from "../utils/assert";
import {Token} from "../tokens/Token";
import {MultiPartName} from "../parseTree/nodes";
import {NameError} from "../utils/errors";
import {getResolveInfoType} from "./Resolve";
import {Resolve} from "./Resolve";
import {ModuleScope} from "./ModuleScope"


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
  tryResolveMultiPartName(multiPartName: MultiPartName): (Resolve | NameError) {

    if (multiPartName.length === 0) throw new AssertError("Zero length name")

    let currScope: Scope = this

    for (let idx = 0; idx < multiPartName.length; idx++) {
      let identNode = multiPartName[idx]
      let namePart = identNode.str
      let isLastPart = idx === multiPartName.length - 1

      if (namePart === ".") {
        if (idx === 0) {
          continue
        } else {
          // go up through parent scopes until encounter module level scope
          while (!(currScope instanceof ModuleScope)) {
            currScope = currScope.parent
            if (currScope === null) throw new AssertError("No parent module level scope??")
          }
          currScope = (currScope as ModuleScope).parentModuleScope
          if (currScope === null) return new NameError("No further parent modules", identNode.token)
          continue
        }
      }

      let resolve = currScope.tryResolveNameThroughParentScopes(namePart, false)
      if (resolve === null) {
        return new NameError("Could not find name: '" + namePart + "'.", identNode.token)
      } else if (isLastPart) {
        return resolve
      } else if (resolve instanceof ModuleResolve) {
        currScope = resolve.moduleRootScope
      } else {
        return new NameError("Expected '" + resolve.name + "' to be a module, but was already declared as " +
          getResolveInfoType(resolve) + " in this scope.", identNode.token)
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









export enum ScopeType {
  Module, // module scopes are the root. In a naked file which is not itself a module, the scope is considered for the global module.
  Function,
  InnerFunction, // functions inside functions can close over the outer functions variables. They need to take into account when assigning variables.
  TypeDef,
  Block
  //MultiFile
}






