"use strict"

import {SessionModel} from "../core/SessionModel";
import {Tokenizer} from "../tokens/Tokenizer";
import {last} from "../utils/arrayUtils";
import {Token} from "../tokens/Token";
import {TokenType} from "../tokens/operatorsAndKeywords";
import {Point} from "../tokens/Token";
import {Range} from "../tokens/Token";
import {Indent} from "../tokens/Token";
import {TokenStream} from "../tokens/TokenStream";
import {BracketGrouper} from "./BracketGrouper";
import {parseWholeFileContents} from "../fsas/general/ModuleContentsFsa";

export function parseFile(path: string, fileContents: string, sessionModel: SessionModel): void {
  let parseSet = sessionModel.parseSet

  parseSet.resetFile(path)
  let fileLevelNode = parseSet.fileLevelNodes[path]
  let fileErrors = parseSet.errors[path]

  // convert string to stream of tokens
  let tokenizer = new Tokenizer()
  tokenizer.tokenize(fileContents)
  if (tokenizer.errors.length > 0) {
    for (let err of tokenizer.errors) {
      fileErrors.parseErrors.push(err)
    }
    // Even if the entire stream was not tokenized, try to parse what was.
    // continue
  }
  let tokens = tokenizer.parsedTokens
  if (tokens.length > 0) {
    fileLevelNode.scopeStartToken = tokens[0]
    fileLevelNode.scopeEndToken = last(tokens)
  }

  // convert tokens to tree of tokens, grouped by brackets and blocks
  let tokenMinus1 = new Token("", TokenType.LineWhiteSpace, new Range(new Point(0, 0), new Point(0, 1)), new Indent(""))
  let tokenStream = new TokenStream(tokens, tokenMinus1)
  let tokenTreeBuilder = new BracketGrouper()
  tokenTreeBuilder.runGrouping(tokenStream)
  if (tokenTreeBuilder.errors.length > 0) {
    for (let err of tokenTreeBuilder.errors) {
      fileErrors.parseErrors.push(err)
    }
    // Even if the entire token tree was not built, parse what was able to be built.
    // continue
  }

  // parse token tree into expression tree
  let groupedTokens = tokenTreeBuilder.tree
  let wholeFileParseState = parseWholeFileContents(fileLevelNode, groupedTokens)
  for (let err of wholeFileParseState.parseErrors) {
    fileErrors.parseErrors.push(err)
  }

}




