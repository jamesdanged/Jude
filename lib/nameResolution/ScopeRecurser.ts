"use strict"

import {ParenthesesNode, GenericArgListNode} from "../parseTree/nodes";
import {LetBlockNode} from "../parseTree/nodes";
import {MacroInvocationNode} from "../parseTree/nodes";
import {MacroDefNode} from "../parseTree/nodes";
import {MultiPartName} from "../parseTree/nodes";
import {TupleNode} from "../parseTree/nodes";
import {ModuleScope} from "./ModuleScope";
import {Token} from "../tokens/Token";
import {ModuleResolveInfo} from "../core/SessionModel";
import {ParseSet} from "../core/SessionModel";
import {ScopeBuilder} from "./ScopeBuilder";
import * as nodepath from "path"
import {Scope} from "./Scope";
import {ModuleLibrary} from "./../core/ModuleLibrary";
import {last} from "../utils/arrayUtils";
import {NameError} from "../utils/errors";
import {IdentifierNode} from "../parseTree/nodes";
import {ScopeType} from "./Scope";
import {ModuleDefNode} from "../parseTree/nodes";
import {VarDeclarationNode} from "../parseTree/nodes";
import {Node} from "../parseTree/nodes";
import {BinaryOpNode} from "../parseTree/nodes";
import {ForBlockNode} from "../parseTree/nodes";
import {WhileBlockNode} from "../parseTree/nodes";
import {DoBlockNode} from "../parseTree/nodes";
import {TryBlockNode} from "../parseTree/nodes";
import {FunctionDefNode} from "../parseTree/nodes";
import {TypeDefNode} from "../parseTree/nodes";
import {IncludeNode} from "../parseTree/nodes";
import {ImportNode} from "../parseTree/nodes";
import {ImportAllNode} from "../parseTree/nodes";
import {UsingNode} from "../parseTree/nodes";
import {ExportNode} from "../parseTree/nodes";
import {AssertError} from "../utils/assert";
import {addToSet} from "../utils/StringSet";
import {NameDeclType} from "./Resolve";
import {Resolve} from "./Resolve";
import {ModuleResolve} from "./Resolve";
import {InvalidParseError} from "../utils/errors";
import {MultiDotNode} from "../parseTree/nodes";


/**
 * Recursively creates scopes.
 */
export class ScopeRecurser {

  moduleResolveInfoStack: ModuleResolveInfo[]
  scopeStack: Scope[]
  fileStack: string[]
  deferredFunctionsToResolve // callbacks: () => void
  builder: ScopeBuilder
  alreadyInitializedRoots: ModuleScope[]  // used to avoid double resolving scopes during recursion
  openFiles: string[]  // only need to recurse into inner scopes of open files.

  constructor(public parseSet: ParseSet, public moduleLibrary: ModuleLibrary, public onlyRetrieveImports: boolean,
      alreadyInitializedRoots: ModuleScope[], openFiles: string[]) {

    this.alreadyInitializedRoots = alreadyInitializedRoots
    this.openFiles = openFiles
    this.moduleResolveInfoStack = []
    this.scopeStack = []
    this.fileStack = []
    this.deferredFunctionsToResolve = []
    this.builder = new ScopeBuilder(this)
  }

  get currModuleResolveInfo(): ModuleResolveInfo { return last(this.moduleResolveInfoStack) }
  get currFile(): string { return last(this.fileStack); }
  get currScope(): Scope { return last(this.scopeStack); }


  /**
   * Recursively resolves all scopes within the module.
   * Also recurses through included files.
   */
  resolveRecursively(moduleResolveInfo: ModuleResolveInfo): void {
    this.fileStack.push(moduleResolveInfo.containingFile)
    this.resolveModuleScope(moduleResolveInfo)
    this.fileStack.pop()

    // resolve bodies of functions after the enclosing module has been resolved
    while (this.deferredFunctionsToResolve.length > 0) {
      let cb = this.deferredFunctionsToResolve.shift()
      cb()
    }
  }

  resolveModuleScope(moduleResolveInfo: ModuleResolveInfo): void {
    this.moduleResolveInfoStack.push(moduleResolveInfo)

    let rootNode = moduleResolveInfo.root
    let rootScope = moduleResolveInfo.scope

    if (this.alreadyInitializedRoots.indexOf(rootScope) >= 0) throw new AssertError("")
    this.alreadyInitializedRoots.push(rootScope)
    this.scopeStack.push(rootScope)
    this.parseSet.scopes[this.currFile].addScope(rootScope)


    let isBareModule = false
    if (rootNode instanceof ModuleDefNode && rootNode.isBareModule) isBareModule = true
    // all modules are based on Core, even bare modules
    let importAllCore = new ImportAllNode()
    importAllCore.names.push( [new IdentifierNode(Token.createEmptyIdentifier("Core"))] )
    this.resolveImportAllNode(importAllCore)
    // modules implicitly import Base
    if (!isBareModule) {
      let importAllBase = new ImportAllNode()
      importAllBase.names.push( [new IdentifierNode(Token.createEmptyIdentifier("Base"))] )
      this.resolveImportAllNode(importAllBase)
    }

    // recurse
    this.resolveNodeSequence(rootNode.expressions)
    this.scopeStack.pop()
    this.moduleResolveInfoStack.pop()
  }

  resolveNodeSequence(nodes: Node[]): void {
    for (let node of nodes) {
      this.resolveNode(node)
    }
  }

  resolveNode(node: Node): void {

    if (node instanceof ModuleDefNode) {
      this.resolveModuleDefNode(node)
    } else if (node instanceof IncludeNode) {
      this.resolveIncludeNode(node)
    } else if (node instanceof ImportNode) {
      this.resolveImportNode(node)
    } else if (node instanceof ImportAllNode) {
      this.resolveImportAllNode(node)
    } else if (node instanceof UsingNode) {
      this.resolveUsingNode(node)
    } else {
      if (this.onlyRetrieveImports) return

      if (node instanceof ExportNode) {
        this.resolveExportNode(node)
      } else if (node instanceof IdentifierNode) {
        this.resolveIdentifierNode(node)
      } else if (node instanceof VarDeclarationNode) {
        this.resolveVariableDeclarationNode(node)
      } else if (node instanceof MultiDotNode) {
        this.resolveMultiDotNode(node)
      } else if (node instanceof BinaryOpNode) {
        this.resolveBinaryOpNode(node)
      } else if (node instanceof ForBlockNode) {
        this.resolveForBlockNode(node)
      } else if (node instanceof WhileBlockNode) {
        this.resolveWhileBlockNode(node)
      } else if (node instanceof DoBlockNode) {
        this.resolveDoBlockNode(node)
      } else if (node instanceof LetBlockNode) {
        this.resolveLetBlockNode(node)
      } else if (node instanceof TryBlockNode) {
        this.resolveTryBlockNode(node)
      } else if (node instanceof FunctionDefNode) {
        this.resolveFunctionDefNode(node)
      } else if (node instanceof TypeDefNode) {
        this.resolveTypeDefNode(node)
      } else if (node instanceof MacroDefNode) {
        this.resolveMacroDefNode(node)
      } else if (node instanceof MacroInvocationNode) {
        this.resolveMacroInvocationNode(node)
      } else {
        // simply recurse through children
        this.resolveNodeSequence(node.children())
      }
    }
  }

  resolveIdentifierNode(node: IdentifierNode): void {
    if (node.isSpecialIdentifier()) return
    if (node.str === "new" && this.scopeStack.findIndex((o) => { return o.type === ScopeType.TypeDef}) >= 0) return

    let resolve = this.currScope.tryResolveNameThroughParentScopes(node.str, false)
    if (resolve === null) {
      this.logNameError(new NameError("Unknown name", node.token))
    } else {
      this.storeIdentifierResolution(node, resolve)
    }
  }

  resolveVariableDeclarationNode(node: VarDeclarationNode): void {

    for (let itemNode of node.names) {
      let identNode = itemNode.name

      if (node.declType === NameDeclType.Const || node.declType === NameDeclType.Local) {
        this.builder.registerVariable(identNode)

      } else if (node.declType === NameDeclType.Global) {
        // check the name exists only at the module scope. Skip intermediate levels.
        let moduleScope = this.scopeStack[0]
        let resolve = moduleScope.tryResolveNameThisLevel(identNode.str)
        if (resolve === null) {
          this.logNameError(new NameError("Name not found in module scope.", identNode.token))
        } else {
          this.storeIdentifierResolution(identNode, resolve as Resolve)
        }

      } else {
        throw new AssertError("")
      }

      if (itemNode.type !== null) {
        this.resolveNode(itemNode.type)
      }
      if (itemNode.value !== null) {
        this.resolveNode(itemNode.value)
      }
    }
  }

  resolveMultiDotNode(node: MultiDotNode): void {
    if (node.nodes.length === 0) throw new AssertError("")

    // Gather the parts that can be resolved via module lookup
    //   ie Foo.Bar.Baz
    //   but not after the 'Foo' in Foo.(a || b).Baz
    // Also gather any parts which are expressions which need to be resolved in the current context
    // instead of another module.
    let multiPartName: MultiPartName = []
    let toResolveInContext: Node[] = []
    let continueMultiPartName = true
    for (let part of node.nodes) {
      if (part instanceof IdentifierNode) {
        if (continueMultiPartName) {
          multiPartName.push(part)
        }
      } else if (part instanceof GenericArgListNode && part.typeName instanceof IdentifierNode) {
        if (continueMultiPartName) {
          multiPartName.push(part.typeName as IdentifierNode)
        }
        for (let iparam of part.params) {
          toResolveInContext.push(iparam)
        }
        continueMultiPartName = false
      } else {
        // some sort of compound expression
        // ie foo.(A || B).bar
        // resolve the expression within this context
        toResolveInContext.push(part)
        continueMultiPartName = false
      }
    }

    // resolve the multi part name by looking up in modules
    if (multiPartName.length > 0) {
      this.resolveMultiPartName(multiPartName)
    }

    // resolve anything that should be resolved in the current context
    for (let toResolve of toResolveInContext) {
      this.resolveNode(toResolve)
    }

  }

  resolveMultiPartName(multiPartName: MultiPartName): void {
    // progressively resolve the multi part name
    // storing a resolution object for each name part
    // Stop when encounter a non-module,
    //   eg stop at 'obj' in the name 'Mod1.obj.prop.propOfProp'

    let i_first_non_dot = multiPartName.findIndex(o => o.str !== ".")

    for (let i = i_first_non_dot; i < multiPartName.length; i++) {
      let prefix = multiPartName.slice(0, i+1)
      let resOrError = this.currScope.tryResolveMultiPartName(prefix)
      if (resOrError instanceof NameError) {
        this.logNameError(resOrError)
        return
      }
      let resolve = resOrError as Resolve
      this.storeIdentifierResolution(prefix[i], resolve)

      if (!(resolve instanceof ModuleResolve)) break
    }
  }



  resolveBinaryOpNode(node: BinaryOpNode): void {

    if (node.op === "=") {
      if (node.arg1 instanceof IdentifierNode) {
        let identNode = node.arg1 as IdentifierNode
        this.builder.createNameByAssignmentIfNecessary(identNode)
      } else if (node.arg1 instanceof TupleNode) {
        let tupNode = node.arg1 as TupleNode
        for (let item of tupNode.nodes) {
          if (item instanceof IdentifierNode) {
            this.builder.createNameByAssignmentIfNecessary(item)
          } else {
            // do not register a name
            // could be assigning to an index in an array
          }
        }
      } else if (node.arg1 instanceof ParenthesesNode) {
        let parenNode = node.arg1 as ParenthesesNode
        if (parenNode.expressions.length == 1 && parenNode.expressions[0] instanceof TupleNode) {
          let tupNode = parenNode.expressions[0] as TupleNode
          for (let item of tupNode.nodes) {
            if (item instanceof IdentifierNode) {
              this.builder.createNameByAssignmentIfNecessary(item)
            } else {
              // do not register a name
              // could be assigning to an index in an array
            }
          }
        }
      } else if (node.arg1 instanceof MultiDotNode) {
        let multiDotNode = node.arg1 as MultiDotNode
        if (!multiDotNode.nodes.every((o) => { return o instanceof IdentifierNode })) {
          // possible that we have
          //   arr[i].prop = val
          // this.logParseError(new InvalidParseError("Expected a variable name to be assigned to.", node.token))
        } else {
          // do not register a name
          // either it is a property of an object or a variable inside another module,
          // neither of which creates a variable inside this module
        }
      } else if (node.arg1 instanceof BinaryOpNode) {
        // type assertion + assignment
        let arg1Op = node.arg1 as BinaryOpNode
        if (arg1Op.op === "::" && arg1Op.arg1 instanceof IdentifierNode) {
          let identNode = arg1Op.arg1 as IdentifierNode
          this.builder.createNameByAssignmentIfNecessary(identNode)
        }
      } // else could be assigning into an array being indexed, or an array that is the result of a function call
    }

    // recurse each side
    this.resolveNode(node.arg1)
    this.resolveNode(node.arg2)
  }

  resolveForBlockNode(node: ForBlockNode): void {
    if (!this.currFileIsOpen()) return

    this.pushNewScope(ScopeType.Block, node.scopeStartToken, node.scopeEndToken)
    for (let iterVar of node.iterVariable) {
      this.builder.createNameByAssignmentIfNecessary(iterVar)
    }
    if (node.range !== null) this.resolveNode(node.range)
    this.resolveNodeSequence(node.expressions)
    this.scopeStack.pop()
  }

  resolveWhileBlockNode(node: WhileBlockNode): void {
    if (!this.currFileIsOpen()) return

    this.pushNewScope(ScopeType.Block, node.scopeStartToken, node.scopeEndToken)
    this.resolveNodeSequence(node.children())
    this.scopeStack.pop()
  }

  resolveDoBlockNode(node: DoBlockNode): void {
    if (!this.currFileIsOpen()) return

    if (node.prefixExpression === null) return  // null if parse failure
    this.resolveNode(node.prefixExpression)

    this.pushNewScope(ScopeType.Block, node.scopeStartToken, node.scopeEndToken)

    for (let arg of node.argList) {
      this.builder.registerVariable(arg.name)
      if (arg.type !== null) this.resolveNode(arg.type)
    }

    this.resolveNodeSequence(node.expressions)
    this.scopeStack.pop()
  }

  resolveLetBlockNode(node: LetBlockNode): void {
    if (!this.currFileIsOpen()) return

    this.pushNewScope(ScopeType.Block, node.scopeStartToken, node.scopeEndToken)

    for (let itemNode of node.names) {
      // resolve the value before the variable name
      if (itemNode.value !== null) {
        this.resolveNode(itemNode.value)
      }
      this.builder.registerVariable(itemNode.name)
      if (itemNode.type !== null) {
        this.resolveNode(itemNode.type)
      }
    }

    this.resolveNodeSequence(node.expressions)
    this.scopeStack.pop()
  }

  resolveTryBlockNode(node: TryBlockNode): void {
    if (!this.currFileIsOpen()) return

    let tryBlock = node.tryBlock
    this.pushNewScope(ScopeType.Block, tryBlock.scopeStartToken, tryBlock.scopeEndToken)
    this.resolveNode(tryBlock)
    this.scopeStack.pop()

    let catchBlock = node.catchBlock
    if (catchBlock !== null) {
      this.pushNewScope(ScopeType.Block, catchBlock.scopeStartToken, catchBlock.scopeEndToken)
      if (node.catchErrorVariable !== null) {
        this.builder.createNameByAssignmentIfNecessary(node.catchErrorVariable)
      }
      this.resolveNode(catchBlock)
      this.scopeStack.pop()
    }

    let finallyBlock = node.finallyBlock
    if (finallyBlock !== null) {
      this.pushNewScope(ScopeType.Block, finallyBlock.scopeStartToken, finallyBlock.scopeEndToken)
      this.resolveNode(finallyBlock)
      this.scopeStack.pop()
    }
  }

  resolveFunctionDefNode(node: FunctionDefNode): void {
    // register the function name if there is one
    this.builder.registerFunction(node)
    if (node.name.length > 0) this.resolveMultiPartName(node.name)

    if (!this.currFileIsOpen()) return

    // determine whether outer or inner function. Affects treatment of variables.
    let isOuterFunction = true
    if (this.scopeStack.find((sc) => sc.type === ScopeType.Function)) isOuterFunction = false
    if (isOuterFunction) {
      this.pushNewScope(ScopeType.Function, node.scopeStartToken, node.scopeEndToken)
    } else {
      this.pushNewScope(ScopeType.InnerFunction, node.scopeStartToken, node.scopeEndToken)
    }

    this.deferResolvingFunction(node)

    this.scopeStack.pop()
  }

  resolveTypeDefNode(node: TypeDefNode): void {
    let identifierNode = node.name
    if (!identifierNode) return  // parse failure

    this.builder.registerType(node)

    if (!this.currFileIsOpen()) return

    // resolve the body of the type def
    this.pushNewScope(ScopeType.TypeDef, node.scopeStartToken, node.scopeEndToken)
    // register generic arg names
    if (node.genericArgs !== null) {
      for (let arg of node.genericArgs.args) {
        this.builder.registerVariable(arg.name)
      }
    }

    if (node.parentType !== null) {
      this.resolveNode(node.parentType)
    }

    for (let field of node.fields) {
      if (field.type !== null) {
        this.resolveNode(field.type)
      }
    }

    this.resolveNodeSequence(node.bodyContents)
    this.scopeStack.pop()


    // TODO new() function inside typedef body
  }

  resolveMacroDefNode(node: MacroDefNode): void {
    let identNode = node.name
    if (!identNode) return // parse failure

    this.builder.registerMacro(node)
    let resolve = this.currScope.tryResolveNameThisLevel("@" + identNode.str)
    if (resolve !== null) {
      this.storeIdentifierResolution(identNode, resolve)
    }
    // don't recurse into body of macro
  }

  resolveMacroInvocationNode(node: MacroInvocationNode): void {
    // normalize the name so it has @ only on the last part
    let numParts = node.name.length
    for (let i = 0; i < numParts; i++) {
      let ipart = node.name[i]
      if (i === 0 && numParts > 1 && ipart.str[0] === "@") {
        ipart.str = ipart.str.slice(1)
      }
      if (i === numParts - 1 && ipart.str[0] !== "@") {
        ipart.str = "@" + ipart.str
      }
    }
    this.resolveMultiPartName(node.name)
    for (let param of node.params) {
      this.resolveNode(param)
    }
  }

  resolveModuleDefNode(node: ModuleDefNode): void {
    // recurse into the inner module
    let mri = this.parseSet.getModuleResolveInfo(node)
    if (this.alreadyInitializedRoots.indexOf(mri.scope) < 0) {
      this.resolveModuleScope(mri)
    }
    this.builder.registerModule(node, mri.scope)
  }

  resolveIncludeNode(node: IncludeNode): void {
    let path = nodepath.resolve(nodepath.dirname(this.currFile), node.relativePath)
    if (!(path in this.parseSet.fileLevelNodes)) {
      // already created an error message during findRootAndRelateds
      return
    }
    let parsedFileNode = this.parseSet.fileLevelNodes[path]
    this.fileStack.push(path)
    this.resolveNodeSequence(parsedFileNode.expressions)
    this.fileStack.pop()
  }

  resolveImportNode(node: ImportNode): void {
    for (let multiPartName of node.getNamesWithPrefix()) {
      this.builder.registerImport(multiPartName)
      this.resolveMultiPartName(multiPartName)
    }
  }

  resolveImportAllNode(node: ImportAllNode): void {
    for (let multiPartName of node.getNamesWithPrefix()) {
      this.builder.registerImportAllOrUsing(multiPartName, false)
      this.resolveMultiPartName(multiPartName)
    }
  }

  resolveUsingNode(node: UsingNode): void {
    for (let multiPartName of node.getNamesWithPrefix()) {
      this.builder.registerImportAllOrUsing(multiPartName, true)
      this.resolveMultiPartName(multiPartName)
    }
  }

  resolveExportNode(node: ExportNode) {
    let scope = this.currScope
    while (scope.parent !== null) {
      scope = scope.parent
    }
    if (scope.type !== ScopeType.Module) throw new AssertError("")
    let moduleScope = scope as ModuleScope

    for (let identNode of node.names) {
      addToSet(moduleScope.exportedNames, identNode.str)
    }
  }


  pushNewScope(scopeType: ScopeType, tokenStart: Token, tokenEnd: Token) {
    let scope = this.currScope.createChild(scopeType)
    scope.tokenStart = tokenStart
    scope.tokenEnd = tokenEnd
    this.scopeStack.push(scope)
    this.parseSet.scopes[this.currFile].addScope(scope)
  }

  deferResolvingFunction(functionDefNode: FunctionDefNode): void {

    let scopeStackSnapshot = this.scopeStack.slice()
    let fileStackSnapshot = this.fileStack.slice()
    let moduleResolveInfoStackSnapshot = this.moduleResolveInfoStack.slice()
    let that = this
    let cb = () => {
      // restore stacks
      that.scopeStack = scopeStackSnapshot
      that.fileStack = fileStackSnapshot
      that.moduleResolveInfoStack = moduleResolveInfoStackSnapshot

      // register generic arg names
      if (functionDefNode.genericArgs !== null) {
        for (let arg of functionDefNode.genericArgs.args) {
          that.builder.registerVariable(arg.name)
          if (arg.restriction !== null) that.resolveNode(arg.restriction)
        }
      }
      // register arg names
      // resolve arg types and default values
      for (let arg of functionDefNode.args.orderedArgs) {
        if (arg.name !== null) {
          that.builder.registerVariable(arg.name)
          that.resolveNode(arg.name)
        }
        if (arg.type !== null) that.resolveNode(arg.type)
        if (arg.defaultValue !== null) that.resolveNode(arg.defaultValue)
      }
      for (let arg of functionDefNode.args.keywordArgs) {
        if (arg.name === null) throw new AssertError("Cannot be null")
        that.builder.registerVariable(arg.name)
        that.resolveNode(arg.name)
        if (arg.type !== null) that.resolveNode(arg.type)
        if (arg.defaultValue !== null) that.resolveNode(arg.defaultValue)
      }

      that.resolveNodeSequence(functionDefNode.bodyExpressions)
    }
    this.deferredFunctionsToResolve.push(cb)
  }


  logNameError(err: NameError): void {
    this.parseSet.errors[this.currFile].nameErrors.push(err)
  }
  logParseError(err: InvalidParseError): void {
    this.parseSet.errors[this.currFile].parseErrors.push(err)
  }
  storeIdentifierResolution(node: IdentifierNode, resolve: Resolve): void {
    this.parseSet.identifiers[this.currFile].map.set(node, resolve)
  }

  currFileIsOpen(): boolean {
    return this.openFiles.indexOf(this.currFile) >= 0
  }

}



