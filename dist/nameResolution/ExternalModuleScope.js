"use strict";
const Resolve_1 = require("./Resolve");
const Resolve_2 = require("./Resolve");
const Resolve_3 = require("./Resolve");
const Tokenizer_1 = require("../tokens/Tokenizer");
const operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
const BracketGrouper_1 = require("../parseTree/BracketGrouper");
const ModuleContentsFsa_1 = require("../fsas/general/ModuleContentsFsa");
const TypeDefFsa_1 = require("../fsas/declarations/TypeDefFsa");
const Resolve_4 = require("./Resolve");
const Resolve_5 = require("./Resolve");
const FunctionDefFsa_1 = require("../fsas/declarations/FunctionDefFsa");
const ModuleScope_1 = require("./ModuleScope");
const assert_1 = require("../utils/assert");
const Token_1 = require("../tokens/Token");
const nodes_1 = require("../parseTree/nodes");
const Token_2 = require("../tokens/Token");
const arrayUtils_1 = require("../utils/arrayUtils");
const StringSet_1 = require("../utils/StringSet");
const nodes_2 = require("../parseTree/nodes");
const PrefixTree_1 = require("./PrefixTree");
const assert_2 = require("../utils/assert");
const Token_3 = require("../tokens/Token");
const Resolve_6 = require("./Resolve");
/**
 * For modules external to the project.
 */
class ExternalModuleScope extends ModuleScope_1.ModuleScope {
    /**
     * The module scope is not fully populated initially. Names are lazily loaded from the serializedLines.
     * The names are all immediately loaded into prefix trees.
     *
     * @param moduleFullName  Can have '.'
     * @param serializedLines
     * @param moduleLibrary
     */
    constructor(moduleFullName, serializedLines, moduleLibrary) {
        super();
        this.moduleFullName = moduleFullName;
        this.serializedLines = serializedLines;
        this.initializedLibraryReference = false;
        this.moduleShortName = arrayUtils_1.last(moduleFullName.split("."));
        this.prefixTree = PrefixTree_1.createPrefixTree(serializedLines);
        this.moduleLibrary = moduleLibrary;
    }
    reset() { throw new assert_2.AssertError(""); }
    getSerializedLines() { return this.serializedLines; } // just for serialization
    addUsingModule(scope) { throw new assert_2.AssertError(""); }
    addImportAllModule(scope) { throw new assert_2.AssertError(""); }
    tryResolveExportedName(name) {
        if (!this.initializedLibraryReference)
            this.initializeLibraryReference();
        if (!(name in this.exportedNames)) {
            return null;
        }
        return this.tryResolveNameThisLevel(name);
    }
    /**
     * Resolves only at this scope, not a parent scope.
     * Also resolves to used modules.
     * For modules outside workspace, their scopes are lazy populated. This populates only the requested name.
     *
     * @param name
     * @returns Matching resolve. Null if not found.
     */
    tryResolveNameThisLevel(name) {
        if (!this.initializedLibraryReference)
            this.initializeLibraryReference();
        if (name in this.names)
            return this.names[name];
        this.tryAddNameFromSerializedState(name);
        if (name in this.names)
            return this.names[name];
        let result = this.searchUsedImportAlldModules(name);
        if (result === null)
            return null;
        return result;
    }
    /**
     * simply loads exported names into the export list of the scope
     *
     */
    initializeLibraryReference() {
        for (let name in this.serializedLines) {
            let arr = this.serializedLines[name];
            for (let line of arr) {
                if (line[2] === "exported") {
                    StringSet_1.addToSet(this.exportedNames, name);
                    break;
                }
                else if (line[2] === "hidden") {
                }
                else {
                    throw new assert_2.AssertError("");
                }
            }
        }
        this.initializedLibraryReference = true;
    }
    tryAddNameFromSerializedState(name) {
        let arr = this.serializedLines[name];
        if (!arr)
            return; // name not in module
        for (let line of arr) {
            if (line[0] === "function") {
                this.addFunctionFromSerialized(line);
            }
            else if (line[0] === "type") {
                this.addTypeFromSerialized(line);
            }
            else if (line[0] === "variable") {
                this.addVariableFromSerialized(line);
            }
            else if (line[0] === "macro") {
                this.addMacroFromSerialized(line);
            }
            else if (line[0] === "module") {
                this.addModuleFromSerialized(line);
            }
        }
    }
    addModuleFromSerialized(parts) {
        if (parts.length !== 4)
            throw new assert_2.AssertError("");
        let name = parts[1];
        let fullModulePath = parts[3];
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        if (fullModulePath in this.moduleLibrary.modules) {
            let innerModuleScope = this.moduleLibrary.modules[fullModulePath];
            this.names[name] = new Resolve_1.ExternalModuleResolve(fullModulePath, innerModuleScope);
        }
        else {
            // module hasn't been retrieved from Julia yet
            StringSet_1.addToSet(this.moduleLibrary.toQueryFromJulia, fullModulePath);
        }
    }
    addVariableFromSerialized(parts) {
        if (parts.length !== 3)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_2.VariableResolve(Token_3.Token.createEmptyIdentifier(name), null);
    }
    addMacroFromSerialized(parts) {
        if (parts.length !== 3)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_3.MacroResolve(name);
    }
    addTypeFromSerialized(parts) {
        if (parts.length !== 4)
            throw new assert_2.AssertError("");
        let name = parts[1];
        // parse the type def block
        let code = parts[3];
        let tokens = Tokenizer_1.Tokenizer.tokenizeThrowIfError(code);
        if (tokens[2].type !== operatorsAndKeywords_1.TokenType.Identifier) {
            console.log("Skipping type due to name: " + code);
            return;
        }
        let tree = BracketGrouper_1.BracketGrouper.groupIntoOneThrowIfError(tokens);
        let wholeState = new ModuleContentsFsa_1.WholeFileParseState();
        let node = TypeDefFsa_1.parseWholeTypeDef(tree, wholeState);
        if (wholeState.parseErrors.length > 0) {
        }
        // store it
        if (name in this.names) {
            assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared multiple times in loaded Julia module??"));
        }
        this.names[name] = new Resolve_4.TypeResolve(node, null);
    }
    addFunctionFromSerialized(parts) {
        if (parts.length !== 6)
            throw new assert_2.AssertError("");
        let name = parts[1];
        let signature = parts[3];
        let path = parts[4];
        if (path === "")
            path = null;
        let lineNumber = 0;
        if (parts[5] !== "")
            lineNumber = parseInt(parts[5]);
        let resolve = this.names[name];
        if (resolve) {
            if (!(resolve instanceof Resolve_5.FunctionResolve)) {
                assert_1.throwErrorFromTimeout(new assert_2.AssertError("'" + name + "' declared both as function and as " +
                    Resolve_6.getResolveInfoType(resolve) + " in module loaded from Julia??"));
                return;
            }
        }
        else {
            resolve = new Resolve_5.FunctionResolve(name);
            this.names[name] = resolve;
        }
        let functionResolve = resolve;
        if (signature.length === 0) {
            // no info on function signature. But we still want to recognize the name exists.
            // Just put in an empty function.
            let node = new nodes_1.FunctionDefNode();
            node.name = [new nodes_2.IdentifierNode(Token_3.Token.createEmptyIdentifier(name))];
            functionResolve.functionDefs.push([path, node]);
        }
        else {
            // create parsable code, and simply parse as a function definition node
            let code = "function " + signature + "\nend";
            let tokens = Tokenizer_1.Tokenizer.tokenizeThrowIfError(code);
            let tree = BracketGrouper_1.BracketGrouper.groupIntoOneThrowIfError(tokens);
            let wholeState = new ModuleContentsFsa_1.WholeFileParseState();
            let node = FunctionDefFsa_1.parseWholeFunctionDef(tree, wholeState);
            if (wholeState.parseErrors.length > 0) {
            }
            // update where the name token points to
            if (node.name.length > 0) {
                let range = null;
                if (lineNumber === 0) {
                    range = Token_2.Range.createEmptyRange();
                }
                else {
                    range = new Token_2.Range(new Token_1.Point(lineNumber - 1, 0), new Token_1.Point(lineNumber - 1, 1));
                }
                node.name[0].token.range = range;
            }
            else {
                console.error("Operator need to handle: " + name);
            }
            functionResolve.functionDefs.push([path, node]);
        }
    }
}
exports.ExternalModuleScope = ExternalModuleScope;
//# sourceMappingURL=ExternalModuleScope.js.map