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
var atomApi_1 = require("../utils/atomApi");
var jasmine13to20_1 = require("../utils/jasmine13to20");
var emptySession_1 = require("./utils/emptySession");
var atomApi_2 = require("../utils/atomApi");
var parseWorkspace_1 = require("../core/parseWorkspace");
var taskUtils_1 = require("../utils/taskUtils");
var parseWorkspace_2 = require("../core/parseWorkspace");
var taskUtils_2 = require("../utils/taskUtils");
var parseWorkspace_3 = require("../core/parseWorkspace");
describe("anonymous functions", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path = "/file.jl";
    let contents = `function map() end
arr = []
map(o -> o + 1, arr)
map((a, b) -> a + b + 1, arr)
`;
    beforeAll(() => {
        let o = {};
        o[path] = contents;
        parseWorkspace_3.mockProjectFiles(o);
        atomApi_2.mockOpenFiles([path]);
        taskUtils_2.mockRunDelayed();
    });
    afterAll(() => {
        parseWorkspace_2.unmockProjectFiles();
        atomApi_1.unmockOpenFiles();
        taskUtils_1.unmockRunDelayed();
    });
    it("should parse arrow functions", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=anonymous-functions-spec.js.map