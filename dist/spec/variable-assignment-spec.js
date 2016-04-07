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
var emptySession_1 = require("./utils/emptySession");
var jasmine13to20_1 = require("../utils/jasmine13to20");
var emptySession_2 = require("./utils/emptySession");
var parseWorkspace_1 = require("../core/parseWorkspace");
var emptySession_3 = require("./utils/emptySession");
describe("variable assignment", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path1 = "/file1.jl";
    let contents1 = `a, b = (1, 2)
`;
    let path2 = "/file2.jl";
    let contents2 = `(a, b) = (1, 2)
`;
    let path3 = "/file3.jl";
    let contents3 = ` a = []
a[1], b = 2, 3
`;
    beforeAll(() => {
        let o = {};
        o[path1] = contents1;
        o[path2] = contents2;
        o[path3] = contents3;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should recognize assignment like a,b = (1, 2)", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        done();
    }));
    it("should recognize assignment like (a,b) = (1, 2)", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path2].parseErrors.length).toBe(0);
        expect(errors[path2].nameErrors.length).toBe(0);
        done();
    }));
    it("should recognize assignment to array index", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path3].parseErrors.length).toBe(0);
        expect(errors[path3].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=variable-assignment-spec.js.map