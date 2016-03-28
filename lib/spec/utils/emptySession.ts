"use strict"

import {LibrarySerialized} from "../../core/ModuleLibrary";
import {SessionModel} from "../../core/SessionModel";

export var jlFilesDir: string = __dirname + "/../jl"


export function createTestSessionModel(): SessionModel {
  let sessionModel = new SessionModel()
  let moduleLibrary = sessionModel.moduleLibrary
  let state = new LibrarySerialized()
  state.loadPaths.push("some path") // prevents querying to julia
  state.serializedLines["Base"] = {}
  state.serializedLines["Core"] = {}
  moduleLibrary.initializeFromSerialized(state)
  return sessionModel
}
