"use strict";
const lookAheadStreamConditions_1 = require("./lookAheadStreamConditions");
const arrayUtils_1 = require("../../utils/arrayUtils");
const streamConditions_1 = require("../../tokens/streamConditions");
const fsaUtils_1 = require("./fsaUtils");
const LetBlockFsa_1 = require("../controlFlow/LetBlockFsa");
const streamConditions_2 = require("../../tokens/streamConditions");
const streamConditions_3 = require("../../tokens/streamConditions");
const GenericDefArgListFsa_1 = require("../declarations/GenericDefArgListFsa");
const nodes_1 = require("../../parseTree/nodes");
const streamConditions_4 = require("../../tokens/streamConditions");
const operatorsAndKeywords_1 = require("../../tokens/operatorsAndKeywords");
const nodes_2 = require("../../parseTree/nodes");
const streamConditions_5 = require("../../tokens/streamConditions");
const nodes_3 = require("../../parseTree/nodes");
const streamConditions_6 = require("../../tokens/streamConditions");
const streamConditions_7 = require("../../tokens/streamConditions");
const streamConditions_8 = require("../../tokens/streamConditions");
const lookAheadStreamConditions_2 = require("./lookAheadStreamConditions");
const streamConditions_9 = require("../../tokens/streamConditions");
const StringFsa_1 = require("./StringFsa");
const FunctionCallFsa_1 = require("../bracketed/FunctionCallFsa");
const streamConditions_10 = require("../../tokens/streamConditions");
const streamConditions_11 = require("../../tokens/streamConditions");
const assert_1 = require("../../utils/assert");
const StringSet_1 = require("../../utils/StringSet");
const operatorsAndKeywords_2 = require("./../../tokens/operatorsAndKeywords");
const operatorsAndKeywords_3 = require("./../../tokens/operatorsAndKeywords");
const streamConditions_12 = require("./../../tokens/streamConditions");
const streamConditions_13 = require("./../../tokens/streamConditions");
const streamConditions_14 = require("./../../tokens/streamConditions");
const streamConditions_15 = require("./../../tokens/streamConditions");
const streamConditions_16 = require("./../../tokens/streamConditions");
const streamConditions_17 = require("./../../tokens/streamConditions");
const streamConditions_18 = require("./../../tokens/streamConditions");
const streamConditions_19 = require("./../../tokens/streamConditions");
const nodes_4 = require("./../../parseTree/nodes");
const nodes_5 = require("./../../parseTree/nodes");
const nodes_6 = require("./../../parseTree/nodes");
const nodes_7 = require("./../../parseTree/nodes");
const orderOfOperations_1 = require("./../../parseTree/orderOfOperations");
const nodes_8 = require("./../../parseTree/nodes");
const nodes_9 = require("./../../parseTree/nodes");
const streamConditions_20 = require("./../../tokens/streamConditions");
const streamConditions_21 = require("./../../tokens/streamConditions");
const streamConditions_22 = require("./../../tokens/streamConditions");
const fsaUtils_2 = require("./fsaUtils");
const fsaUtils_3 = require("./fsaUtils");
const lookAheadStreamConditions_3 = require("./lookAheadStreamConditions");
const nodes_10 = require("../../parseTree/nodes");
const errors_1 = require("../../utils/errors");
const streamConditions_23 = require("../../tokens/streamConditions");
const nodes_11 = require("../../parseTree/nodes");
const GenericArgListFsa_1 = require("../bracketed/GenericArgListFsa");
const FunctionCompactDefFsa_1 = require("../declarations/FunctionCompactDefFsa");
const MacroCallFsa_1 = require("./../bracketed/MacroCallFsa");
const FunctionDefFsa_1 = require("../declarations/FunctionDefFsa");
const BeginBlockFsa_1 = require("../controlFlow/BeginBlockFsa");
const IfBlockFsa_1 = require("../controlFlow/IfBlockFsa");
const ForBlockFsa_1 = require("../controlFlow/ForBlockFsa");
const WhileBlockFsa_1 = require("../controlFlow/WhileBlockFsa");
const DoBlockFsa_1 = require("../controlFlow/DoBlockFsa");
const TryBlockFsa_1 = require("../controlFlow/TryBlockFsa");
const streamConditions_24 = require("../../tokens/streamConditions");
const streamConditions_25 = require("../../tokens/streamConditions");
const streamConditions_26 = require("../../tokens/streamConditions");
const streamConditions_27 = require("../../tokens/streamConditions");
const VarDeclarationFsa_1 = require("../declarations/VarDeclarationFsa");
const VarDeclarationFsa_2 = require("../declarations/VarDeclarationFsa");
const VarDeclarationFsa_3 = require("../declarations/VarDeclarationFsa");
const streamConditions_28 = require("../../tokens/streamConditions");
const nodes_12 = require("../../parseTree/nodes");
const FunctionDefArgListFsa_1 = require("../declarations/FunctionDefArgListFsa");
const nodes_13 = require("../../parseTree/nodes");
const nodes_14 = require("../../parseTree/nodes");
const SquareBracketFsa_1 = require("../bracketed/SquareBracketFsa");
const SquareBracketFsa_2 = require("../bracketed/SquareBracketFsa");
const nodes_15 = require("../../parseTree/nodes");
const streamConditions_29 = require("../../tokens/streamConditions");
const Token_1 = require("../../tokens/Token");
const Token_2 = require("../../tokens/Token");
const lookAheadStreamConditions_4 = require("./lookAheadStreamConditions");
const ParenthesesFsa_1 = require("../bracketed/ParenthesesFsa");
/**
 * Automaton used for recognizing expressions.
 * In Julia, almost everything is a valid expression, including arithmetic expressions, for loops,
 * if statements, function declarations, and type annotations.
 *
 * This is a deterministic FSA. There is no need to track alternative pathways.
 * Even though +- can be unary or binary ops, they will only be unary if they are the
 * first token encountered or they are immediately after a binary op.
 */
class ExpressionFsa extends fsaUtils_2.BaseFsa {
    constructor(options) {
        super();
        let startState = this.startState;
        let stopState = this.stopState;
        let unaryState = new fsaUtils_3.FsaState("unary"); // prefix unary operators
        let binaryState = new fsaUtils_3.FsaState("binary");
        let binaryMayOmitArg2State = new fsaUtils_3.FsaState("binary may omit arg2"); // commas are like binary operators (they create tuples), but after the last comma, they do not require a trailing operand
        let ternaryState = new fsaUtils_3.FsaState("ternary");
        let postFixState = new fsaUtils_3.FsaState("postfix");
        let numberState = new fsaUtils_3.FsaState("number");
        let identifierState = new fsaUtils_3.FsaState("identifier");
        let symbolState = new fsaUtils_3.FsaState("symbol");
        let parenthesesState = new fsaUtils_3.FsaState("parentheses"); // Parentheses on their own control order of operations.
        let functionCallState = new fsaUtils_3.FsaState("function call"); // Parentheses after identifiers or certain expressions is a function call.
        // collapse together the array literal and the indexing state
        let squareBracketState = new fsaUtils_3.FsaState("square bracket");
        //let arrayLiteralState = new FsaState("array literal") // Square brackets on their own create an array literal.
        //let indexingState = new FsaState("indexing") // Square brackets after identifiers or certain expressions is essentially an indexing function call.
        let anyArrayLiteralState = new fsaUtils_3.FsaState("any array literal"); // {} on their own create an Any array literal.
        let typeParametersState = new fsaUtils_3.FsaState("type parameters"); // {} after identifiers or certain expressions is a type parameters qualifier
        let keywordBlockState = new fsaUtils_3.FsaState("keyword block"); // ie if...end, for...end, try...end
        let doBlockState = new fsaUtils_3.FsaState("do block");
        let quoteState = new fsaUtils_3.FsaState("quote");
        let stringMacroState = new fsaUtils_3.FsaState("string macro"); // eg regex r""
        let macroCallState = new fsaUtils_3.FsaState("macro invocation");
        let returnState = new fsaUtils_3.FsaState("return");
        let breakState = new fsaUtils_3.FsaState("break");
        let continueState = new fsaUtils_3.FsaState("continue");
        let singleColonState = new fsaUtils_3.FsaState(":");
        let localVarState = new fsaUtils_3.FsaState("local var");
        let globalVarState = new fsaUtils_3.FsaState("global var");
        let constVarState = new fsaUtils_3.FsaState("const var");
        let typeAliasKeyword = new fsaUtils_3.FsaState("typealias");
        let typeAliasName = new fsaUtils_3.FsaState("typealias name");
        let typeAliasGenericParamList = new fsaUtils_3.FsaState("type alias generic param list");
        let typeAliasRefersTo = new fsaUtils_3.FsaState("typealias refers to");
        let splatState = new fsaUtils_3.FsaState("...");
        let commaAfterSplatState = new fsaUtils_3.FsaState("comma after ...");
        // used to ignore comments, line whitespace, and new lines (via option)
        let allStatesNotStop = [startState, unaryState, binaryState, binaryMayOmitArg2State, ternaryState, postFixState,
            numberState, identifierState, symbolState,
            parenthesesState, functionCallState,
            squareBracketState,
            anyArrayLiteralState, typeParametersState,
            keywordBlockState, doBlockState, quoteState, stringMacroState, macroCallState,
            returnState, breakState, continueState, singleColonState, localVarState, globalVarState, constVarState,
            splatState, commaAfterSplatState, typeAliasKeyword, typeAliasName, typeAliasGenericParamList, typeAliasRefersTo];
        // filter down valid binary ops
        this.binaryOpsRequireArg2 = {};
        this.binaryOpsMayOmitArg2 = {};
        for (let op in operatorsAndKeywords_2.binaryOperators) {
            if (options.binaryOpsToIgnore.indexOf(op) < 0) {
                if (op in operatorsAndKeywords_1.binaryOperatorsMayOmitArg2) {
                    StringSet_1.addToSet(this.binaryOpsMayOmitArg2, op);
                }
                else {
                    StringSet_1.addToSet(this.binaryOpsRequireArg2, op);
                }
            }
        }
        let streamAtBinaryOpRequireArg2 = this.streamAtBinaryOpRequireArg2.bind(this);
        let streamAtBinaryOpMayOmitArg2 = this.streamAtBinaryOpMayOmitArg2.bind(this);
        let streamNotAtContinuingOp = this.streamNotAtContinuingOp.bind(this);
        let streamNotAtContinuingOpNorOpenBracket = this.streamNotAtContinuingOpNorOpenBracket.bind(this);
        // ignore comments everywhere
        for (let state of allStatesNotStop) {
            state.addArc(state, streamConditions_21.streamAtComment, skipOneToken);
        }
        // ignore line whitespace everywhere
        // except in certain situations, where the absence of whitespace can imply multiplication
        for (let state of allStatesNotStop) {
            if (state === numberState || state === parenthesesState || state === functionCallState)
                continue;
            state.addArc(state, streamConditions_1.streamAtLineWhitespace, skipOneToken);
        }
        // New line handling.
        //
        // These states always ignore new lines.
        // Binary and ternary operators allow unlimited new lines until next expression is encountered.
        // Unary needs the next token before any whitespace.
        for (let state of [binaryState, binaryMayOmitArg2State, ternaryState]) {
            state.addArc(state, streamConditions_14.streamAtNewLine, skipOneToken);
        }
        // The rest of the states only ignore new lines if a special option is set.
        for (let state of allStatesNotStop) {
            if (state !== unaryState && state !== binaryState && state !== binaryMayOmitArg2State && state !== ternaryState) {
                if (options.newLineInMiddleDoesNotEndExpression) {
                    state.addArc(state, streamConditions_14.streamAtNewLine, skipOneToken);
                }
            }
        }
        // special expressions
        // ':' by itself only has a path from start to stop
        if (options.allowSingleColon) {
            startState.addArc(singleColonState, streamConditions_10.streamAtColon, readSingleColonAsIdentifier);
            singleColonState.addArc(stopState, streamNotAtContinuingOp, doNothing);
        }
        returnState.addArc(stopState, streamConditions_12.streamAtEof, doNothing);
        returnState.addArc(stopState, streamConditions_23.streamAtNewLineOrSemicolon, doNothing);
        // return can also be followed by an expression
        returnState.addArc(stopState, streamConditions_27.alwaysPasses, readReturnExpression);
        // 'break' can only appear by itself
        breakState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        // continue can only appear by itself
        continueState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        // 'local' 'global' 'const' can only appear at the start
        startState.addArc(localVarState, streamConditions_24.streamAtLocal, readLocalVarDeclaration);
        startState.addArc(globalVarState, streamConditions_25.streamAtGlobal, readGlobalVarDeclaration);
        startState.addArc(constVarState, streamConditions_26.streamAtConst, readConstVarDeclaration);
        localVarState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        globalVarState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        constVarState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        // splat is a special postfix operator. It can only be continued by a comma.
        // Regulate even entering the splat state later below using an option.
        if ("," in this.binaryOpsRequireArg2) {
            splatState.addArc(commaAfterSplatState, streamConditions_28.streamAtComma, readBinaryOp);
        }
        splatState.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        // typealias
        startState.addArc(typeAliasKeyword, streamConditions_8.streamAtTypeAlias, skipOneToken);
        typeAliasKeyword.addArc(typeAliasKeyword, streamConditions_14.streamAtNewLine, skipOneToken);
        typeAliasKeyword.addArc(typeAliasName, streamConditions_16.streamAtIdentifier, readTypeAliasName);
        typeAliasName.addArc(typeAliasName, streamConditions_14.streamAtNewLine, skipOneToken);
        typeAliasName.addArc(typeAliasGenericParamList, streamConditions_20.streamAtOpenCurlyBraces, readTypeAliasGenericParamList);
        typeAliasName.addArc(typeAliasRefersTo, streamConditions_27.alwaysPasses, readTypeAliasRefersToExpression);
        typeAliasGenericParamList.addArc(typeAliasRefersTo, streamConditions_27.alwaysPasses, readTypeAliasRefersToExpression);
        typeAliasRefersTo.addArc(stopState, streamConditions_27.alwaysPasses, doNothing);
        // Most expressions
        // these states can be considered a complete expression
        // They can be be continued with a binary or ternary or postfix op.
        // Also allow do blocks.
        // A ; will terminate.
        // A \n will terminate unless an option is set to ignore them.
        // a new identifier or number also implies termination
        for (let state of [identifierState, parenthesesState, functionCallState, squareBracketState,
            anyArrayLiteralState, typeParametersState, postFixState, numberState, symbolState, keywordBlockState, doBlockState,
            quoteState, stringMacroState,
            macroCallState]) {
            state.addArc(binaryState, streamAtBinaryOpRequireArg2, readBinaryOp);
            state.addArc(binaryMayOmitArg2State, streamAtBinaryOpMayOmitArg2, readBinaryOp);
            state.addArc(ternaryState, streamConditions_13.streamAtTernaryOp, readTernaryOp);
            state.addArc(postFixState, streamConditions_5.streamAtPostFixOp, readPostFixOp);
            state.addArc(doBlockState, streamConditions_2.streamAtDo, readDoBlock);
            if (options.allowSplat) {
                state.addArc(splatState, streamConditions_9.streamAtTripleDot, readPostFixOp); // treat splat as postfix
            }
        }
        // allow certain operators to be treated as identifiers if they appear in isolated circumstances, ie
        //   preceded by BOF ,
        //   followed by , \n ; or EOF
        // This condition must be tested before other arcs out of the start and binary states.
        for (let state of [startState, binaryMayOmitArg2State]) {
            state.addArc(identifierState, lookAheadStreamConditions_4.streamAtOperatorThatIsIdentifier, readOperatorAndConvertToIdentifier);
        }
        // These states must be followed by something that creates a valid expression.
        for (let state of [startState, unaryState, binaryState, binaryMayOmitArg2State, ternaryState, commaAfterSplatState]) {
            state.addArc(keywordBlockState, lookAheadStreamConditions_3.streamAtFunctionCompactDeclaration, readFunctionCompactDef); // must be checked before streamAtIdentifier and streamAtUnaryOp
            state.addArc(unaryState, streamConditions_17.streamAtUnaryOp, readUnaryOp); // can have multiple unary in a row
            state.addArc(numberState, streamConditions_15.streamAtNumber, readNumber);
            state.addArc(symbolState, streamConditions_4.streamAtSymbol, readSymbol);
            state.addArc(keywordBlockState, lookAheadStreamConditions_2.streamAtAnonymousFunction, readAnonymousFunctionDef); // must be checked before streamAtIdentifier and streamAtOpenParenthesis
            state.addArc(macroCallState, lookAheadStreamConditions_1.streamAtMacroInvocation, readMacroInvocation); // must be checked before streamAtIdentifier
            state.addArc(identifierState, streamConditions_16.streamAtIdentifier, readIdentifier);
            state.addArc(parenthesesState, streamConditions_18.streamAtOpenParenthesis, readGroupingParentheses);
            //state.addArc(arrayLiteralState, streamAtOpenSquareBracket, readArrayLiteral )
            state.addArc(squareBracketState, streamConditions_19.streamAtOpenSquareBracket, readSquareBracket);
            state.addArc(anyArrayLiteralState, streamConditions_20.streamAtOpenCurlyBraces, readAnyArrayLiteral);
            state.addArc(keywordBlockState, streamConditions_3.streamAtKeywordBlock, readKeywordBlock);
            state.addArc(quoteState, streamConditions_22.streamAtAnyQuote, readAnyQuote);
            state.addArc(stringMacroState, streamConditions_29.streamAtStringMacro, readStringMacro);
            // technically, break/continue/return can only be after the startState or after the "&&" or "||" operator
            // but to simplify, we just allow it after all these possibilities
            state.addArc(continueState, streamConditions_6.streamAtContinue, readContinue);
            state.addArc(breakState, streamConditions_7.streamAtBreak, readBreak);
            if (options.allowReturn) {
                state.addArc(returnState, streamConditions_11.streamAtReturn, readReturn);
            }
        }
        // a number followed immediately by an identifier or an open parentheses (no whitespace in between) implies multiplication
        numberState.addArc(identifierState, streamConditions_16.streamAtIdentifier, readImplicitMultiplicationIdentifier);
        numberState.addArc(parenthesesState, streamConditions_18.streamAtOpenParenthesis, readImplicitMultiplicationParentheses);
        // otherwise spaces are ignored
        numberState.addArc(numberState, streamConditions_1.streamAtLineWhitespace, skipOneToken);
        // a parentheses followed immediately by an identifier (no whitespace in between) implies multiplication
        for (let state of [parenthesesState, functionCallState]) {
            state.addArc(identifierState, streamConditions_16.streamAtIdentifier, readImplicitMultiplicationIdentifier);
            // otherwise spaces are ignored
            state.addArc(state, streamConditions_1.streamAtLineWhitespace, skipOneToken);
        }
        // these states result in expressions that can be invoked as functions or indexed as arrays
        // [] and () are both resolved as function invocations
        // {} is a type parameter qualifier which can be surpisingly applied to any expression
        for (let state of [identifierState, postFixState, parenthesesState, functionCallState, squareBracketState,
            anyArrayLiteralState, typeParametersState, quoteState, stringMacroState, macroCallState]) {
            state.addArc(functionCallState, streamConditions_18.streamAtOpenParenthesis, readFunctionCallParentheses);
            state.addArc(squareBracketState, streamConditions_19.streamAtOpenSquareBracket, readSquareBracket);
            //state.addArc(indexingState, streamAtOpenSquareBracket, readIndexingArgs )
            state.addArc(typeParametersState, streamConditions_20.streamAtOpenCurlyBraces, readTypeParameters);
            state.addArc(stopState, streamNotAtContinuingOpNorOpenBracket, doNothing); // be sure to add this last as a lot of tokens will trigger it
        }
        // these states cannot be directly invoked afterwards
        //   (if surrounded in parentheses, they can be though)
        // a new open bracket implies a new expression is being started
        for (let state of [numberState, symbolState, keywordBlockState, doBlockState]) {
            state.addArc(stopState, streamNotAtContinuingOp, doNothing); // be sure to add this last as a lot of tokens will trigger it
        }
        // comma is an acceptable last token.
        //   eg  "1,"  indicates a tuple
        // However, new lines continue it, just as any other binary op.
        // Any term afterwards also continues it.
        binaryMayOmitArg2State.addArc(stopState, streamConditions_12.streamAtEof, doNothing);
    }
    /**
     * Runs through the FSA from start to stop.
     * The accumulated tokens are sorted by order of operations into a parse tree.
     *
     * This will produce a non empty expression unless the fsa was allowed to have empty expressions.
     */
    runStartToStop(ts, wholeState) {
        let state = new ParseState(ts, this, wholeState);
        fsaUtils_1.runFsaStartToStopAllowWhitespace(this, state);
        let exprResult = orderOfOperations_1.parseIntoTreeByOrderOfOperations(state.nodes, wholeState);
        return exprResult;
    }
    streamAtBinaryOpRequireArg2(ts) {
        if (ts.eof())
            return false;
        let token = ts.peek();
        return token.type === operatorsAndKeywords_3.TokenType.Operator && (token.str in this.binaryOpsRequireArg2);
    }
    streamAtBinaryOpMayOmitArg2(ts) {
        if (ts.eof())
            return false;
        let token = ts.peek();
        return token.type === operatorsAndKeywords_3.TokenType.Operator && (token.str in this.binaryOpsMayOmitArg2);
    }
    // Certain expressions can only be continued by a binary/ternary op.
    // False if at a binary op or ternary op.
    // True otherwise, ie if EOF, comment, whitespace, or not a binary or ternary op
    streamNotAtContinuingOp(ts) {
        return !this.streamAtContinuingOp(ts);
    }
    streamAtContinuingOp(ts) {
        if (ts.eof())
            return false;
        let tok = ts.peek();
        if (tok.type !== operatorsAndKeywords_3.TokenType.Operator)
            return false;
        if (tok.str === "?")
            return true;
        if (tok.str in this.binaryOpsRequireArg2)
            return true;
        if (tok.str in this.binaryOpsMayOmitArg2)
            return true;
        return false;
    }
    // Certain expressions can only be continued by a binary/ternary op or ( [ {.
    // False if at a binary or ternary op or a bracket.
    // True otherwise, ie if EOF, comment, whitespace, binary op, ternary op, (, [, {
    streamNotAtContinuingOpNorOpenBracket(ts) {
        return !this.streamAtContinuingOpOrOpenBracket(ts);
    }
    streamAtContinuingOpOrOpenBracket(ts) {
        if (ts.eof())
            return false;
        let tok = ts.peek();
        if (tok.type === operatorsAndKeywords_3.TokenType.Operator) {
            if (tok.str === "?")
                return true;
            if (tok.str in this.binaryOpsRequireArg2)
                return true;
            if (tok.str in this.binaryOpsMayOmitArg2)
                return true;
        }
        else if (tok.type == operatorsAndKeywords_3.TokenType.Bracket) {
            if (tok.str === "(" || tok.str === "[" || tok.str === "{")
                return true;
        }
        return false;
    }
}
exports.ExpressionFsa = ExpressionFsa;
class ExpressionFsaOptions {
    constructor() {
        this.binaryOpsToIgnore = [];
        this.newLineInMiddleDoesNotEndExpression = false;
        this.allowReturn = true;
        this.allowSingleColon = false;
        this.allowSplat = false;
    }
}
exports.ExpressionFsaOptions = ExpressionFsaOptions;
/**
 * Since the FSA is a global and is reused, we will use
 * a separate visitor class to contain state of the current parsing instance.
 */
class ParseState {
    constructor(ts, thisFsa, wholeState) {
        this.ts = ts;
        this.thisFsa = thisFsa;
        this.wholeState = wholeState;
        this.nodes = [];
        this.mostRecentTypeAlias = null;
    }
}
// Below are handlers whenever a state is visited.
function doNothing(state) { }
function skipOneToken(state) {
    state.ts.read();
}
function readReturn(state) {
    state.ts.read(); // discard return token
    state.nodes.push(new nodes_11.ReturnNode());
}
function readBreak(state) {
    state.ts.read(); // discard break token
    state.nodes.push(new nodes_13.BreakNode());
}
function readContinue(state) {
    state.ts.read(); // discard continue token
    state.nodes.push(new nodes_3.ContinueNode());
}
function readLocalVarDeclaration(state) {
    state.ts.read(); // discard local keyword
    state.nodes.push(VarDeclarationFsa_1.parseLocalStatement(state.ts, state.wholeState));
}
function readGlobalVarDeclaration(state) {
    state.ts.read(); // discard global keyword
    state.nodes.push(VarDeclarationFsa_2.parseGlobalStatement(state.ts, state.wholeState));
}
function readConstVarDeclaration(state) {
    state.ts.read(); // discard const keyword
    state.nodes.push(VarDeclarationFsa_3.parseConstStatement(state.ts, state.wholeState));
}
function readTypeAliasName(state) {
    let typeDefNode = new nodes_9.TypeDefNode();
    typeDefNode.name = new nodes_7.IdentifierNode(state.ts.read());
    state.mostRecentTypeAlias = typeDefNode;
}
function readTypeAliasGenericParamList(state) {
    if (state.mostRecentTypeAlias === null)
        throw new assert_1.AssertError("");
    state.mostRecentTypeAlias.genericArgs = GenericDefArgListFsa_1.parseGenericDefArgList(state.ts.read(), state.wholeState);
}
function readTypeAliasRefersToExpression(state) {
    if (state.mostRecentTypeAlias === null)
        throw new assert_1.AssertError("");
    state.mostRecentTypeAlias.alias = parseGeneralBlockExpression(state.ts, state.wholeState);
    // safe to add now
    state.nodes.push(state.mostRecentTypeAlias);
}
function readUnaryOp(state) {
    let token = state.ts.read();
    let node = new nodes_4.UnaryOpNode(token);
    state.nodes.push(node);
}
function readBinaryOp(state) {
    let token = state.ts.read();
    let node = new nodes_5.BinaryOpNode(token);
    state.nodes.push(node);
}
function readTernaryOp(state) {
    let token = state.ts.read();
    let node = new nodes_10.TernaryOpNode(token);
    node.trueExpression = parseTernaryOpTrueExpression(state.ts, state.wholeState);
    // read the colon
    state.ts.skipToNextNonWhitespace();
    if (state.ts.eof())
        throw new errors_1.InvalidParseError("Expecting ':' before end.", state.ts.getLastToken());
    token = state.ts.read();
    if (!(token.type === operatorsAndKeywords_3.TokenType.Operator && token.str === ":")) {
        throw new errors_1.InvalidParseError("Expecting ':'", token);
    }
    state.nodes.push(node);
}
function readPostFixOp(state) {
    let token = state.ts.read();
    let node = new nodes_2.PostFixOpNode(token);
    state.nodes.push(node);
}
function readImplicitMultiplicationIdentifier(state) {
    insertImplicitMultiplication(state);
    readIdentifier(state);
}
function readImplicitMultiplicationParentheses(state) {
    insertImplicitMultiplication(state);
    readGroupingParentheses(state);
}
function insertImplicitMultiplication(state) {
    let nextToken = state.ts.peek();
    let nextTokenStart = nextToken.range.start;
    // create a non-existent token for the implied multiplication
    let rng = new Token_1.Range(nextTokenStart, nextTokenStart); // position the fake * token at the end of the number token, but with 0 length
    let token = new Token_2.Token("*", operatorsAndKeywords_3.TokenType.Operator, rng);
    state.nodes.push(new nodes_5.BinaryOpNode(token));
}
function readNumber(state) {
    let token = state.ts.read();
    let node = new nodes_6.NumberNode(token);
    state.nodes.push(node);
}
function readSymbol(state) {
    let token = state.ts.read();
    let node = new nodes_14.SymbolNode(token);
    state.nodes.push(node);
}
function readStringMacro(state) {
    let token = state.ts.read();
    let node = new nodes_15.StringMacroNode(token);
    state.nodes.push(node);
}
function readIdentifier(state) {
    let token = state.ts.read();
    let node = new nodes_7.IdentifierNode(token);
    node.str = token.str;
    state.nodes.push(node);
}
function readOperatorAndConvertToIdentifier(state) {
    let token = state.ts.read();
    token.type = operatorsAndKeywords_3.TokenType.Identifier;
    let node = new nodes_7.IdentifierNode(token);
    node.str = token.str;
    state.nodes.push(node);
}
function readSingleColonAsIdentifier(state) {
    let token = state.ts.read();
    token.type = operatorsAndKeywords_3.TokenType.Identifier;
    let node = new nodes_7.IdentifierNode(token);
    state.nodes.push(node);
}
function readGroupingParentheses(state) {
    let node = ParenthesesFsa_1.parseGroupingParentheses(state.ts.read(), state.wholeState);
    state.nodes.push(node);
}
function readFunctionCallParentheses(state) {
    let node = FunctionCallFsa_1.parseFunctionCallArgs(state.ts.read(), state.wholeState);
    state.nodes.push(node);
}
//function readArrayLiteral(state: ParseState): void {
//  let node = parseArrayLiteral(state.ts.read() as UnparsedTreeToken, state.wholeState)
//  state.nodes.push(node)
//}
//function readIndexingArgs(state: ParseState): void {
//  let node = parseIndexingArgList(state.ts.read() as UnparsedTreeToken, state.wholeState)
//  state.nodes.push(node)
//}
function readSquareBracket(state) {
    let node = SquareBracketFsa_2.parseSquareBracket(state.ts.read(), state.wholeState);
    state.nodes.push(node);
}
function readTypeParameters(state) {
    let node = GenericArgListFsa_1.parseGenericArgList(state.ts.read(), state.wholeState);
    state.nodes.push(node);
}
function readAnyArrayLiteral(state) {
    let node = SquareBracketFsa_1.parseAnyArrayLiteral(state.ts.read(), state.wholeState);
    state.nodes.push(node);
}
function readFunctionCompactDef(state) {
    // NOTE: This can lead to an incorrect parse if (the pathological case) there is an expression like this:
    //   1 + f() = 3
    // as the order of operations will be interpreted incorrectly. This will isolate
    //   f() = 3
    // into a single node before order of operations handles the '+'.
    // But unlikely to put another operator on the same line as cannot combine a function with anything else, unless
    // surrounding the function with parentheses and invoking, like
    //   1 + (f() = 3)()
    let node = FunctionCompactDefFsa_1.parseWholeCompactFunctionDef(state.ts, state.wholeState);
    state.nodes.push(node);
}
function readAnonymousFunctionDef(state) {
    let argsToken = state.ts.read();
    state.ts.skipToNextNonWhitespace();
    state.ts.read(); // arrow
    state.ts.skipToNextNonWhitespace();
    let funcNode = new nodes_8.FunctionDefNode();
    // args
    if (argsToken.type === operatorsAndKeywords_3.TokenType.Identifier) {
        let arg = new nodes_12.FunctionDefArgNode();
        arg.name = new nodes_7.IdentifierNode(argsToken);
        funcNode.args.orderedArgs.push(arg);
    }
    else if (argsToken.type === operatorsAndKeywords_3.TokenType.Bracket && argsToken.str === "(") {
        // TODO don't allow keyword args, optional args
        FunctionDefArgListFsa_1.parseFunctionDefArgList(funcNode.args, argsToken, state.wholeState);
    }
    else {
        throw new assert_1.AssertError("");
    }
    // body
    let funcBody = state.thisFsa.runStartToStop(state.ts, state.wholeState);
    funcNode.bodyExpressions.push(funcBody);
    state.nodes.push(funcNode);
}
function readAnyQuote(state) {
    let tok = state.ts.read();
    if (tok.str === '"' || tok.str === "`" || tok.str === '"""') {
        let node = StringFsa_1.parseString(tok, state.wholeState);
        state.nodes.push(node);
    }
    else if (tok.str === "'") {
        let tree = tok;
        let ch = tree.contents[0];
        let node = new nodes_1.StringLiteralNode(ch);
        state.nodes.push(node);
    }
    else {
        throw new assert_1.AssertError("");
    }
}
function readMacroInvocation(state) {
    let node = MacroCallFsa_1.parseMacroCall(state.ts, state.wholeState);
    state.nodes.push(node);
}
function readDoBlock(state) {
    let unparsedTree = state.ts.read();
    let node = DoBlockFsa_1.parseWholeDoBlock(unparsedTree, state.wholeState);
    state.nodes.push(node);
}
function readKeywordBlock(state) {
    let unparsedTree = state.ts.read();
    var node;
    if (!unparsedTree.openToken) {
        console.log("undefined is");
    }
    switch (unparsedTree.openToken.str) {
        case "function":
            node = FunctionDefFsa_1.parseWholeFunctionDef(unparsedTree, state.wholeState);
            break;
        case "quote":
            throw new errors_1.InvalidParseError("Unimplemented", unparsedTree);
        //node = new CodeQuoteNode()
        // break
        case "begin":
            node = BeginBlockFsa_1.parseWholeBeginBlock(unparsedTree, state.wholeState);
            break;
        case "if":
            node = IfBlockFsa_1.parseWholeIfBlock(unparsedTree, state.wholeState);
            break;
        case "for":
            node = ForBlockFsa_1.parseWholeForBlock(unparsedTree, state.wholeState);
            break;
        case "while":
            node = WhileBlockFsa_1.parseWholeWhileBlock(unparsedTree, state.wholeState);
            break;
        case "let":
            node = LetBlockFsa_1.parseWholeLetBlock(unparsedTree, state.wholeState);
            break;
        case "try":
            node = TryBlockFsa_1.parseWholeTryBlock(unparsedTree, state.wholeState);
            break;
        default:
            throw new errors_1.InvalidParseError("Unexpected keyword: " + unparsedTree.openToken.str, unparsedTree);
    }
    state.nodes.push(node);
}
function readReturnExpression(state) {
    let expr = parseGeneralBlockExpression(state.ts, state.wholeState);
    let retNode = arrayUtils_1.last(state.nodes);
    if (retNode instanceof nodes_11.ReturnNode) {
        retNode.returnValue = expr;
    }
    else {
        throw new assert_1.AssertError("");
    }
}
// FSA objects take a bit of work to construct and are designed to be stateless,
// so just create global objects once and reuse them.
// This fsa can be used to read any block contents
// where we are not expecting any keywords before the end of the token stream
// and we allow multiple statements.
// ';' and \n must be skipped by the wrapping iterator.
var fsaOptions = new ExpressionFsaOptions();
var fsaGeneralBlockExpression = new ExpressionFsa(fsaOptions);
function parseGeneralBlockExpression(ts, wholeState) {
    return fsaGeneralBlockExpression.runStartToStop(ts, wholeState);
}
exports.parseGeneralBlockExpression = parseGeneralBlockExpression;
// Used to read the expression evaluated if condition is true for a ternary op.
// Colons must be treated specially as an escape, not a binary operator.
// Newlines will be ignored until ':' is found
fsaOptions = new ExpressionFsaOptions();
fsaOptions.binaryOpsToIgnore = [":"];
fsaOptions.newLineInMiddleDoesNotEndExpression = true;
var fsaTernaryOpTrueExpression = new ExpressionFsa(fsaOptions);
function parseTernaryOpTrueExpression(ts, wholeState) {
    return fsaTernaryOpTrueExpression.runStartToStop(ts, wholeState);
}
// export function parseGroupingParenthesisExpression(parenTree: TreeToken, wholeState: WholeFileParseState): Node {
//   // handles arithmetic expression grouping
//   //   eg (a + b) * c
//   // as well as tuples
//   //   since "," is treated simply as a binary operator
//   // as well as multiple semicolon delimited statements
//
//   if (parenTree.openToken.str !== "(") throw new AssertError("")
//   let ts = new TokenStream(parenTree.contents, parenTree.openToken)
//   let node = new ParenthesesNode()
//
//   try {
//     ts.skipToNextNonWhitespace()
//     if (ts.eof()) return new EmptyTupleNode()
//
//     node.expression = fsaGroupingParenthesisExpression.runStartToStop(ts, wholeState)
//     expectNoMoreExpressions(ts)
//
//   } catch (err) {
//     handleParseErrorOnly(err, node, parenTree.contents, wholeState)
//   }
//   return node
// }
//# sourceMappingURL=ExpressionFsa.js.map