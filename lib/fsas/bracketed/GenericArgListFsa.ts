"use strict"

import {ExpressionFsa} from "../general/ExpressionFsa";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {TreeToken} from "../../tokens/Token";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {GenericArgListNode} from "./../../parseTree/nodes";
import {TokenStream} from "./../../tokens/TokenStream";
import {streamAtComment} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtComma} from "./../../tokens/streamConditions";
import {BaseFsa} from "./../general/fsaUtils";
import {FsaState} from "./../general/fsaUtils";
import {runFsaStartToStop} from "./../general/fsaUtils";
import {IFsaParseState} from "./../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";


/**
 * Recognizes a type parameter list (within { ... } )
 * for invocations of a generic function or for instantiations of a generic type,
 * not for a declaration of either.
 */
class GenericArgListFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let typeExpression = new FsaState("type expression")
    let comma = new FsaState("comma")

    let allStatesExceptStop = [startState, stopState, typeExpression, comma]

    // ignore new lines and comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtNewLine, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }

    // at least 1 type
    startState.addArc(typeExpression, alwaysPasses, readTypeExpression)

    typeExpression.addArc(stopState, streamAtEof, doNothing)
    typeExpression.addArc(comma, streamAtComma, skipOneToken)

    comma.addArc(typeExpression, alwaysPasses, readTypeExpression)
  }

  runStartToStop(ts: TokenStream, nodeToFill: GenericArgListNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}



class ParseState implements IFsaParseState {
  constructor(public ts: TokenStream, public nodeToFill: GenericArgListNode,
                public wholeState: WholeFileParseState) {
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}


var fsaTypeAnnotationExpression = null // build on first usage. Constructors may not be exported yet upon global scope evaluation.
function readTypeExpression(state: ParseState): void {
  if (fsaTypeAnnotationExpression === null) {
    // Used to read expressions within {} which evaluate to types.
    // Commas must be treated specially as an escape, not a binary operator.
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaTypeAnnotationExpression  = new ExpressionFsa(fsaOptions)
  }

  let node = fsaTypeAnnotationExpression.runStartToStop(state.ts, state.wholeState)
  state.nodeToFill.params.push(node)
}





var fsaGenericArgList = new GenericArgListFsa()

export function parseGenericArgList(curlyTree: TreeToken, wholeState: WholeFileParseState): GenericArgListNode {
  if (curlyTree.openToken.str !== "{") throw new AssertError("")
  let ts = new TokenStream(curlyTree.contents, curlyTree.openToken)
  let node = new GenericArgListNode()

  try {
    fsaGenericArgList.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, node, curlyTree.contents, wholeState)
  }
  return node
}
