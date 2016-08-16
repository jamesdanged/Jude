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
/// <reference path="./../defs/atom_package_deps/atom-package-deps.d.ts" />
const ConfigSchema_1 = require("./ConfigSchema");
const Controller_1 = require("./Controller");
const taskUtils_1 = require("../utils/taskUtils");
const atomPackageDeps = require("atom-package-deps");
var gParseController = null;
class MainObject {
    constructor() {
        this.config = new ConfigSchema_1.ConfigSchema();
    }
    activate(state) {
        gParseController = new Controller_1.Controller(state);
        // Allow window to load before performing main thread blocking operations
        taskUtils_1.runDelayed(() => __awaiter(this, void 0, void 0, function* () {
            yield atomPackageDeps.install("Jude");
        }));
    }
    serialize() {
        if (gParseController.initializedPromise === false) {
            return gParseController.serializedState;
        }
        let libState = gParseController.sessionModel.moduleLibrary.serialize();
        return { moduleLibrary: libState };
    }
    deactivate(state) {
        gParseController.subscriptions.dispose();
        if (gParseController.dirWatcher) {
            gParseController.dirWatcher.close();
        }
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