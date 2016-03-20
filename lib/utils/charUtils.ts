"use strict"

import {assert} from "./assert";


export function isWhiteSpaceNotNewLine(char: string): boolean {
  return char === " " || char === "\t" || char === "\r"  // include carriage return
}

export function isNewLine(char: string): boolean {
  return char === "\n"
}

export function isWhiteSpace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r"
}

export function isValidIdentifierStart(char: string): boolean {
  // TODO  http://julia.readthedocs.org/en/release-0.4/manual/variables/
  return isAlpha(char) || isUnicodeAbove00A0(char) || char === "_"
}

export function isValidIdentifierContinuation(char: string): boolean {
  // TODO
  return isAlpha(char) || char === "_" || char === "!" || isNumeric(char) ||  isUnicodeAbove00A0(char)
}


export function isAlpha(char: string): boolean {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')
}

export function isNumeric(char: string): boolean {
  return char >= '0' && char <= '9'
}

export function isUnicodeAbove00A0(char: string): boolean {
  return char > '\u00A0'
}

export function isBracket(char: string): boolean {
  return char === "(" || char === ")" || char === "[" || char === "]" || char === "{" || char === "}"
}