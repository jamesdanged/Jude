"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("comments", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/comment_1.jl"
  let contents1 = `
a = 1 #some comment
b = 2
`

  let path2 = "/comment_2.jl"
  let contents2 = `
a = 1
#= some multiline
comment
#=
#=

=#
b = 2

arr = [1, 2, #= inserted comment =# 3]

`


  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path1] = contents1
    o[path2] = contents2
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should parse single line comment", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    let node = sessionModel.parseSet.fileLevelNodes[path1]
    expect(node.expressions[0].toString()).toBe("(a=1)")
    expect(node.expressions[1].toString()).toBe("(b=2)")
    done()
  })

  it("should parse multi line comment", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    let node = sessionModel.parseSet.fileLevelNodes[path2]
    expect(node.expressions[0].toString()).toBe("(a=1)")
    expect(node.expressions[1].toString()).toBe("(b=2)")
    expect(node.expressions[2].toString()).toBe("(arr=[1,2,3])")
    done()
  })


})
