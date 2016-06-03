"use strict"

import {throwErrorFromTimeout} from "../utils/assert";
import {logElapsed} from "../utils/taskUtils";
import {getAllFilesInAllSubDirectories} from "../utils/fileUtils";
import {resolveScopesInWorkspaceInvolvingFile} from "../nameResolution/resolveFullWorkspace";
import * as nodepath from "path"
import {SessionModel} from "./SessionModel";
import {runDelayed} from "../utils/taskUtils";
import {parseFile} from "../parseTree/parseFile";
import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {AssertError} from "../utils/assert";
import {ModuleDefNode} from "../parseTree/nodes";


export type ProjectFilesHash = {[path:string]: string}

export async function parseFullWorkspaceAsync(sessionModel: SessionModel) {
  sessionModel.parseSet.reset()

  let t0 = Date.now()
  let allContents = await loadProjectFiles()
  let t1 = Date.now()
  logElapsed("Successfully read project files from disk: " + (t1 - t0) + " ms")

  // parse all the files into expression trees
  t0 = Date.now()
  for (let path in allContents) {
    let fileContents = allContents[path]

    // break into smaller tasks to allow smooth GUI interaction
    await runDelayed(() => {
      sessionModel.parseSet.createEntriesForFile(path)
      parseFile(path, fileContents, sessionModel)
    })
  }
  t1 = Date.now()
  logElapsed("Parsed expression trees: " + (t1 - t0) + " ms")

  await resolveFullWorkspaceAsync(sessionModel)

  // report parse errors to console
  for (let path in sessionModel.parseSet.errors) {
    let errorSet = sessionModel.parseSet.errors[path]
    for (let err of errorSet.parseErrors) {
      console.log("Parse error in " + path + ":\n", err)
      //console.log(err.detailedMessage)
      //console.error("Parse error in " + path + ":\n", err)
      //console.error(err.detailedMessage)
      //throwErrorFromTimeout(err)
    }
  }

  //console.log("Reparsed whole workspace.")
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
  logElapsed("Reparsed one file: " + (t1 - t0) + " ms")

  // If module declaration involved after, also must reparse whole workspace.
  // The node object stays the same, just its contents changed.
  if (fileLevelNode.expressions.findIndex((o) => { return o instanceof ModuleDefNode}) >= 0) mustReparseFullWorkspace = true

  if (mustReparseFullWorkspace) {
    await resolveFullWorkspaceAsync(sessionModel)
  } else {
    await resolveScopesInWorkspaceInvolvingFile(path, sessionModel)
  }

  // report parse errors to console
  let errorSet = sessionModel.parseSet.errors[path]
  for (let err of errorSet.parseErrors) {
    console.log("Parse error in " + path + ":\n", err)
    //console.log(err.detailedMessage)
    //console.error("Parse error in " + path + ":\n", err)
    //console.error(err.detailedMessage)
    //throwErrorFromTimeout(err)
  }

}




/**
 * Loads all .jl files in project.
 * @returns Hash path -> contents
 */
async function loadProjectFiles() {
  if (mockedProjectFiles !== null) return mockedProjectFiles

  let projectDirs = atom.project.getDirectories()

  let allContents = {}

  for (let dir of projectDirs) {
    let fileSet = await getAllFilesInAllSubDirectories(dir)

    // read all their contents
    // node doesn't like too many files open simultaneously. Just read one by one.
    for (let file of fileSet) {
      let path = await file.getRealPath()
      if (nodepath.extname(path) === ".jl") {
        allContents[path] = await file.read()
      }
    }
  }

  return allContents
}

var mockedProjectFiles: ProjectFilesHash = null
export function mockProjectFiles(mock: ProjectFilesHash): void {
  mockedProjectFiles = mock
}
export function unmockProjectFiles(): void {
  mockedProjectFiles = null
}
