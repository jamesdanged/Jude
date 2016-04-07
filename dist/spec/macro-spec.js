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
describe("macros", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path_macro_1 = "/macro_1.jl";
    let contents_macro_1 = `
module Mod
  macro foo(a, b)
  end
end

Mod.@foo(1, 2)
Mod.@foo 1 2
Mod.@foo
`;
    let path_macro_2 = "/macro_2.jl";
    let contents_macro_2 = `
module Mod
  macro foo(a, b)
  end
end

@Mod.foo(1, 2)
@Mod.foo 1 2
@Mod.foo
`;
    let path_macro_3 = "/macro_3.jl";
    let contents_macro_3 = `
module Mod
  export @foo

  macro foo(a, b)
  end
end

using Mod
@foo(1, 2)
@foo 1 2
@foo
`;
    beforeAll(() => {
        let o = {};
        o[path_macro_1] = contents_macro_1;
        o[path_macro_2] = contents_macro_2;
        o[path_macro_3] = contents_macro_3;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should parse Module.@macro without errors", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path_macro_1].parseErrors.length).toBe(0);
        expect(errors[path_macro_1].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse @Module.macro without errors", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path_macro_2].parseErrors.length).toBe(0);
        expect(errors[path_macro_2].nameErrors.length).toBe(0);
        done();
    }));
    it("should export and use macros without errors", (done) => __awaiter(this, void 0, Promise, function* () {
        expect(errors[path_macro_3].parseErrors.length).toBe(0);
        expect(errors[path_macro_3].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=macro-spec.js.map