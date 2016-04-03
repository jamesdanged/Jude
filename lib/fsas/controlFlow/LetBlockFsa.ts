"use strict"

import {streamAtDoubleColon} from "../../tokens/streamConditions";
import {LetBlockNode} from "../../parseTree/nodes";
import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {streamAtComment} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
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
import {streamAtComma} from "../../tokens/streamConditions";
import {VarDeclItemNode} from "../../parseTree/nodes";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";
import {ExpressionFsa} from "../general/ExpressionFsa";

class LetBlockFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let name = new FsaState("name")
    let doubleColon = new FsaState("::")
    let typeState = new FsaState("type")
    let equals = new FsaState("equals")
    let value = new FsaState("value")
    let comma = new FsaState("comma")

    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let allStatesExceptStop = [startState, name, doubleColon, typeState, equals, value, comma, body, betweenExpressions]

    // allow comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // allow new lines in certain areas
    for (let state of [equals, comma, body]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }

    // zero or more names
    startState.addArc(body, streamAtNewLine, skipOneToken)
    startState.addArc(name, streamAtIdentifier, readVariableName)

    name.addArc(doubleColon, streamAtDoubleColon, skipOneToken)
    name.addArc(comma, streamAtComma, skipOneToken)
    name.addArc(equals, streamAtEquals, skipOneToken)
    name.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)

    doubleColon.addArc(typeState, alwaysPasses, readTypeExpression)

    typeState.addArc(comma, streamAtComma, skipOneToken)
    typeState.addArc(equals, streamAtEquals, skipOneToken)
    typeState.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)

    equals.addArc(value, alwaysPasses, readValue)

    value.addArc(comma, streamAtComma, skipOneToken)
    value.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)

    // must follow comma with another variable
    comma.addArc(name, streamAtIdentifier, readVariableName)

    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtSemicolon, doNothing)
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression)

    betweenExpressions.addArc(stopState, streamAtEof, doNothing)
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken) // require delimiter

  }

  runStartToStop(ts: TokenStream, nodeToFill: LetBlockNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }
}



class ParseState implements IFsaParseState {
  mostRecentVar: VarDeclItemNode
  constructor(public ts: TokenStream, public nodeToFill: LetBlockNode, public wholeState: WholeFileParseState) {
    this.mostRecentVar = null
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readVariableName(state: ParseState): void {
  let tok = state.ts.read()
  let varNode = new VarDeclItemNode(new IdentifierNode(tok))
  state.mostRecentVar = varNode
  state.nodeToFill.names.push(varNode)
}

var fsaTypeAnnotation = null
function readTypeExpression(state: ParseState): void {
  if (fsaTypeAnnotation === null) {
    // Used to read type annotations
    // An '=' sign denotes the default value and a ',' denotes another arg so they must be ignored.
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [",", "="]
    fsaOptions.allowReturn = false
    fsaTypeAnnotation = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentVar === null) throw new AssertError("")
  state.mostRecentVar.type = fsaTypeAnnotation.runStartToStop(state.ts, state.wholeState)
}

function readValue(state: ParseState): void {
  if (state.mostRecentVar === null) throw new AssertError("")
  state.mostRecentVar.value = parseGeneralBlockExpression(state.ts, state.wholeState)
}

function readBodyExpression(state: ParseState) {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}




var fsaLetBlock = new LetBlockFsa()

export function parseWholeLetBlock(tree: TreeToken, wholeState: WholeFileParseState): LetBlockNode {
  if (tree.openToken.str !== "let") throw new AssertError("")
  let tokens = tree.contents
  let ts = new TokenStream(tokens, tree.openToken)
  let node = new LetBlockNode()
  node.scopeStartToken = tree.openToken
  node.scopeEndToken = tree.closeToken

  try {
    fsaLetBlock.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, tokens, wholeState)
  }
  return node
}
