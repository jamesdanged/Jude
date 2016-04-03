"use strict"

import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {ForBlockNode} from "./../../parseTree/nodes";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtEquals} from "./../../tokens/streamConditions";
import {streamAtIn} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {IdentifierNode} from "../../parseTree/nodes";
import {skipParse} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {TreeToken} from "../../tokens/Token";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {parseGeneralBlockExpression} from "../general/ExpressionFsa";
import {TokenType} from "../../tokens/operatorsAndKeywords";
import {InvalidParseError} from "../../utils/errors";

class ForBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let iterVariable = new FsaState("iter variable")
    let equals = new FsaState("equals")
    let inKeyword = new FsaState("in keyword")
    let iterRange = new FsaState("iter range")

    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, iterVariable, equals, inKeyword, iterRange, body, betweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // allow new lines in certain areas
    // \n not allowed between iter variable and in/=
    for (let state of [startState, equals, inKeyword, iterRange, body]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    // can have a single iteration variable or a tuple of destructured variables
    startState.addArc(iterVariable, streamAtIdentifier, readIterVariable)
    startState.addArc(iterVariable, streamAtOpenParenthesis, readMultipleIterVariables)

    // either = or in
    iterVariable.addArc(equals, streamAtEquals, skipOneToken)
    iterVariable.addArc(inKeyword, streamAtIn, skipOneToken)

    equals.addArc(iterRange, alwaysPasses, readIterRange)
    inKeyword.addArc(iterRange, alwaysPasses, readIterRange)

    iterRange.addArc(body, alwaysPasses, doNothing)

    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtSemicolon, doNothing)
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression)

    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter


  }

  runStartToStop(ts: TokenStream, nodeToFill: ForBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: ForBlockNode, public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readIterVariable(state: ParseState) {
  let tok = state.ts.read()
  state.nodeToFill.iterVariable.push(new IdentifierNode(tok))
}

function readMultipleIterVariables(state: ParseState) {
  let parenTok = state.ts.read() as TreeToken
  let ts = new TokenStream(parenTok.contents, parenTok.openToken)
  ts.skipNewLinesAndComments()

  while (!ts.eof()) {
    let tok = ts.read()
    if (tok.type !== TokenType.Identifier) {
      state.wholeState.parseErrors.push(new InvalidParseError("Expecting an identifier.", tok))
      return
    }
    state.nodeToFill.iterVariable.push(new IdentifierNode(tok))
    ts.skipNewLinesAndComments()

    if (ts.eof()) break
    tok = ts.read()
    if (!(tok.type === TokenType.Operator && tok.str === ",")) {
      state.wholeState.parseErrors.push(new InvalidParseError("Expecting ','", tok))
      return
    }
    ts.skipNewLinesAndComments()
  }

  if (state.nodeToFill.iterVariable.length === 0) {
    state.wholeState.parseErrors.push(new InvalidParseError("Must have at least one name.", parenTok))
  }
}

function readIterRange(state: ParseState) {
  state.nodeToFill.range = parseGeneralBlockExpression(state.ts, state.wholeState)
}

function readBodyExpression(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}




var fsaForBlock = new ForBlockFsa()

export function parseWholeForBlock(tree: TreeToken, wholeState: WholeFileParseState): ForBlockNode {
  if (tree.openToken.str !== "for") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new ForBlockNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, tokens)
    //} else {
    fsaForBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
