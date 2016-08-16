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
const assert_1 = require("./assert");
const nodeChildProcess = require("child_process");
function runJuliaToGetLoadPathsAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        return runJuliaToGetDataAsync("get_basic_info.jl", []);
    });
}
exports.runJuliaToGetLoadPathsAsync = runJuliaToGetLoadPathsAsync;
function runJuliaToGetModuleDataAsync(moduleName) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = yield runJuliaToGetDataAsync("print_names.jl", [moduleName]);
        let nameData = results;
        return nameData.map((line) => { return line.split("\t"); });
    });
}
exports.runJuliaToGetModuleDataAsync = runJuliaToGetModuleDataAsync;
function runJuliaToGetDataAsync(scriptFileName, additionalArgs) {
    return new Promise((resolve, reject) => {
        console.log("Starting julia child process");
        let errorMessages = "";
        let results = [];
        // julia path
        let juliaPath = atom.config.get("Jude.juliaPath");
        if (!juliaPath)
            throw new Error("Must set Julia path in settings.");
        // julia scripts dir
        let scriptDir = __dirname + "/../../scripts";
        let args = [scriptDir + "/" + scriptFileName];
        if (additionalArgs.length > 0) {
            args = args.concat(additionalArgs);
        }
        let proc = nodeChildProcess.spawn(juliaPath, args);
        proc.stdout.on('data', (data) => {
            let dataPrefix = "##DATA##\t";
            let lines = data.toString().split("\n"); // arrives as a byte array
            for (let line of lines) {
                if (line.trim().length === 0)
                    continue;
                if (line.length > dataPrefix.length && line.slice(0, dataPrefix.length) == dataPrefix) {
                    let parts = line.slice(dataPrefix.length, line.length);
                    results.push(parts);
                }
                else {
                    console.log(`stdout: ${line}`);
                }
            }
        });
        proc.stderr.on('data', (data) => {
            errorMessages += data.toString() + "\n";
        });
        proc.on('close', (code) => {
            console.log(`Julia child process finished with code ${code}.`);
            if (errorMessages.length > 0) {
                if (code !== 0) {
                    assert_1.throwErrorFromTimeout(new Error("Julia child process unexpectedly threw an error:\n" + errorMessages));
                    resolve(results);
                }
                else {
                    console.log("Error messages from Julia process:\n" + errorMessages);
                    resolve(results);
                }
            }
            else {
                resolve(results);
            }
        });
    });
}
//# sourceMappingURL=juliaChildProcess.js.map