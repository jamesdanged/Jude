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
/// <reference path="./../defs/atom_package_deps/atom-package-deps.d.ts" />
var ConfigSchema_1 = require("./ConfigSchema");
var Controller_1 = require("./Controller");
var taskUtils_1 = require("../utils/taskUtils");
var atomPackageDeps = require("atom-package-deps");
var gParseController = null;
class MainObject {
    constructor() {
        this.config = new ConfigSchema_1.ConfigSchema();
    }
    activate(state) {
        gParseController = new Controller_1.Controller(state);
        // Allow window to load before performing main thread blocking operations
        taskUtils_1.runDelayed(() => __awaiter(this, void 0, Promise, function* () {
            yield atomPackageDeps.install("Jude");
        }));
    }
    serialize() {
        let libState = gParseController.sessionModel.moduleLibrary.serialize();
        return { moduleLibrary: libState };
    }
    deactivate(state) {
        gParseController.subscriptions.dispose();
        gParseController.dirWatcher.close();
    }
    provideLinter() {
        return {
            name: "Julia",
            grammarScopes: ["source.julia"],
            scope: "file",
            lintOnFly: true,
            lint: gParseController.lint.bind(gParseController)
        };
    }
    provideAutocomplete() {
        return gParseController.autocompleter;
    }
}
module.exports = new MainObject();
//# sourceMappingURL=main.js.map