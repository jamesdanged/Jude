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
var assert_1 = require("./assert");
var nodeChildProcess = require("child_process");
function runJuliaToGetLoadPathsAsync() {
    return __awaiter(this, void 0, Promise, function* () {
        return runJuliaToGetDataAsync("get_basic_info.jl", []);
    });
}
exports.runJuliaToGetLoadPathsAsync = runJuliaToGetLoadPathsAsync;
function runJuliaToGetModuleDataAsync(moduleName) {
    return __awaiter(this, void 0, Promise, function* () {
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
        // TODO resolve path
        let scriptDir = __dirname + "/../../scripts";
        let args = [scriptDir + "/" + scriptFileName];
        if (additionalArgs.length > 0) {
            args = args.concat(additionalArgs);
        }
        let proc = nodeChildProcess.spawn("julia", args);
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