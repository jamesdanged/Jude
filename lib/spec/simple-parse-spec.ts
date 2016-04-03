"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockOpenFiles} from "../utils/atomApi";
import {NumberNode} from "../parseTree/nodes";
import {Point} from "../tokens/Token";
import * as atomModule from "atom"
import {jlFilesDir} from "./utils/emptySession";
import {parseFile} from "../parseTree/parseFile";
import {SessionModel} from "../core/SessionModel";
import {ModuleLibrary} from "../core/ModuleLibrary";
import {LibrarySerialized} from "../core/ModuleLibrary";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {FunctionDefNode} from "../parseTree/nodes";
import {FileLevelNode} from "../parseTree/nodes";
import {FunctionDefArgListNode} from "../parseTree/nodes";
import {VariableResolve} from "../nameResolution/Resolve";
import {FunctionDefArgNode} from "../parseTree/nodes";
import {FileIdentifiers} from "../core/SessionModel";
import {IdentifierNode} from "../parseTree/nodes";
import {unmockOpenFiles} from "../utils/atomApi";


// TODO
// test for ccall
// should not throw error in promise when
//   resolve recursing a macro/type/function node with no name


describe("basic function parsing", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let path = "/some_dir/basic_function.jl"
  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let contents =
`function basic_function{T <: Int}(arg1::T, arg2::Float64=3.3; keyword_arg=5)
  arg1 + arg2
  arg3
end`


  beforeAll(() => {
    mockOpenFiles([path])
  })

  afterAll(() => {
    unmockOpenFiles()
  })

  it("should not have any entries before parse", () => {
    expect(errors[path]).toBeUndefined()
  })

  it("should have no parse errors", async (done) => {
    sessionModel.parseSet.createEntriesForFile(path)
    parseFile(path, contents, sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
    done()
  })

  it("should have no name errors before resolution", () => {
    expect(errors[path].nameErrors.length).toBe(0)
  })

  it("should have one name error after resolution", async (done) => {
    await resolveFullWorkspaceAsync(sessionModel)
    expect(errors[path].nameErrors.length).toBe(1)
    expect(errors[path].nameErrors[0].token.str).toBe("arg3")
    done()
  })

  it("should be fully resolved", () => {
    expect(sessionModel.partiallyResolved).toBe(false)
  })

  let arg1Node: FunctionDefArgNode = null
  let fileNode: FileLevelNode = null
  let identifiers: FileIdentifiers = null
  it("should have 2 ordered args, 1 keyword arg, and 1 generic arg", () => {
    fileNode = sessionModel.parseSet.fileLevelNodes[path]
    let node = fileNode.expressions[0]

    expect(node instanceof FunctionDefNode).toBe(true)
    let funcNode = node as FunctionDefNode

    expect(funcNode.args.orderedArgs.length).toBe(2)
    arg1Node = funcNode.args.orderedArgs[0]  // use later test
    let arg2Node = funcNode.args.orderedArgs[1]
    expect(arg2Node.defaultValue instanceof NumberNode).toBe(true)

    expect(funcNode.args.keywordArgs.length).toBe(1)
    let arg3Node = funcNode.args.keywordArgs[0]
    expect(arg3Node.type).toBeNull()
    expect(arg3Node.defaultValue instanceof NumberNode).toBe(true)

    expect(funcNode.genericArgs.args.length).toBe(1)
    let genArg1 = funcNode.genericArgs.args[0]
    expect(genArg1.name.name).toBe("T")
    expect(genArg1.restriction instanceof IdentifierNode).toBe(true)
    let restriction = genArg1.restriction as IdentifierNode
    expect(restriction.name).toBe("Int")

    identifiers = sessionModel.parseSet.identifiers[path]

  })

  it("should resolve arg1 to the param list", () => {
    let ident = sessionModel.parseSet.identifiers[path].getIdentifierForPoint(new Point(1, 2))
    expect(ident.token.str).toBe("arg1")
    let resolve = identifiers.map.get(ident)
    expect(resolve instanceof VariableResolve).toBe(true)
    let varResolve = resolve as VariableResolve
    expect(varResolve.token).toBe(arg1Node.name.token)
  })

})

