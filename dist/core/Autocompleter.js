"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var Resolve_1 = require("../nameResolution/Resolve");
var arrayUtils_1 = require("../utils/arrayUtils");
var assert_1 = require("../utils/assert");
var assert_2 = require("../utils/assert");
var atomApi_1 = require("../utils/atomApi");
var Scope_1 = require("../nameResolution/Scope");
var Resolve_2 = require("../nameResolution/Resolve");
var Resolve_3 = require("../nameResolution/Resolve");
var Resolve_4 = require("../nameResolution/Resolve");
var Resolve_5 = require("../nameResolution/Resolve");
var Token_1 = require("../tokens/Token");
var nodepath = require("path");
// TODO need to warn/document that the file tree panel may interfere with autocomplete
// and need to switch between tabs at least once to have popup show properly.
class Autocompleter {
    // internal
    constructor(sessionModel, jumper) {
        this.sessionModel = sessionModel;
        this.jumper = jumper;
        this.selector = ".source.julia";
        this.inclusionPriority = 2;
        this.excludeLowerPriority = true;
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
                return new Promise((resolveCb, rejectCb) => __awaiter(this, void 0, Promise, function* () {
                    resolveCb(yield jumper.jumpToDefinitionAsync(options.editor));
                }));
            }
        }
        else {
            console.log("prefix: " + options.prefix);
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
        if (!(resolve instanceof Resolve_5.FunctionResolve))
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
            console.log("snippet: " + argListString);
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
        let point = atomApi_1.toPoint(options.bufferPosition);
        let editor = options.editor;
        let path = editor.getPath();
        let parseSet = this.sessionModel.parseSet;
        let prefix = options.prefix;
        if (!prefix)
            return [];
        if (prefix.trim() === "")
            return [];
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
            if (identNode === null)
                return [];
            let resolve = identifiers.map.get(identNode);
            if (!(resolve instanceof Resolve_2.ModuleResolve))
                return [];
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
                let identNode = identifiers.getIdentifierForPoint(point);
                if (identNode === null)
                    return [];
                let resolve = identifiers.map.get(identNode);
                if (!(resolve instanceof Resolve_2.ModuleResolve))
                    return [];
                isModuleDot = true;
                moduleScope = resolve.moduleRootScope;
            }
        }
        if (isModuleDot) {
            return this.getSuggestionsForScope(moduleScope, prefix);
        }
        // find narrowest scope that contains the point
        let matchingScope = fileScopes.getScope(point);
        // if no scope contains, then use the corresponding module root scope
        if (matchingScope === null) {
            // is the file level node a root or an included file
            let idx = parseSet.resolveRoots.findIndex((o) => { return o.root === fileLevelNode; });
            if (idx >= 0) {
                matchingScope = parseSet.resolveRoots[idx].scope;
            }
            else {
                let idxWithRelateds = parseSet.resolveRoots.findIndex((o) => { return o.relateds.indexOf(fileLevelNode) >= 0; });
                if (idxWithRelateds < 0) {
                    // this can happen while initial parse is still running
                    //throw new AssertError("")
                    return [];
                }
                matchingScope = parseSet.resolveRoots[idxWithRelateds].scope;
            }
        }
        return this.getSuggestionsForScope(matchingScope, prefix);
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
            if (currScope instanceof Scope_1.ModuleScope) {
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
        if (currScope instanceof Scope_1.ModuleScope) {
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
    if (resolve instanceof Resolve_5.FunctionResolve)
        suggestionType = "function";
    if (resolve instanceof Resolve_1.MacroResolve)
        suggestionType = "function";
    if (resolve instanceof Resolve_4.VariableResolve)
        suggestionType = "variable";
    if (resolve instanceof Resolve_3.TypeResolve)
        suggestionType = "class";
    if (resolve instanceof Resolve_2.ModuleResolve)
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