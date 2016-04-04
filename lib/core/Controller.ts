"use strict"

/// <reference path="./../defs/atom/atom.d.ts" />
/// <reference path="./../defs/chokidar/chokidar.d.ts" />

import {resolveFullWorkspaceAsync} from "../nameResolution/resolveFullWorkspace";
import {JumpController} from "./JumpController";
import {Linter} from "./Linter";
import {ModuleScope} from "../nameResolution/Scope";
import {last} from "../utils/arrayUtils";
import {AssertError} from "../utils/assert";
import {runDelayed} from "../utils/taskUtils";
import {ParseSet} from "./SessionModel";
import {parseFullWorkspaceAsync} from "./parseWorkspace";
import {FunctionDefNode} from "../parseTree/nodes";
import {toPoint} from "../utils/atomApi";
import {toAtomRange} from "../utils/atomApi";
import {toAtomPoint} from "../utils/atomApi";
import {throwErrorFromTimeout} from "../utils/assert";
import {NameError} from "../utils/errors";
import {InvalidParseError} from "../utils/errors";
import {SessionModel} from "./SessionModel";
import {Range} from "../tokens/Token";
import {IdentifierNode} from "../parseTree/nodes";
import {ModuleLibrary} from "./ModuleLibrary";
import * as nodepath from "path"
import {ModuleDefNode} from "../parseTree/nodes";
import {refreshFileAsync} from "./parseWorkspace";
import {Autocompleter} from "./Autocompleter";
import chokidar = require("chokidar")
import fs = require("fs")
import {TaskQueue} from "../utils/taskUtils";
import * as atomModule from "atom"





// TODO
// symbol quote blocks, eg ":( ... )", "quote ... end"
// certain operators treated as identifiers in certain circumstances
//   eg map(arr, +)
//   [+, -]
//   (+, -)
// @everywhere include(...)
// @Base.time vs Base.@time
// m == 0 && return x
// Ignore field after indexing, eg arr[i].x
// Ensure Base.Mmap.mmap shows popup
// for ii in 1:m, jj in 1:n
// .0
// handle docstrings
// display docstrings in autocomplete and jump to definition
// Type one char after module name, does not show autocomplete results?

// jump to definition for includes
// macros in module in workspace, ie MyMod.@my_macro name not being resolved.
// test make sure full reparse when project folder changes. Esp if no jl files loaded in session to begin with.
// Jump to definition for function with module qualifier, eg Mod1.func(), should show definitions from that module, not from the current scope.
// log identifier for target of an alias type
// Autocomplete by matching alignments, maybe ignoring underscore
// Do not autocomplete during comments
// Handle situation where an external library was added into workspace, but still treated as external
// Ctrl space should display signature information for functions that have info in methods(...), but don't have a file location, eg mmap
// Seems to not be running reparse until save, eg type a little, then try to jump to definition of word just typed. Make sure lint on fly is always on.

/**
 * Handles interactions with the editor. Responds to user activity and file system changes.
 */
export class Controller {

  sessionModel: SessionModel
  linter: Linter
  autocompleter: Autocompleter
  jumper: JumpController
  subscriptions // CompositeDisposable
  dirWatcher: fs.FSWatcher
  taskQueue: TaskQueue     // coordinates resolves so that they never run two at the same time. All reparses/resolves must be run through the queue.
  serializedState: any
  initializedPromise: Promise<void> | boolean

  get moduleLibrary(): ModuleLibrary { return this.sessionModel.moduleLibrary }

  constructor(state: any) {
    this.sessionModel = new SessionModel()
    this.linter = new Linter(this.sessionModel)
    this.jumper = new JumpController(this.sessionModel)
    this.autocompleter = new Autocompleter(this.sessionModel, this.jumper)
    this.subscriptions = new atomModule.CompositeDisposable()
    this.dirWatcher = null
    this.taskQueue = new TaskQueue()
    this.serializedState = state
    this.initializedPromise = false  // the first lint call will trigger initialization of controller
  }

  async initalizeAsync() {

    let that = this

    let commandHandler = atom.commands.add("atom-workspace", "jude:reparse-all", this.reparseAllFilesAsync.bind(this))
    this.subscriptions.add(commandHandler)

    commandHandler = atom.commands.add("atom-workspace", "jude:reload-modules-from-julia", this.reloadModulesFromJuliaAndReparseAsync.bind(this))
    this.subscriptions.add(commandHandler)

    commandHandler = atom.commands.add("atom-workspace", "jude:go-back", this.goBackAsync.bind(this))
    this.subscriptions.add(commandHandler)

    commandHandler = atom.commands.add("atom-workspace", "jude:go-forward", this.goForwardAsync.bind(this))
    this.subscriptions.add(commandHandler)

    let observeHandler = atom.workspace.observeTextEditors((editor) => {
      that.onNewEditor(editor)
    })
    this.subscriptions.add(observeHandler)

    observeHandler = atom.project.onDidChangePaths(async () => {
      await that.refreshDirWatcher()
      await that.reparseAllFilesAsync()
    })
    this.subscriptions.add(observeHandler)

    observeHandler = atom.workspace.onDidChangeActivePaneItem((item) => {
      that.onDidChangeActivePaneItem(item)
    })
    this.subscriptions.add(observeHandler)

    // watch project folders for changes
    await this.refreshDirWatcher()

    try {
      if (this.serializedState) {
        if ("moduleLibrary" in this.serializedState) {
          this.moduleLibrary.initializeFromSerialized(this.serializedState.moduleLibrary)
        }
      }
      await this.reparseAllFilesAsync()
    } catch (err) {
      throwErrorFromTimeout(err)  // better error reporting than just outputting to console hidden away
    }
  }

  async refreshDirWatcher() {
    await this.taskQueue.addToQueueAndRun(() => {
      if (this.dirWatcher !== null) {
        this.dirWatcher.close()
        this.dirWatcher = null
      }

      let that = this
      let projectDirs = atom.project.getDirectories().map((o) => {
        return o.getRealPathSync()
      })
      let dirWatcher = this.dirWatcher = chokidar.watch(projectDirs, {ignored: /[\/\\]\./})
      return new Promise((resolve, reject) => {
        dirWatcher.on("ready", () => {
          dirWatcher.on('add', (path) => {
            console.log("Added file: " + path)
            that.reparseAllFilesAsync()
          })
          dirWatcher.on('addDir', (path) => {
            console.log("Added dir: " + path)
            that.reparseAllFilesAsync()
          })
          dirWatcher.on('unlink', (path) => {
            console.log("Removed file: " + path)
            that.reparseAllFilesAsync()
          })
          dirWatcher.on('unlinkDir', (path) => {
            console.log("Removed dir: " + path)
            that.reparseAllFilesAsync()
          })
          dirWatcher.on('change', async (path, stats) => {
            console.log("File updated: " + path)
            let file = new atomModule.File(path, false)
            if (!(await file.exists())) return
            let realPath = await file.getRealPath()
            if (!realPath) return
            if (nodepath.extname(realPath) !== ".jl") return
            let contents = await file.read()
            that.reparseFileAsync(realPath, contents)
          })
          resolve()
        })
      })
    })
  }

  async reparseAllFilesAsync() {
    let sessionModel = this.sessionModel
    await this.taskQueue.addToQueueAndRun(async () => {
      console.log("Reparsing all files.")
      await parseFullWorkspaceAsync(sessionModel)
    })
  }

  async reparseFileAsync(path: string, contents: string) {
    let sessionModel = this.sessionModel
    await this.taskQueue.addToQueueAndRun(async () => {
      //console.log("Reparsing file " + path)
      await refreshFileAsync(path, contents, sessionModel)
    })
  }


  async reloadModulesFromJuliaAndReparseAsync() {
    await this.moduleLibrary.refreshLoadPathsAsync()

    this.moduleLibrary.modules = {}
    this.moduleLibrary.workspaceModulePaths = {}

    await this.reparseAllFilesAsync()
  }


  onNewEditor(editor) {
    let jumper = this.jumper
    let watch = editor.onDidChangeCursorPosition(() => {
      jumper.updateLastKnownCursorPosition()
    })
    editor.onDidDestroy(() => {
      watch.dispose()
    })
  }


  async goBackAsync() {
    await this.jumper.goBackAsync()
  }
  async goForwardAsync() {
    await this.jumper.goForwardAsync()
  }
  async onDidChangeActivePaneItem(item) {
    this.jumper.onSwitchedTab()
    if (this.sessionModel.partiallyResolved) {
      // now is a good time to quickly re-resolve full workspace
      let sessionModel = this.sessionModel
      await this.taskQueue.addToQueueAndRun(async () => {
        await resolveFullWorkspaceAsync(sessionModel)
      })
    }
  }

  lint(editor): any[] | Promise<any[]> {
    //console.log("lint called")

    let path = editor.getPath()
    if (!path) return []  // unsaved file, ie when start a new atom window
    if (path.slice(-3) !== ".jl") {
      throwErrorFromTimeout(new AssertError("linter should not be called here"))
      return []
    }

    let that = this
    return new Promise<any[]>(async (resolve, reject) => {
      try {

        if (that.initializedPromise === false) {
          that.initializedPromise = that.initalizeAsync()
        }
        await that.initializedPromise

        if (!(path in that.sessionModel.parseSet.fileLevelNodes)) {
          console.log("File " + path + " not in workspace.")
          resolve([])
          return
        }
        // lint was called because of a change, so must reparse
        await that.reparseFileAsync(path, editor.getText())
        resolve(that.linter.lint(path))

      } catch (err) {
        console.error("unexpected error caught while linting: ", err)
        resolve([])
      }
    })
  }




  //markUpAllEditors() {
  //  let editors = atom.workspace.getTextEditors()
  //  this.markUpEditors(editors)
  //}


  //markUpEditors(editors: any[]): void {
  //  return
  //  for (let editor of editors) {
  //    //this.editors.push(editor)
  //
  //    let path = editor.getPath()
  //    if (!path) continue  // unsaved file, ie when start a new atom window
  //    if (path.slice(-3).toLowerCase() !== ".jl") continue
  //
  //    console.log("Decorating " + path)
  //
  //    let errors = this.sessionModel.getErrors(path)
  //    console.log("There are " + errors.nameErrors.length + " name errors and " + errors.parseErrors.length + " parse errors")
  //
  //    for (let parseError of errors.parseErrors) {
  //      throwErrorFromTimeout(parseError)
  //      //console.error(parseError)
  //      this.highlight(parseError.token.range, "red", editor)
  //      //let marker = editor.markBufferRange(toAtomRange(parseError.token.range), {})
  //      //let decor = editor.decorateMarker(marker, { type: "highlight", class: "highlight-red" })
  //    }
  //    for (let nameError of errors.nameErrors) {
  //      //throwErrorFromTimeout(nameError)
  //      this.highlight(nameError.token.range, "orange", editor)
  //      //let marker = editor.markBufferRange(toAtomRange(nameError.identifierToken.range), {})
  //      //let decor = editor.decorateMarker(marker, { type: "highlight", class: "highlight-orange" })
  //      //let decor = editor.decorateMarker(marker, { type: "line", class: "line-orange" })
  //    }
  //
  //
  //    let identifiers = this.sessionModel.getIdentifiers(path)
  //    console.log("There are " + identifiers.map.size + " identifiers")
  //
  //    identifiers.map.forEach((val, key) => {
  //      let identNode = key
  //      let resolve = val
  //
  //      if (resolve.resolvesInProject()) {
  //        this.highlight(identNode.token.range, "identifier", editor)
  //      } else {
  //        this.highlight(identNode.token.range, "library-identifier", editor)
  //      }
  //    })
  //  }
  //}


  //highlight(range: Range, classSuffix: string, editor: any): void {
  //  let marker = editor.markBufferRange(toAtomRange(range))
  //  let decor = editor.decorateMarker(marker, { type: "highlight", class: "highlight-" + classSuffix})
  //  this.allMarkers.push(marker)
  //}

}




