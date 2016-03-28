"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {AssertError} from "./assert";
import * as nodepath from "path"

// these are atom API related file and dir objects




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



