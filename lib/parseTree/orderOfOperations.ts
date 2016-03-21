"use strict"

import {Token} from "../tokens/Token";
import {DoBlockNode} from "./nodes";
import {MultiDotNode} from "./nodes";
import {mergeSets} from "../utils/StringSet";
import {unaryOperators} from "../tokens/operatorsAndKeywords";
import {PostFixOpNode} from "./nodes";
import {WholeFileParseState} from "../fsas/general/ModuleContentsFsa";
import {ReturnNode} from "./nodes";
import {AssertError} from "../utils/assert";
import {stringSetToArray} from "./../utils/StringSet";
import {assignmentOperators} from "./../tokens/operatorsAndKeywords";
import {createStringSet} from "./../utils/StringSet";
import {Node} from "./nodes"
import {StringSet} from "./../utils/StringSet";
import {BinaryOpNode} from "./nodes";
import {UnaryOpNode} from "./nodes";
import {TernaryOpNode} from "./nodes";
import {InvalidParseError} from "./../utils/errors";
import {IdentifierNode} from "./nodes";
import {FunctionCallNode} from "./nodes";
import {GenericArgListNode} from "./nodes";
import {binaryOperators} from "../tokens/operatorsAndKeywords";
import {binaryOperatorsMayOmitArg2} from "../tokens/operatorsAndKeywords";
import {postFixOperators} from "../tokens/operatorsAndKeywords";
import {elementWiseAssignmentOperators} from "../tokens/operatorsAndKeywords";
import {TupleNode} from "./nodes";
//import {ArrayLiteralNode} from "./nodes";
//import {IndexingNode} from "./nodes";
import {SquareBracketNode} from "./nodes";


const UNARY_LEVEL = 3
const ASSIGNMENTS_LEVEL = 17

// binary operators are left to right associative except for assignments (and unary operators)
var orderOfOperationsRaw = [
  // bind generic type qualifications eg Foo{T} before any other operators, particularly before ::, so that val::Array{T} evaluates correctly
  [".", "::"],  // syntax. Do function invocations () and [] at this level too. Also handle do blocks.
  ["'"],        // postfix operators
  ["^", ".^"],  // exponentiation
  stringSetToArray(unaryOperators), // unary operators are right to left associative
  ["//", ".//"], // fractions
  ["*", "/", "\\", "%", "÷", "&", ".*", "./", ".\\", ".%", ".÷"], // multiplications
  ["<<", ">>", ">>>", ".<<", ".>>", ".>>>"], // bitshifts
  ["+", "-", "|", "$", ".+", ".-"], // addition
  [":", ".."], // syntax
  ["|>"], // syntax
  [">", ">=", "<=", "<", "==", "===", "!=", "!==", "<:", ".>", ".>=", ".<=", ".<", ".==", ".!=", "≠", "≤", "≥"], // comparisons
  ["&&"], // control flow
  ["||"], // control flow
  ["in", "∈", "∋", "∉", "∌"], // membership    ?? right level ??
  ["?"], // control flow
  [",", "=>"], // tuple or pair construction
  ["..."], // splat
  stringSetToArray(mergeSets([assignmentOperators, elementWiseAssignmentOperators])) // assignments. These are right to left associative
]
var orderOfOperations: StringSet[] = []
for (let oooLevel of orderOfOperationsRaw) {
  orderOfOperations.push(createStringSet(oooLevel))
}

// assert that all unary, binary, ternary, and postfix operators are accounted for
function foundInOrderOfOperations(op: string): boolean {
  for (let level of orderOfOperations) {
    if (op in level) return true
  }
  return false
}

for (let op in unaryOperators) {
  if (!foundInOrderOfOperations(op)) throw new AssertError("Operator '" + op + "' not accounted for in order of operations.")
}
for (let op in binaryOperators) {
  if (!foundInOrderOfOperations(op)) throw new AssertError("Operator '" + op + "' not accounted for in order of operations.")
}
if (!foundInOrderOfOperations("?")) throw new AssertError("Operator '?' not accounted for in order of operations.")
for (let op in postFixOperators) {
  if (!foundInOrderOfOperations(op)) throw new AssertError("Operator '" + op + "' not accounted for in order of operations.")
}



/**
 * Parse a series of nodes in a full expression tree based upon the order of operations.
 *
 * During the parse, any assignments to an identifier will be noted as creating a name.
 *
 */
export function parseIntoTreeByOrderOfOperations(nodes: Node[], wholeState: WholeFileParseState) : Node {

  // TODO function invocations, indexings, type {} specifications

  // shallow copy of array
  nodes = nodes.slice()
  let origNodes = nodes.slice() //useful to keep for debugging

  // generic args, left to right, before anything else
  for (let idx = 0; idx < nodes.length; idx++) {
    let node = nodes[idx]
    if (node instanceof GenericArgListNode) {
      let idxOffset = joinGenericArgListToType(nodes, idx)
      idx += idxOffset
    }
  }

  for (let iOrderLevel = 0; iOrderLevel < orderOfOperations.length; iOrderLevel++) {
    let orderLevel = orderOfOperations[iOrderLevel]
    let isUnaryLevel = iOrderLevel === UNARY_LEVEL
    let isAssignmentsLevel = iOrderLevel === ASSIGNMENTS_LEVEL
    let isLeftToRight = !(isUnaryLevel || isAssignmentsLevel)

    if (isLeftToRight) {
      // left to right associativity
      // read tokens from left to right, searching for any binary operators,
      // and then joining the nodes immediately to their right and left
      for (let idx = 0; idx < nodes.length; idx++) {
        let node = nodes[idx]

        // join () [] with left to right associativity
        if (node instanceof FunctionCallNode) {
          if (iOrderLevel === 0) {
            let idxOffset = joinFunctionCallToFunctionObject(nodes, idx)
            idx += idxOffset
          }
        } else if (node instanceof SquareBracketNode) {
          if (iOrderLevel === 0) {
            let idxOffset = joinSquareBracketToArrayObject(nodes, idx)
            idx += idxOffset
          }
        } else if (node instanceof DoBlockNode) {
          if (iOrderLevel === 0) {
            let idxOffset = joinDoBlock(nodes, idx)
            idx += idxOffset
          }
        }
        else if (node instanceof BinaryOpNode) {
          let opNode = node as BinaryOpNode
          if (opNode.op in orderLevel) {

            // handle situation like: 10^-2
            if (iOrderLevel < UNARY_LEVEL && idx < nodes.length - 1) {
              if (nodes[idx + 1] instanceof UnaryOpNode) {
                joinMultipleUnaryToRightOfBinary(nodes, idx)
              }
            }

            let idxOffset = joinBinaryOperands(nodes, idx)
            idx += idxOffset
          }
        } else if (node instanceof TernaryOpNode) {
          if ("?" in orderLevel) {
            let idxOffset = joinTernaryOperands(nodes, idx)
            idx += idxOffset
          }
        } else if (node instanceof PostFixOpNode) {
          let opNode = node as PostFixOpNode
          if (opNode.op in orderLevel) {
            let idxOffset = joinPostFixOperands(nodes, idx)
            idx += idxOffset
          }
        }
      }

    } else {
      // right to left associativity
      for (let idx = nodes.length - 1; idx >= 0; idx--) {
        let node = nodes[idx]
        if (isUnaryLevel) {
          if (node instanceof UnaryOpNode) { // don't confuse binary +/- with unary +/-. Check we are processing unary and the node is unary.
            let opNode = node as UnaryOpNode
            if (opNode.op in orderLevel) {
              let idxOffset = joinUnaryOperands(nodes, idx)
              idx += idxOffset
            }
          }
        } else {
          if (node instanceof BinaryOpNode) {
            let opNode = node as BinaryOpNode
            if (opNode.op in orderLevel) {
              let idxOffset = joinBinaryOperands(nodes, idx)
              idx += idxOffset
            }
          }
        }
      }

    } // isLeftToRight

  } // for iOrderLevel


  // may be a return statement
  if (nodes[0] instanceof ReturnNode) {
    if (nodes.length > 1) {
      let retNode = nodes[0] as ReturnNode
      let retValue = nodes[1]
      retNode.returnValue = retValue
      nodes.splice(0, 2, retNode)
    }
  }

  if (nodes.length !== 1) {
    let msg = "Failed to sort by order of operations! Still has " + nodes.length + " nodes in the sequence. Nodes are:\n"
    for (let node of nodes) {
      msg += node.toString()
      msg += "\n"
    }
    // assert error because anything resulting from an ExpressionFsa should be fully accounted for.
    // Shouldn't be possible to provide an expression that satisfies the FSA and doesn't fit the order of operations here.
    throw new InvalidParseError(msg, Token.createEmptyIdentifier(""))
  }

  return nodes[0]
}





function joinUnaryOperands(nodes: Node[], opIndex: number): number {
  if (opIndex === nodes.length - 1) throw new AssertError("Unary op needs a right operand!")

  let opNode = nodes[opIndex] as UnaryOpNode
  opNode.arg = nodes[opIndex + 1]

  nodes.splice(opIndex, 2, opNode)

  return 0
}

function joinMultipleUnaryToRightOfBinary(nodes: Node[], binaryOpIndex: number): void{
  // to handle 10 ^ -4
  //  (or 10 ^ --+-4)
  // need to process unary ops before higher precedence binary ops like '^'
  // if they appear on the immediate right of the binary op.
  // However, the unary ops are still lower precedence,
  // ie -2^2 == -4  not +4
  //
  // Doesn't handle populate arg1 or arg2 of the binary op. Just joins the unary operands together.
  let closestUnaryIndex = binaryOpIndex + 1
  if (closestUnaryIndex >= nodes.length - 1) throw new AssertError("Unary op needs right operand")
  if (!(nodes[closestUnaryIndex] instanceof UnaryOpNode)) throw new AssertError("Must call only if unary op to right of binary.")

  let firstUnaryIndex = closestUnaryIndex
  for (let idx = closestUnaryIndex; idx < nodes.length; idx++) {
    if (nodes[idx] instanceof UnaryOpNode) {
      firstUnaryIndex = idx
    } else {
      break
    }
  }

  for (let idx = firstUnaryIndex; idx >= closestUnaryIndex; idx--) {
    let idxOffset = joinUnaryOperands(nodes, idx)
    idx += idxOffset
  }
}


function joinPostFixOperands(nodes: Node[], opIndex: number): number {
  if (opIndex === 0) throw new AssertError("Needs a left operand!")

  let opNode = nodes[opIndex] as PostFixOpNode
  opNode.arg = nodes[opIndex - 1]

  nodes.splice(opIndex - 1, 2, opNode)

  return -1
}

function joinDoBlock(nodes: Node[], opIndex: number): number {
  if (opIndex === 0) throw new AssertError("Needs a left operand!")

  let opNode = nodes[opIndex] as DoBlockNode
  opNode.prefixExpression = nodes[opIndex - 1]

  nodes.splice(opIndex - 1, 2, opNode)

  return -1
}

/**
 *
 * @param nodes Modifies this array in place.
 * @param opIndex
 */
function joinBinaryOperands(nodes: Node[], opIndex: number): number {
  let opNode = nodes[opIndex] as BinaryOpNode
  let mayOmitArg2 = opNode.op in binaryOperatorsMayOmitArg2

  if (opIndex === 0) throw new AssertError("Binary op needs a left operand!")
  if (!mayOmitArg2 && opIndex === nodes.length - 1) throw new AssertError("Binary op needs a right operand!")

  opNode.arg1 = nodes[opIndex - 1]
  if (mayOmitArg2 && opIndex === nodes.length - 1) {
    // no trailing operand
    nodes.splice(opIndex - 1, 2, opNode)
  } else {
    opNode.arg2 = nodes[opIndex + 1]
    nodes.splice(opIndex - 1, 3, opNode)
  }

  // join tuples into a new node
  if (opNode.op === ",") {

    let tupleNode: TupleNode = null
    if (opNode.arg1 instanceof TupleNode) {  // ',' is a left to right associative operator, so only arg1 can also be a ','
      tupleNode = opNode.arg1 as TupleNode
      if (opNode.arg2 !== null) tupleNode.nodes.push(opNode.arg2)
    } else {
      tupleNode = new TupleNode()
      tupleNode.nodes.push(opNode.arg1)
      if (opNode.arg2 !== null) tupleNode.nodes.push(opNode.arg2)
    }

    opIndex -= 1
    nodes.splice(opIndex, 1, tupleNode)


  }
  // join dot qualified names into a new node
  else if (opNode.op === ".") {

    let multiDotNode: MultiDotNode = null
    if (opNode.arg1 instanceof MultiDotNode) {  // '.' is a left to right associative operator, so only arg1 can also be a '.'
      multiDotNode = opNode.arg1 as MultiDotNode
      multiDotNode.nodes.push(opNode.arg2)
    } else {
      multiDotNode = new MultiDotNode()
      multiDotNode.nodes.push(opNode.arg1)
      multiDotNode.nodes.push(opNode.arg2)
    }


    opIndex -= 1
    nodes.splice(opIndex, 1, multiDotNode)
  }

  return -1
}

function joinTernaryOperands(nodes: Node[], opIndex: number): number {
  // pretty much same as binary

  if (opIndex === 0) throw new AssertError("Ternary op needs a left operand before '?' !")
  if (opIndex === nodes.length - 1) throw new AssertError("Ternary op needs a right operand after ':' !")

  let opNode = nodes[opIndex] as TernaryOpNode

  opNode.condition = nodes[opIndex - 1]
  opNode.falseExpression = nodes[opIndex + 1]
  // true expression should be already set during the parsing

  nodes.splice(opIndex - 1, 3, opNode)

  return -1
}

function joinFunctionCallToFunctionObject(nodes: Node[], parenIndex: number): number {
  if (parenIndex === 0) {
    throw new AssertError("() needs a left operand!")
  }

  let opNode = nodes[parenIndex] as FunctionCallNode
  opNode.functionObject = nodes[parenIndex - 1]

  nodes.splice(parenIndex - 1, 2, opNode)

  return -1
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

function joinSquareBracketToArrayObject(nodes: Node[], bracketIndex: number): number {
  if (bracketIndex === 0) return 0  // must be an array literal

  let opNode = nodes[bracketIndex] as SquareBracketNode
  let operand = nodes[bracketIndex - 1]
  if (operand instanceof UnaryOpNode || operand instanceof BinaryOpNode || operand instanceof TernaryOpNode) {
    return 0 // must be an array literal
  }

  // otherwise is something that can be indexed
  // or typed vcat/hcat
  opNode.arrayObject = nodes[bracketIndex - 1]
  nodes.splice(bracketIndex - 1, 2, opNode)

  return -1
}

function joinGenericArgListToType(nodes: Node[], curlyBraceIndex: number): number {
  if (curlyBraceIndex === 0) {
    throw new AssertError("{} needs a left operand!")
  }

  let opNode = nodes[curlyBraceIndex] as GenericArgListNode
  opNode.typeName = nodes[curlyBraceIndex - 1]

  nodes.splice(curlyBraceIndex - 1, 2, opNode)

  return -1
}

