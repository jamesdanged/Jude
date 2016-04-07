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
describe("implicit multiplication", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path = "/file.jl";
    let contents = `a = 5
b = 3
2a+b
2(a+b)
(1+a)b
`;
    beforeAll(() => {
        let o = {};
        o[path] = contents;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should parse 2a+b as ((2*a)+b)", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        let node = sessionModel.parseSet.fileLevelNodes[path];
        let expr = node.expressions[2];
        expect(expr.toString()).toBe("((2*a)+b)");
        done();
    }));
    it("should parse 2(a+b) as (2*(a+b))", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        let node = sessionModel.parseSet.fileLevelNodes[path];
        let expr = node.expressions[3];
        expect(expr.toString()).toBe("(2*(a+b))");
        done();
    }));
    it("should parse (1+a)b as ((1+a)*b)", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        let node = sessionModel.parseSet.fileLevelNodes[path];
        let expr = node.expressions[4];
        expect(expr.toString()).toBe("((1+a)*b)");
        done();
    }));
});
//# sourceMappingURL=implicit-multiplication-spec.js.map