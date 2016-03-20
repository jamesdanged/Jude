"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {AssertError} from "./assert";
import * as nodepath from "path"

// these are atom API related file and dir objects

/**
 * Loads all .jl files.
 * @returns array of arrays with tuples [path, contents]
 */
export async function loadAllFilesInAllProjectDirs() {
  let projectDirs = atom.project.getDirectories()

  let projectDirsContents = []

  for (let dir of projectDirs) {
    // separate file set for each project dir
    let pathsAndContents = await loadAllFilesInProjectDir(dir)
    projectDirsContents.push(pathsAndContents)
  }

  return projectDirsContents
}

/**
 *
 * @returns Array with tuples: [path, contents] for all files
 */
export async function loadAllFilesInProjectDir(dir) {
  let fileSet = await getAllFilesInAllSubDirectories(dir)

  // read all their contents
  let filePathsAndContents = []
  // node doesn't like too many files open simultaneously. Just read one by one.
  for (let file of fileSet) {
    let path = await file.getRealPath()
    if (nodepath.extname(path) === ".jl") {
      let contents = await file.read()
      filePathsAndContents.push([path, contents])
    }
  }

  return filePathsAndContents
}



export async function getEntriesInDir(dir) {
  return await new Promise((resolve, reject) => {
    dir.getEntries((error, entries) => {
      if (error) {
        reject(error)
      } else {
        resolve(entries)
      }
    })
  })
}

export async function getAllFilesInAllSubDirectories(dir) {
  // could be done faster if launch all reads at same time and wait for response
  // but harder to program

  let files = []
  let dirsToSearch = []
  dirsToSearch.push(dir)

  while (dirsToSearch.length > 0) {
    let iDir = dirsToSearch.shift()
    let entries = (await getEntriesInDir(iDir)) as any[]
    for (let entry of entries) {
      if (entry.isFile()) {
        files.push(entry)
      } else if (entry.isDirectory()) {
        dirsToSearch.push(entry)
      } else {
        throw new AssertError("")
      }
    }
  }

  return files
}



