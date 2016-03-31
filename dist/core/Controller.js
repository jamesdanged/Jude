"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
/// <reference path="./../defs/atom/atom.d.ts" />
/// <reference path="./../defs/chokidar/chokidar.d.ts" />
var resolveFullWorkspace_1 = require("../nameResolution/resolveFullWorkspace");
var JumpController_1 = require("./JumpController");
var Linter_1 = require("./Linter");
var assert_1 = require("../utils/assert");
var parseWorkspace_1 = require("./parseWorkspace");
var assert_2 = require("../utils/assert");
var SessionModel_1 = require("./SessionModel");
var nodepath = require("path");
var parseWorkspace_2 = require("./parseWorkspace");
var Autocompleter_1 = require("./Autocompleter");
var chokidar = require("chokidar");
var taskUtils_1 = require("../utils/taskUtils");
var atomModule = require("atom");
// TODO
// ccall as an identifier
// symbol quote blocks, eg ":( ... )", "quote ... end"
// certain operators treated as identifiers in certain circumstances
//   eg map(arr, +)
//   [+, -]
//   (+, -)
// @everywhere include(...)
// m == 0 && return x
// for ii in 1:m, jj in 1:n
// .0
// jump to definition for includes
// @Base.time vs Base.@time
// macros in module in workspace, ie MyMod.@my_macro name not being resolved.
// test make sure full reparse when project folder changes. Esp if no jl files loaded in session to begin with.
// Jump to definition for function with module qualifier, eg Mod1.func(), should show definitions from that module, not from the current scope.
// log identifier for target of an alias type
// Ignore field after indexing, eg arr[i].x
// Autocomplete by matching alignments, maybe ignoring underscore
// Do not autocomplete during comments
// Handle situation where an external library was added into workspace, but still treated as external
/**
 * Handles interactions with the editor. Responds to user activity and file system changes.
 */
class Controller {
    constructor(state) {
        this.sessionModel = new SessionModel_1.SessionModel();
        this.linter = new Linter_1.Linter(this.sessionModel);
        this.jumper = new JumpController_1.JumpController(this.sessionModel);
        this.autocompleter = new Autocompleter_1.Autocompleter(this.sessionModel, this.jumper);
        this.subscriptions = new atomModule.CompositeDisposable();
        this.dirWatcher = null;
        this.taskQueue = new taskUtils_1.TaskQueue(true);
        this.serializedState = state;
        this.initializedPromise = false; // the first lint call will trigger initialization of controller
    }
    get moduleLibrary() { return this.sessionModel.moduleLibrary; }
    initalizeAsync() {
        return __awaiter(this, void 0, Promise, function* () {
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
            observeHandler = atom.project.onDidChangePaths(() => __awaiter(this, void 0, Promise, function* () {
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
        return __awaiter(this, void 0, Promise, function* () {
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
                        dirWatcher.on('change', (path, stats) => __awaiter(this, void 0, Promise, function* () {
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
        return __awaiter(this, void 0, Promise, function* () {
            let sessionModel = this.sessionModel;
            yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, Promise, function* () {
                console.log("Reparsing all files.");
                yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
            }));
        });
    }
    reparseFileAsync(path, contents) {
        return __awaiter(this, void 0, Promise, function* () {
            let sessionModel = this.sessionModel;
            yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, Promise, function* () {
                //console.log("Reparsing file " + path)
                yield parseWorkspace_2.refreshFileAsync(path, contents, sessionModel);
            }));
        });
    }
    reloadModulesFromJuliaAndReparseAsync() {
        return __awaiter(this, void 0, Promise, function* () {
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
        return __awaiter(this, void 0, Promise, function* () {
            yield this.jumper.goBackAsync();
        });
    }
    goForwardAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            yield this.jumper.goForwardAsync();
        });
    }
    onDidChangeActivePaneItem(item) {
        return __awaiter(this, void 0, Promise, function* () {
            this.jumper.onSwitchedTab();
            if (this.sessionModel.partiallyResolved) {
                // now is a good time to quickly re-resolve full workspace
                let sessionModel = this.sessionModel;
                yield this.taskQueue.addToQueueAndRun(() => __awaiter(this, void 0, Promise, function* () {
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
        return new Promise((resolve, reject) => __awaiter(this, void 0, Promise, function* () {
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
        }));
    }
}
exports.Controller = Controller;
//# sourceMappingURL=Controller.js.map