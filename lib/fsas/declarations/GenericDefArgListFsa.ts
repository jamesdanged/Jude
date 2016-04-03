"use strict"

import {ExpressionFsa} from "../general/ExpressionFsa";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {TreeToken} from "../../tokens/Token";
import {AssertError} from "../../utils/assert";
import {GenericArgNode} from "./../../parseTree/nodes";
import {TokenStream} from "./../../tokens/TokenStream";
import {GenericDefArgListNode} from "./../../parseTree/nodes";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtComma} from "./../../tokens/streamConditions";
import {streamAtLessThanColon} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {IdentifierNode} from "../../parseTree/nodes";
import {skipParse} from "../general/fsaUtils";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";



/**
 * An automaton that recognizes the entire contents within {...} of a type parameter list declaration
 * of a generic function or a generic type.
 */
class GenericDefArgListFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let argName = new FsaState("arg name")
    let lessThanColon = new FsaState("<:")
    let typeRestriction = new FsaState("type restriction")
    let comma = new FsaState("comma")

    let allStatesExceptStop = [startState, argName, lessThanColon, typeRestriction, comma]

    // skip new lines and comments
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtNewLine, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }

    // at least one arg
    startState.addArc(argName, streamAtIdentifier, readArgName)

    // type restriction is optional
    argName.addArc(stopState, streamAtEof, doNothing)
    argName.addArc(comma, streamAtComma, skipOneToken)
    argName.addArc(lessThanColon, streamAtLessThanColon, skipOneToken)

    lessThanColon.addArc(typeRestriction, alwaysPasses, readTypeRestriction)

    typeRestriction.addArc(stopState, streamAtEof, doNothing)
    typeRestriction.addArc(comma, streamAtComma, skipOneToken)

    // must be another arg after a comma
    comma.addArc(argName, streamAtIdentifier, readArgName)
  }

  runStartToStop(ts: TokenStream, nodeToFill: GenericDefArgListNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }


}



class ParseState implements IFsaParseState {
  mostRecentParam: GenericArgNode // The FSA needs a bit of help tracking params

  constructor(public ts: TokenStream, public nodeToFill: GenericDefArgListNode,
              public wholeState: WholeFileParseState) {
    this.mostRecentParam = null
  }
}



function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readArgName(state: ParseState): void {
  let token = state.ts.read()
  let arg = new GenericArgNode(new IdentifierNode(token))
  state.nodeToFill.args.push(arg)
  state.mostRecentParam = arg
}

var fsaTypeAnnotationExpression = null
function readTypeRestriction(state: ParseState): void {
  if (fsaTypeAnnotationExpression === null) {
    // Used to read expressions within {} which evaluate to types.
    // Commas must be treated specially as an escape, not a binary operator.
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaTypeAnnotationExpression   = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentParam === null) throw new AssertError("")
  state.mostRecentParam.restriction = fsaTypeAnnotationExpression.runStartToStop(state.ts, state.wholeState)
}






var fsaGenericDefArgList = new GenericDefArgListFsa()

export function parseGenericDefArgList(tree: TreeToken, wholeState: WholeFileParseState): GenericDefArgListNode {
  if (tree.openToken.str !== "{") throw new AssertError("")
  let ts = new TokenStream(tree.contents, tree.openToken)
  let node = new GenericDefArgListNode()

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, curlyTree.contents)
    //} else {
    fsaGenericDefArgList.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tree.contents, wholeState)
  }
  return node
}
