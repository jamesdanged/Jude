"use strict"

import {getFromHash} from "../utils/arrayUtils";
import {JumpController} from "./JumpController";
import {SessionModel} from "./SessionModel";
import {throwErrorFromTimeout} from "../utils/assert";
import {AssertError} from "../utils/assert";
import {toPoint} from "../utils/atomApi";
import {ModuleScope} from "../nameResolution/Scope";
import {ModuleDefNode} from "../parseTree/nodes";
import {ModuleResolve} from "../nameResolution/Resolve";
import {TypeResolve} from "../nameResolution/Resolve";
import {VariableResolve} from "../nameResolution/Resolve";
import {FunctionResolve} from "../nameResolution/Resolve";
import {Resolve} from "../nameResolution/Resolve";
import {Point} from "../tokens/Token";
import {FunctionDefNode} from "../parseTree/nodes";
import * as nodepath from "path"
import {IdentifierNode} from "../parseTree/nodes";


// TODO need to warn/document that the file tree panel may interfere with autocomplete
// and need to switch between tabs at least once to have popup show properly.
export class Autocompleter {
  selector: string
  inclusionPriority: number
  excludeLowerPriority: boolean

  constructor(public sessionModel: SessionModel, public jumper: JumpController) {
    this.selector = ".source.julia"
    this.inclusionPriority = 2
    this.excludeLowerPriority = true
  }

  getSuggestions(options: AutoCompleteRequestOptions): (Promise<any[]> | any[]) {
    let path = options.editor.getPath()
    if (!path) return []
    if (path.slice(-3).toLowerCase() !== ".jl") {
      throwErrorFromTimeout(new AssertError("auto complete should not be called here"))
      return []
    }

    if (!(path in this.sessionModel.parseSet.fileLevelNodes)) {
      return []
    }

    if (options.activatedManually) {
      //console.log("autocomplete manual request")
      if (options.prefix === "(") {
        return this.getSuggestionsFunctionSignatureCompletionRequest(options)
      } else {
        let jumper = this.jumper
        return new Promise<any[]>(async (resolveCb, rejectCb) => {
          resolveCb(await jumper.jumpToDefinitionAsync(options.editor))
        })
      }
    } else {
      if (options.prefix === ".") return [] // TODO handle module names on left
      return this.getSuggestionsRegularRequest(options)
    }
  }

  onDidInsertSuggestion(options: AutoCompleteOnDidInsertSuggestionOptions) {
    if (!options.suggestion.isJumpToDefinition) return
    this.jumper.onAutoCompleteDidInsertSuggestionsAsync(options)
  }


  getSuggestionsFunctionSignatureCompletionRequest(options: AutoCompleteRequestOptions): any[] {
    let point = toPoint(options.bufferPosition)
    point = new Point(point.row, point.column - 1) // before the paren

    let path = options.editor.getPath()
    let identifiers = getFromHash(this.sessionModel.parseSet.identifiers, path)

    let identNode: IdentifierNode = null
    let resolve: Resolve = null
    for (let kv of identifiers.map) {
      let iIdentNode: IdentifierNode = kv[0]
      let iResolve: Resolve = kv[1]
      if (iIdentNode.token.range.pointWithin(point)) {
        identNode = iIdentNode
        resolve = iResolve
        break
      }
    }
    if (identNode === null) return []
    if (!(resolve instanceof FunctionResolve)) return []
    let funcResolve = resolve as FunctionResolve

    let suggestions = []
    for (let tup of funcResolve.functionDefs) {
      let iPath = tup[0]
      let funcDefNode: FunctionDefNode = tup[1]
      let sourceFile = ""
      if (iPath) sourceFile = nodepath.basename(iPath)
      let argListString = funcDefNode.args.toSnippetString()
      if (argListString === "") argListString = " "  // otherwise, a 0 arg signature will not be an option
      console.log("snippet: " + argListString)

      suggestions.push({
        snippet: argListString,
        //displayText: sig,
        type: "snippet",
        //leftLabel: "Any",
        //rightLabel: sourceFile,
        //description: "",
        //node: funcDefNode,
        //destPath: path,
        isJumpToDefinition: false
      })
    }

    return suggestions
  }

  getSuggestionsRegularRequest(options: AutoCompleteRequestOptions): any[] {

    let point = toPoint(options.bufferPosition)
    let editor = options.editor
    let path = editor.getPath()
    let parseSet = this.sessionModel.parseSet
    let prefix = options.prefix
    if (!prefix) return []
    if (prefix.trim() === "") return []

    let fileScopes = getFromHash(parseSet.scopes, path)
    let fileLevelNode = getFromHash(parseSet.fileLevelNodes, path)

    // find narrowest scope that contains the point
    let matchingScope = fileScopes.getScope(point)
    // if no scope contains, then use the corresponding module root scope
    if (matchingScope === null) {

      // is the file level node a root or an included file
      let idx = parseSet.resolveRoots.findIndex((o) => { return o.root === fileLevelNode })
      if (idx >= 0) {
        matchingScope = parseSet.resolveRoots[idx].scope
      } else {
        let idxWithRelateds = parseSet.resolveRoots.findIndex((o) => { return o.relateds.indexOf(fileLevelNode) >= 0 })
        if (idxWithRelateds < 0) {
          // this can happen while initial parse is still running
          //throw new AssertError("")
          return []
        }
        matchingScope = parseSet.resolveRoots[idxWithRelateds].scope
      }
    }



    // all the top level names in the scope
    let suggestions = []
    let currScope = matchingScope
    prefix = prefix.toLowerCase()
    while (true) {
      let moduleName = null
      if (currScope instanceof ModuleScope) {
        let resolveRoot = this.sessionModel.parseSet.resolveRoots.find((o) => {return o.scope === currScope})
        if (resolveRoot) {
          if (resolveRoot.root instanceof ModuleDefNode) {
            let node = resolveRoot.root as ModuleDefNode
            moduleName = node.name.name
          }
        }
      }

      for (let name in currScope.names) {
        if (name.toLowerCase().startsWith(prefix)) {
          let resolve = currScope.names[name]
          suggestions.push(createSuggestion(name, moduleName, resolve))
        }
      }
      if (currScope.parent === null) break
      currScope = currScope.parent
    }
    // any names from using/importall modules
    if (currScope instanceof ModuleScope) {
      let refModules = []
      for (let tup of currScope.usingModules) {
        refModules.push(tup)
      }
      for (let tup of currScope.importAllModules) {
        refModules.push(tup)
      }
      for (let tup of refModules) {
        let moduleName: string = tup[0]
        let moduleScope: ModuleScope = tup[1]
        if (moduleName in this.sessionModel.moduleLibrary.modules) {
          let prefixTree = this.sessionModel.moduleLibrary.prefixTrees[moduleName]
          if (!prefixTree) throw new AssertError("")
          let names = prefixTree.getMatchingNames(prefix)
          for (let name of names) {
            suggestions.push(createSuggestion(name, moduleName, null))
          }
        } else {
          // may be a locally defined module not accessible via load paths
          for (let name in moduleScope.names) {
            let resolve = moduleScope.names[name]
            suggestions.push(createSuggestion(name, moduleName, resolve))
          }

          // TODO add the modules used by this module
        }
      }
    }


    return suggestions
  }


}

/**
 *
 * @param name
 * @param moduleName Can be null.
 * @param resolve Can be null.
 * @returns {{text: string, type: string, isJumpToDefinition: boolean}}
 */
function createSuggestion(name: string, moduleName: string, resolve: Resolve) {
  let suggestionType = ""
  if (resolve instanceof FunctionResolve) suggestionType = "function"
  if (resolve instanceof VariableResolve) suggestionType = "variable"
  if (resolve instanceof TypeResolve) suggestionType = "class"
  if (resolve instanceof ModuleResolve) suggestionType = "import"
  return {
    text: name,
    //displayText: sig,
    type: suggestionType,
    //leftLabel: "Any",
    rightLabel: moduleName,
    //description: sig,
    //node: funcNode,
    //destPath: path,
    isJumpToDefinition: false
  }
}




export class AutoCompleteRequestOptions {
  editor           // editor
  bufferPosition   // Point
  scopeDescriptor  // ScopeDescriptor
  prefix:           string
  activatedManually // bool?
}

export class AutoCompleteOnDidInsertSuggestionOptions {
  editor
  triggerPosition
  suggestion
}