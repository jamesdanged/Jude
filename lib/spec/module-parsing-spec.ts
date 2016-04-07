"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import {runDelayed} from "../utils/taskUtils";
import {createTestSessionModel} from "./utils/emptySession";
import {jasmine13to20} from "../utils/jasmine13to20";
import {mockOpenFiles} from "../utils/atomApi";
import {unmockOpenFiles} from "../utils/atomApi";
import {parseFile} from "../parseTree/parseFile";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {mockProjectFiles} from "../core/parseWorkspace";
import {unmockProjectFiles} from "../core/parseWorkspace";
import {ProjectFilesHash} from "../core/parseWorkspace";
import {parseFullWorkspaceAsync} from "../core/parseWorkspace";
import {mockRunDelayed} from "../utils/taskUtils";
import {unmockRunDelayed} from "../utils/taskUtils";
import {unmockAll} from "./utils/emptySession";
import {mockAll} from "./utils/emptySession";


describe("basic module parsing", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  //dorunDelayed(() => { console.log("hi there")})

  let modPath = "/somedir/MODXYZ/src/MODXYZ.jl"
  let modFileContents =
`x = 10  # some statements outside

module MODXYZ
  include("file1.jl")
  include("missing.jl")
  include("subdir/file2.jl")
end`

  let path1 = "/somedir/MODXYZ/src/file1.jl"
  let contents1 =
`foo = 10

function bar()
  println("hello")
end

baz^2
`

  let path2 = "/somedir/MODXYZ/src/subdir/file2.jl"
  let contents2 =
`x+1

foo *= 2 + bar()
baz = 5
`

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[modPath] = modFileContents
    o[path1] = contents1
    o[path2] = contents2
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })



  it("should only have 1 parse error for the missing file", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[modPath].parseErrors.length).toBe(1)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path2].parseErrors.length).toBe(0)
    done()
  })


})


describe("multiple modules in a file", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll


  let contents = `
module Mod1
  function foo()
  end
end

module Mod2
  function bar()
  end
end

Mod1.foo()
Mod2.bar()
`

  let path = "/dir/only_file.jl"


  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path] = contents
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })



  it("should be able to have multiple modules in a single file", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
    expect(errors[path].nameErrors.length).toBe(0)
    done()
  })



})

