"use strict"

import {AssertError} from "../../utils/assert";
import {WholeFileParseState} from "./ModuleContentsFsa";
import {TokenStream} from "../../tokens/TokenStream";
import {InvalidParseError} from "../../utils/errors";
import {Token} from "../../tokens/Token";
import {MayBeUnparsedNode} from "../../parseTree/nodes";



export abstract class BaseFsa {
  startState: FsaState
  stopState: FsaState

  constructor() {
    let startState = new FsaState("start")
    let stopState = new FsaState("stop")
    this.startState = startState
    this.stopState = stopState
  }
}



export interface IFsaParseState {
  ts: TokenStream
}

export class FsaState {
  arcs: Arc[]
  name: string // useful when debugging

  constructor(name: string) {
    this.arcs = []
    this.name = name
  }

  /**
   * Adds an outgoing arc from this state.
   */
  addArc(nextState: FsaState, condition: (TokenStream) => boolean, onSuccess) {
    this.arcs.push(new Arc(nextState, condition, onSuccess))
  }

  toString(): string {
    return this.name
  }
}


export class Arc {

  /**
   *
   * @param nextState
   * @param condition
   * @param onSuccessParseStreamCallback  Callback of dynamic type: (T) => void  where T is the parse state
   */
  constructor(public nextState: FsaState, public condition: (TokenStream) => boolean,
              public onSuccessParseStreamCallback) {
  }
}








/**
 * Run the parse state container through the fsa states, consuming tokens as necessary.
 * The FSA must be deterministic.
 * The visitor contains state which is modified as it passes through the FSA.
 * Does not change any FSA state.
 *
 * This separates the algorithm for traversing the FSA from the FSA.
 */
export function runFsaStartToStop(fsa: BaseFsa, parseState: IFsaParseState): void {
  runFsaHelper(fsa, parseState, null)
}

export function runFsaStartToEarlyExit(fsa: BaseFsa, parseState: IFsaParseState, earlyStopStates: FsaState[]): void {
  runFsaHelper(fsa, parseState, earlyStopStates)
}

function runFsaHelper(fsa: BaseFsa, parseState: IFsaParseState, earlyStopStates: FsaState[]): void {
  let currState = fsa.startState
  //let streamStartIndex = parseState.ts.index

  // track state sequence and corresponding token stream indexes for help when debugging
  let stateSteps: FsaState[] = []
  let tsIndexes: number[] = []

  while (currState !== fsa.stopState) {
    stateSteps.push(currState)
    tsIndexes.push(parseState.ts.index)

    if (earlyStopStates !== null) {
      if (earlyStopStates.indexOf(currState) >= 0) {
        break
      }
    }

    // find the correct arc to follow
    let foundArc = false
    for (let i = 0; i < currState.arcs.length; i++) {
      let iArc = currState.arcs[i]
      if (iArc.condition(parseState.ts)) {
        foundArc = true
        currState = iArc.nextState
        iArc.onSuccessParseStreamCallback(parseState)
        break
      }
    }

    // throws if cannot advance
    if (!foundArc) {
      throwParseErrorFailedToFindArc(parseState.ts, stateSteps, tsIndexes)
    }

    if (stateSteps.length > 1000000) {
      throw new InvalidParseError("Stuck in infinite loop trying to parse: " + parseState.ts.getContext(), parseState.ts.peek())
    }
  }

}


// helper method for failures
function throwParseErrorFailedToFindArc(ts: TokenStream, stateSteps: FsaState[], tsIndexes: number[]) {
  let currIndex = ts.index
  let symbolsSoFar = ts.toOrigString(tsIndexes[0], currIndex)
  let stateNamesSoFar = stateSteps.map((state) => { return state.name }).join(", ")

  let stateSymbolsList = ""
  for (let i = 0; i < stateSteps.length; i++) {
    let state = stateSteps[i]
    let prevIndex = tsIndexes[0]
    if (i > 0) prevIndex = tsIndexes[i-1]
    let currIndex = tsIndexes[i]

    let iSymbols = ts.toOrigString(prevIndex, currIndex)
    let iStateName = state.name

    stateSymbolsList += iStateName + ": " + iSymbols + "\n"
  }

  let detailedMessage = "Symbols so far: " + symbolsSoFar +
    ". States so far: " + stateNamesSoFar + ".\n\nList:\n" + stateSymbolsList

  if (ts.eof()) {
    let err = new InvalidParseError("Unexpected end of expression.", ts.getLastToken())
    err.detailedMessage = detailedMessage
    throw err
  }
  let token = ts.read()
  let err = new InvalidParseError("Unexpected symbol", token)
  err.detailedMessage = detailedMessage
  throw err
}


export function expectNoMoreExpressions(ts: TokenStream): void {
  ts.skipToNextNonWhitespace()
  if (!ts.eof()) throw new InvalidParseError("Expected end of expression.", ts.read())
}
export function handleParseErrorOnly(err: Error, node: MayBeUnparsedNode, contents: Token[], wholeState: WholeFileParseState) {
  if (err instanceof InvalidParseError) {
    node.parseError = err
    node.unparsedContents = contents.slice()
    node.parseSkipped = true
    wholeState.parseErrors.push(err)
  } else {
    throw err
  }
}
export function skipParse(node: MayBeUnparsedNode, unparsedContents: Token[]) {
  node.unparsedContents = unparsedContents.slice()
  node.parseSkipped = true
}
