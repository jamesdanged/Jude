"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {mockAll} from "./utils/emptySession";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("strings", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/string_1.jl"
  let contents1 = `
a = 3
s = "hello world $a  singlequote: ' backtick: \`"
`

  let path2 = "/string_2.jl"
  let contents2 = `
println(s) = s
add(a, b) = a + b
println("a + b is $(add(1, 3)) single quote: ' backtick: \` ")
`

  let path3 = "/string_3.jl"
  let contents3 = "val = 5; `a command $val 3 4`"

  let path4 = "/string_4.jl"
  let contents4 = `
a = 5
rand() = 1.0

s = """
A very long string. Could be a docstring.
$(rand()) $a

Can have double quotes: "this is a also just a string"

Can have unclosed double quotes: "
Can have backticks: \`

"""
`

  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path1] = contents1
    o[path2] = contents2
    o[path3] = contents3
    o[path4] = contents4
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should parse simple interpolation", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should parse interpolated expression", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("should parse backtick strings", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })

  it("should parse triple quoted strings", async (done) => {
    expect(errors[path4].parseErrors.length).toBe(0)
    expect(errors[path4].nameErrors.length).toBe(0)
    done()
  })


})
