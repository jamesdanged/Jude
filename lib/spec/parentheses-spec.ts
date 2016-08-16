"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession"
import {jasmine13to20} from "../utils/jasmine13to20"
import {createTestSessionModel} from "./utils/emptySession"
import {parseFullWorkspaceAsync} from "../core/parseWorkspace"
import {ProjectFilesHash} from "../core/parseWorkspace"
import {unmockAll} from "./utils/emptySession"
import {Point} from "../tokens/Token"


describe("parentheses", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/parentheses_1.jl"
  let contents1 = `
(a, b) = 1, 2
a
b
(c, d) = (3, 4)
c
d
`

  let path2 = "/parentheses_2.jl"
  let contents2 = `
a = ()
a
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

  it("should identify variables declared in multiple assignment expressions", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should recognize empty tuples", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    // TODO check the node in the tree is a TupleNode ?
    done()
  })




})