"use strict"

import {streamAtMacroInvocation} from "./lookAheadStreamConditions";
import {last} from "../../utils/arrayUtils";
import {streamAtLineWhitespace} from "../../tokens/streamConditions";
import {runFsaStartToStopAllowWhitespace} from "./fsaUtils";
import {parseWholeLetBlock} from "../controlFlow/LetBlockFsa";
import {streamAtDo} from "../../tokens/streamConditions";
import {streamAtKeywordBlock} from "../../tokens/streamConditions";
import {parseGenericDefArgList} from "../declarations/GenericDefArgListFsa";
import {StringLiteralNode} from "../../parseTree/nodes";
import {streamAtSymbol} from "../../tokens/streamConditions";
import {binaryOperatorsMayOmitArg2} from "../../tokens/operatorsAndKeywords";
import {PostFixOpNode} from "../../parseTree/nodes";
import {streamAtPostFixOp} from "../../tokens/streamConditions";
import {ContinueNode} from "../../parseTree/nodes";
import {streamAtContinue} from "../../tokens/streamConditions";
import {streamAtBreak} from "../../tokens/streamConditions";
import {streamAtTypeAlias} from "../../tokens/streamConditions";
import {streamAtAnonymousFunction} from "./lookAheadStreamConditions";
import {streamAtTripleDot} from "../../tokens/streamConditions";
import {parseWholeMacroDef} from "../declarations/MacroDefFsa";
import {expectNoMoreExpressions} from "./fsaUtils";
import {WholeFileParseState} from "./ModuleContentsFsa";
import {handleParseErrorOnly} from "./fsaUtils";
import {parseString} from "./StringFsa";
import {parseFunctionCallArgs} from "../bracketed/FunctionCallFsa";
import {streamAtColon} from "../../tokens/streamConditions";
import {streamAtReturn} from "../../tokens/streamConditions";
import {AssertError} from "../../utils/assert";
import {Escapes} from "./../../tokens/operatorsAndKeywords";
import {toEscapeString} from "./../../tokens/operatorsAndKeywords";
import {addToSet} from "../../utils/StringSet";
import {createStringSet} from "../../utils/StringSet";
import {StringSet} from "../../utils/StringSet";
import {binaryOperators} from "./../../tokens/operatorsAndKeywords";
import {TokenType} from "./../../tokens/operatorsAndKeywords";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtTernaryOp} from "./../../tokens/streamConditions";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {streamAtSemicolon} from "./../../tokens/streamConditions";
import {streamAtNumber} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {streamAtUnaryOp} from "./../../tokens/streamConditions";
import {streamAtOpenParenthesis} from "./../../tokens/streamConditions";
import {streamAtOpenSquareBracket} from "./../../tokens/streamConditions";
import {streamAtOpenBlockKeyword} from "./../../tokens/streamConditions";
import {TokenStream} from "./../../tokens/TokenStream";
import {UnaryOpNode} from "./../../parseTree/nodes";
import {BinaryOpNode} from "./../../parseTree/nodes";
import {NumberNode} from "./../../parseTree/nodes";
import {IdentifierNode} from "./../../parseTree/nodes";
import {ParenthesesNode} from "./../../parseTree/nodes";
import {EmptyTupleNode} from "./../../parseTree/nodes";
import {parseIntoTreeByOrderOfOperations} from "./../../parseTree/orderOfOperations";
import {FunctionCallNode} from "./../../parseTree/nodes";
import {FunctionDefNode} from "./../../parseTree/nodes";
import {Node, MacroDefNode} from "./../../parseTree/nodes";
import {CodeQuoteNode} from "./../../parseTree/nodes";
import {TypeDefNode} from "./../../parseTree/nodes";
import {WhileBlockNode} from "./../../parseTree/nodes";
import {ForBlockNode} from "./../../parseTree/nodes";
import {IfBlockNode} from "./../../parseTree/nodes";
import {BeginBlockNode} from "./../../parseTree/nodes";
import {DoBlockNode} from "./../../parseTree/nodes";
import {TryBlockNode} from "./../../parseTree/nodes";
import {ModuleDefNode} from "./../../parseTree/nodes";
import {streamAtOpenCurlyBraces} from "./../../tokens/streamConditions";
import {GenericArgListNode} from "./../../parseTree/nodes";
import {streamAtComment} from "./../../tokens/streamConditions";
import {streamAtAnyQuote} from "./../../tokens/streamConditions";
import {BaseFsa} from "./fsaUtils";
import {FsaState} from "./fsaUtils";
import {runFsaStartToStop} from "./fsaUtils";
import {IFsaParseState} from "./fsaUtils";
import {TreeToken} from "../../tokens/Token";
import {streamAtFunctionCompactDeclaration} from "./lookAheadStreamConditions";
import {TernaryOpNode} from "../../parseTree/nodes";
import {InvalidParseError} from "../../utils/errors";
import {streamAtNewLineOrSemicolon} from "../../tokens/streamConditions";
import {ReturnNode} from "../../parseTree/nodes";
import {parseGenericArgList} from "../bracketed/GenericArgListFsa";
import {parseWholeCompactFunctionDef} from "../declarations/FunctionCompactDefFsa";
import {parseMacroCall} from "./../bracketed/MacroCallFsa";
import {parseWholeFunctionDef} from "../declarations/FunctionDefFsa";
import {parseWholeTypeDef} from "../declarations/TypeDefFsa";
import {parseWholeBeginBlock} from "../controlFlow/BeginBlockFsa";
import {parseWholeIfBlock} from "../controlFlow/IfBlockFsa";
import {parseWholeForBlock} from "../controlFlow/ForBlockFsa";
import {parseWholeWhileBlock} from "../controlFlow/WhileBlockFsa";
import {parseWholeDoBlock} from "../controlFlow/DoBlockFsa";
import {parseWholeTryBlock} from "../controlFlow/TryBlockFsa";
import {parseWholeModuleDef} from "./ModuleDefFsa";
import {streamAtLocal} from "../../tokens/streamConditions";
import {streamAtGlobal} from "../../tokens/streamConditions";
import {streamAtConst} from "../../tokens/streamConditions";
import {streamAtEquals} from "../../tokens/streamConditions";
import {alwaysPasses} from "../../tokens/streamConditions";
import {parseLocalStatement} from "../declarations/VarDeclarationFsa";
import {parseGlobalStatement} from "../declarations/VarDeclarationFsa";
import {parseConstStatement} from "../declarations/VarDeclarationFsa";
import {streamAtComma} from "../../tokens/streamConditions";
import {FunctionDefArgNode} from "../../parseTree/nodes";
import {parseFunctionDefArgList} from "../declarations/FunctionDefArgListFsa";
import {BreakNode} from "../../parseTree/nodes";
import {SymbolNode} from "../../parseTree/nodes";
import {parseAnyArrayLiteral} from "../bracketed/SquareBracketFsa";
//import {parseArrayLiteral} from "../bracketed/ArrayLiteralFsa";
//import {parseIndexingArgList} from "../bracketed/ArrayIndexingFsa";
//import {ArrayLiteralNode} from "./../../parseTree/nodes";
//import {IndexingNode} from "./../../parseTree/nodes";
import {parseSquareBracket} from "../bracketed/SquareBracketFsa";
import {StringMacroNode} from "../../parseTree/nodes";
import {streamAtStringMacro} from "../../tokens/streamConditions";
import {Range} from "../../tokens/Token"
import {Token} from "../../tokens/Token";
import {streamAtOperatorThatIsIdentifier} from "./lookAheadStreamConditions";

/**
 * Automaton used for recognizing expressions.
 * In Julia, almost everything is a valid expression, including arithmetic expressions, for loops,
 * if statements, function declarations, and type annotations.
 *
 * This is a deterministic FSA. There is no need to track alternative pathways.
 * Even though +- can be unary or binary ops, they will only be unary if they are the
 * first token encountered or they are immediately after a binary op.
 */
export class ExpressionFsa extends BaseFsa {
  binaryOpsRequireArg2: StringSet
  binaryOpsMayOmitArg2: StringSet

  constructor(options: ExpressionFsaOptions) {
    super()
    let startState = this.startState
    let stopState = this.stopState

    let unaryState = new FsaState("unary")  // prefix unary operators
    let binaryState = new FsaState("binary")
    let binaryMayOmitArg2State = new FsaState("binary may omit arg2") // commas are like binary operators (they create tuples), but after the last comma, they do not require a trailing operand
    let ternaryState = new FsaState("ternary")
    let postFixState = new FsaState("postfix")
    let numberState = new FsaState("number")
    let identifierState = new FsaState("identifier")
    let symbolState = new FsaState("symbol")
    let parenthesesState = new FsaState("parentheses") // Parentheses on their own control order of operations.
    let functionCallState = new FsaState("function call") // Parentheses after identifiers or certain expressions is a function call.

    // collapse together the array literal and the indexing state
    let squareBracketState = new FsaState("square bracket")
    //let arrayLiteralState = new FsaState("array literal") // Square brackets on their own create an array literal.
    //let indexingState = new FsaState("indexing") // Square brackets after identifiers or certain expressions is essentially an indexing function call.

    let anyArrayLiteralState = new FsaState("any array literal") // {} on their own create an Any array literal.
    let typeParametersState = new FsaState("type parameters") // {} after identifiers or certain expressions is a type parameters qualifier
    let keywordBlockState = new FsaState("keyword block") // ie if...end, for...end, try...end
    let doBlockState = new FsaState("do block")
    let quoteState = new FsaState("quote")
    let stringMacroState = new FsaState("string macro")  // eg regex r""
    let macroCallState = new FsaState("macro invocation")

    let returnState = new FsaState("return")
    let breakState = new FsaState("break")
    let continueState = new FsaState("continue")
    let singleColonState = new FsaState(":")
    let localVarState = new FsaState("local var")
    let globalVarState = new FsaState("global var")
    let constVarState = new FsaState("const var")
    let typeAliasKeyword = new FsaState("typealias")
    let typeAliasName = new FsaState("typealias name")
    let typeAliasGenericParamList = new FsaState("type alias generic param list")
    let typeAliasRefersTo = new FsaState("typealias refers to")
    let splatState = new FsaState("...")
    let commaAfterSplatState = new FsaState("comma after ...")

    // used to ignore comments, line whitespace, and new lines (via option)
    let allStatesNotStop = [startState, unaryState, binaryState, binaryMayOmitArg2State, ternaryState, postFixState,
      numberState, identifierState, symbolState,
      parenthesesState, functionCallState,
      squareBracketState, //arrayLiteralState, indexingState,
      anyArrayLiteralState, typeParametersState,
      keywordBlockState, doBlockState, quoteState, stringMacroState, macroCallState,
      returnState, breakState, continueState, singleColonState, localVarState, globalVarState, constVarState,
      splatState, commaAfterSplatState, typeAliasKeyword, typeAliasName, typeAliasGenericParamList, typeAliasRefersTo]

    // filter down valid binary ops
    this.binaryOpsRequireArg2 = {}
    this.binaryOpsMayOmitArg2 = {}
    for (let op in binaryOperators) {
      if (options.binaryOpsToIgnore.indexOf(op) < 0) {
        if (op in binaryOperatorsMayOmitArg2) {
          addToSet(this.binaryOpsMayOmitArg2, op)
        } else {
          addToSet(this.binaryOpsRequireArg2, op)
        }
      }
    }
    let streamAtBinaryOpRequireArg2 = this.streamAtBinaryOpRequireArg2.bind(this)
    let streamAtBinaryOpMayOmitArg2 = this.streamAtBinaryOpMayOmitArg2.bind(this)
    let streamNotAtContinuingOp = this.streamNotAtContinuingOp.bind(this)
    let streamNotAtContinuingOpNorOpenBracket = this.streamNotAtContinuingOpNorOpenBracket.bind(this)


    // ignore comments everywhere
    for (let state of allStatesNotStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // ignore line whitespace everywhere
    // except in certain situations, where the absence of whitespace can imply multiplication
    for (let state of allStatesNotStop) {
      if (state === numberState || state === parenthesesState || state === functionCallState) continue
      state.addArc(state, streamAtLineWhitespace, skipOneToken)
    }


    // New line handling.
    //
    // These states always ignore new lines.
    // Binary and ternary operators allow unlimited new lines until next expression is encountered.
    // Unary needs the next token before any whitespace.
    for (let state of [binaryState, binaryMayOmitArg2State, ternaryState]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }
    // The rest of the states only ignore new lines if a special option is set.
    for (let state of allStatesNotStop) {
      if (state !== unaryState && state !== binaryState && state !== binaryMayOmitArg2State && state !== ternaryState) {
        if (options.newLineInMiddleDoesNotEndExpression) {
          state.addArc(state, streamAtNewLine, skipOneToken)
        }
      }
    }






    // special expressions

    // ':' by itself only has a path from start to stop
    if (options.allowSingleColon) {
      startState.addArc(singleColonState, streamAtColon, readSingleColonAsIdentifier)
      singleColonState.addArc(stopState, streamNotAtContinuingOp, doNothing)
      // binary ternary operators not allowed after
    }

    // 'return' can only appear at the start
    if (options.allowReturn) {
      startState.addArc(returnState, streamAtReturn, readReturn)
      returnState.addArc(stopState, streamAtEof, doNothing)
      returnState.addArc(stopState, streamAtNewLineOrSemicolon, doNothing)
      // return can also be followed by an expression which is handled below
    }

    // 'break' can only appear by itself
    startState.addArc(breakState, streamAtBreak, readBreak)
    breakState.addArc(stopState, alwaysPasses, doNothing)

    // continue can only appear by itself
    startState.addArc(continueState, streamAtContinue, readContinue)
    continueState.addArc(stopState, alwaysPasses, doNothing)

    // 'local' 'global' 'const' can only appear at the start
    startState.addArc(localVarState, streamAtLocal, readLocalVarDeclaration)
    startState.addArc(globalVarState, streamAtGlobal, readGlobalVarDeclaration)
    startState.addArc(constVarState, streamAtConst, readConstVarDeclaration)
    localVarState.addArc(stopState, alwaysPasses, doNothing)
    globalVarState.addArc(stopState, alwaysPasses, doNothing)
    constVarState.addArc(stopState, alwaysPasses, doNothing)

    // splat is a special postfix operator. It can only be continued by a comma.
    // Regulate even entering the splat state later below using an option.
    if ("," in this.binaryOpsRequireArg2) {
      splatState.addArc(commaAfterSplatState, streamAtComma, readBinaryOp)
    }
    splatState.addArc(stopState, alwaysPasses, doNothing)

    // typealias
    startState.addArc(typeAliasKeyword, streamAtTypeAlias, skipOneToken)
    typeAliasKeyword.addArc(typeAliasKeyword, streamAtNewLine, skipOneToken)
    typeAliasKeyword.addArc(typeAliasName, streamAtIdentifier, readTypeAliasName)
    typeAliasName.addArc(typeAliasName, streamAtNewLine, skipOneToken)
    typeAliasName.addArc(typeAliasGenericParamList, streamAtOpenCurlyBraces, readTypeAliasGenericParamList)
    typeAliasName.addArc(typeAliasRefersTo, alwaysPasses, readTypeAliasRefersToExpression)
    typeAliasGenericParamList.addArc(typeAliasRefersTo, alwaysPasses, readTypeAliasRefersToExpression)
    typeAliasRefersTo.addArc(stopState, alwaysPasses, doNothing)






    // Most expressions

    // these states can be considered a complete expression
    // They can be be continued with a binary or ternary or postfix op.
    // Also allow do blocks.
    // A ; will terminate.
    // A \n will terminate unless an option is set to ignore them.
    // a new identifier or number also implies termination
    for (let state of [identifierState, parenthesesState, functionCallState, squareBracketState, // arrayLiteralState, indexingState,
      anyArrayLiteralState, typeParametersState, postFixState, numberState, symbolState, keywordBlockState, doBlockState,
      quoteState, stringMacroState,
      macroCallState]) {

      state.addArc(binaryState, streamAtBinaryOpRequireArg2, readBinaryOp)
      state.addArc(binaryMayOmitArg2State, streamAtBinaryOpMayOmitArg2, readBinaryOp)
      state.addArc(ternaryState, streamAtTernaryOp, readTernaryOp)
      state.addArc(postFixState, streamAtPostFixOp, readPostFixOp)
      state.addArc(doBlockState, streamAtDo, readDoBlock)

      if (options.allowSplat) {
        state.addArc(splatState, streamAtTripleDot, readPostFixOp) // treat splat as postfix
      }
    }

    // allow certain operators to be treated as identifiers if they appear in isolated circumstances, ie
    //   preceded by BOF ,
    //   followed by , \n ; or EOF
    // This condition must be tested before other arcs out of the start and binary states.
    for (let state of [startState, binaryMayOmitArg2State]) {
      state.addArc(identifierState, streamAtOperatorThatIsIdentifier, readOperatorAndConvertToIdentifier)
    }

    // These states must be followed by something that creates a valid expression.
    for (let state of [startState, returnState, unaryState, binaryState, binaryMayOmitArg2State, ternaryState, commaAfterSplatState]) {
      state.addArc(keywordBlockState, streamAtFunctionCompactDeclaration, readFunctionCompactDef) // must be checked before streamAtIdentifier and streamAtUnaryOp
      state.addArc(unaryState, streamAtUnaryOp, readUnaryOp )  // can have multiple unary in a row
      state.addArc(numberState, streamAtNumber, readNumber )
      state.addArc(symbolState, streamAtSymbol, readSymbol )
      state.addArc(keywordBlockState, streamAtAnonymousFunction, readAnonymousFunctionDef) // must be checked before streamAtIdentifier and streamAtOpenParenthesis
      state.addArc(macroCallState, streamAtMacroInvocation, readMacroInvocation) // must be checked before streamAtIdentifier
      state.addArc(identifierState, streamAtIdentifier, readIdentifier )
      state.addArc(parenthesesState, streamAtOpenParenthesis, readGroupingParentheses)
      //state.addArc(arrayLiteralState, streamAtOpenSquareBracket, readArrayLiteral )
      state.addArc(squareBracketState, streamAtOpenSquareBracket, readSquareBracket)
      state.addArc(anyArrayLiteralState, streamAtOpenCurlyBraces, readAnyArrayLiteral)
      state.addArc(keywordBlockState, streamAtKeywordBlock, readKeywordBlock)
      state.addArc(quoteState, streamAtAnyQuote, readAnyQuote)
      state.addArc(stringMacroState, streamAtStringMacro, readStringMacro)
    }

    // a number followed immediately by an identifier or an open parentheses (no whitespace in between) implies multiplication
    numberState.addArc(identifierState, streamAtIdentifier, readImplicitMultiplicationIdentifier)
    numberState.addArc(parenthesesState, streamAtOpenParenthesis, readImplicitMultiplicationParentheses)
    // otherwise spaces are ignored
    numberState.addArc(numberState, streamAtLineWhitespace, skipOneToken)

    // a parentheses followed immediately by an identifier (no whitespace in between) implies multiplication
    for (let state of [parenthesesState, functionCallState]) {
      state.addArc(identifierState, streamAtIdentifier, readImplicitMultiplicationIdentifier)
      // otherwise spaces are ignored
      state.addArc(state, streamAtLineWhitespace, skipOneToken)
    }


    // these states result in expressions that can be invoked as functions or indexed as arrays
    // [] and () are both resolved as function invocations
    // {} is a type parameter qualifier which can be surpisingly applied to any expression
    for (let state of [identifierState, postFixState, parenthesesState, functionCallState, squareBracketState, // arrayLiteralState, indexingState,
        anyArrayLiteralState, typeParametersState, quoteState, stringMacroState, macroCallState]) {
      state.addArc(functionCallState, streamAtOpenParenthesis, readFunctionCallParentheses)
      state.addArc(squareBracketState, streamAtOpenSquareBracket, readSquareBracket)
      //state.addArc(indexingState, streamAtOpenSquareBracket, readIndexingArgs )
      state.addArc(typeParametersState, streamAtOpenCurlyBraces, readTypeParameters)

      state.addArc(stopState, streamNotAtContinuingOpNorOpenBracket, doNothing) // be sure to add this last as a lot of tokens will trigger it
    }

    // these states cannot be directly invoked afterwards
    //   (if surrounded in parentheses, they can be though)
    // a new open bracket implies a new expression is being started
    for (let state of [numberState, symbolState, keywordBlockState, doBlockState]) {
      state.addArc(stopState, streamNotAtContinuingOp, doNothing)  // be sure to add this last as a lot of tokens will trigger it
    }

    // comma is an acceptable last token.
    //   eg  "1,"  indicates a tuple
    // However, new lines continue it, just as any other binary op.
    // Any term afterwards also continues it.
    binaryMayOmitArg2State.addArc(stopState, streamAtEof, doNothing)

  }

  /**
   * Runs through the FSA from start to stop.
   * The accumulated tokens are sorted by order of operations into a parse tree.
   *
   * This will produce a non empty expression unless the fsa was allowed to have empty expressions.
   */
  runStartToStop(ts:TokenStream, wholeState: WholeFileParseState): Node {
    let state = new ParseState(ts, this, wholeState)
    runFsaStartToStopAllowWhitespace(this, state)
    let exprResult = parseIntoTreeByOrderOfOperations(state.nodes, wholeState)
    return exprResult
  }

  streamAtBinaryOpRequireArg2(ts: TokenStream): boolean {
    if (ts.eof()) return false
    let token = ts.peek()
    return token.type === TokenType.Operator && (token.str in this.binaryOpsRequireArg2)
  }

  streamAtBinaryOpMayOmitArg2(ts: TokenStream): boolean {
    if (ts.eof()) return false
    let token = ts.peek()
    return token.type === TokenType.Operator && (token.str in this.binaryOpsMayOmitArg2)
  }

  // Certain expressions can only be continued by a binary/ternary op.
  // False if at a binary op or ternary op.
  // True otherwise, ie if EOF, comment, whitespace, or not a binary or ternary op
  streamNotAtContinuingOp(ts: TokenStream): boolean {
    return !this.streamAtContinuingOp(ts)
  }

  streamAtContinuingOp(ts: TokenStream): boolean {
    if (ts.eof()) return false
    let tok = ts.peek()
    if (tok.type !== TokenType.Operator) return false
    if (tok.str === "?") return true
    if (tok.str in this.binaryOpsRequireArg2) return true
    if (tok.str in this.binaryOpsMayOmitArg2) return true
    return false
  }

  // Certain expressions can only be continued by a binary/ternary op or ( [ {.
  // False if at a binary or ternary op or a bracket.
  // True otherwise, ie if EOF, comment, whitespace, binary op, ternary op, (, [, {
  streamNotAtContinuingOpNorOpenBracket(ts: TokenStream): boolean {
    return !this.streamAtContinuingOpOrOpenBracket(ts)
  }

  streamAtContinuingOpOrOpenBracket(ts: TokenStream): boolean {
    if (ts.eof()) return false
    let tok = ts.peek()
    if (tok.type === TokenType.Operator) {
      if (tok.str === "?") return true
      if (tok.str in this.binaryOpsRequireArg2) return true
      if (tok.str in this.binaryOpsMayOmitArg2) return true
    } else if (tok.type == TokenType.Bracket) {
      if ( tok.str === "(" || tok.str === "[" || tok.str === "{" ) return true
    }
    return false
  }


}

export class ExpressionFsaOptions {
  // Usually, anything considered a binary op will continue an expression.
  // Ignored ops will not continue the expression. They should be provided as an escape or else
  // they will be an unexpected token.
  binaryOpsToIgnore: string[]

  // Usually a new line after "3 + 5" would terminate the expression.
  // Within some brackets this should not happen. Only the closing bracket should terminate.
  // ie    3 + 5
  //         + 5
  //   will parse as one expression within brackets, but as two expressions otherwise
  newLineInMiddleDoesNotEndExpression: boolean

  // Usually true.
  // False to not allow the expression to start with 'return'
  allowReturn: boolean

  // Usually false
  // True to allow a single ':' as the expression. Only really applicable while indexing or for function call args.
  allowSingleColon: boolean

  // Usually false
  // True to allow '...' in the expression. Splats are only allowed within () or []
  allowSplat: boolean

  constructor() {
    this.binaryOpsToIgnore = []
    this.newLineInMiddleDoesNotEndExpression = false
    this.allowReturn = true
    this.allowSingleColon = false
    this.allowSplat = false
  }

}




/**
 * Since the FSA is a global and is reused, we will use
 * a separate visitor class to contain state of the current parsing instance.
 */
class ParseState implements IFsaParseState {
  nodes: Node[]
  mostRecentTypeAlias: TypeDefNode

  constructor(public ts: TokenStream, public thisFsa: ExpressionFsa, public wholeState: WholeFileParseState) {
    this.nodes = []
    this.mostRecentTypeAlias = null
  }
}




// Below are handlers whenever a state is visited.

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readReturn(state: ParseState): void {
  state.ts.read() // discard return token
  state.nodes.push(new ReturnNode())
}

function readBreak(state: ParseState): void {
  state.ts.read() // discard break token
  state.nodes.push(new BreakNode())
}

function readContinue(state: ParseState): void {
  state.ts.read() // discard continue token
  state.nodes.push(new ContinueNode())
}

function readLocalVarDeclaration(state: ParseState): void {
  state.ts.read() // discard local keyword
  state.nodes.push(parseLocalStatement(state.ts, state.wholeState))
}

function readGlobalVarDeclaration(state: ParseState): void {
  state.ts.read() // discard global keyword
  state.nodes.push(parseGlobalStatement(state.ts, state.wholeState))
}

function readConstVarDeclaration(state: ParseState): void {
  state.ts.read() // discard const keyword
  state.nodes.push(parseConstStatement(state.ts, state.wholeState))
}

function readTypeAliasName(state: ParseState): void {
  let typeDefNode = new TypeDefNode()
  typeDefNode.name = new IdentifierNode(state.ts.read())
  state.mostRecentTypeAlias = typeDefNode
}

function readTypeAliasGenericParamList(state: ParseState): void {
  if (state.mostRecentTypeAlias === null) throw new AssertError("")
  state.mostRecentTypeAlias.genericArgs = parseGenericDefArgList(state.ts.read() as TreeToken, state.wholeState)
}

function readTypeAliasRefersToExpression(state: ParseState): void {
  if (state.mostRecentTypeAlias === null) throw new AssertError("")
  state.mostRecentTypeAlias.alias = parseGeneralBlockExpression(state.ts, state.wholeState)
  // safe to add now
  state.nodes.push(state.mostRecentTypeAlias)
}

function readUnaryOp(state: ParseState): void {
  let token = state.ts.read()
  let node = new UnaryOpNode(token)
  state.nodes.push(node)
}

function readBinaryOp(state: ParseState): void {
  let token = state.ts.read()
  let node = new BinaryOpNode(token)
  state.nodes.push(node)
}

function readTernaryOp(state: ParseState): void {
  let token = state.ts.read()
  let node = new TernaryOpNode(token)
  node.trueExpression = parseTernaryOpTrueExpression(state.ts, state.wholeState)

  // read the colon
  state.ts.skipToNextNonWhitespace()
  if (state.ts.eof()) throw new InvalidParseError("Expecting ':' before end.", state.ts.getLastToken())
  token = state.ts.read()
  if (!(token.type === TokenType.Operator && token.str === ":")) {
    throw new InvalidParseError("Expecting ':'", token)
  }

  state.nodes.push(node)
}

function readPostFixOp(state: ParseState): void {
  let token = state.ts.read()
  let node = new PostFixOpNode(token)
  state.nodes.push(node)
}

function readImplicitMultiplicationIdentifier(state: ParseState): void {
  insertImplicitMultiplication(state)
  readIdentifier(state)
}

function readImplicitMultiplicationParentheses(state: ParseState): void {
  insertImplicitMultiplication(state)
  readGroupingParentheses(state)
}

function insertImplicitMultiplication(state: ParseState): void {
  let nextToken = state.ts.peek()
  let nextTokenStart = nextToken.range.start

  // create a non-existent token for the implied multiplication
  let rng = new Range(nextTokenStart, nextTokenStart) // position the fake * token at the end of the number token, but with 0 length
  let token = new Token("*", TokenType.Operator, rng)
  state.nodes.push(new BinaryOpNode(token))
}



function readNumber(state: ParseState): void {
  let token = state.ts.read()
  let node = new NumberNode(token)
  state.nodes.push(node)
}

function readSymbol(state: ParseState): void {
  let token = state.ts.read()
  let node = new SymbolNode(token)
  state.nodes.push(node)
}

function readStringMacro(state: ParseState): void {
  let token = state.ts.read()
  let node = new StringMacroNode(token)
  state.nodes.push(node)
}

function readIdentifier(state: ParseState): void {
  let token = state.ts.read()
  let node = new IdentifierNode(token)
  node.str = token.str
  state.nodes.push(node)
}

function readOperatorAndConvertToIdentifier(state: ParseState): void {
  let token = state.ts.read()
  token.type = TokenType.Identifier
  let node = new IdentifierNode(token)
  node.str = token.str
  state.nodes.push(node)
}

function readSingleColonAsIdentifier(state: ParseState): void {
  let token = state.ts.read()
  token.type = TokenType.Identifier
  let node = new IdentifierNode(token)
  state.nodes.push(node)
}

function readGroupingParentheses(state: ParseState): void {
  let node = parseGroupingParenthesisExpression(state.ts.read() as TreeToken, state.wholeState)
  state.nodes.push(node)
}

function readFunctionCallParentheses(state: ParseState): void {
  let node = parseFunctionCallArgs(state.ts.read() as TreeToken, state.wholeState)
  state.nodes.push(node)
}

//function readArrayLiteral(state: ParseState): void {
//  let node = parseArrayLiteral(state.ts.read() as UnparsedTreeToken, state.wholeState)
//  state.nodes.push(node)
//}

//function readIndexingArgs(state: ParseState): void {
//  let node = parseIndexingArgList(state.ts.read() as UnparsedTreeToken, state.wholeState)
//  state.nodes.push(node)
//}

function readSquareBracket(state: ParseState): void {
  let node = parseSquareBracket(state.ts.read() as TreeToken, state.wholeState)
  state.nodes.push(node)
}

function readTypeParameters(state: ParseState): void {
  let node = parseGenericArgList(state.ts.read() as TreeToken, state.wholeState)
  state.nodes.push(node)
}

function readAnyArrayLiteral(state: ParseState): void {
  let node = parseAnyArrayLiteral(state.ts.read() as TreeToken, state.wholeState)
  state.nodes.push(node)
}

function readFunctionCompactDef(state: ParseState): void {
  // NOTE: This can lead to an incorrect parse if (the pathological case) there is an expression like this:
  //   1 + f() = 3
  // as the order of operations will be interpreted incorrectly. This will isolate
  //   f() = 3
  // into a single node before order of operations handles the '+'.
  // But unlikely to put another operator on the same line as cannot combine a function with anything else, unless
  // surrounding the function with parentheses and invoking, like
  //   1 + (f() = 3)()
  let node = parseWholeCompactFunctionDef(state.ts, state.wholeState)
  state.nodes.push(node)
}

function readAnonymousFunctionDef(state: ParseState): void {
  let argsToken = state.ts.read()
  state.ts.skipToNextNonWhitespace()
  state.ts.read() // arrow
  state.ts.skipToNextNonWhitespace()

  let funcNode = new FunctionDefNode()

  // args
  if (argsToken.type === TokenType.Identifier) {
    let arg = new FunctionDefArgNode()
    arg.name = new IdentifierNode(argsToken)
    funcNode.args.orderedArgs.push(arg)
  } else if (argsToken.type === TokenType.Bracket && argsToken.str === "(") {
    // TODO don't allow keyword args, optional args
    parseFunctionDefArgList(funcNode.args, argsToken as TreeToken, state.wholeState)
  } else {
    throw new AssertError("")
  }

  // body
  let funcBody = state.thisFsa.runStartToStop(state.ts, state.wholeState)
  funcNode.bodyExpressions.push(funcBody)

  state.nodes.push(funcNode)
}

function readAnyQuote(state: ParseState): void {
  let tok = state.ts.read()
  if (tok.str === '"' || tok.str === "`" || tok.str === '"""') {
    let node = parseString(tok as TreeToken, state.wholeState)
    state.nodes.push(node)
  } else if (tok.str === "'") {
    let tree = tok as TreeToken
    let ch = tree.contents[0]
    let node = new StringLiteralNode(ch)
    state.nodes.push(node)
  } else {
    throw new AssertError("")
  }
}

function readMacroInvocation(state: ParseState): void {
  let node = parseMacroCall(state.ts, state.wholeState)
  state.nodes.push(node)
}

function readDoBlock(state: ParseState): void {
  let unparsedTree = state.ts.read() as TreeToken
  let node = parseWholeDoBlock(unparsedTree, state.wholeState)
  state.nodes.push(node)
}

function readKeywordBlock(state: ParseState): void {
  let unparsedTree = state.ts.read() as TreeToken
  var node
  if (!unparsedTree.openToken) {
    console.log("undefined is")
  }
  switch (unparsedTree.openToken.str) {
    case "function":
      node = parseWholeFunctionDef(unparsedTree, state.wholeState)
      break
    case "quote":
      throw new InvalidParseError("Unimplemented", unparsedTree)
      //node = new CodeQuoteNode()
      break
    case "begin":
      node = parseWholeBeginBlock(unparsedTree, state.wholeState)
      break
    case "if":
      node = parseWholeIfBlock(unparsedTree, state.wholeState)
      break
    case "for":
      node = parseWholeForBlock(unparsedTree, state.wholeState)
      break
    case "while":
      node = parseWholeWhileBlock(unparsedTree, state.wholeState)
      break
    case "let":
      node = parseWholeLetBlock(unparsedTree, state.wholeState)
      break
    case "try":
      node = parseWholeTryBlock(unparsedTree, state.wholeState)
      break
    default:
      throw new InvalidParseError("Unexpected keyword: " + unparsedTree.openToken.str, unparsedTree)
  }
  state.nodes.push(node)
}

















// FSA objects take a bit of work to construct and are designed to be stateless,
// so just create global objects once and reuse them.



// This fsa can be used to read any block contents
// where we are not expecting any keywords before the end of the token stream
// and we allow multiple statements.
// ';' and \n must be skipped by the wrapping iterator.
var fsaOptions = new ExpressionFsaOptions()
var fsaGeneralBlockExpression = new ExpressionFsa(fsaOptions)

export function parseGeneralBlockExpression(ts: TokenStream, wholeState: WholeFileParseState): Node {
  return fsaGeneralBlockExpression.runStartToStop(ts, wholeState)
}



// Used to read the expression evaluated if condition is true for a ternary op.
// Colons must be treated specially as an escape, not a binary operator.
// Newlines will be ignored until ':' is found
fsaOptions = new ExpressionFsaOptions()
fsaOptions.binaryOpsToIgnore = [":"]
fsaOptions.newLineInMiddleDoesNotEndExpression = true
var fsaTernaryOpTrueExpression = new ExpressionFsa(fsaOptions)

function parseTernaryOpTrueExpression(ts: TokenStream, wholeState: WholeFileParseState): Node {
  return fsaTernaryOpTrueExpression.runStartToStop(ts, wholeState)
}





fsaOptions = new ExpressionFsaOptions()
fsaOptions.newLineInMiddleDoesNotEndExpression = true
fsaOptions.allowSplat = true
var fsaGroupingParenthesisExpression = new ExpressionFsa(fsaOptions)

export function parseGroupingParenthesisExpression(parenTree: TreeToken, wholeState: WholeFileParseState): Node {
  if (parenTree.openToken.str !== "(") throw new AssertError("")
  let ts = new TokenStream(parenTree.contents, parenTree.openToken)
  let node = new ParenthesesNode()

  try {
    ts.skipToNextNonWhitespace()
    if (ts.eof()) return new EmptyTupleNode()

    node.expression = fsaGroupingParenthesisExpression.runStartToStop(ts, wholeState)
    expectNoMoreExpressions(ts)

  } catch (err) {
    handleParseErrorOnly(err, node, parenTree.contents, wholeState)
  }
  return node
}

