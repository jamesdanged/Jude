"use strict"

import {createStringSet} from "../../utils/StringSet";
import {addToSet} from "../../utils/StringSet";
import {VariableResolve} from "../../nameResolution/Resolve";
import {LibrarySerialized} from "../../core/ModuleLibrary";
import {SessionModel} from "../../core/SessionModel";
import {Token} from "../../tokens/Token";

export var jlFilesDir: string = __dirname + "/../jl"


export function createTestSessionModel(): SessionModel {
  let sessionModel = new SessionModel()
  let moduleLibrary = sessionModel.moduleLibrary
  let state = new LibrarySerialized()
  state.loadPaths.push("some path") // prevents querying to julia
  state.serializedLines["Base"] = {}
  state.serializedLines["Core"] = {}
  moduleLibrary.initializeFromSerialized(state)

  // put some basic types in
  let core = moduleLibrary.modules["Core"]
  let namesToAdd = ["Int", "Float64", "println"]
  for (let name of namesToAdd) {
    core.names[name] = new VariableResolve(Token.createEmptyIdentifier(name), null)
  }
  core.exportedNames = createStringSet(namesToAdd)

  return sessionModel
}
