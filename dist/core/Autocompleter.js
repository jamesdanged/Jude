"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/// <reference path="./../defs/atom/atom.d.ts" />
const Resolve_1 = require("../nameResolution/Resolve");
const Resolve_2 = require("../nameResolution/Resolve");
const arrayUtils_1 = require("../utils/arrayUtils");
const assert_1 = require("../utils/assert");
const assert_2 = require("../utils/assert");
const atomApi_1 = require("../utils/atomApi");
const ModuleScope_1 = require("../nameResolution/ModuleScope");
const Resolve_3 = require("../nameResolution/Resolve");
const Resolve_4 = require("../nameResolution/Resolve");
const Resolve_5 = require("../nameResolution/Resolve");
const Resolve_6 = require("../nameResolution/Resolve");
const Token_1 = require("../tokens/Token");
const nodepath = require("path");
// TODO need to warn/document that the file tree panel may interfere with autocomplete
// and need to switch between tabs at least once to have popup show properly.
class Autocompleter {
    constructor(sessionModel, jumper, controller) {
        this.sessionModel = sessionModel;
        this.jumper = jumper;
        this.controller = controller;
        this.selector = ".source.julia";
    }
    get excludeLowerPriority() {
        return atom.config.get("Jude.onlyShowAutocompleteSuggestionsFromJude");
    }
    get inclusionPriority() {
        return atom.config.get("Jude.autocompletePriority");
    }
    getSuggestions(options) {
        let path = options.editor.getPath();
        if (!path)
            return [];
        if (path.slice(-3).toLowerCase() !== ".jl") {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("auto complete should not be called here"));
            return [];
        }
        if (!(path in this.sessionModel.parseSet.fileLevelNodes)) {
            return [];
        }
        if (options.activatedManually) {
            //console.log("autocomplete manual request")
            if (options.prefix === "(") {
                return this.getSuggestionsFunctionSignatureCompletionRequest(options);
            }
            else {
                let jumper = this.jumper;
                return new Promise((resolveCb, rejectCb) => __awaiter(this, void 0, void 0, function* () {
                    resolveCb(yield jumper.jumpToDefinitionAsync(options.editor));
                }));
            }
        }
        else {
            //console.log("prefix: " + options.prefix)
            return this.getSuggestionsRegularRequest(options);
        }
    }
    onDidInsertSuggestion(options) {
        if (!options.suggestion.isJumpToDefinition)
            return;
        this.jumper.onAutoCompleteDidInsertSuggestionsAsync(options);
    }
    getSuggestionsFunctionSignatureCompletionRequest(options) {
        let point = atomApi_1.toPoint(options.bufferPosition);
        point = new Token_1.Point(point.row, point.column - 1); // before the paren
        let path = options.editor.getPath();
        let identifiers = arrayUtils_1.getFromHash(this.sessionModel.parseSet.identifiers, path);
        let identNode = identifiers.getIdentifierForPoint(point);
        if (identNode === null)
            return [];
        let resolve = identifiers.map.get(identNode);
        if (resolve instanceof Resolve_1.ImportedResolve) {
            let impResolve = resolve;
            resolve = impResolve.ref;
        }
        if (!(resolve instanceof Resolve_6.FunctionResolve))
            return [];
        let funcResolve = resolve;
        let suggestions = [];
        for (let tup of funcResolve.functionDefs) {
            let iPath = tup[0];
            let funcDefNode = tup[1];
            let sourceFile = "";
            if (iPath)
                sourceFile = nodepath.basename(iPath);
            let argListString = funcDefNode.args.toSnippetString();
            if (argListString === "")
                argListString = " "; // otherwise, a 0 arg signature will not be an option
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
            });
        }
        return suggestions;
    }
    getSuggestionsRegularRequest(options) {
        let that = this;
        return new Promise((resolveCb, rejectCb) => __awaiter(this, void 0, void 0, function* () {
            let point = atomApi_1.toPoint(options.bufferPosition);
            let editor = options.editor;
            let path = editor.getPath();
            let parseSet = this.sessionModel.parseSet;
            let prefix = options.prefix;
            if (!prefix) {
                resolveCb([]);
                return;
            }
            if (prefix.trim() === "") {
                resolveCb([]);
                return;
            }
            let identifiers = arrayUtils_1.getFromHash(parseSet.identifiers, path);
            let fileScopes = arrayUtils_1.getFromHash(parseSet.scopes, path);
            let fileLevelNode = arrayUtils_1.getFromHash(parseSet.fileLevelNodes, path);
            // if this is immediately after a module name + '.' then return choices from that module
            let isModuleDot = false;
            let moduleScope = null;
            // immediately after '.' without any other letters
            if (prefix === ".") {
                point = new Token_1.Point(point.row, point.column - 1); // before the dot
                let identNode = identifiers.getIdentifierForPoint(point);
                if (identNode === null) {
                    resolveCb([]);
                    return;
                }
                let resolve = identifiers.map.get(identNode);
                if (!(resolve instanceof Resolve_3.ModuleResolve)) {
                    resolveCb([]);
                    return;
                }
                isModuleDot = true;
                moduleScope = resolve.moduleRootScope;
                prefix = "";
            }
            else {
                // maybe after '.' with some letters typed
                let rowText = editor.lineTextForBufferRow(point.row);
                let dotCol = point.column - prefix.length - 1; // -1 because cursor at point i is after the i-1 character
                if (dotCol > 0 && rowText[dotCol] === ".") {
                    point = new Token_1.Point(point.row, dotCol - 1); // before the dot
                    if (prefix.length === 1) {
                        // Because the autocompleter is invoked immediately before any reparsing is triggered by the linter,
                        // there is an issue when autocompleting after eg MyMod.a
                        // "MyMod." is invalid, and so would not have completely parsed. Then the name "MyMod" would not resolve,
                        // so there will be no identifier at the point.
                        // This only happens for the first letter immediately after MyMod.
                        // ie no problem with MyMod.ab, which is a valid parse.
                        //
                        // To deal with this, we will require a quick reparse immediately after typing '.a'
                        // But in general, we dont' want to have to wait for a reparse before every autcomplete.
                        yield that.controller.reparseFileAsync(path, editor.getText());
                        identifiers = arrayUtils_1.getFromHash(parseSet.identifiers, path);
                        fileScopes = arrayUtils_1.getFromHash(parseSet.scopes, path);
                        fileLevelNode = arrayUtils_1.getFromHash(parseSet.fileLevelNodes, path);
                    }
                    let identNode = identifiers.getIdentifierForPoint(point);
                    if (identNode === null) {
                        resolveCb([]);
                        return;
                    }
                    let resolve = identifiers.map.get(identNode);
                    if (!(resolve instanceof Resolve_3.ModuleResolve)) {
                        resolveCb([]);
                        return;
                    }
                    isModuleDot = true;
                    moduleScope = resolve.moduleRootScope;
                }
            }
            if (isModuleDot) {
                resolveCb(this.getSuggestionsForScope(moduleScope, prefix));
                return;
            }
            // find narrowest scope that contains the point
            let matchingScope = fileScopes.getScope(point);
            // if no scope contains, then use the corresponding module root scope
            if (matchingScope === null) {
                // is the file level node a root or an included file
                let idx = parseSet.moduleResolveInfos.findIndex((o) => { return o.root === fileLevelNode; });
                if (idx >= 0) {
                    matchingScope = parseSet.moduleResolveInfos[idx].scope;
                }
                else {
                    let idxWithRelateds = parseSet.moduleResolveInfos.findIndex((o) => { return o.relateds.indexOf(fileLevelNode) >= 0; });
                    if (idxWithRelateds < 0) {
                        // this can happen while initial parse is still running
                        //throw new AssertError("")
                        resolveCb([]);
                        return;
                    }
                    matchingScope = parseSet.moduleResolveInfos[idxWithRelateds].scope;
                }
            }
            resolveCb(this.getSuggestionsForScope(matchingScope, prefix));
            return;
        }));
    }
    getSuggestionsForScope(scope, prefix) {
        // get all names in the scope that start with the prefix
        // and repeat through each parent scope
        let suggestions = [];
        let currScope = scope;
        prefix = prefix.toLowerCase();
        while (true) {
            // get the module name if the scope is module level
            let moduleName = null;
            if (currScope instanceof ModuleScope_1.ModuleScope) {
                moduleName = currScope.moduleShortName; // may be nulls
            }
            // all names that match prefix
            currScope.getMatchingNames(prefix).forEach((name) => {
                let resolve = currScope.names[name];
                suggestions.push(createSuggestion(name, moduleName, resolve));
            });
            if (currScope.parent === null)
                break;
            currScope = currScope.parent;
        }
        // any names from using/importall modules
        if (currScope instanceof ModuleScope_1.ModuleScope) {
            let refModules = currScope.usingModules.concat(currScope.importAllModules);
            for (let moduleScope of refModules) {
                moduleScope.prefixTree.getMatchingNames(prefix).forEach((name) => {
                    suggestions.push(createSuggestion(name, moduleScope.moduleShortName, null));
                });
            }
        }
        return suggestions;
    }
}
exports.Autocompleter = Autocompleter;
/**
 *
 * @param name
 * @param moduleName Can be null.
 * @param resolve Can be null.
 * @returns {{text: string, type: string, isJumpToDefinition: boolean}}
 */
function createSuggestion(name, moduleName, resolve) {
    let suggestionType = "";
    if (resolve instanceof Resolve_6.FunctionResolve)
        suggestionType = "function";
    if (resolve instanceof Resolve_2.MacroResolve)
        suggestionType = "function";
    if (resolve instanceof Resolve_5.VariableResolve)
        suggestionType = "variable";
    if (resolve instanceof Resolve_4.TypeResolve)
        suggestionType = "class";
    if (resolve instanceof Resolve_3.ModuleResolve)
        suggestionType = "import";
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
    };
}
class AutoCompleteRequestOptions {
}
exports.AutoCompleteRequestOptions = AutoCompleteRequestOptions;
class AutoCompleteOnDidInsertSuggestionOptions {
}
exports.AutoCompleteOnDidInsertSuggestionOptions = AutoCompleteOnDidInsertSuggestionOptions;
//# sourceMappingURL=Autocompleter.js.map