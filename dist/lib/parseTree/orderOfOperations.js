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
var Token_1 = require("../tokens/Token");
var nodes_1 = require("./nodes");
var nodes_2 = require("./nodes");
var StringSet_1 = require("../utils/StringSet");
var operatorsAndKeywords_1 = require("../tokens/operatorsAndKeywords");
var nodes_3 = require("./nodes");
var nodes_4 = require("./nodes");
var assert_1 = require("../utils/assert");
var StringSet_2 = require("./../utils/StringSet");
var operatorsAndKeywords_2 = require("./../tokens/operatorsAndKeywords");
var StringSet_3 = require("./../utils/StringSet");
var nodes_5 = require("./nodes");
var nodes_6 = require("./nodes");
var nodes_7 = require("./nodes");
var errors_1 = require("./../utils/errors");
var nodes_8 = require("./nodes");
var nodes_9 = require("./nodes");
var operatorsAndKeywords_3 = require("../tokens/operatorsAndKeywords");
var operatorsAndKeywords_4 = require("../tokens/operatorsAndKeywords");
var operatorsAndKeywords_5 = require("../tokens/operatorsAndKeywords");
var operatorsAndKeywords_6 = require("../tokens/operatorsAndKeywords");
var nodes_10 = require("./nodes");
//import {ArrayLiteralNode} from "./nodes";
//import {IndexingNode} from "./nodes";
var nodes_11 = require("./nodes");
const UNARY_LEVEL = 3;
const ASSIGNMENTS_LEVEL = 17;
// binary operators are left to right associative except for assignments (and unary operators)
var orderOfOperationsRaw = [
    // bind generic type qualifications eg Foo{T} before any other operators, particularly before ::, so that val::Array{T} evaluates correctly
    [".", "::"],
    ["'"],
    ["^", ".^"],
    StringSet_2.stringSetToArray(operatorsAndKeywords_1.unaryOperators),
    ["//", ".//"],
    ["*", "/", "\\", "%", "÷", "&", ".*", "./", ".\\", ".%", ".÷"],
    ["<<", ">>", ">>>", ".<<", ".>>", ".>>>"],
    ["+", "-", "|", "$", ".+", ".-"],
    [":", ".."],
    ["|>"],
    [">", ">=", "<=", "<", "==", "===", "!=", "!==", "<:", ".>", ".>=", ".<=", ".<", ".==", ".!=", "≠", "≤", "≥"],
    ["&&"],
    ["||"],
    ["in", "∈", "∋", "∉", "∌"],
    ["?"],
    [",", "=>"],
    ["..."],
    StringSet_2.stringSetToArray(StringSet_1.mergeSets([operatorsAndKeywords_2.assignmentOperators, operatorsAndKeywords_6.elementWiseAssignmentOperators])) // assignments. These are right to left associative
];
var orderOfOperations = [];
for (let oooLevel of orderOfOperationsRaw) {
    orderOfOperations.push(StringSet_3.createStringSet(oooLevel));
}
// assert that all unary, binary, ternary, and postfix operators are accounted for
function foundInOrderOfOperations(op) {
    for (let level of orderOfOperations) {
        if (op in level)
            return true;
    }
    return false;
}
for (let op in operatorsAndKeywords_1.unaryOperators) {
    if (!foundInOrderOfOperations(op))
        throw new assert_1.AssertError("Operator '" + op + "' not accounted for in order of operations.");
}
for (let op in operatorsAndKeywords_3.binaryOperators) {
    if (!foundInOrderOfOperations(op))
        throw new assert_1.AssertError("Operator '" + op + "' not accounted for in order of operations.");
}
if (!foundInOrderOfOperations("?"))
    throw new assert_1.AssertError("Operator '?' not accounted for in order of operations.");
for (let op in operatorsAndKeywords_5.postFixOperators) {
    if (!foundInOrderOfOperations(op))
        throw new assert_1.AssertError("Operator '" + op + "' not accounted for in order of operations.");
}
/**
 * Parse a series of nodes in a full expression tree based upon the order of operations.
 *
 * During the parse, any assignments to an identifier will be noted as creating a name.
 *
 */
function parseIntoTreeByOrderOfOperations(nodes, wholeState) {
    // TODO function invocations, indexings, type {} specifications
    // shallow copy of array
    nodes = nodes.slice();
    let origNodes = nodes.slice(); //useful to keep for debugging
    // generic args, left to right, before anything else
    for (let idx = 0; idx < nodes.length; idx++) {
        let node = nodes[idx];
        if (node instanceof nodes_9.GenericArgListNode) {
            let idxOffset = joinGenericArgListToType(nodes, idx);
            idx += idxOffset;
        }
    }
    for (let iOrderLevel = 0; iOrderLevel < orderOfOperations.length; iOrderLevel++) {
        let orderLevel = orderOfOperations[iOrderLevel];
        let isUnaryLevel = iOrderLevel === UNARY_LEVEL;
        let isAssignmentsLevel = iOrderLevel === ASSIGNMENTS_LEVEL;
        let isLeftToRight = !(isUnaryLevel || isAssignmentsLevel);
        if (isLeftToRight) {
            // left to right associativity
            // read tokens from left to right, searching for any binary operators,
            // and then joining the nodes immediately to their right and left
            for (let idx = 0; idx < nodes.length; idx++) {
                let node = nodes[idx];
                // join () [] with left to right associativity
                if (node instanceof nodes_8.FunctionCallNode) {
                    if (iOrderLevel === 0) {
                        let idxOffset = joinFunctionCallToFunctionObject(nodes, idx);
                        idx += idxOffset;
                    }
                }
                else if (node instanceof nodes_11.SquareBracketNode) {
                    if (iOrderLevel === 0) {
                        let idxOffset = joinSquareBracketToArrayObject(nodes, idx);
                        idx += idxOffset;
                    }
                }
                else if (node instanceof nodes_1.DoBlockNode) {
                    if (iOrderLevel === 0) {
                        let idxOffset = joinDoBlock(nodes, idx);
                        idx += idxOffset;
                    }
                }
                else if (node instanceof nodes_5.BinaryOpNode) {
                    let opNode = node;
                    if (opNode.op in orderLevel) {
                        // handle situation like: 10^-2
                        if (iOrderLevel < UNARY_LEVEL && idx < nodes.length - 1) {
                            if (nodes[idx + 1] instanceof nodes_6.UnaryOpNode) {
                                joinMultipleUnaryToRightOfBinary(nodes, idx);
                            }
                        }
                        let idxOffset = joinBinaryOperands(nodes, idx);
                        idx += idxOffset;
                    }
                }
                else if (node instanceof nodes_7.TernaryOpNode) {
                    if ("?" in orderLevel) {
                        let idxOffset = joinTernaryOperands(nodes, idx);
                        idx += idxOffset;
                    }
                }
                else if (node instanceof nodes_3.PostFixOpNode) {
                    let opNode = node;
                    if (opNode.op in orderLevel) {
                        let idxOffset = joinPostFixOperands(nodes, idx);
                        idx += idxOffset;
                    }
                }
            }
        }
        else {
            // right to left associativity
            for (let idx = nodes.length - 1; idx >= 0; idx--) {
                let node = nodes[idx];
                if (isUnaryLevel) {
                    if (node instanceof nodes_6.UnaryOpNode) {
                        let opNode = node;
                        if (opNode.op in orderLevel) {
                            let idxOffset = joinUnaryOperands(nodes, idx);
                            idx += idxOffset;
                        }
                    }
                }
                else {
                    if (node instanceof nodes_5.BinaryOpNode) {
                        let opNode = node;
                        if (opNode.op in orderLevel) {
                            let idxOffset = joinBinaryOperands(nodes, idx);
                            idx += idxOffset;
                        }
                    }
                }
            }
        } // isLeftToRight
    } // for iOrderLevel
    // may be a return statement
    if (nodes[0] instanceof nodes_4.ReturnNode) {
        if (nodes.length > 1) {
            let retNode = nodes[0];
            let retValue = nodes[1];
            retNode.returnValue = retValue;
            nodes.splice(0, 2, retNode);
        }
    }
    if (nodes.length !== 1) {
        let msg = "Failed to sort by order of operations! Still has " + nodes.length + " nodes in the sequence. Nodes are:\n";
        for (let node of nodes) {
            msg += node.toString();
            msg += "\n";
        }
        // assert error because anything resulting from an ExpressionFsa should be fully accounted for.
        // Shouldn't be possible to provide an expression that satisfies the FSA and doesn't fit the order of operations here.
        throw new errors_1.InvalidParseError(msg, Token_1.Token.createEmptyIdentifier(""));
    }
    return nodes[0];
}
exports.parseIntoTreeByOrderOfOperations = parseIntoTreeByOrderOfOperations;
function joinUnaryOperands(nodes, opIndex) {
    if (opIndex === nodes.length - 1)
        throw new assert_1.AssertError("Unary op needs a right operand!");
    let opNode = nodes[opIndex];
    opNode.arg = nodes[opIndex + 1];
    nodes.splice(opIndex, 2, opNode);
    return 0;
}
function joinMultipleUnaryToRightOfBinary(nodes, binaryOpIndex) {
    // to handle 10 ^ -4
    //  (or 10 ^ --+-4)
    // need to process unary ops before higher precedence binary ops like '^'
    // if they appear on the immediate right of the binary op.
    // However, the unary ops are still lower precedence,
    // ie -2^2 == -4  not +4
    //
    // Doesn't handle populate arg1 or arg2 of the binary op. Just joins the unary operands together.
    let closestUnaryIndex = binaryOpIndex + 1;
    if (closestUnaryIndex >= nodes.length - 1)
        throw new assert_1.AssertError("Unary op needs right operand");
    if (!(nodes[closestUnaryIndex] instanceof nodes_6.UnaryOpNode))
        throw new assert_1.AssertError("Must call only if unary op to right of binary.");
    let firstUnaryIndex = closestUnaryIndex;
    for (let idx = closestUnaryIndex; idx < nodes.length; idx++) {
        if (nodes[idx] instanceof nodes_6.UnaryOpNode) {
            firstUnaryIndex = idx;
        }
        else {
            break;
        }
    }
    for (let idx = firstUnaryIndex; idx >= closestUnaryIndex; idx--) {
        let idxOffset = joinUnaryOperands(nodes, idx);
        idx += idxOffset;
    }
}
function joinPostFixOperands(nodes, opIndex) {
    if (opIndex === 0)
        throw new assert_1.AssertError("Needs a left operand!");
    let opNode = nodes[opIndex];
    opNode.arg = nodes[opIndex - 1];
    nodes.splice(opIndex - 1, 2, opNode);
    return -1;
}
function joinDoBlock(nodes, opIndex) {
    if (opIndex === 0)
        throw new assert_1.AssertError("Needs a left operand!");
    let opNode = nodes[opIndex];
    opNode.prefixExpression = nodes[opIndex - 1];
    nodes.splice(opIndex - 1, 2, opNode);
    return -1;
}
/**
 *
 * @param nodes Modifies this array in place.
 * @param opIndex
 */
function joinBinaryOperands(nodes, opIndex) {
    let opNode = nodes[opIndex];
    let mayOmitArg2 = opNode.op in operatorsAndKeywords_4.binaryOperatorsMayOmitArg2;
    if (opIndex === 0)
        throw new assert_1.AssertError("Binary op needs a left operand!");
    if (!mayOmitArg2 && opIndex === nodes.length - 1)
        throw new assert_1.AssertError("Binary op needs a right operand!");
    opNode.arg1 = nodes[opIndex - 1];
    if (mayOmitArg2 && opIndex === nodes.length - 1) {
        // no trailing operand
        nodes.splice(opIndex - 1, 2, opNode);
    }
    else {
        opNode.arg2 = nodes[opIndex + 1];
        nodes.splice(opIndex - 1, 3, opNode);
    }
    // join tuples into a new node
    if (opNode.op === ",") {
        let tupleNode = null;
        if (opNode.arg1 instanceof nodes_10.TupleNode) {
            tupleNode = opNode.arg1;
            if (opNode.arg2 !== null)
                tupleNode.nodes.push(opNode.arg2);
        }
        else {
            tupleNode = new nodes_10.TupleNode();
            tupleNode.nodes.push(opNode.arg1);
            if (opNode.arg2 !== null)
                tupleNode.nodes.push(opNode.arg2);
        }
        opIndex -= 1;
        nodes.splice(opIndex, 1, tupleNode);
    }
    else if (opNode.op === ".") {
        let multiDotNode = null;
        if (opNode.arg1 instanceof nodes_2.MultiDotNode) {
            multiDotNode = opNode.arg1;
            multiDotNode.nodes.push(opNode.arg2);
        }
        else {
            multiDotNode = new nodes_2.MultiDotNode();
            multiDotNode.nodes.push(opNode.arg1);
            multiDotNode.nodes.push(opNode.arg2);
        }
        opIndex -= 1;
        nodes.splice(opIndex, 1, multiDotNode);
    }
    return -1;
}
function joinTernaryOperands(nodes, opIndex) {
    // pretty much same as binary
    if (opIndex === 0)
        throw new assert_1.AssertError("Ternary op needs a left operand before '?' !");
    if (opIndex === nodes.length - 1)
        throw new assert_1.AssertError("Ternary op needs a right operand after ':' !");
    let opNode = nodes[opIndex];
    opNode.condition = nodes[opIndex - 1];
    opNode.falseExpression = nodes[opIndex + 1];
    // true expression should be already set during the parsing
    nodes.splice(opIndex - 1, 3, opNode);
    return -1;
}
function joinFunctionCallToFunctionObject(nodes, parenIndex) {
    if (parenIndex === 0) {
        throw new assert_1.AssertError("() needs a left operand!");
    }
    let opNode = nodes[parenIndex];
    opNode.functionObject = nodes[parenIndex - 1];
    nodes.splice(parenIndex - 1, 2, opNode);
    return -1;
}
//function joinIndexingToArrayObject(nodes: Node[], bracketIndex: number): number {
//  if (bracketIndex === 0) {
//    throw new AssertError("[] needs a left operand!")
//  }
//
//  let opNode = nodes[bracketIndex] as IndexingNode
//  opNode.arrayObject = nodes[bracketIndex - 1]
//
//  nodes.splice(bracketIndex - 1, 2, opNode)
//
//  return -1
//}
function joinSquareBracketToArrayObject(nodes, bracketIndex) {
    if (bracketIndex === 0)
        return 0; // must be an array literal
    let opNode = nodes[bracketIndex];
    let operand = nodes[bracketIndex - 1];
    if (operand instanceof nodes_6.UnaryOpNode || operand instanceof nodes_5.BinaryOpNode || operand instanceof nodes_7.TernaryOpNode) {
        return 0; // must be an array literal
    }
    // otherwise is something that can be indexed
    // or typed vcat/hcat
    opNode.arrayObject = nodes[bracketIndex - 1];
    nodes.splice(bracketIndex - 1, 2, opNode);
    return -1;
}
function joinGenericArgListToType(nodes, curlyBraceIndex) {
    if (curlyBraceIndex === 0) {
        throw new assert_1.AssertError("{} needs a left operand!");
    }
    let opNode = nodes[curlyBraceIndex];
    opNode.typeName = nodes[curlyBraceIndex - 1];
    nodes.splice(curlyBraceIndex - 1, 2, opNode);
    return -1;
}
//# sourceMappingURL=orderOfOperations.js.map