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
var streamConditions_1 = require("./streamConditions");
var streamConditions_2 = require("./streamConditions");
var fsaUtils_1 = require("../fsas/general/fsaUtils");
var streamConditions_3 = require("./streamConditions");
var streamConditions_4 = require("./streamConditions");
var streamConditions_5 = require("./streamConditions");
var streamConditions_6 = require("./streamConditions");
var streamConditions_7 = require("./streamConditions");
var streamConditions_8 = require("./streamConditions");
var streamConditions_9 = require("./streamConditions");
var streamConditions_10 = require("./streamConditions");
var streamConditions_11 = require("./streamConditions");
var streamConditions_12 = require("./streamConditions");
var fsaUtils_2 = require("../fsas/general/fsaUtils");
// For running the stream through a mini fsa to see if it satifies a complex condition.
// These need look ahead multiple tokens. The other stream conditions just peek ahead one token.
// Because they are more complex, it's clearer to represent them as mini FSAs.
function doNothing(ts) { }
function skipOneToken(ts) {
    ts.read();
}
function isAccepted(fsa, ts) {
    let currState = fsa.startState;
    while (currState !== fsa.stopState) {
        let foundArc = false;
        for (let arc of currState.arcs) {
            if (arc.condition(ts)) {
                foundArc = true;
                arc.onSuccessParseStreamCallback(ts);
                currState = arc.nextState;
                break;
            }
        }
        if (!foundArc)
            return false;
    }
    return currState === fsa.stopState;
}
/**
 * Satisfied if the stream is at a compact function declaration such as
 *   f(val) = 2*val
 */
class FunctionCompactDeclarationFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        let name = new fsaUtils_2.FsaState("name");
        let nameDot = new fsaUtils_2.FsaState("name dot");
        let overridableOperator = new fsaUtils_2.FsaState("overridable operator");
        let genericParams = new fsaUtils_2.FsaState("generic params");
        let argList = new fsaUtils_2.FsaState("arg list");
        let equals = new fsaUtils_2.FsaState("equals");
        let allStatesExceptStop = [start, name, nameDot, overridableOperator, genericParams, argList, equals];
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_5.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_6.streamAtComment, skipOneToken);
        }
        start.addArc(name, streamConditions_3.streamAtIdentifier, skipOneToken);
        start.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, skipOneToken);
        name.addArc(nameDot, streamConditions_4.streamAtDot, skipOneToken);
        name.addArc(genericParams, streamConditions_7.streamAtOpenCurlyBraces, skipOneToken);
        name.addArc(argList, streamConditions_8.streamAtOpenParenthesis, skipOneToken);
        nameDot.addArc(name, streamConditions_3.streamAtIdentifier, skipOneToken);
        nameDot.addArc(overridableOperator, streamConditions_1.streamAtOverridableOperator, skipOneToken);
        overridableOperator.addArc(genericParams, streamConditions_7.streamAtOpenCurlyBraces, skipOneToken);
        overridableOperator.addArc(argList, streamConditions_8.streamAtOpenParenthesis, skipOneToken);
        genericParams.addArc(argList, streamConditions_8.streamAtOpenParenthesis, skipOneToken);
        argList.addArc(equals, streamConditions_9.streamAtEquals, skipOneToken);
        equals.addArc(stop, streamConditions_10.alwaysPasses, doNothing);
    }
}
let functionCompactDeclarationFsa = new FunctionCompactDeclarationFsa();
function streamAtFunctionCompactDeclaration(ts) {
    ts = ts.shallowCopy();
    return isAccepted(functionCompactDeclarationFsa, ts);
}
exports.streamAtFunctionCompactDeclaration = streamAtFunctionCompactDeclaration;
/**
 * Satisfied if the stream is at a macro invocation
 * eg
 *   @foo
 *   Base.@foo
 *   @Base.foo
 */
class MacroInvocationFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        // for @Base.time
        // or @time
        let firstNameWithAt = new fsaUtils_2.FsaState("first name with @");
        // for Base.@time
        let prefixWithoutAt = new fsaUtils_2.FsaState("prefix without @");
        let dot = new fsaUtils_2.FsaState(".");
        let lastNameWithAt = new fsaUtils_2.FsaState("last name with @");
        // maybe don't allow whitespace
        //let allStatesExceptStop = [start, firstNameWithAt, prefixWithoutAt, dot, lastNameWithAt]
        //for (let state of allStatesExceptStop) {
        //  state.addArc(state, streamAtLineWhitespace, skipOneToken) // only allow whitespace, not comments or new lines
        //}
        start.addArc(firstNameWithAt, streamConditions_2.streamAtMacroIdentifier, skipOneToken);
        firstNameWithAt.addArc(stop, streamConditions_10.alwaysPasses, doNothing);
        start.addArc(prefixWithoutAt, streamConditions_3.streamAtIdentifier, skipOneToken);
        prefixWithoutAt.addArc(dot, streamConditions_4.streamAtDot, skipOneToken);
        dot.addArc(prefixWithoutAt, streamConditions_3.streamAtIdentifier, skipOneToken);
        dot.addArc(lastNameWithAt, streamConditions_2.streamAtMacroIdentifier, skipOneToken);
        lastNameWithAt.addArc(stop, streamConditions_10.alwaysPasses, doNothing);
    }
}
let macroInvocationFsa = new MacroInvocationFsa();
function streamAtMacroInvocation(ts) {
    ts = ts.shallowCopy();
    return isAccepted(macroInvocationFsa, ts);
}
exports.streamAtMacroInvocation = streamAtMacroInvocation;
/**
 * Satified if the stream is an an anonymous function, such as
 *   val -> val + 1
 *   (a, b) -> a + b
 */
class AnonymousFunctionFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        let singleArg = new fsaUtils_2.FsaState("single arg");
        let multipleArgs = new fsaUtils_2.FsaState("multiple args");
        let arrow = new fsaUtils_2.FsaState("arrow");
        let allStatesExceptStop = [start, singleArg, multipleArgs, arrow];
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_5.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_6.streamAtComment, skipOneToken);
        }
        start.addArc(singleArg, streamConditions_3.streamAtIdentifier, skipOneToken);
        start.addArc(multipleArgs, streamConditions_8.streamAtOpenParenthesis, skipOneToken);
        singleArg.addArc(arrow, streamConditions_11.streamAtArrow, skipOneToken);
        multipleArgs.addArc(arrow, streamConditions_11.streamAtArrow, skipOneToken);
        arrow.addArc(stop, streamConditions_10.alwaysPasses, doNothing);
    }
}
let anonymousFunctionFsa = new AnonymousFunctionFsa();
function streamAtAnonymousFunction(ts) {
    ts = ts.shallowCopy();
    return isAccepted(anonymousFunctionFsa, ts);
}
exports.streamAtAnonymousFunction = streamAtAnonymousFunction;
/**
 * Satisfied if the stream is at an identifier = .
 * Useful in function arg lists.
 * eg
 *   foo(a=1, b=2)
 */
class IdentifierEqualsFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        let identifier = new fsaUtils_2.FsaState("identifier");
        let equals = new fsaUtils_2.FsaState("equals");
        let allStatesExceptStop = [start, identifier, equals];
        for (let state of allStatesExceptStop) {
            state.addArc(state, streamConditions_5.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_6.streamAtComment, skipOneToken);
            state.addArc(state, streamConditions_12.streamAtNewLine, skipOneToken); // new lines are ok within parentheses
        }
        start.addArc(identifier, streamConditions_3.streamAtIdentifier, skipOneToken);
        identifier.addArc(equals, streamConditions_9.streamAtEquals, skipOneToken);
        equals.addArc(stop, streamConditions_10.alwaysPasses, doNothing);
    }
}
let identifierEqualsFsa = new IdentifierEqualsFsa();
function streamAtIdentifierEquals(ts) {
    ts = ts.shallowCopy();
    return isAccepted(identifierEqualsFsa, ts);
}
exports.streamAtIdentifierEquals = streamAtIdentifierEquals;
//# sourceMappingURL=lookAheadStreamConditions.js.map