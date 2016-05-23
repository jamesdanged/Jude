"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />


import {mockAll} from "./utils/emptySession";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("property after an indexed array", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path = "/file.jl"
  let contents =
    `arr = []
arr[1].prop = 3
`

  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path] = contents
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should not be a name error to have property after array indexing", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
    expect(errors[path].nameErrors.length).toBe(0)
    done()
  })


})
