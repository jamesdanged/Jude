"use strict"

/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />

import * as atomModule from "atom"
import {parseFile} from "../parseTree/parseFile";
import {SessionModel} from "../core/SessionModel";
import {ModuleLibrary} from "../core/ModuleLibrary";
import {LibrarySerialized} from "../core/ModuleLibrary";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";


var jlFilesDir: string = __dirname + "/jl"

function createTestSessionModel(): SessionModel {
  let sessionModel = new SessionModel()
  let moduleLibrary = sessionModel.moduleLibrary
  let state = new LibrarySerialized()
  state.loadPaths.push("some path") // prevents querying to julia
  state.serializedLines["Base"] = {}
  state.serializedLines["Core"] = {}
  moduleLibrary.initializeFromSerialized(state)
  return sessionModel
}

describe("basic function parsing", () => {
  let file = new atomModule.File(jlFilesDir + "/functions.jl", false)
  let path = file.getPath()
  let contents = null
  let sessionModel = createTestSessionModel()
  let errors = sessionModel.parseSet.errors

  beforeAll(async (done) => {
    contents = await file.read()
    done()
  })

  it("should be okie dokie", () => {
    expect(true).toBe(false)
  })

  it("should not have any entries before parse", () => {
    expect(errors[path]).toBeUndefined()
  })

  it("should have no parse errors", () => {
    parseFile(path, contents, sessionModel)
    expect(errors[path].parseErrors.length).toBe(0)
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

