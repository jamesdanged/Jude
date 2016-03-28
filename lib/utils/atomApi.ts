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


var mockOpenFiles: string[] = null
export function setMockOpenFiles(openFiles: string[]) {
  mockOpenFiles = openFiles
}
export function atomGetOpenFiles(): string[] {
  if (mockOpenFiles !== null) return mockOpenFiles
  let paths = []
  let editors = atom.workspace.getTextEditors()
  for (let editor of editors) {
    paths.push(editor.getPath())
  }

  return paths
}
