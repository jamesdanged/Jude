"use strict"

import {operatorsThatAreIdentifiers} from "../tokens/operatorsAndKeywords";
import {NameDeclType} from "../nameResolution/Resolve";
import {last} from "../utils/arrayUtils";
import {Token} from "./../tokens/Token";
import {TokenType} from "./../tokens/operatorsAndKeywords";
import {Point} from "../tokens/Token";
import {AssertError} from "../utils/assert";





export abstract class Node {
  constructor() {}

  /**
   * Get the immediate children of this node as a new array.
   */
  children(): Node[] {
    let nodes: Node[] = []
    for (let field in this) {
      let val = this[field]
      if (val !== null) {
        if (val instanceof Node) {
          nodes.push(val)
        } else if (val instanceof Array) {
          for (let item of val) {
            if (item instanceof Node) {
              nodes.push(item)
            }
          }
        }
      }
    }
    return nodes
  }
}

export abstract class MayBeUnparsedNode extends Node {
  // not really using any of these
  unparsedContents: Token[]
  parseError: Error
  parseSkipped: boolean
  constructor() {
    super()
    this.unparsedContents = null
    this.parseError = null
    this.parseSkipped = false
  }
}


/**
 * Represents a sequence of expressions
 */
export class MultiExpressionNode extends Node {
  expressions: Node[]
  constructor() {
    super()
    this.expressions = []
  }
}
export class ScopedMultiExpressionNode extends Node {
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}



export class NumberNode extends Node {
  value: string
  token: Token
  constructor(token: Token) {
    super()
    this.value = token.str
    this.token = token
  }
  toString(): string { return this.value }
}

export class SymbolNode extends Node {
  token: Token
  constructor(token: Token) {
    super()
    this.token = token
  }
}

export class IdentifierNode extends Node {
  str: string
  token: Token
  constructor(token: Token) {
    super()
    if (token.type !== TokenType.Identifier && token.type !== TokenType.Macro) throw new AssertError("")
    this.str = token.str
    this.token = token
  }
  isEndIndex(): boolean {
    return this.str === "end"
  }
  isColon(): boolean {
    return this.str === ":"
  }
  isSpecialIdentifier(): boolean {
    return this.isEndIndex() || this.isColon() // || this.str in operatorsThatAreIdentifiers
  }
  toString(): string { return this.str }
}

export class VarDeclarationNode extends Node {
  declType: NameDeclType
  names: VarDeclItemNode[]
  constructor(declType: NameDeclType) {
    super()
    this.declType = declType
    this.names = []
  }
}

export class VarDeclItemNode extends Node {
  name: IdentifierNode
  type: Node  // can be null
  value: Node  // null if no value expression with the declaration
  constructor(name: IdentifierNode) {
    super()
    this.name = name
    this.type = null
    this.value = null
  }
}


export class InterpolatedStringNode extends MayBeUnparsedNode {
  contents: Node[]
  isBackTick: boolean
  constructor() {
    super()
    this.contents = []
    this.isBackTick = false
  }
}

export class StringLiteralNode extends Node {
  value: string
  isBackTick: boolean
  constructor(public token: Token) {
    super()
    if (token.type !== TokenType.StringLiteralContents) throw new AssertError("")
    this.token = token
    this.value = token.str
    this.isBackTick = false
  }
}

export class RegexNode extends Node {
  constructor(public token: Token) {
    super()
  }
}

export class EmptyTupleNode extends Node {
  constructor() {
    super()
  }
  toString(): string { return "()" }
}

/**
 * Consolidates multiple ',' operators into one node.
 */
export class TupleNode extends Node {
  nodes: Node[]
  constructor() {
    super()
    this.nodes = []
  }
}

/**
 * Consolidates multiple '.' operators into one node.
 */
export class MultiDotNode extends Node {
  nodes: Node[]
  constructor() {
    super()
    this.nodes = []
  }
}


export class UnaryOpNode extends Node {
  op: string
  token: Token
  arg: Node
  constructor(token: Token) {
    super()
    this.op = token.str
    this.token = token
    this.arg = null
  }
  toString(): string {
    let s = this.op
    if (this.arg !== null) s = s + this.arg.toString()
    return "(" + s + ")"
  }
}

export class BinaryOpNode extends Node {
  op: string
  token: Token
  arg1: Node
  arg2: Node
  constructor(token: Token) {
    super()
    if (token.type !== TokenType.Operator) throw new AssertError("")
    this.token = token
    this.op = token.str
    this.arg1 = null
    this.arg2 = null
  }
  toString(): string {
    let s = this.op
    if (this.arg1 !== null) s = this.arg1.toString() + s
    if (this.arg2 !== null) s = s + this.arg2.toString()
    s = "(" + s + ")"
    return s
  }
}

export class TernaryOpNode extends Node {
  questionMarkToken: Token
  condition: Node
  trueExpression: Node
  falseExpression: Node
  constructor(questionMarkToken: Token) {
    super()
    this.questionMarkToken = questionMarkToken
    this.condition = null
    this.trueExpression = null
    this.falseExpression = null
  }
  toString(): string { return "? :" }
}

export class PostFixOpNode extends Node {
  op: string
  token: Token
  arg: Node
  constructor(token: Token) {
    super()
    this.op = token.str
    this.token = token
    this.arg = null
  }
}

export class ReturnNode extends Node {
  returnValue: Node // may be null
  constructor() {
    super()
    this.returnValue = null
  }
}

export class BreakNode extends Node {
}

export class ContinueNode extends Node {
}

/**
 * Simply for parentheses which are not function call related, but just order of operations.
 */
export class ParenthesesNode extends MayBeUnparsedNode {
  expression: Node
  constructor() {
    super()
    this.expression = null
  }
  toString(): string {
    if (this.expression !== null) {
      return this.expression.toString()  // don't need to wrap in extra parentheses for printing. Operator nodes will already have them.
    }
    return "( <missing> )"
  }
}

export class FunctionCallNode extends MayBeUnparsedNode {
  functionObject: Node  // could also be a generic arg list node
  orderedArgs: Node[]
  keywordArgs: [string, Node][]
  constructor() {
    super()
    this.functionObject = null
    this.orderedArgs = []
    this.keywordArgs = []
  }
  children(): Node[] {
    let nodes = []
    if (this.functionObject !== null) nodes.push(this.functionObject)
    nodes = nodes.concat(this.orderedArgs)
    for (let tup of this.keywordArgs) {
      nodes.push(tup[1])
    }
    return nodes
  }
  toString(): string { return "( ... )" }
}

export class SquareBracketNode extends MayBeUnparsedNode {
  arrayObject: Node  // null if this is interpreted as an array literal
  contents: Node[]
  isAnyArray: boolean  // The contents of a {...} block denotes an Any array literal.
  constructor() {
    super()
    this.arrayObject = null
    this.contents = []
    this.isAnyArray = false
  }
  toString(): string { return "[ ... ]" }
}

//export class ArrayLiteralNode extends MayBeUnparsedNode {
//  contents: Node[]
//  isAnyArray: boolean  // The contents of a {...} block denotes an Any array literal.
//  constructor() {
//    super()
//    this.isAnyArray = false
//    this.contents = []
//  }
//  toString(): string { return "[ ... ]" }
//}



//export class IndexingNode extends MayBeUnparsedNode {
//  arrayObject: Node
//  indexingArgs: Node[]
//  constructor() {
//    super()
//    this.arrayObject = null
//    this.indexingArgs = []
//  }
//  toString(): string { return "[ ... ]" }
//}

/**
 * The contents of a {...} block that specifies arguments for a parameterized type.
 * Used for a type expression, not for a generic function declaration or a generic type declaration.
 *   ie applies to the {Int, 2} but not the {T} in
 *     function foo{T}(val::T, arr::Array{Int, 2}) ... end
 *
 */
export class GenericArgListNode extends MayBeUnparsedNode {
  typeName: Node // should resolve to a type name. Could be in parentheses though?
  params: Node[]  // param values should each evaluate to an expression
  constructor() {
    super()
    this.typeName = null
    this.params = []
  }
  toString(): string {
    let s = ""
    if (this.typeName !== null) s += this.typeName.toString()
    s += "{"
    if (this.params.length === 0) {
      s += "???"
    } else {
      for (let i = 0; i < this.params.length; i++) {
        s += this.params[i].toString()
        if (i !== this.params.length - 1) s += ","
      }
    }
    s += "}"
    return s
  }
}

/**
 * The contents of a {...} block that denotes the type arguments
 * for the declaration of either a generic function or a generic type.
 */
export class GenericDefArgListNode extends MayBeUnparsedNode {
  args: GenericArgNode[]
  constructor() {
    super()
    this.args = []
  }
  toString(): string {
    let s = ""
    s += "{"
    for (let i = 0; i < this.args.length; i++) {
      let arg = this.args[i]
      s += arg.toString()
      if (i !== this.args.length - 1) s += ","
    }
    s += "}"
    return s
  }
}

export class GenericArgNode extends Node {
  name: IdentifierNode
  restriction: Node  // null if no type restrictions

  constructor(name: IdentifierNode) {
    super()
    this.name = name
    this.restriction = null
  }

  toString(): string {
    let s = ""
    s += this.name.str
    if (this.restriction !== null) {
      s += "<:"
      s += this.restriction.toString()
    }
    return s
  }
}

export class FunctionDefNode extends MayBeUnparsedNode {
  name: MultiPartName      // can be empty if anonymous function declaration
  genericArgs: GenericDefArgListNode  // can be null if no generic parameters
  args: FunctionDefArgListNode
  bodyExpressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.name = []
    this.genericArgs = null
    this.args = new FunctionDefArgListNode()
    this.bodyExpressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
  toSignatureString(): string {
    let name = last(this.name).str
    let sig = name
    let genArgs = this.genericArgs
    if (genArgs !== null) {
      sig += genArgs.toString()
    }
    sig += this.args.toString()
    return sig
  }
  toString(): string {
    let s = "function "
    s += this.toSignatureString()
    s += " "
    for (let node of this.bodyExpressions) {
      s += node.toString()
      s += "; "
    }
    s += " end"
    return s
  }
}

export class FunctionDefArgNode extends Node {
  name: IdentifierNode // null if an unnamed argument
  type: Node          // null if no type annotation
  defaultValue: Node  // can be null if a required ordered arg
  isVarArgs: boolean // usually false. Only one arg can be var args.
  constructor() {
    super()
    this.name = null
    this.type = null
    this.defaultValue = null
    this.isVarArgs = false
  }
  toString(): string {
    let s = ""
    if (this.name !== null) s += this.name.str
    if (this.type !== null) s += "::" + this.type.toString()
    if (this.defaultValue !== null) s += "=" + this.defaultValue.toString()
    if (this.isVarArgs) s += "..."
    return s
  }
  toSnippet(snippetIndex: number): string {
    let s = "${" + snippetIndex + ":"
    if (this.name !== null) s += this.name.str
    if (this.type !== null) s += "::" + this.type.toString()
    if (this.defaultValue !== null) s += "=" + this.defaultValue.toString()
    if (this.isVarArgs) s += "..."
    s = s.replace(/}/g, "\\}")
    s += "}"
    return s
  }

}

export class FunctionDefArgListNode extends MayBeUnparsedNode {
  orderedArgs: FunctionDefArgNode[]
  keywordArgs: FunctionDefArgNode[]
  constructor() {
    super()
    this.orderedArgs = []
    this.keywordArgs = []
  }
  toString(): string {
    let s = ""
    s += "("
    for (let i = 0; i < this.orderedArgs.length; i++) {
      let arg = this.orderedArgs[i]
      s += arg.toString()
      if (i !== this.orderedArgs.length - 1) s += ", "
    }
    if (this.keywordArgs.length > 0) s += "; "
    for (let i = 0; i < this.keywordArgs.length; i++) {
      let arg = this.keywordArgs[i]
      s += arg.toString()
      if (i !== this.keywordArgs.length - 1) s += ", "
    }
    s += ")"
    return s
  }
  toSnippetString(): string {
    let s = ""
    let orderedArgs = this.orderedArgs
    let keywordArgs = this.keywordArgs
    let snippetIndex = 1
    for (let i = 0; i < orderedArgs.length; i++) {
      let arg = orderedArgs[i]
      s += arg.toSnippet(snippetIndex)
      snippetIndex++
      if (i !== orderedArgs.length - 1) s += ", "
    }
    if (orderedArgs.length > 0 && keywordArgs.length > 0) s += "; "
    for (let i = 0; i < keywordArgs.length; i++) {
      let arg = keywordArgs[i]
      s += arg.toSnippet(snippetIndex)
      snippetIndex++
      if (i !== keywordArgs.length - 1) s += ", "
    }
    return s
  }
}

export class MacroDefNode extends MayBeUnparsedNode {
  name: IdentifierNode  // without '@'  null only if parse failure
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.name = null
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

export class CodeQuoteNode extends MayBeUnparsedNode {
}

//export class AbstractDefNode extends Node {
//  name: IdentifierNode
//  parentType: Node  // can be null
//  constructor(name: IdentifierNode) {
//    super()
//    this.name = name
//    this.parentType = null
//  }
//}
//
//export class BitsTypeNode extends Node {
//  name: IdentifierNode
//  numbits: NumberNode
//  parentType: Node  // can be null
//  constructor() {
//    super()
//    this.numbits = null
//    this.name = null
//    this.parentType = null
//  }
//}

/**
 * Represents regular types, immutable types, abstract types, bits types, and type aliases.
 */
export class TypeDefNode extends MayBeUnparsedNode {
  name: IdentifierNode  // null only if parse failure
  genericArgs: GenericDefArgListNode  // can be null if no generic parameters
  parentType: Node // can be null
  fields: FieldNode[]
  numbits: NumberNode  // null unless is bits type
  alias: Node // null unless is alias
  bodyContents: Node[]  // expressions in a type...end body, not including the fields
  scopeStartToken: Token
  scopeEndToken: Token

  isImmutable: boolean
  isAbstract: boolean
  isBitsType: boolean
  isAlias: boolean
  constructor() {
    super()
    this.name = null
    this.genericArgs = null
    this.parentType = null
    this.fields = []
    this.numbits = null
    this.alias = null
    this.bodyContents = []
    this.scopeStartToken = null
    this.scopeEndToken = null

    this.isImmutable = false
    this.isAbstract = false
    this.isBitsType = false
    this.isAlias = false
  }
}

/**
 * Field in a type...end declaration.
 */
export class FieldNode extends Node {
  name: IdentifierNode
  type: Node   // null if no type annotation
  constructor(name: IdentifierNode) {
    super()
    this.name = name
    this.type = null
  }
}

export class BeginBlockNode extends MayBeUnparsedNode {
  expressions: Node[]
  constructor() {
    super()
    this.expressions = []
  }
}

export class IfBlockNode extends MayBeUnparsedNode {
  ifCondition: Node  // null only if parse failure
  elseIfConditions: Node[]
  ifBlock: MultiExpressionNode
  elseIfBlocks: MultiExpressionNode[]
  elseBlock: MultiExpressionNode
  constructor() {
    super()
    this.ifCondition = null
    this.elseIfConditions = []
    this.ifBlock = new MultiExpressionNode()
    this.elseIfBlocks = []
    this.elseBlock = null
  }
}

export class ForBlockNode extends MayBeUnparsedNode {
  iterVariable: IdentifierNode[] // one or more if given as a tuple: for (a, b) in arr ...    null only if parse failure
  range: Node  // null only if parse failure
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.iterVariable = []
    this.range = null
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

export class WhileBlockNode extends MayBeUnparsedNode {
  condition: Node   // null only if parse failure
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.condition = null
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

export class DoBlockNode extends MayBeUnparsedNode {
  prefixExpression: Node   // eg map([A, B, C]) do ... end      null only if parse failure
  argList: DoBlockArgNode[]
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.prefixExpression = null
    this.argList = []
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

export class DoBlockArgNode extends Node {
  name: IdentifierNode
  type: Node     // null if no type annotation
  constructor(name: IdentifierNode) {
    super()
    this.name = name
    this.type = null
  }
}

export class LetBlockNode extends MayBeUnparsedNode {
  names: VarDeclItemNode[]
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.names = []
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

export class TryBlockNode extends MayBeUnparsedNode {
  tryBlock: ScopedMultiExpressionNode
  catchErrorVariable: IdentifierNode  // null if none declared
  catchBlock: ScopedMultiExpressionNode // may be null
  finallyBlock: ScopedMultiExpressionNode // may be null
  constructor() {
    super()
    this.tryBlock = new ScopedMultiExpressionNode()
    this.catchErrorVariable = null
    this.catchBlock = null
    this.finallyBlock = null
  }
}

export class MacroInvocationNode extends MayBeUnparsedNode {
  name: MultiPartName // the @ sign may be on the first part or the last part
  params: Node[]
  constructor() {
    super()
    this.name = []
    this.params = []
  }
}



export abstract class ModuleContentsNode extends MayBeUnparsedNode {
  expressions: Node[]
  scopeStartToken: Token
  scopeEndToken: Token
  constructor() {
    super()
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}


export class ModuleDefNode extends ModuleContentsNode {
  name: IdentifierNode    // null only if parse failure
  isBareModule: boolean
  constructor() {
    super()
    this.name = null
    this.isBareModule = false
  }
}

export class FileLevelNode extends ModuleContentsNode {
  path: string
  constructor(path: string) {
    super()
    this.path = path
  }
  reset(): void {
    this.expressions = []
    this.scopeStartToken = null
    this.scopeEndToken = null
  }
}

/**
 * A name like Foo.Bar.func
 * (qualified by its module path).
 */
export type MultiPartName = IdentifierNode[]

export class LoadNamesNode extends Node {
  prefix: MultiPartName // eg the 'Foo' in 'import Foo: a, b, c'.   Can be null.
  names: MultiPartName[] // comma delimited names to import. Names can be compound paths delimited by period.
  constructor() {
    super()
    this.prefix = null
    this.names = []
  }
  getNamesWithPrefix(): IdentifierNode[][] {
    let arr: IdentifierNode[][] = []
    for (let name of this.names) {
      if (this.prefix !== null) {
        arr.push(this.prefix.concat(name))
      } else {
        arr.push(name.slice())
      }
    }
    return arr
  }
}
export class ImportNode extends LoadNamesNode {}
export class ImportAllNode extends LoadNamesNode {}
export class UsingNode extends LoadNamesNode {}

export class ExportNode extends Node {
  names: IdentifierNode[]
  point: Point
  constructor(point: Point) {
    super()
    this.names = []
    this.point = point
  }
}

export class IncludeNode extends Node {
  includeString: StringLiteralNode
  relativePath: string
  point: Point
  constructor(stringLitNode: StringLiteralNode) {
    super()
    this.includeString = stringLitNode
    this.relativePath = stringLitNode.value
    this.point = stringLitNode.token.range.start
  }
}











/**
 * does BFS to get all nodes in tree
 */
export function getAllNodes(node: Node): Node[] {

  let nodes: Node[] = []
  let toSearch: Node[] = []
  toSearch.push(node)

  while (toSearch.length > 0) {
    let iNode: Node = toSearch.shift()
    nodes.push(iNode)
    for (let jChild of iNode.children()) {
      toSearch.push(jChild)
    }
  }

  return nodes
}



