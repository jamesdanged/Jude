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
var nodes_1 = require("../parseTree/nodes");
var nodes_2 = require("../parseTree/nodes");
var nodes_3 = require("../parseTree/nodes");
var nodes_4 = require("../parseTree/nodes");
var Token_1 = require("../tokens/Token");
var ScopeBuilder_1 = require("./ScopeBuilder");
var nodepath = require("path");
var arrayUtils_1 = require("../utils/arrayUtils");
var errors_1 = require("../utils/errors");
var nodes_5 = require("../parseTree/nodes");
var Scope_1 = require("./Scope");
var nodes_6 = require("../parseTree/nodes");
var nodes_7 = require("../parseTree/nodes");
var nodes_8 = require("../parseTree/nodes");
var nodes_9 = require("../parseTree/nodes");
var nodes_10 = require("../parseTree/nodes");
var nodes_11 = require("../parseTree/nodes");
var nodes_12 = require("../parseTree/nodes");
var nodes_13 = require("../parseTree/nodes");
var nodes_14 = require("../parseTree/nodes");
var nodes_15 = require("../parseTree/nodes");
var nodes_16 = require("../parseTree/nodes");
var nodes_17 = require("../parseTree/nodes");
var nodes_18 = require("../parseTree/nodes");
var nodes_19 = require("../parseTree/nodes");
var assert_1 = require("../utils/assert");
var StringSet_1 = require("../utils/StringSet");
var Resolve_1 = require("./Resolve");
var Resolve_2 = require("./Resolve");
var errors_2 = require("../utils/errors");
var nodes_20 = require("../parseTree/nodes");
/**
 * Recursively creates scopes.
 */
class ScopeRecurser {
    constructor(parseSet, moduleLibrary, onlyRetrieveImports, alreadyInitializedRoots, openFiles) {
        this.parseSet = parseSet;
        this.moduleLibrary = moduleLibrary;
        this.onlyRetrieveImports = onlyRetrieveImports;
        this.alreadyInitializedRoots = alreadyInitializedRoots;
        this.openFiles = openFiles;
        this.resolveRootStack = [];
        this.scopeStack = [];
        this.fileStack = [];
        this.deferredFunctionsToResolve = [];
        this.builder = new ScopeBuilder_1.ScopeBuilder(this);
    }
    get currResolveRoot() { return arrayUtils_1.last(this.resolveRootStack); }
    get currFile() { return arrayUtils_1.last(this.fileStack); }
    get currScope() { return arrayUtils_1.last(this.scopeStack); }
    /**
     * Recursively resolves all scopes within the module.
     * Also recurses through included files.
     */
    resolveRecursively(resolveRoot) {
        this.fileStack.push(resolveRoot.containingFile);
        this.resolveRootScope(resolveRoot);
        this.fileStack.pop();
        // resolve bodies of functions after the enclosing module has been resolved
        while (this.deferredFunctionsToResolve.length > 0) {
            let cb = this.deferredFunctionsToResolve.shift();
            cb();
        }
    }
    resolveRootScope(resolveRoot) {
        this.resolveRootStack.push(resolveRoot);
        let rootNode = resolveRoot.root;
        let rootScope = resolveRoot.scope;
        if (this.alreadyInitializedRoots.indexOf(rootScope) >= 0)
            throw new assert_1.AssertError("");
        this.alreadyInitializedRoots.push(rootScope);
        this.scopeStack.push(rootScope);
        this.parseSet.scopes[this.currFile].addScope(rootScope);
        let isBareModule = false;
        if (rootNode instanceof nodes_6.ModuleDefNode && rootNode.isBareModule)
            isBareModule = true;
        // all modules are based on Core, even bare modules
        let importAllCore = new nodes_17.ImportAllNode();
        importAllCore.names.push([new nodes_5.IdentifierNode(Token_1.Token.createEmptyIdentifier("Core"))]);
        this.resolveImportAllNode(importAllCore);
        // modules implicitly import Base
        if (!isBareModule) {
            let importAllBase = new nodes_17.ImportAllNode();
            importAllBase.names.push([new nodes_5.IdentifierNode(Token_1.Token.createEmptyIdentifier("Base"))]);
            this.resolveImportAllNode(importAllBase);
        }
        // recurse
        this.resolveNodeSequence(rootNode.expressions);
        this.scopeStack.pop();
        this.resolveRootStack.pop();
    }
    resolveNodeSequence(nodes) {
        for (let node of nodes) {
            this.resolveNode(node);
        }
    }
    resolveNode(node) {
        if (node instanceof nodes_6.ModuleDefNode) {
            this.resolveModuleDefNode(node);
        }
        else if (node instanceof nodes_15.IncludeNode) {
            this.resolveIncludeNode(node);
        }
        else if (node instanceof nodes_16.ImportNode) {
            this.resolveImportNode(node);
        }
        else if (node instanceof nodes_17.ImportAllNode) {
            this.resolveImportAllNode(node);
        }
        else if (node instanceof nodes_18.UsingNode) {
            this.resolveUsingNode(node);
        }
        else {
            if (this.onlyRetrieveImports)
                return;
            if (node instanceof nodes_19.ExportNode) {
                this.resolveExportNode(node);
            }
            else if (node instanceof nodes_5.IdentifierNode) {
                this.resolveIdentifierNode(node);
            }
            else if (node instanceof nodes_7.VarDeclarationNode) {
                this.resolveVariableDeclarationNode(node);
            }
            else if (node instanceof nodes_20.MultiDotNode) {
                this.resolveMultiDotNode(node);
            }
            else if (node instanceof nodes_8.BinaryOpNode) {
                this.resolveBinaryOpNode(node);
            }
            else if (node instanceof nodes_9.ForBlockNode) {
                this.resolveForBlockNode(node);
            }
            else if (node instanceof nodes_10.WhileBlockNode) {
                this.resolveWhileBlockNode(node);
            }
            else if (node instanceof nodes_11.DoBlockNode) {
                this.resolveDoBlockNode(node);
            }
            else if (node instanceof nodes_1.LetBlockNode) {
                this.resolveLetBlockNode(node);
            }
            else if (node instanceof nodes_12.TryBlockNode) {
                this.resolveTryBlockNode(node);
            }
            else if (node instanceof nodes_13.FunctionDefNode) {
                this.resolveFunctionDefNode(node);
            }
            else if (node instanceof nodes_14.TypeDefNode) {
                this.resolveTypeDefNode(node);
            }
            else if (node instanceof nodes_3.MacroDefNode) {
                this.resolveMacroDefNode(node);
            }
            else if (node instanceof nodes_2.MacroInvocationNode) {
                this.resolveMacroInvocationNode(node);
            }
            else {
                // simply recurse through children
                this.resolveNodeSequence(node.children());
            }
        }
    }
    resolveIdentifierNode(node) {
        if (node.isSpecialIdentifier())
            return;
        if (node.name === "new" && this.scopeStack.findIndex((o) => { return o.type === Scope_1.ScopeType.TypeDef; }) >= 0)
            return;
        let resolve = this.currScope.tryResolveNameThroughParentScopes(node.name, false);
        if (resolve === null) {
            this.logNameError(new errors_1.NameError("Unknown name", node.token));
        }
        else {
            this.storeIdentifierResolution(node, resolve);
        }
    }
    resolveVariableDeclarationNode(node) {
        for (let itemNode of node.names) {
            let identNode = itemNode.name;
            if (node.declType === Resolve_1.NameDeclType.Const || node.declType === Resolve_1.NameDeclType.Local) {
                this.builder.registerVariable(identNode);
            }
            else if (node.declType === Resolve_1.NameDeclType.Global) {
                // check the name exists only at the module scope. Skip intermediate levels.
                let moduleScope = this.scopeStack[0];
                let resolve = moduleScope.tryResolveNameThisLevel(identNode.name);
                if (resolve === null) {
                    this.logNameError(new errors_1.NameError("Name not found in module scope.", identNode.token));
                }
                else {
                    this.storeIdentifierResolution(identNode, resolve);
                }
            }
            else {
                throw new assert_1.AssertError("");
            }
            if (itemNode.type !== null) {
                this.resolveNode(itemNode.type);
            }
            if (itemNode.value !== null) {
                this.resolveNode(itemNode.value);
            }
        }
    }
    resolveMultiDotNode(node) {
        if (node.nodes.length === 0)
            throw new assert_1.AssertError("");
        // resolve recursively if any part is a complex expression
        for (let part of node.nodes) {
            if (!(part instanceof nodes_5.IdentifierNode)) {
                this.resolveNode(part);
            }
        }
        // only try to resolve parts which are not dynamic
        let prefix = [];
        for (let part of node.nodes) {
            if (part instanceof nodes_5.IdentifierNode) {
                prefix.push(part);
            }
        }
        if (prefix.length > 0) {
            this.resolveMultiPartName(prefix);
        }
    }
    resolveMultiPartName(multiPartName) {
        // progressively resolve the multi part name
        // storing a resolution object for each name part
        // Stop when encounter a non-module,
        //   eg stop at 'obj' in the name 'Mod1.obj.prop.propOfProp'
        for (let i = 0; i < multiPartName.length; i++) {
            let prefix = multiPartName.slice(0, i + 1);
            let resOrError = this.currScope.tryResolveMultiPartName(prefix);
            if (resOrError instanceof errors_1.NameError) {
                this.logNameError(resOrError);
                return;
            }
            let resolve = resOrError;
            this.storeIdentifierResolution(prefix[i], resolve);
            if (!(resolve instanceof Resolve_2.ModuleResolve))
                break;
        }
    }
    resolveBinaryOpNode(node) {
        if (node.op === "=") {
            if (node.arg1 instanceof nodes_5.IdentifierNode) {
                let identNode = node.arg1;
                this.builder.createNameByAssignmentIfNecessary(identNode);
            }
            else if (node.arg1 instanceof nodes_4.TupleNode) {
                let tupNode = node.arg1;
                for (let item of tupNode.nodes) {
                    if (item instanceof nodes_5.IdentifierNode) {
                        this.builder.createNameByAssignmentIfNecessary(item);
                    }
                    else {
                    }
                }
            }
            else if (node.arg1 instanceof nodes_20.MultiDotNode) {
                let multiDotNode = node.arg1;
                if (!multiDotNode.nodes.every((o) => { return o instanceof nodes_5.IdentifierNode; })) {
                    this.logParseError(new errors_2.InvalidParseError("Expected a variable name to be assigned to.", node.token));
                }
                else {
                }
            }
            else if (node.arg1 instanceof nodes_8.BinaryOpNode) {
                // type assertion + assignment
                let arg1Op = node.arg1;
                if (arg1Op.op === "::" && arg1Op.arg1 instanceof nodes_5.IdentifierNode) {
                    let identNode = arg1Op.arg1;
                    this.builder.createNameByAssignmentIfNecessary(identNode);
                }
            } // else could be assigning into an array being indexed, or an array that is the result of a function call
        }
        // recurse each side
        this.resolveNode(node.arg1);
        this.resolveNode(node.arg2);
    }
    resolveForBlockNode(node) {
        if (!this.currFileIsOpen())
            return;
        this.pushNewScope(Scope_1.ScopeType.Block, node.scopeStartToken, node.scopeEndToken);
        for (let iterVar of node.iterVariable) {
            this.builder.createNameByAssignmentIfNecessary(iterVar);
        }
        if (node.range !== null)
            this.resolveNode(node.range);
        this.resolveNodeSequence(node.expressions);
        this.scopeStack.pop();
    }
    resolveWhileBlockNode(node) {
        if (!this.currFileIsOpen())
            return;
        this.pushNewScope(Scope_1.ScopeType.Block, node.scopeStartToken, node.scopeEndToken);
        this.resolveNodeSequence(node.children());
        this.scopeStack.pop();
    }
    resolveDoBlockNode(node) {
        if (!this.currFileIsOpen())
            return;
        if (node.prefixExpression === null)
            return; // null if parse failure
        this.resolveNode(node.prefixExpression);
        this.pushNewScope(Scope_1.ScopeType.Block, node.scopeStartToken, node.scopeEndToken);
        for (let arg of node.argList) {
            this.builder.registerVariable(arg.name);
            if (arg.type !== null)
                this.resolveNode(arg.type);
        }
        this.resolveNodeSequence(node.expressions);
        this.scopeStack.pop();
    }
    resolveLetBlockNode(node) {
        if (!this.currFileIsOpen())
            return;
        this.pushNewScope(Scope_1.ScopeType.Block, node.scopeStartToken, node.scopeEndToken);
        for (let itemNode of node.names) {
            // resolve the value before the variable name
            if (itemNode.value !== null) {
                this.resolveNode(itemNode.value);
            }
            this.builder.registerVariable(itemNode.name);
            if (itemNode.type !== null) {
                this.resolveNode(itemNode.type);
            }
        }
        this.resolveNodeSequence(node.expressions);
        this.scopeStack.pop();
    }
    resolveTryBlockNode(node) {
        if (!this.currFileIsOpen())
            return;
        let tryBlock = node.tryBlock;
        this.pushNewScope(Scope_1.ScopeType.Block, tryBlock.scopeStartToken, tryBlock.scopeEndToken);
        this.resolveNode(tryBlock);
        this.scopeStack.pop();
        let catchBlock = node.catchBlock;
        if (catchBlock !== null) {
            this.pushNewScope(Scope_1.ScopeType.Block, catchBlock.scopeStartToken, catchBlock.scopeEndToken);
            if (node.catchErrorVariable !== null) {
                this.builder.createNameByAssignmentIfNecessary(node.catchErrorVariable);
            }
            this.resolveNode(catchBlock);
            this.scopeStack.pop();
        }
        let finallyBlock = node.finallyBlock;
        if (finallyBlock !== null) {
            this.pushNewScope(Scope_1.ScopeType.Block, finallyBlock.scopeStartToken, finallyBlock.scopeEndToken);
            this.resolveNode(finallyBlock);
            this.scopeStack.pop();
        }
    }
    resolveFunctionDefNode(node) {
        // register the function name if there is one
        this.builder.registerFunction(node);
        if (node.name.length > 0)
            this.resolveMultiPartName(node.name);
        if (!this.currFileIsOpen())
            return;
        // determine whether outer or inner function. Affects treatment of variables.
        let isOuterFunction = true;
        if (this.scopeStack.find((sc) => sc.type === Scope_1.ScopeType.Function))
            isOuterFunction = false;
        if (isOuterFunction) {
            this.pushNewScope(Scope_1.ScopeType.Function, node.scopeStartToken, node.scopeEndToken);
        }
        else {
            this.pushNewScope(Scope_1.ScopeType.InnerFunction, node.scopeStartToken, node.scopeEndToken);
        }
        this.deferResolvingFunction(node);
        this.scopeStack.pop();
    }
    resolveTypeDefNode(node) {
        let identifierNode = node.name;
        if (!identifierNode)
            return; // parse failure
        this.builder.registerType(node);
        if (!this.currFileIsOpen())
            return;
        // resolve the body of the type def
        this.pushNewScope(Scope_1.ScopeType.TypeDef, node.scopeStartToken, node.scopeEndToken);
        // register generic arg names
        if (node.genericArgs !== null) {
            for (let arg of node.genericArgs.args) {
                this.builder.registerVariable(arg.name);
            }
        }
        if (node.parentType !== null) {
            this.resolveNode(node.parentType);
        }
        for (let field of node.fields) {
            if (field.type !== null) {
                this.resolveNode(field.type);
            }
        }
        this.resolveNodeSequence(node.bodyContents);
        this.scopeStack.pop();
        // TODO new() function inside typedef body
    }
    resolveMacroDefNode(node) {
        let identNode = node.name;
        if (!identNode)
            return; // parse failure
        this.builder.registerMacro(node);
        let resolve = this.currScope.tryResolveNameThisLevel("@" + identNode.name);
        if (resolve !== null) {
            this.storeIdentifierResolution(identNode, resolve);
        }
        // don't recurse into body of macro
    }
    resolveMacroInvocationNode(node) {
        this.resolveIdentifierNode(node.name);
        for (let param of node.params) {
            this.resolveNode(param);
        }
    }
    resolveModuleDefNode(node) {
        // recurse into the inner module
        let resolveRoot = this.parseSet.getResolveRoot(node);
        if (this.alreadyInitializedRoots.indexOf(resolveRoot.scope) < 0) {
            this.resolveRootScope(resolveRoot);
        }
        this.builder.registerModule(node, resolveRoot.scope);
    }
    resolveIncludeNode(node) {
        let path = nodepath.resolve(nodepath.dirname(this.currFile), node.relativePath);
        if (!(path in this.parseSet.fileLevelNodes)) {
            // already created an error message during findRootAndRelateds
            return;
        }
        let parsedFileNode = this.parseSet.fileLevelNodes[path];
        this.fileStack.push(path);
        this.resolveNodeSequence(parsedFileNode.expressions);
        this.fileStack.pop();
    }
    resolveImportNode(node) {
        for (let multiPartName of node.getNamesWithPrefix()) {
            this.builder.registerImport(multiPartName);
            this.resolveMultiPartName(multiPartName);
        }
    }
    resolveImportAllNode(node) {
        for (let multiPartName of node.getNamesWithPrefix()) {
            this.builder.registerImportAllOrUsing(multiPartName, false);
            this.resolveMultiPartName(multiPartName);
        }
    }
    resolveUsingNode(node) {
        for (let multiPartName of node.getNamesWithPrefix()) {
            this.builder.registerImportAllOrUsing(multiPartName, true);
            this.resolveMultiPartName(multiPartName);
        }
    }
    resolveExportNode(node) {
        let scope = this.currScope;
        while (scope.parent !== null) {
            scope = scope.parent;
        }
        if (scope.type !== Scope_1.ScopeType.Module)
            throw new assert_1.AssertError("");
        let moduleScope = scope;
        for (let identNode of node.names) {
            StringSet_1.addToSet(moduleScope.exportedNames, identNode.name);
        }
    }
    pushNewScope(scopeType, tokenStart, tokenEnd) {
        let scope = this.currScope.createChild(scopeType);
        scope.tokenStart = tokenStart;
        scope.tokenEnd = tokenEnd;
        this.scopeStack.push(scope);
        this.parseSet.scopes[this.currFile].addScope(scope);
    }
    deferResolvingFunction(functionDefNode) {
        let scopeStackSnapshot = this.scopeStack.slice();
        let fileStackSnapshot = this.fileStack.slice();
        let resolveRootStackSnapshot = this.resolveRootStack.slice();
        let that = this;
        let cb = () => {
            // restore stacks
            that.scopeStack = scopeStackSnapshot;
            that.fileStack = fileStackSnapshot;
            that.resolveRootStack = resolveRootStackSnapshot;
            // register generic arg names
            if (functionDefNode.genericArgs !== null) {
                for (let arg of functionDefNode.genericArgs.args) {
                    that.builder.registerVariable(arg.name);
                    if (arg.restriction !== null)
                        that.resolveNode(arg.restriction);
                }
            }
            // register arg names
            // resolve arg types and default values
            for (let arg of functionDefNode.args.orderedArgs) {
                if (arg.name !== null) {
                    that.builder.registerVariable(arg.name);
                    that.resolveNode(arg.name);
                }
                if (arg.type !== null)
                    that.resolveNode(arg.type);
                if (arg.defaultValue !== null)
                    that.resolveNode(arg.defaultValue);
            }
            for (let arg of functionDefNode.args.keywordArgs) {
                if (arg.name === null)
                    throw new assert_1.AssertError("Cannot be null");
                that.builder.registerVariable(arg.name);
                that.resolveNode(arg.name);
                if (arg.type !== null)
                    that.resolveNode(arg.type);
                if (arg.defaultValue !== null)
                    that.resolveNode(arg.defaultValue);
            }
            that.resolveNodeSequence(functionDefNode.bodyExpressions);
        };
        this.deferredFunctionsToResolve.push(cb);
    }
    logNameError(err) {
        this.parseSet.errors[this.currFile].nameErrors.push(err);
    }
    logParseError(err) {
        this.parseSet.errors[this.currFile].parseErrors.push(err);
    }
    storeIdentifierResolution(node, resolve) {
        this.parseSet.identifiers[this.currFile].map.set(node, resolve);
    }
    currFileIsOpen() {
        return this.openFiles.indexOf(this.currFile) >= 0;
    }
}
exports.ScopeRecurser = ScopeRecurser;
//# sourceMappingURL=ScopeRecurser.js.map