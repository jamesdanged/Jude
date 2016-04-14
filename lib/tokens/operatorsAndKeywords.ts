"use strict"

import {createStringSet} from "./../utils/StringSet";
import {mergeSets} from "./../utils/StringSet";
import {addToSet} from "./../utils/StringSet";
import {StringSet} from "./../utils/StringSet";
import {AssertError} from "../utils/assert";


export enum TokenType {
  Identifier, Number, LineWhiteSpace, NewLine, Keyword, Operator,
  Bracket, Quote,  // {} [] (),    ", ', `
  SemiColon,  // never should be an operator
  Comment,
  StringLiteralContents,  // excludes the $ and any () used in demarcating interpolation
  StringInterpolationStart, // unescaped '$' within a string
  CharacterLiteralContents,
  Macro,           // macro invocation, ie @assert
  StringMacro,     // eg regexes, byte string literals
  Symbol // eg :foo
  //EndAsIndex // the 'end' keyword when inside square brackets is evaluated at runtime as the last index to an array
  //Unexpected
  //Comma,
}


export var arithmeticOperators = createStringSet([
  "+", "-", "*", "/",
  "\\", // inverse divide
  "%", // remainder
  "÷", // integer divide
  "//", // rational number creator
  "^"
])


export var comparisonOperators = createStringSet([
  "==", "!=",
  ">", ">=", "<=", "<",
  "≠", "≤", "≥",
  "===",
  "!==",
  "<:"  // type inheritance comparison
])

export var assignmentOperators = createStringSet([
  "=",
  "+=", "-=", "*=", "/=",
  "\\=", "%=", "÷=", "//=",
  "^=",
  "&=", "|=", "$=",
  ">>>=", ">>=", "<<="
])

export var logicalOperators = createStringSet([
  "&&", "||", "!",
  "&", "|", "~", "$", // bitwise and, or, not, xor.  '&' is also address of operator inside ccall statements
])

export var bitshiftOperators = createStringSet([
  ">>>", ">>", "<<"
])


export var elementWiseOperators = createStringSet([
  ".+", ".-", ".*", "./", ".\\", ".%", ".^", // arithmetic
  ".==", ".!=", ".>", ".>=", ".<=", ".<", // comparison
  ".<<", ".>>", ".>>>" // bitshifts
])

export var elementWiseAssignmentOperators = createStringSet([
  ".+=", ".-=", ".*=", "./=", ".\\=", ".//=", ".%=", ".÷=", ".^=" // assignment
])


var specialBinaryOperators = createStringSet([
  ".",  // access field or module member
  "::", // declarations and type assertions
  ":",  // colon is a binary operator usually, which generates a range object. It can also be overridden.
        // It can also be used as an indexing expression by itself, ie arr[3, :]
  "..", // ?
  "|>", // ?
  ",",  // comma is actually an operator that constructs tuples
  "=>"  // constructs pairs
])

// need special tokenizing logic to avoid treating as identifier
export var binaryOperatorsLikeIdentifiers = createStringSet([
  "in", "∈", "∋", "∉", "∌"
])

var specialOperators = createStringSet([
  "?",   // ternary operator. Must be followed eventually by a colon...
  "...", // var args/splat operator
  "->",  // creates anonymous functions
  "'"    // transpose operator in certain contexts
])

export var allOperators = mergeSets([arithmeticOperators, comparisonOperators, assignmentOperators,
  logicalOperators, bitshiftOperators, elementWiseOperators, elementWiseAssignmentOperators, specialBinaryOperators,
  binaryOperatorsLikeIdentifiers, specialOperators])

export const longestOperatorLength = 4 // >>>= and .>>>

// assert the first char of all operators is an operator
// The tokenizer relies on this to recognize when a character is starting an operator.
// One exception for binaryOperatorsLikeIdentifiers, as they are parsed earlier in the identifier rule.
for (let op in allOperators) {
  if (!(op[0] in allOperators)) {
    if (op in binaryOperatorsLikeIdentifiers) {
      // ok
    } else {
      throw new AssertError("The first character of " + op + " is not an operator!")
    }
  }
}


export var unaryOperators = createStringSet([
  "+", "-",
  "!", "~",
   "&"  // address of operator only allowed within ccall
])

export var binaryOperators =
  mergeSets([arithmeticOperators, comparisonOperators, assignmentOperators, elementWiseOperators, elementWiseAssignmentOperators,
    bitshiftOperators, specialBinaryOperators, binaryOperatorsLikeIdentifiers])
for (let op in logicalOperators) {
  if (!(op in unaryOperators))
    addToSet(binaryOperators, op)
}

export var binaryOperatorsMayOmitArg2 = createStringSet([","])

export var postFixOperators = createStringSet([
  "'"
])


// note, many operators can be overridden
//   eg +(a, b) = a + b
// That is ok, but changing '+' from binary to some other function or a variable is beyond
// our ability to statically parse.
//   eg + = 5
// We will just throw parse errors when that happens.

export var overridableBinaryOperators =
  mergeSets([arithmeticOperators, comparisonOperators, bitshiftOperators, elementWiseOperators, binaryOperatorsLikeIdentifiers])
addToSet(overridableBinaryOperators, "|>")
addToSet(overridableBinaryOperators, "&")
addToSet(overridableBinaryOperators, "|")
addToSet(overridableBinaryOperators, "$")

export var overridableUnaryOperators =
  mergeSets([unaryOperators])


export var operatorsThatAreIdentifiers = mergeSets(
  [arithmeticOperators, comparisonOperators, bitshiftOperators, elementWiseOperators,
    binaryOperatorsLikeIdentifiers]
)
addToSet(operatorsThatAreIdentifiers, "!")
addToSet(operatorsThatAreIdentifiers, "&")
addToSet(operatorsThatAreIdentifiers, "|")
addToSet(operatorsThatAreIdentifiers, "~")
addToSet(operatorsThatAreIdentifiers, "$")
addToSet(operatorsThatAreIdentifiers, ":")
addToSet(operatorsThatAreIdentifiers, "|>")



export var regexFlags = createStringSet((["i", "m", "s", "x"]))



export var keywords = createStringSet([
  "function", "macro", "quote", //"ccall",
  "module", "baremodule",
  "type", "abstract", "typealias", "bitstype", "immutable",
  "const", "let", "local", "global",
  "export", "import", "importall", "using",

  "begin", "end",
  "if", "else", "elseif",
  "for", "while", "do",
  "try", "catch", "finally",
  "return", "break", "continue",

  "stagedfunction"  // deprecated
])

export var keywordsNeedEnd = createStringSet([
  "function", "macro", "quote",
  "module", "baremodule",
  "type", "immutable",
  "begin", "if", "for", "while", "do", "let", "try"
])

export var keywordValues = createStringSet([
  "true", "false", "NaN", "Inf", "nothing"
])


export var allBrackets = createStringSet([
  "(", ")",
  "[", "]",
  "{", "}",
])

export var allQuotes = createStringSet([
  "\"",
  "'",
  "`",
  "\"\"\""
])





export enum Escapes {
  End,
  Parenthesis,
  SquareBracket,
  CurlyBracket,

  // other keywords for next section
  Catch,
  Finally,
  ElseIf,
  Else,
  //Return,
  //Break,
  //Continue

  Colon, // terminate the ternary true expression
  Comma, // terminate a function arg

}

export function toEscapeString(esc: Escapes): string {
  switch (esc) {
    case Escapes.End:
      return "end"
    case Escapes.Parenthesis:
      return ")"
    case Escapes.SquareBracket:
      return "]"
    case Escapes.CurlyBracket:
      return "}"
    case Escapes.Else:
      return "else"
    case Escapes.ElseIf:
      return "elseif"
    case Escapes.Catch:
      return "catch"
    case Escapes.Finally:
      return "finally"
    case Escapes.Comma:
      return ","
    case Escapes.Colon:
      return ":"
    default:
      throw new AssertError("Unexpected escape type: " + esc)
  }

}





