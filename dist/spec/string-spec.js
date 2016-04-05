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
/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />
var atomApi_1 = require("../utils/atomApi");
var jasmine13to20_1 = require("../utils/jasmine13to20");
var emptySession_1 = require("./utils/emptySession");
var atomApi_2 = require("../utils/atomApi");
var parseWorkspace_1 = require("../core/parseWorkspace");
var taskUtils_1 = require("../utils/taskUtils");
var parseWorkspace_2 = require("../core/parseWorkspace");
var taskUtils_2 = require("../utils/taskUtils");
var parseWorkspace_3 = require("../core/parseWorkspace");
describe("strings", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path1 = "/string_1.jl";
    let contents1 = `
a = 3
s = "hello world $a  singlequote: ' backtick: \`"
`;
    let path2 = "/string_2.jl";
    let contents2 = `
println(s) = s
add(a, b) = a + b
println("a + b is $(add(1, 3)) single quote: ' backtick: \` ")
`;
    let path3 = "/string_3.jl";
    let contents3 = "val = 5; `a command $val 3 4`";
    let path4 = "/string_4.jl";
    let contents4 = `
a = 5
rand() = 1.0

s = """
A very long string. Could be a docstring.
$(rand()) $a

Can have double quotes: "this is a also just a string"

Can have unclosed double quotes: "
Can have backticks: \`

"""
`;
    beforeAll(() => {
        let o = {};
        o[path1] = contents1;
        o[path2] = contents2;
        o[path3] = contents3;
        o[path4] = contents4;
        parseWorkspace_3.mockProjectFiles(o);
        atomApi_2.mockOpenFiles([path1, path2, path3, path4]);
        taskUtils_2.mockRunDelayed();
    });
    afterAll(() => {
        parseWorkspace_2.unmockProjectFiles();
        atomApi_1.unmockOpenFiles();
        taskUtils_1.unmockRunDelayed();
    });
    it("should parse simple interpolation", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse interpolated expression", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path2].parseErrors.length).toBe(0);
        expect(errors[path2].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse backtick strings", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path3].parseErrors.length).toBe(0);
        expect(errors[path3].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse triple quoted strings", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path4].parseErrors.length).toBe(0);
        expect(errors[path4].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=string-spec.js.map