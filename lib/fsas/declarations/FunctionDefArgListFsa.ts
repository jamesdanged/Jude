"use strict"

import {ExpressionFsa} from "../general/ExpressionFsa";
import {streamAtTripleDot} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "../general/fsaUtils";
import {WholeFileParseState} from "../general/ModuleContentsFsa";
import {handleParseErrorOnly} from "../general/fsaUtils";
import {AssertError} from "../../utils/assert";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {FunctionDefNode} from "./../../parseTree/nodes";
import {Node} from "./../../parseTree/nodes";
import {TokenType} from "./../../tokens/operatorsAndKeywords";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtDoubleColon} from "./../../tokens/streamConditions";
import {streamAtEquals} from "./../../tokens/streamConditions";
import {streamAtComma} from "./../../tokens/streamConditions";
import {FunctionDefArgNode} from "./../../parseTree/nodes";
import {GenericArgListNode} from "./../../parseTree/nodes";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtComment} from "./../../tokens/streamConditions";
import {BaseFsa} from "../general/fsaUtils";
import {FsaState} from "../general/fsaUtils";
import {runFsaStartToStop} from "../general/fsaUtils";
import {IFsaParseState} from "../general/fsaUtils";
import {FunctionDefArgListNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {skipParse} from "../general/fsaUtils";
import {TreeToken} from "../../tokens/Token";
import {ExpressionFsaOptions} from "../general/ExpressionFsa";


/**
 * An automaton that recognizes the entire contents within the parentheses of a function's arg list declaration.
 */
class FunctionDefArgListFsa extends BaseFsa {
  constructor() {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let orderedArgName = new FsaState("ordered arg name")
    let orderedArgType = new FsaState("ordered arg type")
    let orderedArgTypeCannotBeOptional = new FsaState("ordered arg type, cannot be optional")
    let orderedArgComma = new FsaState("ordered arg comma")

    // optional args are ordered args, but from this point forward, all args will require a default value
    let optionalArgName = new FsaState("optional arg name")
    let optionalArgType = new FsaState("optional arg type")
    let optionalArgEqualSign = new FsaState("optional arg =")
    let optionalArgDefaultValue = new FsaState("optional arg default value")
    let optionalArgComma = new FsaState("optional arg comma")

    let varArgs = new FsaState("var args")

    let semicolonState = new FsaState("semicolon")
    let keywordArgName = new FsaState("keyword arg name")
    let keywordArgType = new FsaState("keyword arg type")
    let keywordArgEqualSign = new FsaState("keyword arg equal sign")
    let keywordArgDefaultValue = new FsaState("keyword arg default value")
    let keywordArgComma = new FsaState("keyword arg comma")

    let allStatesExceptStop = [startState, orderedArgName, orderedArgType, orderedArgTypeCannotBeOptional, orderedArgComma,
      optionalArgName, optionalArgType, optionalArgEqualSign, optionalArgDefaultValue, optionalArgComma, varArgs,
      semicolonState, keywordArgName, keywordArgType, keywordArgEqualSign, keywordArgDefaultValue, keywordArgComma]

    // add arcs to skip newlines and comments everywhere
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtNewLine, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }



    // Can start with nothing (no params), a semicolon, an ordered arg, an unnamed ordered arg (ie ::Type{T}).
    // There is ambiguity about whether an ordered arg is actually an optional arg.
    // But rather than use a non deterministic FSA, we will just store both ordered args and optional args
    // together, and then simply have the default value for ordered args be null.
    startState.addArc(stopState, streamAtEof, doNothing)  // passes if EOF
    startState.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    startState.addArc(orderedArgName, streamAtIdentifier, readOrderedArgName)
    startState.addArc(orderedArgTypeCannotBeOptional, streamAtDoubleColon, readUnnamedOrderedArgTypeDeclaration)

    // ordered args can have a type annotation
    orderedArgName.addArc(orderedArgType, streamAtDoubleColon, readTypeDeclaration)

    // an ordered arg can actually be an optional arg
    // in which case, all future args before ';' will be optional args
    // unnamed ordered args cannot be optional
    orderedArgName.addArc(optionalArgEqualSign, streamAtEquals, skipOneToken)
    orderedArgType.addArc(optionalArgEqualSign, streamAtEquals, skipOneToken)

    // delimiter
    orderedArgName.addArc(orderedArgComma, streamAtComma, skipOneToken)
    orderedArgType.addArc(orderedArgComma, streamAtComma, skipOneToken)
    orderedArgTypeCannotBeOptional.addArc(orderedArgComma, streamAtComma, skipOneToken)
    orderedArgName.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    orderedArgType.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    orderedArgTypeCannotBeOptional.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    orderedArgName.addArc(stopState, streamAtEof, doNothing)
    orderedArgType.addArc(stopState, streamAtEof, doNothing)
    orderedArgTypeCannotBeOptional.addArc(stopState, streamAtEof, doNothing)

    // proceed to next ordered arg
    orderedArgComma.addArc(orderedArgName, streamAtIdentifier, readOrderedArgName)
    orderedArgComma.addArc(orderedArgTypeCannotBeOptional, streamAtDoubleColon, readUnnamedOrderedArgTypeDeclaration)

    // optional args can have a type annotation
    optionalArgName.addArc(optionalArgType, streamAtDoubleColon, readTypeDeclaration)

    // optional args must specify a default value
    optionalArgName.addArc(optionalArgEqualSign, streamAtEquals, skipOneToken)
    optionalArgType.addArc(optionalArgEqualSign, streamAtEquals, skipOneToken)
    // read the default value
    optionalArgEqualSign.addArc(optionalArgDefaultValue, alwaysPasses, readExpressionForDefaultValue) // add last as always passes

    // delimiter
    optionalArgDefaultValue.addArc(optionalArgComma, streamAtComma, skipOneToken)
    optionalArgDefaultValue.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    optionalArgDefaultValue.addArc(stopState, streamAtEof, doNothing)
    // proceed to next optional arg
    optionalArgComma.addArc(optionalArgName, streamAtIdentifier, readOrderedArgName)

    // the last ordered arg or optional args or keyword arg can be a varargs
    // ie foo(a, b=2, c...)
    orderedArgName.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)
    optionalArgName.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)
    keywordArgName.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)
    orderedArgType.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)
    optionalArgType.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)
    keywordArgType.addArc(varArgs, streamAtTripleDot, markArgAsVarArgs)

    varArgs.addArc(semicolonState, streamAtSemicolon, skipOneToken)
    varArgs.addArc(stopState, streamAtEof, doNothing)

    // after semicolon
    semicolonState.addArc(stopState, streamAtEof, doNothing)
    semicolonState.addArc(keywordArgName, streamAtIdentifier, readKeywordArgName)

    // keyword arg can have a type annotation
    keywordArgName.addArc(keywordArgType, streamAtDoubleColon, readTypeDeclaration)

    // keyword args must specify a default value
    keywordArgName.addArc(keywordArgEqualSign, streamAtEquals, skipOneToken)
    keywordArgType.addArc(keywordArgEqualSign, streamAtEquals, skipOneToken)
    // read the default value
    keywordArgEqualSign.addArc(keywordArgDefaultValue, alwaysPasses, readExpressionForDefaultValue) // add last as always passes

    // delimiter
    keywordArgDefaultValue.addArc(keywordArgComma, streamAtComma, skipOneToken)
    keywordArgDefaultValue.addArc(stopState, streamAtEof, doNothing)
    // proceed to next keyword arg
    keywordArgComma.addArc(keywordArgName, streamAtIdentifier, readKeywordArgName)


  }

  runStartToStop(ts: TokenStream, nodeToFill: FunctionDefArgListNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}


class ParseState implements IFsaParseState {
  mostRecentParam: FunctionDefArgNode // The FSA needs a bit of help tracking params
  constructor(public ts: TokenStream, public nodeToFill: FunctionDefArgListNode,
              public wholeState: WholeFileParseState) {
    this.mostRecentParam = null
  }

}



// parse callbacks

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readOrderedArgName(state: ParseState): void {
  let token = state.ts.read()
  let arg = new FunctionDefArgNode()
  arg.name = new IdentifierNode(token)
  state.nodeToFill.orderedArgs.push(arg)
  state.mostRecentParam = arg
}

function readKeywordArgName(state: ParseState): void {
  let token = state.ts.read()
  let arg = new FunctionDefArgNode()
  arg.name = new IdentifierNode(token)
  state.nodeToFill.keywordArgs.push(arg)
  state.mostRecentParam = arg
}


var fsaTypeAnnotationInFunctionDefArgListExpression = null
function parseTypeAnnotationExpressionWithinFunctionDefArgList(ts: TokenStream, wholeState: WholeFileParseState): Node {
  if (fsaTypeAnnotationInFunctionDefArgListExpression === null) {
    // Used to read type annotations in function definition arg lists.
    // An '=' sign denotes the default value
    // and a ',' denotes another arg
    // so they must be ignored.
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [",", "="]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaOptions.allowReturn = false
    fsaTypeAnnotationInFunctionDefArgListExpression = new ExpressionFsa(fsaOptions)
  }
  return fsaTypeAnnotationInFunctionDefArgListExpression.runStartToStop(ts, wholeState)
}

function readUnnamedOrderedArgTypeDeclaration(state: ParseState): void {
  state.ts.read() // discard ::
  let arg = new FunctionDefArgNode()
  state.nodeToFill.orderedArgs.push(arg)
  state.mostRecentParam = arg
  arg.type = parseTypeAnnotationExpressionWithinFunctionDefArgList(state.ts, state.wholeState)
}

function readTypeDeclaration(state: ParseState): void {
  if (state.mostRecentParam === null) throw new AssertError("")
  state.ts.read() // discard the ::
  state.mostRecentParam.type = parseTypeAnnotationExpressionWithinFunctionDefArgList(state.ts, state.wholeState)
}

function markArgAsVarArgs(state: ParseState): void {
  if (state.mostRecentParam == null) throw new AssertError("")
  state.ts.read() // discard the ...
  state.mostRecentParam.isVarArgs = true
}

var fsaDefaultValueExpressions = null
function readExpressionForDefaultValue(state: ParseState): void {
  if (fsaDefaultValueExpressions === null) {
    // Used to read expressions for default value
    // commas must be treated specially as an escape, not a binary operator
    let fsaOptions = new ExpressionFsaOptions()
    fsaOptions.binaryOpsToIgnore = [","]
    fsaOptions.newLineInMiddleDoesNotEndExpression = true
    fsaOptions.allowSplat = true
    fsaDefaultValueExpressions = new ExpressionFsa(fsaOptions)
  }
  if (state.mostRecentParam == null) throw new AssertError("")
  state.mostRecentParam.defaultValue = fsaDefaultValueExpressions.runStartToStop(state.ts, state.wholeState)
}





var fsaFunctionDefArgList = new FunctionDefArgListFsa()

export function parseFunctionDefArgList(node: FunctionDefArgListNode, tree: TreeToken, wholeState: WholeFileParseState): void {
  if (tree.openToken.str !== "(") throw new AssertError("")
  let ts = new TokenStream(tree.contents, tree.openToken)
  //let node = new FunctionDefArgListNode()

  try {
    //if (wholeState.onlyParseTopLevel) {
    //  skipParse(node, parenTree.contents)
    //} else {
    fsaFunctionDefArgList.runStartToStop(ts, node, wholeState)
    expectNoMoreExpressions(ts)
    //}
  } catch (err) {
    handleParseErrorOnly(err, node, tree.contents, wholeState)
  }
}
