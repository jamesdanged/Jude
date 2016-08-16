"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession"
import {jasmine13to20} from "../utils/jasmine13to20"
import {createTestSessionModel} from "./utils/emptySession"
import {parseFullWorkspaceAsync} from "../core/parseWorkspace"
import {ProjectFilesHash} from "../core/parseWorkspace"
import {unmockAll} from "./utils/emptySession"


describe("semicolon", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/semicolon_1.jl"
  let contents1 = `
a = 1; b = 2; a+b
a - b
`

  let path2 = "/semicolon_2.jl"
  let contents2 = `
i = 0
while i < 5; i += 1; end
`

  let path3 = "/semicolon_3.jl"
  let contents3 = `
(a = 5; b = 3)
a + b
1 < 3 && (c = 4; c < 5)
`


  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path1] = contents1
    o[path2] = contents2
    o[path3] = contents3
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })

  it("should allow splitting multiple statements with semicolons", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should allow semicolon within 'while' block", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("should allow multiple expressions within parentheses if separated by semicolon", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })



})