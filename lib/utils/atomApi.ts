"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import * as tok from "../tokens/Token"
import * as atomModule from "atom"

export function toAtomPoint(pt: tok.Point) {
  return new atomModule.Point(pt.row, pt.column)
}

export function toAtomRange(range: tok.Range) {
  return new atomModule.Range(toAtomPoint(range.start), toAtomPoint(range.end))
}


export function toPoint(pt): tok.Point {
  return new tok.Point(pt.row, pt.column)
}

export function toRange(range): tok.Range {
  return new tok.Range(toPoint(range.start), toPoint(range.end))
}


var mockedOpenFiles: string[] = null
export function mockOpenFiles(openFiles: string[]) {
  mockedOpenFiles = openFiles
}
export function unmockOpenFiles() {
  mockedOpenFiles = null
}
export function atomGetOpenFiles(): string[] {
  if (mockedOpenFiles !== null) return mockedOpenFiles
  let paths = []
  let editors = atom.workspace.getTextEditors()
  for (let editor of editors) {
    paths.push(editor.getPath())
  }

  return paths
}
