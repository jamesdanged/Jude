"use strict"


import {SessionModel} from "./SessionModel";
import {throwErrorFromTimeout} from "../utils/assert";
import {AssertError} from "../utils/assert";
import {toAtomRange} from "../utils/atomApi";
import {refreshFileAsync} from "./parseWorkspace";

// TODO need to warn/document that sometimes linting doesn't work
// and need to switch between tabs at least once to show any lints??
export class Linter {

  constructor(public sessionModel: SessionModel) {
  }

  lint(path: string): any[] {

    let parseSet = this.sessionModel.parseSet

    if (!(path in parseSet.fileLevelNodes)) throw new AssertError("")
    let errors = parseSet.errors[path]
    if (!errors) throw new AssertError("")

    let lintMessages = []
    for (let err of errors.parseErrors) {
      lintMessages.push({
        type: "Error",
        text: err.message,
        range: toAtomRange(err.token.range),
        filePath: path
      })
    }
    for (let err of errors.nameErrors) {
      lintMessages.push({
        type: "Warning",
        text: err.message,
        range: toAtomRange(err.token.range),
        filePath: path
      })
    }

    return lintMessages
  }

}



