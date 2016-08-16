"use strict"

import {ModuleScope} from "./ModuleScope";
import {AssertError} from "../utils/assert";

export function createPrefixTree(namesObject: any): PrefixTreeNode {  // names object is just a {} with each name as a field
  let root = new PrefixTreeNode("")
  reinitializePrefixTree(namesObject, root)
  return root
}

export function reinitializePrefixTree(namesObject, root: PrefixTreeNode): void {
  root.reset()
  for (let name in namesObject) {
    if (name.length === 0) throw new AssertError("")
    root.names.push(name)
  }
  // build out one level
  root.createChildrenGeneration()
  // build out another level
  for (let c in root.children) {
    root.children[c].createChildrenGeneration()
  }
}


/**
 * Stores all the names in the module in an easily searched tree format.
 * Helps with autocomplete.
 *
 * Stores names with case, but search is case insensitive.
 */
export class PrefixTreeNode {
  prefix: string
  children: {[c: string]: PrefixTreeNode}
  names: string[]
  isTip: boolean

  constructor(prefix: string) {
    this.prefix = prefix
    this.children = {}
    this.names = []
    this.isTip = true
  }

  reset(): void {
    this.prefix = ""
    this.children = {}
    this.names = []
    this.isTip = true
  }

  /**
   * Moves names down into a new generation of children.
   * Requires names to already be populated.
   */
  createChildrenGeneration(): void {
    let prefixLength = this.prefix.length
    for (let i = this.names.length - 1; i >= 0; i--) {
      let name = this.names[i]
      let c = name.slice(prefixLength, prefixLength + 1)
      if (c.length === 0) continue // don't move this name downwards. It is too short.
      c = c.toLowerCase()

      if (!(c in this.children)) this.children[c] = new PrefixTreeNode(this.prefix + c)
      this.children[c].names.push(name)
      this.names.splice(i, 1)
    }
    this.isTip = false
  }

  getMatchingNames(prefix: string): string[] {
    let thisPrefixLength = this.prefix.length
    let c = prefix.slice(thisPrefixLength, thisPrefixLength + 1)

    if (c.length === 0) {
      // prefix too short
      return this.getAllNames()
    } else if (this.isTip) {
      // prefix longer than we have children
      let res = this.getAllNames()
      let filteredRes = []
      prefix = prefix.toLowerCase()
      for (let name of res) {
        if (name.toLowerCase().startsWith(prefix)) {
          filteredRes.push(name)
        }
      }
      return filteredRes
    } else {
      c = c.toLowerCase()
      let matchingChild = this.children[c]
      if (matchingChild) {
        return matchingChild.getMatchingNames(prefix)
      }
      return []
    }
  }

  getAllNames(): string[] {
    let res = this.names.slice()
    for (let c in this.children) {
      res = res.concat(this.children[c].getAllNames())
    }
    return res
  }

}