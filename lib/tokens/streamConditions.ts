"use strict"

import {operatorsThatAreIdentifiers} from "./operatorsAndKeywords";
import {TreeToken} from "./Token";
import {overridableUnaryOperators} from "./operatorsAndKeywords";
import {overridableBinaryOperators} from "./operatorsAndKeywords";
import {postFixOperators} from "./operatorsAndKeywords";
import {start} from "repl";
import {createStringSet} from "./../utils/StringSet";
import {addToSet} from "./../utils/StringSet";
import {StringSet} from "./../utils/StringSet";
import {unaryOperators} from "./operatorsAndKeywords";
import {binaryOperators} from "./operatorsAndKeywords";
import {keywordsNeedEnd} from "./operatorsAndKeywords";
import {TokenStream} from "./TokenStream";
import {Node, BinaryOpNode} from "./../parseTree/nodes";
import {UnaryOpNode} from "./../parseTree/nodes";
import {NumberNode} from "./../parseTree/nodes";
import {IdentifierNode} from "./../parseTree/nodes";
import {Escapes} from "./operatorsAndKeywords";
import {toEscapeString} from "./operatorsAndKeywords";
import {TokenType} from "./operatorsAndKeywords";
import {Token} from "./Token";





// Helper methods for conditions.

export function alwaysPasses(ts: TokenStream): boolean {
  return true
}
export function streamAtEof(ts:TokenStream): boolean {
  return ts.eof()
}
export function streamAtComment(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Comment
}
export function streamAtLineWhitespace(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.LineWhiteSpace
}
export function streamAtReturn(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "return"
}
export function streamAtBreak(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "break"
}
export function streamAtContinue(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "continue"
}
export function streamAtUnaryOp(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && (tok.str in unaryOperators)
}
export function streamAtTernaryOp(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "?"
}
export function streamAtPostFixOp(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && (tok.str in postFixOperators)
}
export function streamAtNumber(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Number
}
export function streamAtSymbol(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Symbol
}
export function streamAtIdentifier(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Identifier
}
export function streamAtMacroIdentifier(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Macro
}
export function streamAtOpenParenthesis(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Bracket && tok.str === "("
}
export function streamAtOpenSquareBracket(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Bracket && tok.str === "["
}
export function streamAtOpenCurlyBraces(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Bracket && tok.str === "{"
}
export function streamAtOpenBlockKeyword(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && (tok.str in keywordsNeedEnd)
}
export function streamAtKeywordBlock(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  if (tok.type !== TokenType.Keyword) return false
  if (!(tok instanceof TreeToken)) return false
  return tok.str === "function" || tok.str === "quote" || tok.str === "begin" || tok.str === "if" ||
    tok.str === "for" || tok.str === "while" || tok.str === "let" || tok.str === "try"
}

export function streamAtAnyQuote(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Quote
}
export function streamAtStringLiteral(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.StringLiteralContents
}
export function streamAtInterpolationStart(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.StringInterpolationStart
}

export function streamAtNewLine(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.NewLine
}
export function streamAtSemicolon(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.SemiColon
}
export function streamAtDoubleColon(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "::"
}
export function streamAtNewLineOrSemicolon(ts: TokenStream): boolean {
  return streamAtNewLine(ts) || streamAtSemicolon(ts)
}
export function streamAtEquals(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "="
}
export function streamAtComma(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === ","
}
export function streamAtDot(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "."
}
export function streamAtColon(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === ":"
}
export function streamAtLessThanColon(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "<:"
}
export function streamAtArrow(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "->"
}
export function streamAtIn(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "in"
}
export function streamAtTripleDot(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str === "..."
}
export function streamAtOverridableBinaryOperator(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str in overridableBinaryOperators
}
export function streamAtOverridableUnaryOperator(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str in overridableUnaryOperators
}
export function streamAtOverridableOperator(ts: TokenStream): boolean {
  return streamAtOverridableBinaryOperator(ts) || streamAtOverridableUnaryOperator(ts)
}
export function streamAtOperatorThatCanBeIdentifier(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Operator && tok.str in operatorsThatAreIdentifiers
}

export function streamAtStringMacro(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.StringMacro
}
export function streamAtLocal(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "local"
}
export function streamAtGlobal(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "global"
}
export function streamAtConst(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "const"
}
export function streamAtFor(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "for"
}
export function streamAtElseIf(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "elseif"
}
export function streamAtElse(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "else"
}
export function streamAtCatch(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "catch"
}
export function streamAtFinally(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "finally"
}
export function streamAtDo(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "do"
}
export function streamAtMacroKeyword(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "macro"
}
export function streamAtModule(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "module"
}
export function streamAtBareModule(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "baremodule"
}
export function streamAtType(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "type"
}
export function streamAtImmutable(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "immutable"
}
export function streamAtAbstract(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "abstract"
}
export function streamAtBitsType(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "bitstype"
}
export function streamAtTypeAlias(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "typealias"
}
export function streamAtImport(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "import"
}
export function streamAtImportAll(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "importall"
}
export function streamAtExport(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "export"
}
export function streamAtUsing(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Keyword && tok.str === "using"
}
export function streamAtInclude(ts: TokenStream): boolean {
  if (ts.eof()) return false
  let tok = ts.peek()
  return tok.type === TokenType.Identifier && tok.str === "include"
}

//
///**
// * True if the stream is at a compact function declaration such as
// *  f(val) = 2*val
// */
//export function streamAtFunctionCompactDeclaration(ts: TokenStream): boolean {
//
//  // could have done identifier check after peekUpTo4 but this saves having to do the slice by checking the identifier first
//  if (ts.eof()) return false
//  let tok = ts.peek()
//  if (tok.type !== TokenType.Identifier && !streamAtOverridableOperator(ts)) { //
//    return false
//  }
//
//  // TODO handle multi part names
//  let next4 = ts.peekUpToX(4)
//  if (next4 === null) return false
//
//  // function with type parameters
//  if (next4[1].type === TokenType.Bracket && next4[1].str === "{" &&
//    next4[2].type === TokenType.Bracket && next4[2].str === "(" &&
//      next4[3].type === TokenType.Operator && next4[3].str === "=") return true
//
//  // function without type parameters
//  if (next4[1].type === TokenType.Bracket && next4[1].str === "(" &&
//    next4[2].type === TokenType.Operator && next4[2].str === "=") return true
//
//  return false
//}
//
//export function streamAtAnonymousFunction(ts: TokenStream): boolean {
//  let next2 = ts.peekUpToX(2)
//  if (next2 === null) return false
//
//  let argsTok = next2[0]
//  let arrowTok = next2[1]
//
//  if (argsTok.type === TokenType.Identifier ||
//      (argsTok.type === TokenType.Bracket && argsTok.str === "(")) {
//
//    if (arrowTok.type === TokenType.Operator && arrowTok.str === "->") {
//      return true
//    }
//    return false
//  } else {
//    return false
//  }
//}
//
//
//
//export function streamAtIdentifierEquals(ts: TokenStream): boolean {
//  if (ts.eof()) return false
//
//  ts = ts.shallowCopy()
//
//  let tokens: Token[] = []
//  while (tokens.length < 2) {
//    if (ts.eof()) return false
//
//    let tok = ts.read()
//    if (tok.type !== TokenType.NewLine) {
//      tokens.push(tok)
//    }
//  }
//
//  if (tokens[0].type === TokenType.Identifier && tokens[1].type === TokenType.Operator && tokens[1].str === "=") {
//    return true
//  }
//  return false
//}
//


