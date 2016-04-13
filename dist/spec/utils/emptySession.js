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
var StringSet_1 = require("../../utils/StringSet");
var Resolve_1 = require("../../nameResolution/Resolve");
var ModuleLibrary_1 = require("../../core/ModuleLibrary");
var SessionModel_1 = require("../../core/SessionModel");
var Token_1 = require("../../tokens/Token");
var taskUtils_1 = require("../../utils/taskUtils");
var atomApi_1 = require("../../utils/atomApi");
var parseWorkspace_1 = require("../../core/parseWorkspace");
var taskUtils_2 = require("../../utils/taskUtils");
var atomApi_2 = require("../../utils/atomApi");
var parseWorkspace_2 = require("../../core/parseWorkspace");
exports.jlFilesDir = __dirname + "/../jl";
function createTestSessionModel() {
    let sessionModel = new SessionModel_1.SessionModel();
    let moduleLibrary = sessionModel.moduleLibrary;
    let state = new ModuleLibrary_1.LibrarySerialized();
    state.loadPaths.push("some path"); // prevents querying to julia
    state.serializedLines["Base"] = {};
    state.serializedLines["Core"] = {};
    moduleLibrary.initializeFromSerialized(state);
    // put some basic types in
    // Simply declare these as variables rather than functions or types, just as a shortcut.
    let core = moduleLibrary.modules["Core"];
    let namesToAdd = ["Int", "Float64", "println", "Tuple", "Dict"];
    for (let name of namesToAdd) {
        core.names[name] = new Resolve_1.VariableResolve(Token_1.Token.createEmptyIdentifier(name), null);
    }
    core.exportedNames = StringSet_1.createStringSet(namesToAdd);
    return sessionModel;
}
exports.createTestSessionModel = createTestSessionModel;
function mockAll(filesAndContents) {
    parseWorkspace_2.mockProjectFiles(filesAndContents);
    let paths = [];
    for (let path in filesAndContents) {
        paths.push(path);
    }
    atomApi_2.mockOpenFiles(paths);
    taskUtils_2.mockRunDelayed();
}
exports.mockAll = mockAll;
function unmockAll() {
    parseWorkspace_1.unmockProjectFiles();
    atomApi_1.unmockOpenFiles();
    taskUtils_1.unmockRunDelayed();
}
exports.unmockAll = unmockAll;
//# sourceMappingURL=emptySession.js.map