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


describe("relative modules", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.beforeAll; let beforeEach = j13to20.beforeEach; let it = j13to20.it; let afterEach = j13to20.afterEach; let afterAll = j13to20.afterAll

  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  let path1 = "/modules_1.jl"
  let contents1 = `
module Mod1
  module Inner1
    function abc()
      5
    end
  end
  
  module Inner2
    module Nested1
      function ghi()
        10
      end
    end
    
    import .Nested1
    Nested1.ghi()
  
    import ..Inner1: abc
    function def()
      abc()
    end
  end
end
`

  let path2 = "/modules_2.jl"
  let contents2 = `
module Mod1
  module Inner1
    export foo
    
    function foo()
      10
    end
  end
  
  using .Inner1
  
  foo()
end
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


  it("should be recognized with both single and double+ dot notation", async (done) => {
    await parseFullWorkspaceAsync(sessionModel)
    expect(errors[path1].parseErrors.length).toBe(0)
    expect(errors[path1].nameErrors.length).toBe(0)
    done()
  })

  it("should handle using with dots", async (done) => {
    expect(errors[path2].parseErrors.length).toBe(0)
    expect(errors[path2].nameErrors.length).toBe(0)
    done()
  })


})
