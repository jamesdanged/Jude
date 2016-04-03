"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />

import {ExternalModuleResolve} from "../nameResolution/Resolve";
import {AssertError} from "../utils/assert";
import {getFromHash} from "../utils/arrayUtils";
import {Point} from "../tokens/Token";
import {SessionModel} from "./SessionModel";
import {LocalModuleResolve} from "../nameResolution/Resolve";
import {toPoint} from "../utils/atomApi";
import * as nodepath from "path"
import {AutoCompleteOnDidInsertSuggestionOptions} from "./Autocompleter";
import {FunctionDefNode} from "../parseTree/nodes";
import {toAtomPoint} from "../utils/atomApi";
import {last} from "../utils/arrayUtils";
import {IdentifierNode} from "../parseTree/nodes";
import {Resolve} from "../nameResolution/Resolve";
import {TypeResolve} from "../nameResolution/Resolve";
import {VariableResolve} from "../nameResolution/Resolve";
import {FunctionResolve} from "../nameResolution/Resolve";
import {MacroResolve} from "../nameResolution/Resolve";
import {ImportedResolve} from "../nameResolution/Resolve";


export class JumpController {

  jumpHistory: JumpPoint[]
  currJumpHistoryIndex: number
  currentlyJumping: boolean

  // used to track when changing tabs, since the event doesn't tell us the previous cursor position, just its new one
  lastKnownCursorPosition: JumpPoint

  constructor(public sessionModel: SessionModel) {
    this.jumpHistory = []
    this.currJumpHistoryIndex = -1
    this.lastKnownCursorPosition = null
    this.currentlyJumping = false
  }

  async jumpToDefinitionAsync(editor) {  // returns suggestion array
    let path = editor.getPath()
    let identifiers = getFromHash(this.sessionModel.parseSet.identifiers, path)

    let atomPoint = editor.getCursorBufferPosition()
    let point = toPoint(atomPoint)
    let identNode: IdentifierNode = null
    let resolve: Resolve = null
    for (let kv of identifiers.map) {
      let iIdentNode: IdentifierNode = kv[0]
      let iResolve: Resolve = kv[1]
      if (iIdentNode.token.range.pointWithin(point)) {
        identNode = iIdentNode
        resolve = iResolve
        break
      }
    }
    if (resolve === null) {
      console.log("Must select an identifier.")
      return []
    }
    if (!resolve.resolvesInWorkspace()) {
      console.log(identNode.name + " is not in workspace.")
      return []
    }
    if (resolve instanceof ImportedResolve) resolve = (resolve as ImportedResolve).ref


    let destPath = null
    let destPoint = null
    if (resolve instanceof TypeResolve) {
      destPath = resolve.filePath
      destPoint = resolve.typeDefNode.name.token.range.start
    } else if (resolve instanceof VariableResolve) {
      destPath = resolve.filePath
      destPoint = resolve.token.range.start
    } else if (resolve instanceof FunctionResolve) {

      let paths: string[] = []
      let nodes: FunctionDefNode[] = []
      for (let tup of resolve.functionDefs) {
        let iPath = tup[0]
        let funcDefNode = tup[1]
        if (iPath !== null) {
          paths.push(iPath)
          nodes.push(funcDefNode)
        }
      }
      if (paths.length === 0) {
        console.log(identNode.name + " is not in project.")
        return []
      } else if (paths.length === 1) {
        destPath = paths[0]
        destPoint = nodes[0].name[0].token.range.start
      } else {
        console.log("There are " + paths.length + " functions in project matching the signature.")
        let suggestions = []
        for (let tupIndex = 0; tupIndex < paths.length; tupIndex++) {
          let path = paths[tupIndex]
          let funcDefNode = nodes[tupIndex]
          let sig = funcDefNode.toSignatureString()

          suggestions.push({
            text: sig,
            //displayText: sig,
            type: "function",
            //leftLabel: "Any",
            rightLabel: nodepath.basename(path),
            description: sig,
            node: funcDefNode,
            destPath: path,
            isJumpToDefinition: true
          })
        }

        //console.error(identNode.name + " has multiple definitions.") // TODO
        return suggestions
      }
    } else if (resolve instanceof MacroResolve) {
      destPath = resolve.filePath
      destPoint = resolve.node.name.token.range.start
    } else if (resolve instanceof LocalModuleResolve) {
      destPath = resolve.filePath
      destPoint = resolve.moduleDefNode.name.token.range.start
    } else if (resolve instanceof ExternalModuleResolve) {
      console.log("Not supported for modules outside workspace.")
      return []
    } else {
      throw new AssertError("")
    }

    await this.jumpAsync(destPath, destPoint)
    return []
  }

  async onAutoCompleteDidInsertSuggestionsAsync(options: AutoCompleteOnDidInsertSuggestionOptions) {

    options.editor.undo()

    let destPath = options.suggestion.destPath
    let node: FunctionDefNode = options.suggestion.node
    if (!node) return
    if (!destPath) return
    let destPoint = last(node.name).token.range.start
    await this.jumpAsync(destPath, destPoint)
  }

  async jumpAsync(destPath: string, destPoint: Point) {
    let destAtomPoint = toAtomPoint(destPoint)
    let oldPoint = this.getCurrentPosition()
    this.currentlyJumping = true
    try {
      let matchingEditor = await atom.workspace.open(destPath)
      matchingEditor.setCursorBufferPosition(destAtomPoint)
      matchingEditor.scrollToCursorPosition()
      let newPoint = this.getCurrentPosition()

      if (oldPoint) this.addToJumpHistory(oldPoint)
      if (newPoint) this.addToJumpHistory(newPoint)

      if (this.jumpHistory.length > 0) {
        this.currJumpHistoryIndex = this.jumpHistory.length - 1
      }
    } catch (err) {
      console.error("Error opening " + destPath + ": ", err)
    }
    this.currentlyJumping = false
  }

  async goBackAsync() {
    if (this.jumpHistory.length === 0) return
    if (this.currJumpHistoryIndex === 0) return

    let index = this.currJumpHistoryIndex - 1
    let jumpPoint = this.jumpHistory[index]
    let destPath = jumpPoint.path
    let destPoint = toAtomPoint(jumpPoint.point)
    try {
      let matchingEditor = await atom.workspace.open(destPath)
      matchingEditor.setCursorBufferPosition(destPoint)
      matchingEditor.scrollToCursorPosition()
      this.currJumpHistoryIndex = index
    } catch(err) {
      console.error("Error opening " + destPath + ": ", err)
    }
  }

  async goForwardAsync() {
    if (this.jumpHistory.length < 2) return
    if (this.currJumpHistoryIndex === this.jumpHistory.length - 1) return

    let index = this.currJumpHistoryIndex + 1
    let jumpPoint = this.jumpHistory[index]
    let destPath = jumpPoint.path
    let destPoint = toAtomPoint(jumpPoint.point)
    try {
      let matchingEditor = await atom.workspace.open(destPath)
      matchingEditor.setCursorBufferPosition(destPoint)
      matchingEditor.scrollToCursorPosition()
      this.currJumpHistoryIndex = index
    } catch(err) {
      console.error("Error opening " + destPath + ": ", err)
    }
  }




  /**
   * Returns the current position as a JumpPoint or null if a valid editor not open.
   */
  getCurrentPosition(): JumpPoint {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) return null
    let path = editor.getPath()
    if (!path) return null
    let atomPoint = editor.getCursorBufferPosition()
    let point = toPoint(atomPoint)
    return new JumpPoint(path, point)
  }

  updateLastKnownCursorPosition(): void {
    let currPos = this.getCurrentPosition()
    if (currPos !== null) {
      //console.log("updating cursor to (" + currPos.point.row + "," + currPos.point.column + ")")
      this.lastKnownCursorPosition = currPos
    }
  }

  /**
   * Adds point in history.
   * Only add if doesn't match last point.
   * Also truncates anything forward in the history.
   */
  addToJumpHistory(point: JumpPoint): void {
    if (this.jumpHistory.length > 0) {
      let idx = this.currJumpHistoryIndex
      let lastPoint = this.jumpHistory[idx]
      if (!lastPoint.equals(point)) {
        let newIdx = idx + 1
        this.jumpHistory.splice(newIdx, this.jumpHistory.length - newIdx, point)
        this.currJumpHistoryIndex = newIdx
      }
    } else {
      this.jumpHistory.push(point)
      this.currJumpHistoryIndex = 0
    }
  }


  onSwitchedTab(): void {
    // simply logs the position in the jump history

    let currPos = this.getCurrentPosition()
    if (!currPos) return // not an editor tab or not a saved file
    //console.log("switched tab to (" + currPos.point.row + "," + currPos.point.column + ")")

    if (this.currentlyJumping) return

    if (this.lastKnownCursorPosition !== null) {
      this.addToJumpHistory(this.lastKnownCursorPosition)
    }
    this.addToJumpHistory(currPos)
  }


}


class JumpPoint {
  constructor(public path: string, public point: Point) {}

  equals(other: JumpPoint): boolean {
    return this.path === other.path && this.point.equals(other.point)
  }
}
