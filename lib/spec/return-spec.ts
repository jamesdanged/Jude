"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession"
import {jasmine13to20} from "../utils/jasmine13to20"
import {createTestSessionModel} from "./utils/emptySession"
import {parseFullWorkspaceAsync} from "../core/parseWorkspace"
import {ProjectFilesHash} from "../core/parseWorkspace"
import {unmockAll} from "./utils/emptySession"


describe("return", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/return_1.jl"
  let contents1 = `
function foo()
  a = 5 + 3
  if true
    return a + 2
  else
    return
  end
end
`

  let path2 = "/return_2.jl"
  let contents2 = `
function foo()
  a = 5 + 3
  a == 8 && return 10
  1
end
`

  let path3 = "/return_3.jl"
  let contents3 = `
function foo()
  for i = 1:5
    i == 2 && continue
    i == 3 && break
    i == 4 || return
    i == 5 || continue
    i == 5 || break
  end  
end
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

  it("should parse returned expressions and empty returns", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should allow 'return' after &&", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("should allow 'continue' 'break' and 'return' after && and ||", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })



})