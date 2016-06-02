"use strict"

import {createStringSet} from "../../utils/StringSet";
import {addToSet} from "../../utils/StringSet";
import {VariableResolve} from "../../nameResolution/Resolve";
import {LibrarySerialized} from "../../core/ModuleLibrary";
import {SessionModel} from "../../core/SessionModel";
import {Token} from "../../tokens/Token";
import {unmockRunDelayed} from "../../utils/taskUtils";
import {unmockOpenFiles} from "../../utils/atomApi";
import {unmockProjectFiles} from "../../core/parseWorkspace";
import {mockRunDelayed} from "../../utils/taskUtils";
import {mockOpenFiles} from "../../utils/atomApi";
import {mockProjectFiles} from "../../core/parseWorkspace";

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
  // Simply declare these as variables rather than functions or types, just as a shortcut.
  let core = moduleLibrary.modules["Core"]
  let namesToAdd = ["Int", "Float64", "println", "Tuple", "Dict", "rand"]
  for (let name of namesToAdd) {
    core.names[name] = new VariableResolve(Token.createEmptyIdentifier(name), null)
  }
  core.exportedNames = createStringSet(namesToAdd)

  return sessionModel
}


export function mockAll(filesAndContents: {[path:string]:string}): void {
  mockProjectFiles(filesAndContents)
  let paths = []
  for (let path in filesAndContents) {
    paths.push(path)
  }
  mockOpenFiles(paths)
  mockRunDelayed()
}

export function unmockAll(): void {
  unmockProjectFiles()
  unmockOpenFiles()
  unmockRunDelayed()
}
