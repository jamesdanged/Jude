"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {ImportedResolve} from "../nameResolution/Resolve";
import {MacroResolve} from "../nameResolution/Resolve";
import {Node} from "../parseTree/nodes";
import {FileIdentifiers} from "./SessionModel";
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
import {Scope} from "../nameResolution/Scope";


// TODO need to warn/document that the file tree panel may interfere with autocomplete
// and need to switch between tabs at least once to have popup show properly.
export class Autocompleter {

  // fields for Autocomplete+
  selector: string

  constructor(public sessionModel: SessionModel, public jumper: JumpController) {
    this.selector = ".source.julia"
  }

  get excludeLowerPriority(): boolean {
    return atom.config.get("Jude.onlyShowAutocompleteSuggestionsFromJude")
  }

  get inclusionPriority(): number {
    return atom.config.get("Jude.autocompletePriority")
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
      //console.log("prefix: " + options.prefix)
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

    let identNode: IdentifierNode = identifiers.getIdentifierForPoint(point)
    if (identNode === null) return []
    let resolve: Resolve = identifiers.map.get(identNode)
    if (resolve instanceof ImportedResolve) {
      let impResolve = resolve as ImportedResolve
      resolve = impResolve.ref
    }
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
      //console.log("snippet: " + argListString)

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
    let identifiers = getFromHash(parseSet.identifiers, path)
    let fileScopes = getFromHash(parseSet.scopes, path)
    let fileLevelNode = getFromHash(parseSet.fileLevelNodes, path)

    // if this is immediately after a module name + '.' then return choices from that module
    let isModuleDot = false
    let moduleScope: ModuleScope = null
    // immediately after '.' without any other letters
    if (prefix === ".") {
      point = new Point(point.row, point.column - 1) // before the dot

      let identNode: IdentifierNode = identifiers.getIdentifierForPoint(point)
      if (identNode === null) return []
      let resolve: Resolve = identifiers.map.get(identNode)
      if (!(resolve instanceof ModuleResolve)) return []

      isModuleDot = true
      moduleScope = (resolve as ModuleResolve).moduleRootScope
      prefix = ""
    } else {
      // maybe after '.' with some letters typed
      let rowText = editor.lineTextForBufferRow(point.row)
      let dotCol = point.column - prefix.length - 1 // -1 because cursor at point i is after the i-1 character
      if (dotCol > 0 && rowText[dotCol] === ".") {
        point = new Point(point.row, dotCol - 1) // before the dot

        let identNode: IdentifierNode = identifiers.getIdentifierForPoint(point)
        if (identNode === null) return []
        let resolve: Resolve = identifiers.map.get(identNode)
        if (!(resolve instanceof ModuleResolve)) return []

        isModuleDot = true
        moduleScope = (resolve as ModuleResolve).moduleRootScope
      }
    }
    if (isModuleDot) {
      return this.getSuggestionsForScope(moduleScope, prefix)
    }



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

    return this.getSuggestionsForScope(matchingScope, prefix)
  }




  getSuggestionsForScope(scope: Scope, prefix: string): any[] {
    // get all names in the scope that start with the prefix
    // and repeat through each parent scope
    let suggestions = []
    let currScope = scope
    prefix = prefix.toLowerCase()
    while (true) {

      // get the module name if the scope is module level
      let moduleName = null
      if (currScope instanceof ModuleScope) {
        moduleName = currScope.moduleShortName // may be nulls
      }

      // all names that match prefix
      currScope.getMatchingNames(prefix).forEach((name) => {
        let resolve = currScope.names[name]
        suggestions.push(createSuggestion(name, moduleName, resolve))
      })

      if (currScope.parent === null) break
      currScope = currScope.parent
    }

    // any names from using/importall modules
    if (currScope instanceof ModuleScope) {
      let refModules = currScope.usingModules.concat(currScope.importAllModules)
      for (let moduleScope of refModules) {
        moduleScope.prefixTree.getMatchingNames(prefix).forEach((name) => {
          suggestions.push(createSuggestion(name, moduleScope.moduleShortName, null))
        })
        // TODO add the modules used by this module
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
  if (resolve instanceof MacroResolve) suggestionType = "function"
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