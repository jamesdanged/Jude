"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {ConfigSchema} from "./ConfigSchema";
import {ModuleLibrary} from "./ModuleLibrary";
import {Controller} from "./Controller";
import {SessionModel} from "./SessionModel";


var gParseController = new Controller()


class MainObject {
  config
  constructor() {
    this.config = new ConfigSchema()
  }

  activate(state: any) {

    // Allow window to load before performing main thread blocking operations
    window.setTimeout(() => {
        gParseController.initalizeAsync(state)
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






