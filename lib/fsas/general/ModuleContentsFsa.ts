"use strict"

import {streamAtMacroIdentifier} from "../../tokens/streamConditions";
import {streamAtOverridableOperator} from "../../tokens/streamConditions";
import {streamAtOpenCurlyBraces} from "../../tokens/streamConditions";
import {TypeDefNode} from "../../parseTree/nodes";
import {streamAtNumber} from "../../tokens/streamConditions";
import {streamAtAbstract} from "../../tokens/streamConditions";
import {expectNoMoreExpressions} from "./fsaUtils";
import {parseGeneralBlockExpression} from "./ExpressionFsa";
import {FileLevelNode} from "../../parseTree/nodes";
import {handleParseErrorOnly} from "./fsaUtils";
import {TokenStream} from "../../tokens/TokenStream";
import {ModuleContentsNode} from "../../parseTree/nodes";
import {streamAtComment} from "./../../tokens/streamConditions";
import {alwaysPasses} from "./../../tokens/streamConditions";
import {streamAtEof} from "./../../tokens/streamConditions";
import {streamAtNewLineOrSemicolon} from "./../../tokens/streamConditions";
import {streamAtImport} from "./../../tokens/streamConditions";
import {streamAtImportAll} from "./../../tokens/streamConditions";
import {streamAtExport} from "./../../tokens/streamConditions";
import {streamAtUsing} from "./../../tokens/streamConditions";
import {ImportNode} from "../../parseTree/nodes";
import {ImportAllNode} from "../../parseTree/nodes";
import {ExportNode} from "../../parseTree/nodes";
import {UsingNode} from "../../parseTree/nodes";
import {streamAtComma} from "./../../tokens/streamConditions";
import {streamAtNewLine} from "./../../tokens/streamConditions";
import {LoadNamesNode} from "../../parseTree/nodes";
import {MultiPartName} from "../../parseTree/nodes";
import {TokenType} from "../../tokens/operatorsAndKeywords";
import {InvalidParseError} from "../../utils/errors";
import {streamAtColon} from "./../../tokens/streamConditions";
import {streamAtIdentifier} from "./../../tokens/streamConditions";
import {IFsa} from "./fsaUtils";
import {FsaState} from "./fsaUtils";
import {runFsaStartToStop} from "./fsaUtils";
import {IFsaParseState} from "./fsaUtils";
import {streamAtInclude} from "../../tokens/streamConditions";
import {streamAtOpenParenthesis} from "../../tokens/streamConditions";
import {TreeToken} from "../../tokens/Token";
import {IncludeNode} from "../../parseTree/nodes";
import {StringLiteralNode} from "../../parseTree/nodes";
import {IdentifierNode} from "../../parseTree/nodes";
import {Token} from "../../tokens/Token";
import {streamAtBitsType} from "../../tokens/streamConditions";
import {streamAtImmutable} from "../../tokens/streamConditions";
import {streamAtMacroKeyword} from "../../tokens/streamConditions";
import {streamAtType} from "../../tokens/streamConditions";
import {parseWholeTypeDef} from "../declarations/TypeDefFsa";
import {parseWholeMacroDef} from "../declarations/MacroDefFsa";
import {streamAtModule} from "../../tokens/streamConditions";
import {streamAtBareModule} from "../../tokens/streamConditions";
import {parseWholeModuleDef} from "./ModuleDefFsa";
import {streamAtLessThanColon} from "../../tokens/streamConditions";
import {AssertError} from "../../utils/assert";
import {NumberNode} from "../../parseTree/nodes";
import {parseGenericDefArgList} from "../declarations/GenericDefArgListFsa";
import {Point} from "../../tokens/Token";
import {Range} from "../../tokens/Token";
import {Indent} from "../../tokens/Token";
import {overridableBinaryOperators} from "../../tokens/operatorsAndKeywords";

/**
 * Recognizes the contents of a module.
 * Can be used for statements in the top level module or
 * for contents of a file which are included in a module
 * (both of which aren't surrounded by module...end).
 * This is the only FSA allowed to recognize import, importall, export, and using statements.
 */
class ModuleContentsFsa implements IFsa {

  startState: FsaState
  stopState: FsaState

  constructor() {

    let startState = new FsaState("start")
    let stopState = new FsaState("stop")
    this.startState = startState
    this.stopState = stopState

    let body = new FsaState("body")
    let betweenExpressions = new FsaState("between expressions")

    let abstractKeyword = new FsaState("abstract")
    let abstractTypeName = new FsaState("abstract type name")
    let abstractGenericParams = new FsaState("abstract generic params")
    let abstractLessThanColon = new FsaState("abstract <:")
    let abstractParentType = new FsaState("abstract parent type")

    let bitsTypeKeyword = new FsaState("bitstype keyword")
    let bitsTypeNumBits = new FsaState("bitstype num bits")
    let bitsTypeName = new FsaState("bitstype name")
    let bitsTypeLessThanColon = new FsaState("bitstype <:")
    let bitsTypeParentType = new FsaState("bitstype parent type")

    let macro = new FsaState("macro")
    let moduleDef = new FsaState("module def")
    let typeDefState = new FsaState("type def")

    // imp == [import | importall | using]
    let impStart = new FsaState("imp start")
    let impFirstName = new FsaState("imp first name")
    let impColon = new FsaState("imp colon")
    let impNamesList = new FsaState("imp names list")
    let impComma = new FsaState("imp comma")

    let exportStart = new FsaState("export start")
    let exportNamesList = new FsaState("export names list")
    let exportComma = new FsaState("export comma")

    let includeWord = new FsaState("include word")
    let includeParen = new FsaState("include paren")

    // used to skip comments
    let allStatesExceptStop = [startState, body, betweenExpressions,
      abstractKeyword, abstractTypeName, abstractGenericParams, abstractLessThanColon, abstractParentType,
      bitsTypeKeyword, macro, moduleDef, typeDefState,
      impStart, impFirstName, impColon, impNamesList, impComma,
      exportStart, exportNamesList, exportComma, includeWord, includeParen]

    // skip comments
    for (let state of allStatesExceptStop) {
      state.addArc(state, streamAtComment, skipOneToken)
    }
    // new lines have no effect at various points
    for (let state of [impStart, impColon, impComma, exportStart, exportComma]) {
      state.addArc(state, streamAtNewLine, skipOneToken)
    }


    startState.addArc(body, alwaysPasses, doNothing)

    body.addArc(stopState, streamAtEof, doNothing)
    body.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)


    // handle abstract declarations
    body.addArc(abstractKeyword, streamAtAbstract, skipOneToken)
    abstractKeyword.addArc(abstractTypeName, streamAtIdentifier, readAbstractName)

    abstractTypeName.addArc(abstractGenericParams, streamAtOpenCurlyBraces, readAbstractGenericParams)
    abstractTypeName.addArc(abstractLessThanColon, streamAtLessThanColon, skipOneToken)
    abstractTypeName.addArc(betweenExpressions, alwaysPasses, doNothing)

    abstractGenericParams.addArc(abstractLessThanColon, streamAtLessThanColon, skipOneToken)
    abstractGenericParams.addArc(betweenExpressions, alwaysPasses, doNothing)

    abstractLessThanColon.addArc(abstractLessThanColon, streamAtNewLine, skipOneToken)
    abstractLessThanColon.addArc(abstractParentType, alwaysPasses, readAbstractParentType)

    abstractParentType.addArc(betweenExpressions, alwaysPasses, doNothing)

    // handle bitstype declarations
    body.addArc(bitsTypeKeyword, streamAtBitsType, skipOneToken)
    bitsTypeKeyword.addArc(bitsTypeNumBits, streamAtNumber, readBitsTypeNumBits)
    bitsTypeNumBits.addArc(bitsTypeName, streamAtIdentifier, readBitsTypeName)
    bitsTypeName.addArc(bitsTypeLessThanColon, streamAtLessThanColon, skipOneToken)
    bitsTypeName.addArc(betweenExpressions, alwaysPasses, doNothing)
    bitsTypeLessThanColon.addArc(bitsTypeLessThanColon, streamAtNewLine, skipOneToken)
    bitsTypeLessThanColon.addArc(bitsTypeParentType, alwaysPasses, readBitsTypeParentType)
    bitsTypeParentType.addArc(betweenExpressions, alwaysPasses, doNothing)

    // handle declarations of macros, modules, types
    body.addArc(macro, streamAtMacroKeyword, readMacroDef)
    body.addArc(moduleDef, streamAtModule, readModuleDef)
    body.addArc(moduleDef, streamAtBareModule, readModuleDef)
    body.addArc(typeDefState, streamAtImmutable, readTypeDef)
    body.addArc(typeDefState, streamAtType, readTypeDef)
    macro.addArc(betweenExpressions, alwaysPasses, doNothing)
    moduleDef.addArc(betweenExpressions, alwaysPasses, doNothing)
    typeDefState.addArc(betweenExpressions, alwaysPasses, doNothing)

    // handle import, importall, using, export, include
    body.addArc(impStart, streamAtImport, newImport)
    body.addArc(impStart, streamAtImportAll, newImportAll)
    body.addArc(impStart, streamAtUsing, newUsing)
    body.addArc(exportStart, streamAtExport, newExport)
    body.addArc(includeWord, streamAtInclude, skipOneToken)

    // otherwise must be an expression
    body.addArc(betweenExpressions, alwaysPasses, readBodyExpression)

    // require a delimiter between expressions
    betweenExpressions.addArc(body, streamAtNewLineOrSemicolon, skipOneToken)
    betweenExpressions.addArc(stopState, streamAtEof, doNothing)



    // handle import, importall, using statements

    // read the first name, which could be a prefix or part of the names list
    impStart.addArc(impFirstName, alwaysPasses, readImpName)

    // if we encounter a ':', then it was actually a prefix
    impFirstName.addArc(impColon, streamAtColon, changeImpNameToPrefix)
    impFirstName.addArc(impComma, streamAtComma, skipOneToken)
    impFirstName.addArc(betweenExpressions, alwaysPasses, doNothing) // otherwise end of the import|importall|using statement

    // must be at least one name after a colon
    impColon.addArc(impNamesList, alwaysPasses, readImpName)

    // must have a comma to continue, or else end of the import/importall/using statement
    impNamesList.addArc(impComma, streamAtComma, skipOneToken)
    impNamesList.addArc(betweenExpressions, alwaysPasses, doNothing)

    impComma.addArc(impNamesList, alwaysPasses, readImpName)




    // handle export statement

    // must have at least one name
    exportStart.addArc(exportNamesList, streamAtIdentifier, readExportedName)
    exportStart.addArc(exportNamesList, streamAtMacroIdentifier, readExportedName)

    // comma continues list, else end of export statement
    exportNamesList.addArc(exportComma, streamAtComma, skipOneToken)
    exportNamesList.addArc(betweenExpressions, alwaysPasses, doNothing)

    exportComma.addArc(exportNamesList, streamAtIdentifier, readExportedName)
    exportComma.addArc(exportNamesList, streamAtMacroIdentifier, readExportedName)


    // handle include call
    includeWord.addArc(includeParen, streamAtOpenParenthesis, readIncludePath)
    includeParen.addArc(betweenExpressions, alwaysPasses, doNothing)

  }

  runStartToStop(ts: TokenStream, nodeToFill: ModuleContentsNode, wholeState: WholeFileParseState): void {
    let parseState = new ParseState(ts, nodeToFill, wholeState)
    runFsaStartToStop(this, parseState)
  }

}



class ParseState implements IFsaParseState {
  lastImp: LoadNamesNode
  lastExportNode: ExportNode
  lastTypeDef: TypeDefNode
  constructor(public ts: TokenStream, public nodeToFill: ModuleContentsNode, public wholeState: WholeFileParseState) {
    this.lastImp = null
    this.lastExportNode = null
    this.lastTypeDef = null
  }
}

function doNothing(state: ParseState): void { }

function skipOneToken(state: ParseState): void {
  state.ts.read()
}

function readAbstractName(state: ParseState): void {
  let abstractNode = new TypeDefNode()
  abstractNode.name = new IdentifierNode(state.ts.read())
  state.lastTypeDef = abstractNode
  state.nodeToFill.expressions.push(abstractNode)
}

function readAbstractGenericParams(state: ParseState): void {
  let curlyBraceTokTree = state.ts.read() as TreeToken
  state.lastTypeDef.genericArgs = parseGenericDefArgList(curlyBraceTokTree, state.wholeState)
}

function readAbstractParentType(state: ParseState): void {
  if (state.lastTypeDef === null) throw new AssertError("")
  state.lastTypeDef.parentType = parseGeneralBlockExpression(state.ts, state.wholeState)
}

function readBitsTypeNumBits(state: ParseState): void {
  let node = new TypeDefNode()
  node.numbits = new NumberNode(state.ts.read())
  state.lastTypeDef = node
}

function readBitsTypeName(state: ParseState): void {
  if (state.lastTypeDef === null) throw new AssertError("")
  state.lastTypeDef.name = new IdentifierNode(state.ts.read())
  // now safe to store
  state.nodeToFill.expressions.push(state.lastTypeDef)
}

function readBitsTypeParentType(state: ParseState): void {
  if (state.lastTypeDef === null) throw new AssertError("")
  state.lastTypeDef.parentType = parseGeneralBlockExpression(state.ts, state.wholeState)
}

function readMacroDef(state: ParseState): void {
  let unparsedTree = state.ts.read() as TreeToken
  let node = parseWholeMacroDef(unparsedTree, state.wholeState)
  state.nodeToFill.expressions.push(node)
}

function readModuleDef(state: ParseState): void {
  let unparsedTree = state.ts.read() as TreeToken
  let node = parseWholeModuleDef(unparsedTree, state.wholeState)
  state.nodeToFill.expressions.push(node)
}

function readTypeDef(state: ParseState): void {
  let unparsedTree = state.ts.read() as TreeToken
  let node = parseWholeTypeDef(unparsedTree, state.wholeState)
  state.nodeToFill.expressions.push(node)
}

function newImport(state: ParseState): void {
  state.ts.read() // skip the import token
  let node = new ImportNode()
  state.lastImp = node
  state.nodeToFill.expressions.push(node)
}

function newImportAll(state: ParseState): void {
  state.ts.read() // skip the importall token
  let node = new ImportAllNode()
  state.lastImp = node
  state.nodeToFill.expressions.push(node)
}

function newUsing(state: ParseState): void {
  state.ts.read() // skip the using token
  let node = new UsingNode()
  state.lastImp = node
  state.nodeToFill.expressions.push(node)
}

function newExport(state: ParseState): void {
  let exportToken = state.ts.read() // skip the export token
  let node = new ExportNode(exportToken.range.start)
  state.lastExportNode = node
  state.nodeToFill.expressions.push(node)
}

function readBodyExpression(state: ParseState): void {
  let expr = parseGeneralBlockExpression(state.ts, state.wholeState)
  state.nodeToFill.expressions.push(expr)
}

function readImpName(state: ParseState): void {
  let name = readMultiPartName(state)
  state.lastImp.names.push(name)
}

function changeImpNameToPrefix(state: ParseState): void {
  state.ts.read() // discard ':'
  // convert previous name to be a prefix
  state.lastImp.prefix = state.lastImp.names.pop()
}

function readMultiPartName(state: ParseState): MultiPartName {
  let ts = state.ts
  let name: MultiPartName = []


  let readNamePart = () => {
    let tok: Token = null
    if (streamAtOverridableOperator(state.ts)) {
      // convert operator to an identifer
      tok = ts.read()
      tok.type = TokenType.Identifier
    } else if (streamAtMacroIdentifier(state.ts)) {
      tok = ts.read()
    } else {
      tok = ts.read()
      if (tok.type !== TokenType.Identifier) {
        throw new InvalidParseError("Expected an identifier, got " + tok.str, tok)
      }
    }
    name.push(new IdentifierNode(tok))
  }


  // at least one name part
  readNamePart()
  // try to read any further parts
  while (!ts.eof()) {
    let tok = ts.peek()
    if (tok.type === TokenType.Operator && tok.str[0] === ".") {
      // deal with situations like 'import Base.+'  since '.+' is treated as a single operator
      if (tok.str.length > 1) {
        let dotStart = tok.range.start
        let dotEnd = new Point(dotStart.row, dotStart.column + 1)
        let tokDot = new Token(".", TokenType.Operator, new Range(dotStart, dotEnd), tok.indent)

        let opStart = new Point(dotEnd.row, dotEnd.column)
        let opEnd = tok.range.end
        let tokOp = new Token(tok.str.slice(1), TokenType.Operator, new Range(opStart, opEnd), tok.indent)

        ts.splice(ts.index, 1, tokDot, tokOp)
      }
      ts.read() // skip the dot
      ts.skipNewLinesAndComments()
      readNamePart()
    } else {
      break
    }
  }

  // notify if operator is an interior part
  // Should only be the last part
  for (let i = 0; i < name.length - 1; i++) {
    let tok = name[i].token
    if (tok.str in overridableBinaryOperators) {
      state.wholeState.parseErrors.push(new InvalidParseError("Cannot have an operator as a module name.", tok))
    }
  }

  return name
}

function readExportedName(state: ParseState): void {
  let tok = state.ts.read()
  state.lastExportNode.names.push(new IdentifierNode(tok))
}


function readIncludePath(state: ParseState): void {
  let treeToken = state.ts.read() as TreeToken
  let innerTs = new TokenStream(treeToken.contents, treeToken.openToken)
  innerTs.skipNewLinesAndComments()

  if (innerTs.eof()) throw new InvalidParseError("Expected include path.", innerTs.getLastToken())

  let quoteToken = innerTs.read()
  if (quoteToken.type !== TokenType.Quote && quoteToken.str !== "\"") throw new InvalidParseError("Expected double quotes.", quoteToken)
  treeToken = quoteToken as TreeToken
  innerTs = new TokenStream(treeToken.contents, treeToken.openToken)
  if (innerTs.eof()) throw new InvalidParseError("Expected include path.", innerTs.getLastToken())

  let pathToken = innerTs.read()
  if (pathToken.type !== TokenType.StringLiteralContents) throw new InvalidParseError("Expected include path.", pathToken)

  let includeNode = new IncludeNode(new StringLiteralNode(pathToken))
  state.nodeToFill.expressions.push(includeNode)

  innerTs.skipNewLinesAndComments()
  if (!innerTs.eof()) throw new InvalidParseError("Unexpected token.", innerTs.read())

}







var fsaModuleContents = new ModuleContentsFsa()

export function parseModuleContents(ts: TokenStream, nodeToFill: ModuleContentsNode, wholeState: WholeFileParseState): void {
  fsaModuleContents.runStartToStop(ts, nodeToFill, wholeState)
}


/**
 * State that accumulates over a full file parse.
 * May eventually have more state, such as parsing options.
 */
export class WholeFileParseState {
  parseErrors: InvalidParseError[]

  constructor() {
    this.parseErrors = []
  }
}

/**
 *
 *
 * @param nodeToFill
 * @param fileContents  Should already be grouped into trees by brackets.
 * @returns {FileLevelNode}
 */
export function parseWholeFileContents(nodeToFill: FileLevelNode, fileContents: Token[]): WholeFileParseState {

  let wholeState = new WholeFileParseState()
  let tokenMinus1 = new Token("", TokenType.LineWhiteSpace, new Range(new Point(0, 0), new Point(0, 1)), new Indent(""))
  let ts = new TokenStream(fileContents, tokenMinus1)

  try {
    fsaModuleContents.runStartToStop(ts, nodeToFill, wholeState)
    expectNoMoreExpressions(ts)
  } catch (err) {
    handleParseErrorOnly(err, nodeToFill, fileContents, wholeState)
  }
  return wholeState
}
