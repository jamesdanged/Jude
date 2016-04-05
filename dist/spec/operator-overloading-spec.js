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
describe("operator overloading", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path1 = "/file1.jl";
    let contents1 = `function +(a, b)
  a + b
end
`;
    let path2 = "/file2.jl";
    let contents2 = `+(a, b) = a + b
`;
    beforeAll(() => {
        let o = {};
        o[path1] = contents1;
        o[path2] = contents2;
        parseWorkspace_3.mockProjectFiles(o);
        atomApi_2.mockOpenFiles([path1, path2]);
        taskUtils_2.mockRunDelayed();
    });
    afterAll(() => {
        parseWorkspace_2.unmockProjectFiles();
        atomApi_1.unmockOpenFiles();
        taskUtils_1.unmockRunDelayed();
    });
    it("should allow function +() ... end", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        done();
    }));
    it("should allow +() = ...", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=operator-overloading-spec.js.map