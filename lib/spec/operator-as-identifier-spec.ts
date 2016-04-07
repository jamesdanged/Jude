"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />


import {mockAll} from "./utils/emptySession";
import {BinaryOpNode} from "../parseTree/nodes";
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


describe("operators", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/file1.jl"
  let contents1 =
    `function map(a, b)
end
+(a, b) = a + b
arr = []
map(+, arr)
map(arr, +)
`

  let path2 = "/file2.jl"
  let contents2 =
    `
+(a, b) = a + b
-(a, b) = a - b
*(a, b) = a * b
/(a, b) = a / b
arr = [+, -, *, /]
`

  let path3 = "/file3.jl"
  let contents3 =
    `
+(a, b) = a + b
-(a, b) = a - b
%(a, b) = a % b
+
-
%
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


  it("can be treated as identifiers in function calls", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("can be identifiers in an array", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })

  it("can be identifiers on their own", async (done) => {
    expect(errors[path3].parseErrors.length).toBe(0)
    expect(errors[path3].nameErrors.length).toBe(0)
    done()
  })

})
