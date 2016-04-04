"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />
/// <reference path="./../defs/atom_package_deps/atom-package-deps.d.ts" />

import {ConfigSchema} from "./ConfigSchema";
import {ModuleLibrary} from "./ModuleLibrary";
import {Controller} from "./Controller";
import {SessionModel} from "./SessionModel";
import {runDelayed} from "../utils/taskUtils";
import * as atomPackageDeps from "atom-package-deps"

var gParseController: Controller = null


class MainObject {
  config
  constructor() {
    this.config = new ConfigSchema()
  }

  activate(state: any) {
    gParseController = new Controller(state)

    // Allow window to load before performing main thread blocking operations
    runDelayed(async () => {
      await atomPackageDeps.install("Jude")
    })
  }

  serialize() {
    let libState = gParseController.sessionModel.moduleLibrary.serialize()
    return { moduleLibrary: libState}
  }

  deactivate(state) {
    gParseController.subscriptions.dispose()
    if (gParseController.dirWatcher) {
      gParseController.dirWatcher.close()
    }
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






