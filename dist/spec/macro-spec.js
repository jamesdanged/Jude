"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/jasmine/jasmine.d.ts" />
const emptySession_1 = require("./utils/emptySession");
const jasmine13to20_1 = require("../utils/jasmine13to20");
const emptySession_2 = require("./utils/emptySession");
const parseWorkspace_1 = require("../core/parseWorkspace");
const emptySession_3 = require("./utils/emptySession");
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
    let path_macro_4 = "/macro_4.jl";
    let contents_macro_4 = `
macro abc_str(s1, s2)
  s1 + s2
end
abc"some text"xyz + 2
`;
    let path_macro_5 = "/macro_5.jl";
    let contents_macro_5 = `
macro a123_str(s1, s2)
  foo
end

a123"some text"xyz() + 2
`;
    beforeAll(() => {
        let o = {};
        o[path_macro_1] = contents_macro_1;
        o[path_macro_2] = contents_macro_2;
        o[path_macro_3] = contents_macro_3;
        o[path_macro_4] = contents_macro_4;
        o[path_macro_5] = contents_macro_5;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should parse Module.@macro without errors", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path_macro_1].parseErrors.length).toBe(0);
        expect(errors[path_macro_1].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse @Module.macro without errors", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path_macro_2].parseErrors.length).toBe(0);
        expect(errors[path_macro_2].nameErrors.length).toBe(0);
        done();
    }));
    it("should export and use macros without errors", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path_macro_3].parseErrors.length).toBe(0);
        expect(errors[path_macro_3].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse usage of string macros", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path_macro_4].parseErrors.length).toBe(0);
        expect(errors[path_macro_4].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse usage of string macros allowing invocation of macro result", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path_macro_5].parseErrors.length).toBe(0);
        expect(errors[path_macro_5].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=macro-spec.js.map