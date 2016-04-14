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
var arrayUtils_1 = require("../utils/arrayUtils");
var operatorsAndKeywords_1 = require("./../tokens/operatorsAndKeywords");
var assert_1 = require("../utils/assert");
class Node {
    constructor() {
    }
    /**
     * Get the immediate children of this node as a new array.
     */
    children() {
        let nodes = [];
        for (let field in this) {
            let val = this[field];
            if (val !== null) {
                if (val instanceof Node) {
                    nodes.push(val);
                }
                else if (val instanceof Array) {
                    for (let item of val) {
                        if (item instanceof Node) {
                            nodes.push(item);
                        }
                    }
                }
            }
        }
        return nodes;
    }
}
exports.Node = Node;
class MayBeUnparsedNode extends Node {
    constructor() {
        super();
        this.unparsedContents = null;
        this.parseError = null;
        this.parseSkipped = false;
    }
}
exports.MayBeUnparsedNode = MayBeUnparsedNode;
/**
 * Represents a sequence of expressions
 */
class MultiExpressionNode extends Node {
    constructor() {
        super();
        this.expressions = [];
    }
}
exports.MultiExpressionNode = MultiExpressionNode;
class ScopedMultiExpressionNode extends Node {
    constructor() {
        super();
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.ScopedMultiExpressionNode = ScopedMultiExpressionNode;
class NumberNode extends Node {
    constructor(token) {
        super();
        this.value = token.str;
        this.token = token;
    }
    toString() { return this.value; }
}
exports.NumberNode = NumberNode;
class SymbolNode extends Node {
    constructor(token) {
        super();
        this.token = token;
    }
}
exports.SymbolNode = SymbolNode;
class IdentifierNode extends Node {
    constructor(token) {
        super();
        if (token.type !== operatorsAndKeywords_1.TokenType.Identifier && token.type !== operatorsAndKeywords_1.TokenType.Macro)
            throw new assert_1.AssertError("");
        this.str = token.str;
        this.token = token;
    }
    isEndIndex() {
        return this.str === "end";
    }
    isColon() {
        return this.str === ":";
    }
    isSpecialIdentifier() {
        return this.isEndIndex() || this.isColon(); // || this.str in operatorsThatAreIdentifiers
    }
    toString() { return this.str; }
}
exports.IdentifierNode = IdentifierNode;
class VarDeclarationNode extends Node {
    constructor(declType) {
        super();
        this.declType = declType;
        this.names = [];
    }
}
exports.VarDeclarationNode = VarDeclarationNode;
class VarDeclItemNode extends Node {
    constructor(name) {
        super();
        this.name = name;
        this.type = null;
        this.value = null;
    }
}
exports.VarDeclItemNode = VarDeclItemNode;
class InterpolatedStringNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.contents = [];
        this.isBackTick = false;
    }
}
exports.InterpolatedStringNode = InterpolatedStringNode;
class StringLiteralNode extends Node {
    constructor(token) {
        super();
        this.token = token;
        if (token.type !== operatorsAndKeywords_1.TokenType.StringLiteralContents)
            throw new assert_1.AssertError("");
        this.token = token;
        this.value = token.str;
        this.isBackTick = false;
    }
}
exports.StringLiteralNode = StringLiteralNode;
/**
 * eg regex r"" or bytestring b""
 */
class StringMacroNode extends Node {
    constructor(token) {
        super();
        this.token = token;
    }
}
exports.StringMacroNode = StringMacroNode;
class EmptyTupleNode extends Node {
    constructor() {
        super();
    }
    toString() { return "()"; }
}
exports.EmptyTupleNode = EmptyTupleNode;
/**
 * Consolidates multiple ',' operators into one node.
 */
class TupleNode extends Node {
    constructor() {
        super();
        this.nodes = [];
    }
}
exports.TupleNode = TupleNode;
/**
 * Consolidates multiple '.' operators into one node.
 */
class MultiDotNode extends Node {
    constructor() {
        super();
        this.nodes = [];
    }
}
exports.MultiDotNode = MultiDotNode;
class UnaryOpNode extends Node {
    constructor(token) {
        super();
        this.op = token.str;
        this.token = token;
        this.arg = null;
    }
    toString() {
        let s = this.op;
        if (this.arg !== null)
            s = s + this.arg.toString();
        return "(" + s + ")";
    }
}
exports.UnaryOpNode = UnaryOpNode;
class BinaryOpNode extends Node {
    constructor(token) {
        super();
        if (token.type !== operatorsAndKeywords_1.TokenType.Operator)
            throw new assert_1.AssertError("");
        this.token = token;
        this.op = token.str;
        this.arg1 = null;
        this.arg2 = null;
    }
    toString() {
        let s = this.op;
        if (this.arg1 !== null)
            s = this.arg1.toString() + s;
        if (this.arg2 !== null)
            s = s + this.arg2.toString();
        s = "(" + s + ")";
        return s;
    }
}
exports.BinaryOpNode = BinaryOpNode;
class TernaryOpNode extends Node {
    constructor(questionMarkToken) {
        super();
        this.questionMarkToken = questionMarkToken;
        this.condition = null;
        this.trueExpression = null;
        this.falseExpression = null;
    }
    toString() { return "? :"; }
}
exports.TernaryOpNode = TernaryOpNode;
class PostFixOpNode extends Node {
    constructor(token) {
        super();
        this.op = token.str;
        this.token = token;
        this.arg = null;
    }
}
exports.PostFixOpNode = PostFixOpNode;
class ReturnNode extends Node {
    constructor() {
        super();
        this.returnValue = null;
    }
}
exports.ReturnNode = ReturnNode;
class BreakNode extends Node {
}
exports.BreakNode = BreakNode;
class ContinueNode extends Node {
}
exports.ContinueNode = ContinueNode;
/**
 * Simply for parentheses which are not function call related, but just order of operations.
 */
class ParenthesesNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.expression = null;
    }
    toString() {
        if (this.expression !== null) {
            return this.expression.toString(); // don't need to wrap in extra parentheses for printing. Operator nodes will already have them.
        }
        return "( <missing> )";
    }
}
exports.ParenthesesNode = ParenthesesNode;
class FunctionCallNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.functionObject = null;
        this.orderedArgs = [];
        this.keywordArgs = [];
    }
    children() {
        let nodes = [];
        if (this.functionObject !== null)
            nodes.push(this.functionObject);
        nodes = nodes.concat(this.orderedArgs);
        for (let tup of this.keywordArgs) {
            nodes.push(tup[1]);
        }
        return nodes;
    }
    toString() { return "( ... )"; }
}
exports.FunctionCallNode = FunctionCallNode;
class SquareBracketNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.arrayObject = null;
        this.contents = [];
        this.isAnyArray = false;
    }
    toString() {
        let s = "";
        if (this.arrayObject !== null) {
            s += this.arrayObject.toString();
        }
        if (this.isAnyArray) {
            s += "{";
        }
        else {
            s += "[";
        }
        // delimiters not retained. Just report ',' for now.
        for (let i = 0; i < this.contents.length; i++) {
            s += this.contents[i].toString();
            if (i !== this.contents.length - 1)
                s += ",";
        }
        if (this.isAnyArray) {
            s += "}";
        }
        else {
            s += "]";
        }
        return s;
    }
}
exports.SquareBracketNode = SquareBracketNode;
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
class GenericArgListNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.typeName = null;
        this.params = [];
    }
    toString() {
        let s = "";
        if (this.typeName !== null)
            s += this.typeName.toString();
        s += "{";
        if (this.params.length === 0) {
            s += "???";
        }
        else {
            for (let i = 0; i < this.params.length; i++) {
                s += this.params[i].toString();
                if (i !== this.params.length - 1)
                    s += ",";
            }
        }
        s += "}";
        return s;
    }
}
exports.GenericArgListNode = GenericArgListNode;
/**
 * The contents of a {...} block that denotes the type arguments
 * for the declaration of either a generic function or a generic type.
 */
class GenericDefArgListNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.args = [];
    }
    toString() {
        let s = "";
        s += "{";
        for (let i = 0; i < this.args.length; i++) {
            let arg = this.args[i];
            s += arg.toString();
            if (i !== this.args.length - 1)
                s += ",";
        }
        s += "}";
        return s;
    }
}
exports.GenericDefArgListNode = GenericDefArgListNode;
class GenericArgNode extends Node {
    constructor(name) {
        super();
        this.name = name;
        this.restriction = null;
    }
    toString() {
        let s = "";
        s += this.name.str;
        if (this.restriction !== null) {
            s += "<:";
            s += this.restriction.toString();
        }
        return s;
    }
}
exports.GenericArgNode = GenericArgNode;
class FunctionDefNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.name = [];
        this.genericArgs = null;
        this.args = new FunctionDefArgListNode();
        this.bodyExpressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
    toSignatureString() {
        let name = arrayUtils_1.last(this.name).str;
        let sig = name;
        let genArgs = this.genericArgs;
        if (genArgs !== null) {
            sig += genArgs.toString();
        }
        sig += this.args.toString();
        return sig;
    }
    toString() {
        let s = "function ";
        s += this.toSignatureString();
        s += " ";
        for (let node of this.bodyExpressions) {
            s += node.toString();
            s += "; ";
        }
        s += " end";
        return s;
    }
}
exports.FunctionDefNode = FunctionDefNode;
class FunctionDefArgNode extends Node {
    constructor() {
        super();
        this.name = null;
        this.type = null;
        this.defaultValue = null;
        this.isVarArgs = false;
    }
    toString() {
        let s = "";
        if (this.name !== null)
            s += this.name.str;
        if (this.type !== null)
            s += "::" + this.type.toString();
        if (this.defaultValue !== null)
            s += "=" + this.defaultValue.toString();
        if (this.isVarArgs)
            s += "...";
        return s;
    }
    toSnippet(snippetIndex) {
        let s = "${" + snippetIndex + ":";
        if (this.name !== null)
            s += this.name.str;
        if (this.type !== null)
            s += "::" + this.type.toString();
        if (this.defaultValue !== null)
            s += "=" + this.defaultValue.toString();
        if (this.isVarArgs)
            s += "...";
        s = s.replace(/}/g, "\\}");
        s += "}";
        return s;
    }
}
exports.FunctionDefArgNode = FunctionDefArgNode;
class FunctionDefArgListNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.orderedArgs = [];
        this.keywordArgs = [];
    }
    toString() {
        let s = "";
        s += "(";
        for (let i = 0; i < this.orderedArgs.length; i++) {
            let arg = this.orderedArgs[i];
            s += arg.toString();
            if (i !== this.orderedArgs.length - 1)
                s += ", ";
        }
        if (this.keywordArgs.length > 0)
            s += "; ";
        for (let i = 0; i < this.keywordArgs.length; i++) {
            let arg = this.keywordArgs[i];
            s += arg.toString();
            if (i !== this.keywordArgs.length - 1)
                s += ", ";
        }
        s += ")";
        return s;
    }
    toSnippetString() {
        let s = "";
        let orderedArgs = this.orderedArgs;
        let keywordArgs = this.keywordArgs;
        let snippetIndex = 1;
        for (let i = 0; i < orderedArgs.length; i++) {
            let arg = orderedArgs[i];
            s += arg.toSnippet(snippetIndex);
            snippetIndex++;
            if (i !== orderedArgs.length - 1)
                s += ", ";
        }
        if (orderedArgs.length > 0 && keywordArgs.length > 0)
            s += "; ";
        for (let i = 0; i < keywordArgs.length; i++) {
            let arg = keywordArgs[i];
            s += arg.toSnippet(snippetIndex);
            snippetIndex++;
            if (i !== keywordArgs.length - 1)
                s += ", ";
        }
        return s;
    }
}
exports.FunctionDefArgListNode = FunctionDefArgListNode;
class MacroDefNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.name = null;
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.MacroDefNode = MacroDefNode;
class CodeQuoteNode extends MayBeUnparsedNode {
}
exports.CodeQuoteNode = CodeQuoteNode;
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
class TypeDefNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.name = null;
        this.genericArgs = null;
        this.parentType = null;
        this.fields = [];
        this.numbits = null;
        this.alias = null;
        this.bodyContents = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
        this.isImmutable = false;
        this.isAbstract = false;
        this.isBitsType = false;
        this.isAlias = false;
    }
}
exports.TypeDefNode = TypeDefNode;
/**
 * Field in a type...end declaration.
 */
class FieldNode extends Node {
    constructor(name) {
        super();
        this.name = name;
        this.type = null;
    }
}
exports.FieldNode = FieldNode;
class BeginBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.expressions = [];
    }
}
exports.BeginBlockNode = BeginBlockNode;
class IfBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.ifCondition = null;
        this.elseIfConditions = [];
        this.ifBlock = new MultiExpressionNode();
        this.elseIfBlocks = [];
        this.elseBlock = null;
    }
}
exports.IfBlockNode = IfBlockNode;
class ForBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.iterVariable = [];
        this.range = null;
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.ForBlockNode = ForBlockNode;
class WhileBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.condition = null;
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.WhileBlockNode = WhileBlockNode;
class DoBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.prefixExpression = null;
        this.argList = [];
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.DoBlockNode = DoBlockNode;
class DoBlockArgNode extends Node {
    constructor(name) {
        super();
        this.name = name;
        this.type = null;
    }
}
exports.DoBlockArgNode = DoBlockArgNode;
class LetBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.names = [];
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.LetBlockNode = LetBlockNode;
class TryBlockNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.tryBlock = new ScopedMultiExpressionNode();
        this.catchErrorVariable = null;
        this.catchBlock = null;
        this.finallyBlock = null;
    }
}
exports.TryBlockNode = TryBlockNode;
class MacroInvocationNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.name = [];
        this.params = [];
    }
}
exports.MacroInvocationNode = MacroInvocationNode;
class ModuleContentsNode extends MayBeUnparsedNode {
    constructor() {
        super();
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.ModuleContentsNode = ModuleContentsNode;
class ModuleDefNode extends ModuleContentsNode {
    constructor() {
        super();
        this.name = null;
        this.isBareModule = false;
    }
}
exports.ModuleDefNode = ModuleDefNode;
class FileLevelNode extends ModuleContentsNode {
    constructor(path) {
        super();
        this.path = path;
    }
    reset() {
        this.expressions = [];
        this.scopeStartToken = null;
        this.scopeEndToken = null;
    }
}
exports.FileLevelNode = FileLevelNode;
class LoadNamesNode extends Node {
    constructor() {
        super();
        this.prefix = null;
        this.names = [];
    }
    getNamesWithPrefix() {
        let arr = [];
        for (let name of this.names) {
            if (this.prefix !== null) {
                arr.push(this.prefix.concat(name));
            }
            else {
                arr.push(name.slice());
            }
        }
        return arr;
    }
}
exports.LoadNamesNode = LoadNamesNode;
class ImportNode extends LoadNamesNode {
}
exports.ImportNode = ImportNode;
class ImportAllNode extends LoadNamesNode {
}
exports.ImportAllNode = ImportAllNode;
class UsingNode extends LoadNamesNode {
}
exports.UsingNode = UsingNode;
class ExportNode extends Node {
    constructor(point) {
        super();
        this.names = [];
        this.point = point;
    }
}
exports.ExportNode = ExportNode;
class IncludeNode extends Node {
    constructor(stringLitNode) {
        super();
        this.includeString = stringLitNode;
        this.relativePath = stringLitNode.value;
        this.point = stringLitNode.token.range.start;
    }
}
exports.IncludeNode = IncludeNode;
/**
 * does BFS to get all nodes in tree
 */
function getAllNodes(node) {
    let nodes = [];
    let toSearch = [];
    toSearch.push(node);
    while (toSearch.length > 0) {
        let iNode = toSearch.shift();
        nodes.push(iNode);
        for (let jChild of iNode.children()) {
            toSearch.push(jChild);
        }
    }
    return nodes;
}
exports.getAllNodes = getAllNodes;
//# sourceMappingURL=nodes.js.map