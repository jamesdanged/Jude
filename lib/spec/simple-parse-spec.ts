"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import * as atomModule from "atom"
import {jlFilesDir} from "./utils/emptySession";
import {parseFile} from "../parseTree/parseFile";
import {SessionModel} from "../core/SessionModel";
import {ModuleLibrary} from "../core/ModuleLibrary";
import {LibrarySerialized} from "../core/ModuleLibrary";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {setMockOpenFiles} from "../utils/atomApi";
import {jasmine13to20} from "../utils/jasmine13to20";
import {createTestSessionModel} from "./utils/emptySession";


describe("basic function parsing", () => {
  let j13to20 = jasmine13to20(); let beforeAll = j13to20.newBeforeAll; let it = j13to20.newIt

  let file = new atomModule.File(jlFilesDir + "/functions.jl", false)
  let path: string = null
  let contents = null
  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors


  beforeAll(async (done) => {
    path =  await file.getRealPath()
    setMockOpenFiles([path])
    contents = await file.read()
    done()
  })

  it("should not have any entries before parse", () => {
    expect(errors[path]).toBeUndefined()
  })

  it("should have no parse errors", async (done) => {
    contents = await file.read()
    sessionModel.parseSet.createEntriesForFile(path)
    parseFile(path, contents, sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
    done()
  })

  it("should have no name errors before resolution", () => {
    expect(errors[path].nameErrors.length).toBe(0)
  })

  it("should have one name error after resolution", async (done) => {
    await resolveFullWorkspaceAsync(sessionModel)
    expect(errors[path].nameErrors.length).toBe(1)
    expect(errors[path].nameErrors[0].token.str).toBe("arg3")
    done()
  })
})

