"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var errors_1 = require("../../utils/errors");
class BaseFsa {
    constructor() {
        let startState = new FsaState("start");
        let stopState = new FsaState("stop");
        this.startState = startState;
        this.stopState = stopState;
    }
}
exports.BaseFsa = BaseFsa;
class FsaState {
    constructor(name) {
        this.arcs = [];
        this.name = name;
    }
    /**
     * Adds an outgoing arc from this state.
     */
    addArc(nextState, condition, onSuccess) {
        this.arcs.push(new Arc(nextState, condition, onSuccess));
    }
    toString() {
        return this.name;
    }
}
exports.FsaState = FsaState;
class Arc {
    /**
     *
     * @param nextState
     * @param condition
     * @param onSuccessParseStreamCallback  Callback of dynamic type: (T) => void  where T is the parse state
     */
    constructor(nextState, condition, onSuccessParseStreamCallback) {
        this.nextState = nextState;
        this.condition = condition;
        this.onSuccessParseStreamCallback = onSuccessParseStreamCallback;
    }
}
exports.Arc = Arc;
/**
 * Run the parse state container through the fsa states, consuming tokens as necessary.
 * The FSA must be deterministic.
 * The visitor contains state which is modified as it passes through the FSA.
 * Does not change any FSA state.
 *
 * This separates the algorithm for traversing the FSA from the FSA.
 */
function runFsaStartToStop(fsa, parseState) {
    runFsaHelper(fsa, parseState, null);
}
exports.runFsaStartToStop = runFsaStartToStop;
function runFsaStartToEarlyExit(fsa, parseState, earlyStopStates) {
    runFsaHelper(fsa, parseState, earlyStopStates);
}
exports.runFsaStartToEarlyExit = runFsaStartToEarlyExit;
function runFsaHelper(fsa, parseState, earlyStopStates) {
    let currState = fsa.startState;
    //let streamStartIndex = parseState.ts.index
    // track state sequence and corresponding token stream indexes for help when debugging
    let stateSteps = [];
    let tsIndexes = [];
    while (currState !== fsa.stopState) {
        stateSteps.push(currState);
        tsIndexes.push(parseState.ts.index);
        if (earlyStopStates !== null) {
            if (earlyStopStates.indexOf(currState) >= 0) {
                break;
            }
        }
        // find the correct arc to follow
        let foundArc = false;
        for (let i = 0; i < currState.arcs.length; i++) {
            let iArc = currState.arcs[i];
            if (iArc.condition(parseState.ts)) {
                foundArc = true;
                currState = iArc.nextState;
                iArc.onSuccessParseStreamCallback(parseState);
                break;
            }
        }
        // throws if cannot advance
        if (!foundArc) {
            throwParseErrorFailedToFindArc(parseState.ts, stateSteps, tsIndexes);
        }
        if (stateSteps.length > 1000000) {
            throw new errors_1.InvalidParseError("Stuck in infinite loop trying to parse: " + parseState.ts.getContext(), parseState.ts.peek());
        }
    }
}
// helper method for failures
function throwParseErrorFailedToFindArc(ts, stateSteps, tsIndexes) {
    let currIndex = ts.index;
    let symbolsSoFar = ts.toOrigString(tsIndexes[0], currIndex);
    let stateNamesSoFar = stateSteps.map((state) => { return state.name; }).join(", ");
    let stateSymbolsList = "";
    for (let i = 0; i < stateSteps.length; i++) {
        let state = stateSteps[i];
        let prevIndex = tsIndexes[0];
        if (i > 0)
            prevIndex = tsIndexes[i - 1];
        let currIndex = tsIndexes[i];
        let iSymbols = ts.toOrigString(prevIndex, currIndex);
        let iStateName = state.name;
        stateSymbolsList += iStateName + ": " + iSymbols + "\n";
    }
    let detailedMessage = "Symbols so far: " + symbolsSoFar +
        ". States so far: " + stateNamesSoFar + ".\n\nList:\n" + stateSymbolsList;
    if (ts.eof()) {
        let err = new errors_1.InvalidParseError("Unexpected end of expression.", ts.getLastToken());
        err.detailedMessage = detailedMessage;
        throw err;
    }
    let token = ts.read();
    let err = new errors_1.InvalidParseError("Unexpected symbol", token);
    err.detailedMessage = detailedMessage;
    throw err;
}
function expectNoMoreExpressions(ts) {
    ts.skipToNextNonWhitespace();
    if (!ts.eof())
        throw new errors_1.InvalidParseError("Expected end of expression.", ts.read());
}
exports.expectNoMoreExpressions = expectNoMoreExpressions;
function handleParseErrorOnly(err, node, contents, wholeState) {
    if (err instanceof errors_1.InvalidParseError) {
        node.parseError = err;
        node.unparsedContents = contents.slice();
        node.parseSkipped = true;
        wholeState.parseErrors.push(err);
    }
    else {
        throw err;
    }
}
exports.handleParseErrorOnly = handleParseErrorOnly;
function skipParse(node, unparsedContents) {
    node.unparsedContents = unparsedContents.slice();
    node.parseSkipped = true;
}
exports.skipParse = skipParse;
//# sourceMappingURL=fsaUtils.js.map