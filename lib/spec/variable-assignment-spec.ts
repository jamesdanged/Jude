"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />


import {mockAll} from "./utils/emptySession";
import {BinaryOpNode} from "../parseTree/nodes";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("variable assignment", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/file1.jl"
  let contents1 =
`a, b = (1, 2)
`

  let path2 = "/file2.jl"
  let contents2 =
`(a, b) = (1, 2)
`

  let path3 = "/file3.jl"
  let contents3 =
` a = []
a[1], b = 2, 3
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


  it("should recognize assignment like a,b = (1, 2)", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should recognize assignment like (a,b) = (1, 2)", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("should recognize assignment to array index", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })

})
