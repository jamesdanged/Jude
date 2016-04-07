"use strict"

import {streamAtOperatorThatCanBeIdentifier} from "./streamConditions";
import {streamAtOverridableOperator} from "./streamConditions";
import {streamAtMacroIdentifier} from "./streamConditions";
import {BaseFsa} from "../fsas/general/fsaUtils";
import {streamAtIdentifier} from "./streamConditions";
import {TokenStream} from "./TokenStream";
import {streamAtDot} from "./streamConditions";
import {streamAtLineWhitespace} from "./streamConditions";
import {streamAtComment} from "./streamConditions";
import {streamAtOpenCurlyBraces} from "./streamConditions";
import {streamAtOpenParenthesis} from "./streamConditions";
import {streamAtEquals} from "./streamConditions";
import {alwaysPasses} from "./streamConditions";
import {streamAtArrow} from "./streamConditions";
import {streamAtNewLine} from "./streamConditions";
import {FsaState} from "../fsas/general/fsaUtils";
import {streamAtComma} from "./streamConditions";
import {streamAtEof} from "./streamConditions";
import {streamAtSemicolon} from "./streamConditions";


// For running the stream through a mini fsa to see if it satifies a complex condition.
// These need look ahead multiple tokens. The other stream conditions just peek ahead one token.
// Because they are more complex, it's clearer to represent them as mini FSAs.
// Using these introduces a bit of extra work to every parse, but the effect seems minimal.


function doNothing(ts: TokenStream): void { }

function skipOneToken(ts: TokenStream): void {
  ts.read()
}


function isAccepted(fsa: BaseFsa, ts: TokenStream): boolean {
  let currState = fsa.startState
  while (currState !== fsa.stopState) {
    let foundArc = false
    for (let arc of currState.arcs) {
      if (arc.condition(ts)) {
        foundArc = true
        arc.onSuccessParseStreamCallback(ts)
        currState = arc.nextState
        break
      }
    }
    if (!foundArc) return false
  }
  return currState === fsa.stopState
}


/**
 * Satisfied if the stream is at a compact function declaration such as
 *   f(val) = 2*val
 */
class FunctionCompactDeclarationFsa extends BaseFsa {
  constructor() {
    super()

    let start = this.startState
    let stop = this.stopState
    let name = new FsaState("name")
    let nameDot = new FsaState("name dot")
    let overridableOperator = new FsaState("overridable operator")
    let genericParams = new FsaState("generic params")
    let argList = new FsaState("arg list")
    let equals = new FsaState("equals")

    let allStatesExceptStop = [start, name, nameDot, overridableOperator, genericParams, argList, equals]
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtLineWhitespace, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }

    start.addArc(name, streamAtIdentifier, skipOneToken)
    start.addArc(overridableOperator, streamAtOverridableOperator, skipOneToken)

    name.addArc(nameDot, streamAtDot, skipOneToken)
    name.addArc(genericParams, streamAtOpenCurlyBraces, skipOneToken)
    name.addArc(argList, streamAtOpenParenthesis, skipOneToken)

    nameDot.addArc(name, streamAtIdentifier, skipOneToken)
    nameDot.addArc(overridableOperator, streamAtOverridableOperator, skipOneToken)

    overridableOperator.addArc(genericParams, streamAtOpenCurlyBraces, skipOneToken)
    overridableOperator.addArc(argList, streamAtOpenParenthesis, skipOneToken)

    genericParams.addArc(argList, streamAtOpenParenthesis, skipOneToken)

    argList.addArc(equals, streamAtEquals, skipOneToken)

    equals.addArc(stop, alwaysPasses, doNothing)
  }
}

let functionCompactDeclarationFsa = new FunctionCompactDeclarationFsa()
export function streamAtFunctionCompactDeclaration(ts: TokenStream): boolean {
  ts = ts.shallowCopy()
  return isAccepted(functionCompactDeclarationFsa, ts)
}



/**
 * Satisfied if the stream is at a macro invocation
 * eg
 *   @foo
 *   Base.@foo
 *   @Base.foo
 */
class MacroInvocationFsa extends BaseFsa {
  constructor() {
    super()

    let start = this.startState
    let stop = this.stopState

    // for @Base.time
    // or @time
    let firstNameWithAt = new FsaState("first name with @")

    // for Base.@time
    let prefixWithoutAt = new FsaState("prefix without @")
    let dot = new FsaState(".")
    let lastNameWithAt = new FsaState("last name with @")

    // maybe don't allow whitespace
    //let allStatesExceptStop = [start, firstNameWithAt, prefixWithoutAt, dot, lastNameWithAt]
    //for (let state of allStatesExceptStop) {
    //  state.addArc(state, streamAtLineWhitespace, skipOneToken) // only allow whitespace, not comments or new lines
    //}

    start.addArc(firstNameWithAt, streamAtMacroIdentifier, skipOneToken)
    firstNameWithAt.addArc(stop, alwaysPasses, doNothing)

    start.addArc(prefixWithoutAt, streamAtIdentifier, skipOneToken)
    prefixWithoutAt.addArc(dot, streamAtDot, skipOneToken)
    dot.addArc(prefixWithoutAt, streamAtIdentifier, skipOneToken)
    dot.addArc(lastNameWithAt, streamAtMacroIdentifier, skipOneToken)
    lastNameWithAt.addArc(stop, alwaysPasses, doNothing)
  }
}

let macroInvocationFsa = new MacroInvocationFsa()
export function streamAtMacroInvocation(ts: TokenStream): boolean {
  ts = ts.shallowCopy()
  return isAccepted(macroInvocationFsa, ts)
}




/**
 * Satified if the stream is an an anonymous function, such as
 *   val -> val + 1
 *   (a, b) -> a + b
 */
class AnonymousFunctionFsa extends BaseFsa {
  constructor() {
    super()

    let start = this.startState
    let stop = this.stopState
    let singleArg = new FsaState("single arg")
    let multipleArgs = new FsaState("multiple args")
    let arrow = new FsaState("arrow")

    let allStatesExceptStop = [start, singleArg, multipleArgs, arrow]
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtLineWhitespace, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
    }

    start.addArc(singleArg, streamAtIdentifier, skipOneToken)
    start.addArc(multipleArgs, streamAtOpenParenthesis, skipOneToken)

    singleArg.addArc(arrow, streamAtArrow, skipOneToken)
    multipleArgs.addArc(arrow, streamAtArrow, skipOneToken)

    arrow.addArc(stop, alwaysPasses, doNothing)
  }
}

let anonymousFunctionFsa = new AnonymousFunctionFsa()
export function streamAtAnonymousFunction(ts: TokenStream): boolean {
  ts = ts.shallowCopy()
  return isAccepted(anonymousFunctionFsa, ts)
}


/**
 * Satisfied if the stream is at an identifier = .
 * Useful in function arg lists.
 * eg
 *   foo(a=1, b=2)
 */
class IdentifierEqualsFsa extends BaseFsa {
  constructor() {
    super()

    let start = this.startState
    let stop = this.stopState
    let identifier = new FsaState("identifier")
    let equals = new FsaState("equals")

    let allStatesExceptStop = [start, identifier, equals]
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtLineWhitespace, skipOneToken)
      state.addArc(state, streamAtComment, skipOneToken)
      state.addArc(state, streamAtNewLine, skipOneToken)  // new lines are ok within parentheses
    }

    start.addArc(identifier, streamAtIdentifier, skipOneToken)

    identifier.addArc(equals, streamAtEquals, skipOneToken)

    equals.addArc(stop, alwaysPasses, doNothing)
  }
}

let identifierEqualsFsa = new IdentifierEqualsFsa()
export function streamAtIdentifierEquals(ts: TokenStream): boolean {
  ts = ts.shallowCopy()
  return isAccepted(identifierEqualsFsa, ts)
}


/**
 * Satisfied if encounters an operator that can be interpreted as an identifier, for situations like
 *   map(+, arr)
 *   broadcast(*, arr)
 */
class OperatorAsIdentifierFsa extends BaseFsa {
  constructor() {
    super()
    let start = this.startState
    let stop = this.stopState
    let operator = new FsaState("operator")

    start.addArc(operator, streamAtOperatorThatCanBeIdentifier, skipOneToken)

    // ignore whitespace and comments
    operator.addArc(operator, streamAtComment, skipOneToken)
    operator.addArc(operator, streamAtLineWhitespace, skipOneToken)

    // the operator can be followed by ';' '\n' ',' or eof
    operator.addArc(stop, streamAtSemicolon, doNothing)
    operator.addArc(stop, streamAtNewLine, doNothing)
    operator.addArc(stop, streamAtComma, doNothing)
    operator.addArc(stop, streamAtEof, doNothing)

  }
}

let operatorAsIdentifierFsa = new OperatorAsIdentifierFsa()
export function streamAtOperatorThatIsIdentifier(ts: TokenStream): boolean {
  ts = ts.shallowCopy()
  return isAccepted(operatorAsIdentifierFsa, ts)
}

