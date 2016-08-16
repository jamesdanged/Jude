"use strict";
const StringSet_1 = require("../../utils/StringSet");
const Resolve_1 = require("../../nameResolution/Resolve");
const ModuleLibrary_1 = require("../../core/ModuleLibrary");
const SessionModel_1 = require("../../core/SessionModel");
const Token_1 = require("../../tokens/Token");
const taskUtils_1 = require("../../utils/taskUtils");
const atomApi_1 = require("../../utils/atomApi");
const parseWorkspace_1 = require("../../core/parseWorkspace");
const taskUtils_2 = require("../../utils/taskUtils");
const atomApi_2 = require("../../utils/atomApi");
const parseWorkspace_2 = require("../../core/parseWorkspace");
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
    let namesToAdd = ["Int", "Float64", "println", "Tuple", "Dict", "rand"];
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