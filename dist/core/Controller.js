"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/// <reference path="./../defs/atom/atom.d.ts" />
/// <reference path="./../defs/chokidar/chokidar.d.ts" />
const resolveFullWorkspace_1 = require("../nameResolution/resolveFullWorkspace");
const JumpController_1 = require("./JumpController");
const Linter_1 = require("./Linter");
const assert_1 = require("../utils/assert");
const parseWorkspace_1 = require("./parseWorkspace");
const assert_2 = require("../utils/assert");
const SessionModel_1 = require("./SessionModel");
const nodepath = require("path");
const parseWorkspace_2 = require("./parseWorkspace");
const Autocompleter_1 = require("./Autocompleter");
const chokidar = require("chokidar");
const taskUtils_1 = require("../utils/taskUtils");
const atomModule = require("atom");
// TODO
// symbol quote blocks, eg ":( ... )", "quote ... end"
// certain operators treated as identifiers in certain circumstances
//   eg map(arr, +)
//   [+, -]
//   (+, -)
// @everywhere include(...)
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
// when remove folder from workspace, need to remove from module library
// Limit autocomplete results to exported names
/**
 * Handles interactions with the editor. Responds to user activity and file system changes.
 */
class Controller {
    constructor(state) {
        this.sessionModel = new SessionModel_1.SessionModel();
        this.linter = new Linter_1.Linter(this.sessionModel);
        this.jumper = new JumpController_1.JumpController(this.sessionModel);
        this.autocompleter = new Autocompleter_1.Autocompleter(this.sessionModel, this.jumper, this);
        this.subscriptions = new atomModule.CompositeDisposable();
        this.dirWatcher = null;
        this.taskQueue = new taskUtils_1.TaskQueue();
        this.serializedState = state;
        this.initializedPromise = false; // the first lint call will trigger initialization of controller
    }
    get moduleLibrary() { return this.sessionModel.moduleLibrary; }
    initalizeAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            let that = this;
            let commandHandler = atom.commands.add("atom-workspace", "jude:reparse-all", this.reparseAllFilesAsync.bind(this));
            this.subscriptions.add(commandHandler);
            commandHandler = atom.commands.add("atom-workspace", "jude:reload-modules-from-julia", this.reloadModulesFromJuliaAndReparseAsync.bind(this));
            this.subscriptions.add(commandHandler);
            commandHandler = atom.commands.add("atom-workspace", "jude:go-back", this.goBackAsync.bind(this));
            this.subscriptions.add(commandHandler);
            commandHandler = atom.commands.add("atom-workspace", "jude:go-forward", this.goForwardAsync.bind(this));
            this.subscriptions.add(commandHandler);
            let observeHandler = atom.workspace.observeTextEditors((editor) => {
                that.onNewEditor(editor);
            });
            this.subscriptions.add(observeHandler);
            observeHandler = atom.project.onDidChangePaths(() => __awaiter(this, void 0, void 0, function* () {
                yield that.refreshDirWatcher();
                yield that.reparseAllFilesAsync();
            }));
            this.subscriptions.add(observeHandler);
            observeHandler = atom.workspace.onDidChangeActivePaneItem((item) => {
                that.onDidChangeActivePaneItem(item);
            });
            this.subscriptions.add(observeHandler);
            // watch project folders for changes
            yield this.refreshDirWatcher();
            try {
                if (this.serializedState) {
                    if ("moduleLibrary" in this.serializedState) {
                        this.moduleLibrary.initializeFromSerialized(this.serializedState.moduleLibrary);
                    }
                }
                yield this.reparseAllFilesAsync();
            }
            catch (err) {
                assert_2.throwErrorFromTimeout(err); // better error reporting than just outputting to console hidden away
            }
        });
    }
    refreshDirWatcher() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.taskQueue.addToQueueAndRun(() => {
                if (this.dirWatcher !== null) {
                    this.dirWatcher.close();
                    this.dirWatcher = null;
                }
                let that = this;
                let projectDirs = atom.project.getDirectories().map((o) => {
                    return o.getRealPathSync();
                });
                let dirWatcher = this.dirWatcher = chokidar.watch(projectDirs, { ignored: /[\/\\]\./ });
                return new Promise((resolve, reject) => {
                    dirWatcher.on("ready", () => {
                        dirWatcher.on('add', (path) => {
                            console.log("Added file: " + path);
                            that.reparseAllFilesAsync();
                        });
                        dirWatcher.on('addDir', (path) => {
                            console.log("Added dir: " + path);
                            that.reparseAllFilesAsync();
                        });
                        dirWatcher.on('unlink', (path) => {
                            console.log("Removed file: " + path);
                            that.reparseAllFilesAsync();
                        });
                        dirWatcher.on('unlinkDir', (path) => {
                            console.log("Removed dir: " + path);
                            that.reparseAllFilesAsync();
                        });
                        dirWatcher.on('change', (path, stats) => __awaiter(this, void 0, void 0, function* () {
                            console.log("File updated: " + path);
                            let file = new atomModule.File(path, false);
                            if (!(yield file.exists()))
                                return;
                            let realPath = yield file.getRealPath();
                            if (!realPath)
                                return;
                            if (nodepath.extname(realPath) !== ".jl")
                                return;
                            let contents = yield file.read();
                            that.reparseFileAsync(realPath, contents);
                        }));
                        resolve();
                    });
                });
            });
        });
    }
    reparseAllFilesAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionModel = this.sessionModel;
            yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, void 0, function* () {
                console.log("Reparsing all files.");
                yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
            }));
        });
    }
    reparseFileAsync(path, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionModel = this.sessionModel;
            yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, void 0, function* () {
                //console.log("Reparsing file " + path)
                yield parseWorkspace_2.refreshFileAsync(path, contents, sessionModel);
            }));
        });
    }
    reloadModulesFromJuliaAndReparseAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.moduleLibrary.refreshLoadPathsAsync();
            this.moduleLibrary.modules = {};
            this.moduleLibrary.workspaceModulePaths = {};
            yield this.reparseAllFilesAsync();
        });
    }
    onNewEditor(editor) {
        let jumper = this.jumper;
        let watch = editor.onDidChangeCursorPosition(() => {
            jumper.updateLastKnownCursorPosition();
        });
        editor.onDidDestroy(() => {
            watch.dispose();
        });
    }
    goBackAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.jumper.goBackAsync();
        });
    }
    goForwardAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.jumper.goForwardAsync();
        });
    }
    onDidChangeActivePaneItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            this.jumper.onSwitchedTab();
            if (this.sessionModel.partiallyResolved) {
                // now is a good time to quickly re-resolve full workspace
                let sessionModel = this.sessionModel;
                yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, void 0, function* () {
                    yield resolveFullWorkspace_1.resolveFullWorkspaceAsync(sessionModel);
                }));
            }
        });
    }
    lint(editor) {
        //console.log("lint called")
        let path = editor.getPath();
        if (!path)
            return []; // unsaved file, ie when start a new atom window
        if (path.slice(-3) !== ".jl") {
            assert_2.throwErrorFromTimeout(new assert_1.AssertError("linter should not be called here"));
            return [];
        }
        let that = this;
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (that.initializedPromise === false) {
                    that.initializedPromise = that.initalizeAsync();
                }
                yield that.initializedPromise;
                if (!(path in that.sessionModel.parseSet.fileLevelNodes)) {
                    console.log("File " + path + " not in workspace.");
                    resolve([]);
                    return;
                }
                // lint was called because of a change, so must reparse
                yield that.reparseFileAsync(path, editor.getText());
                resolve(that.linter.lint(path));
            }
            catch (err) {
                console.error("unexpected error caught while linting: ", err);
                resolve([]);
            }
        }));
    }
}
exports.Controller = Controller;
//# sourceMappingURL=Controller.js.map