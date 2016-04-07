"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />


import {mockAll} from "./utils/emptySession";
import {unmockOpenFiles} from "../utils/atomApi";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";
import {mockOpenFiles} from "../utils/atomApi";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {unmockRunDelayed} from "../utils/taskUtils";
import {unmockProjectFiles} from "../core/parseWorkspace";
import {mockRunDelayed} from "../utils/taskUtils";
import {mockProjectFiles} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {unmockAll} from "./utils/emptySession";


describe("macros", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path_macro_1 = "/macro_1.jl"
  let contents_macro_1 = `
module Mod
  macro foo(a, b)
  end
end

Mod.@foo(1, 2)
Mod.@foo 1 2
Mod.@foo
`

  let path_macro_2 = "/macro_2.jl"
  let contents_macro_2 = `
module Mod
  macro foo(a, b)
  end
end

@Mod.foo(1, 2)
@Mod.foo 1 2
@Mod.foo
`

  let path_macro_3 = "/macro_3.jl"
  let contents_macro_3 = `
module Mod
  export @foo

  macro foo(a, b)
  end
end

using Mod
@foo(1, 2)
@foo 1 2
@foo
`




  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path_macro_1] = contents_macro_1
    o[path_macro_2] = contents_macro_2
    o[path_macro_3] = contents_macro_3
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should parse Module.@macro without errors", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path_macro_1].parseErrors.length).toBe(0)
    expect(errors[path_macro_1].nameErrors.length).toBe(0)
    done()
  })

  it("should parse @Module.macro without errors", async (done) => {
    expect(errors[path_macro_2].parseErrors.length).toBe(0)
    expect(errors[path_macro_2].nameErrors.length).toBe(0)
    done()
  })

  it("should export and use macros without errors", async (done) => {
    expect(errors[path_macro_3].parseErrors.length).toBe(0)
    expect(errors[path_macro_3].nameErrors.length).toBe(0)
    done()
  })



})
