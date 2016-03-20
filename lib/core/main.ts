"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {ModuleLibrary} from "./ModuleLibrary";
import {Controller} from "./Controller";
import {SessionModel} from "./SessionModel";


var gParseController = new Controller()


class MainObject {
  constructor() {
  }

  activate(state) {

    let moduleLibrary = gParseController.sessionModel.moduleLibrary
    if (state !== null) {
      if ("moduleLibrary" in state) {
        let libState = state["moduleLibrary"]
        if ("loadPaths" in libState) {
          moduleLibrary.loadPaths = libState["loadPaths"]
        }
        if ("serializedLines" in libState) {
          moduleLibrary.serializedLines = libState["serializedLines"]
        }
      }
    }

    // Allow window to load before performing main thread blocking operations
    window.setTimeout(() => {
        gParseController.initalizeAsync()
    })
  }

  serialize() {
    let libState = gParseController.sessionModel.moduleLibrary.serialize()
    return { moduleLibrary: libState}
  }

  deactivate(state) {
    gParseController.subscriptions.dispose()
    gParseController.dirWatcher.close()
  }

  provideLinter() {
    return {
      name: "Julia",
      grammarScopes: ["source.julia"],
      scope: "file",
      lintOnFly: true,
      lint: gParseController.lint.bind(gParseController)
    }
  }

  provideAutocomplete() {
    return gParseController.autocompleter
  }
}



module.exports = new MainObject()






