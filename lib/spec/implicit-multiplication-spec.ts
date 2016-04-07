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


describe("implicit multiplication", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path = "/file.jl"
  let contents =
`a = 5
b = 3
2a+b
2(a+b)
(1+a)b
`

  beforeAll(() => {
    let o: ProjectFilesHash = {}
    o[path] = contents
    mockAll(o)
  })

  afterAll(() => {
    unmockAll()
  })


  it("should parse 2a+b as ((2*a)+b)", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
    expect(errors[path].nameErrors.length).toBe(0)
    let node = sessionModel.parseSet.fileLevelNodes[path]
    let expr = node.expressions[2]
    expect(expr.toString()).toBe("((2*a)+b)")
    done()
  })

  it("should parse 2(a+b) as (2*(a+b))", async (done) => {
    expect(errors[path].parseErrors.length).toBe(0)
    expect(errors[path].nameErrors.length).toBe(0)
    let node = sessionModel.parseSet.fileLevelNodes[path]
    let expr = node.expressions[3]
    expect(expr.toString()).toBe("(2*(a+b))")
    done()
  })

  it("should parse (1+a)b as ((1+a)*b)", async (done) => {
    expect(errors[path].parseErrors.length).toBe(0)
    expect(errors[path].nameErrors.length).toBe(0)
    let node = sessionModel.parseSet.fileLevelNodes[path]
    let expr = node.expressions[4]
    expect(expr.toString()).toBe("((1+a)*b)")
    done()
  })

})
