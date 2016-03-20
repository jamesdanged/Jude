"use strict"

import {resolveScopesInWorkspaceInvolvingFile} from "../nameResolution/resolveFullWorkspace";
import * as nodepath from "path"
import {loadAllFilesInAllProjectDirs} from "../utils/fileUtils";
import {SessionModel} from "./SessionModel";
import {runDelayed} from "../utils/taskUtils";
import {parseFile} from "../parseTree/parseFile";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {refreshPrefixTreesAsync} from "./ModuleLibrary";
import {AssertError} from "../utils/assert";
import {ModuleDefNode} from "../parseTree/nodes";



export async function parseFullWorkspaceAsync(sessionModel: SessionModel) {
  sessionModel.parseSet.reset()

  let t0 = Date.now()
  let multiDirsContents = await loadAllFilesInAllProjectDirs()
  let t1 = Date.now()
  console.log("Successfully read project files from disk: " + (t1 - t0) + " ms")

  // parse all the files into expression trees
  t0 = Date.now()
  for (let dirContents of multiDirsContents) {

    // create parse trees
    for (let tup of dirContents) {
      let path = tup[0]
      let fileContents = tup[1]

      // break into smaller tasks to allow smooth GUI interaction
      await runDelayed(() => {
        sessionModel.parseSet.createEntriesForFile(path)
        parseFile(path, fileContents, sessionModel)
      })
    }
  }
  t1 = Date.now()
  console.log("Parsed expression trees: " + (t1 - t0) + " ms")

  await resolveFullWorkspaceAsync(sessionModel)
  await refreshPrefixTreesAsync(sessionModel.moduleLibrary, true)

  // report parse errors to console
  for (let path in sessionModel.parseSet.errors) {
    let errorSet = sessionModel.parseSet.errors[path]
    for (let err of errorSet.parseErrors) {
      console.error(path, err)
    }
  }

  console.log("Done reparsing.")
}


export async function refreshFileAsync(path: string, fileContents: string, sessionModel: SessionModel) {
  if (nodepath.extname(path) !== ".jl") throw new AssertError("")

  let mustReparseFullWorkspace = false

  // If module declaration involved before, must reparse whole workspace.
  let fileLevelNode = sessionModel.parseSet.fileLevelNodes[path]
  if (!fileLevelNode) throw new AssertError("")
  if (fileLevelNode.expressions.findIndex((o) => { return o instanceof ModuleDefNode}) >= 0) mustReparseFullWorkspace = true

  let t0 = Date.now()
  parseFile(path, fileContents, sessionModel)
  let t1 = Date.now()
  console.log("Reparsed one file: " + (t1 - t0) + " ms")

  // If module declaration involved after, also must reparse whole workspace.
  // The node object stays the same, just its contents changed.
  if (fileLevelNode.expressions.findIndex((o) => { return o instanceof ModuleDefNode}) >= 0) mustReparseFullWorkspace = true

  if (mustReparseFullWorkspace) {
    await resolveFullWorkspaceAsync(sessionModel)
  } else {
    await resolveScopesInWorkspaceInvolvingFile(path, sessionModel)
  }

  await refreshPrefixTreesAsync(sessionModel.moduleLibrary, false)
}







