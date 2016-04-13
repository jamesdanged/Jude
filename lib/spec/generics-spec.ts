"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("generics", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/generics_1.jl"
  let contents1 = `
d = Dict{Int, Int}()
`

  let path2 = "/generics_2.jl"
  let contents2 = `
Tuple{}
`

  let path3 = "/generics_3.jl"
  let contents3 = `
function foo{T}(val::T)
  val
end

# can have 0 args
function foo{}(val)
  val
end


`

  let path4 = "/generics_4.jl"
  let contents4 = `
type Bar{T}
  a::T
  b::Int
end
`

  let path5 = "/generics_5.jl"
  let contents5 = `
type Bar{T}
  a::T
  b::Int
  function Bar()
    obj = new(1, 2)
    obj.a = T(1)
    obj.b = 2
    obj
  end
end
`


  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path1] = contents1
    o[path2] = contents2
    o[path3] = contents3
    o[path4] = contents4
    o[path5] = contents5
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should parse generic type usages", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should parse empty generics", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("should parse generic functions", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })

  it("should parse generic types", async (done) => {
    expect(errors[path4].parseErrors.length).toBe(0)
    expect(errors[path4].nameErrors.length).toBe(0)
    done()
  })

  it("should parse functions inside generic types", async (done) => {
    expect(errors[path5].parseErrors.length).toBe(0)
    expect(errors[path5].nameErrors.length).toBe(0)
    done()
  })

})
