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
var streamConditions_1 = require("./../../tokens/streamConditions");
var streamConditions_2 = require("./../../tokens/streamConditions");
var streamConditions_3 = require("./../../tokens/streamConditions");
var fsaUtils_1 = require("./fsaUtils");
var streamConditions_4 = require("./../../tokens/streamConditions");
var streamConditions_5 = require("./../../tokens/streamConditions");
var streamConditions_6 = require("./../../tokens/streamConditions");
var streamConditions_7 = require("./../../tokens/streamConditions");
var streamConditions_8 = require("./../../tokens/streamConditions");
var streamConditions_9 = require("./../../tokens/streamConditions");
var streamConditions_10 = require("./../../tokens/streamConditions");
var streamConditions_11 = require("./../../tokens/streamConditions");
var streamConditions_12 = require("./../../tokens/streamConditions");
var streamConditions_13 = require("./../../tokens/streamConditions");
var fsaUtils_2 = require("./fsaUtils");
var streamConditions_14 = require("./../../tokens/streamConditions");
var streamConditions_15 = require("./../../tokens/streamConditions");
var streamConditions_16 = require("./../../tokens/streamConditions");
// For running the stream through a mini fsa to see if it satifies a complex condition.
// These need look ahead multiple tokens. The other stream conditions just peek ahead one token.
// Because they are more complex, it's clearer to represent them as mini FSAs.
// Using these introduces a bit of extra work to every parse, but the effect seems minimal.
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
            state.addArc(state, streamConditions_6.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_7.streamAtComment, skipOneToken);
        }
        start.addArc(name, streamConditions_4.streamAtIdentifier, skipOneToken);
        start.addArc(overridableOperator, streamConditions_2.streamAtOverridableOperator, skipOneToken);
        name.addArc(nameDot, streamConditions_5.streamAtDot, skipOneToken);
        name.addArc(genericParams, streamConditions_8.streamAtOpenCurlyBraces, skipOneToken);
        name.addArc(argList, streamConditions_9.streamAtOpenParenthesis, skipOneToken);
        nameDot.addArc(name, streamConditions_4.streamAtIdentifier, skipOneToken);
        nameDot.addArc(overridableOperator, streamConditions_2.streamAtOverridableOperator, skipOneToken);
        overridableOperator.addArc(genericParams, streamConditions_8.streamAtOpenCurlyBraces, skipOneToken);
        overridableOperator.addArc(argList, streamConditions_9.streamAtOpenParenthesis, skipOneToken);
        genericParams.addArc(argList, streamConditions_9.streamAtOpenParenthesis, skipOneToken);
        argList.addArc(equals, streamConditions_10.streamAtEquals, skipOneToken);
        equals.addArc(stop, streamConditions_11.alwaysPasses, doNothing);
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
        start.addArc(firstNameWithAt, streamConditions_3.streamAtMacroIdentifier, skipOneToken);
        firstNameWithAt.addArc(stop, streamConditions_11.alwaysPasses, doNothing);
        start.addArc(prefixWithoutAt, streamConditions_4.streamAtIdentifier, skipOneToken);
        prefixWithoutAt.addArc(dot, streamConditions_5.streamAtDot, skipOneToken);
        dot.addArc(prefixWithoutAt, streamConditions_4.streamAtIdentifier, skipOneToken);
        dot.addArc(lastNameWithAt, streamConditions_3.streamAtMacroIdentifier, skipOneToken);
        lastNameWithAt.addArc(stop, streamConditions_11.alwaysPasses, doNothing);
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
            state.addArc(state, streamConditions_6.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_7.streamAtComment, skipOneToken);
        }
        start.addArc(singleArg, streamConditions_4.streamAtIdentifier, skipOneToken);
        start.addArc(multipleArgs, streamConditions_9.streamAtOpenParenthesis, skipOneToken);
        singleArg.addArc(arrow, streamConditions_12.streamAtArrow, skipOneToken);
        multipleArgs.addArc(arrow, streamConditions_12.streamAtArrow, skipOneToken);
        arrow.addArc(stop, streamConditions_11.alwaysPasses, doNothing);
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
            state.addArc(state, streamConditions_6.streamAtLineWhitespace, skipOneToken);
            state.addArc(state, streamConditions_7.streamAtComment, skipOneToken);
            state.addArc(state, streamConditions_13.streamAtNewLine, skipOneToken); // new lines are ok within parentheses
        }
        start.addArc(identifier, streamConditions_4.streamAtIdentifier, skipOneToken);
        identifier.addArc(equals, streamConditions_10.streamAtEquals, skipOneToken);
        equals.addArc(stop, streamConditions_11.alwaysPasses, doNothing);
    }
}
let identifierEqualsFsa = new IdentifierEqualsFsa();
function streamAtIdentifierEquals(ts) {
    ts = ts.shallowCopy();
    return isAccepted(identifierEqualsFsa, ts);
}
exports.streamAtIdentifierEquals = streamAtIdentifierEquals;
/**
 * Satisfied if encounters an operator that can be interpreted as an identifier, for situations like
 *   map(+, arr)
 *   broadcast(*, arr)
 */
class OperatorAsIdentifierFsa extends fsaUtils_1.BaseFsa {
    constructor() {
        super();
        let start = this.startState;
        let stop = this.stopState;
        let operator = new fsaUtils_2.FsaState("operator");
        start.addArc(operator, streamConditions_1.streamAtOperatorThatCanBeIdentifier, skipOneToken);
        // ignore whitespace and comments
        operator.addArc(operator, streamConditions_7.streamAtComment, skipOneToken);
        operator.addArc(operator, streamConditions_6.streamAtLineWhitespace, skipOneToken);
        // the operator can be followed by ';' '\n' ',' or eof
        operator.addArc(stop, streamConditions_16.streamAtSemicolon, doNothing);
        operator.addArc(stop, streamConditions_13.streamAtNewLine, doNothing);
        operator.addArc(stop, streamConditions_14.streamAtComma, doNothing);
        operator.addArc(stop, streamConditions_15.streamAtEof, doNothing);
    }
}
let operatorAsIdentifierFsa = new OperatorAsIdentifierFsa();
function streamAtOperatorThatIsIdentifier(ts) {
    ts = ts.shallowCopy();
    return isAccepted(operatorAsIdentifierFsa, ts);
}
exports.streamAtOperatorThatIsIdentifier = streamAtOperatorThatIsIdentifier;
//# sourceMappingURL=lookAheadStreamConditions.js.map