"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const emptySession_1 = require("./utils/emptySession");
const jasmine13to20_1 = require("../utils/jasmine13to20");
const parseWorkspace_1 = require("../core/parseWorkspace");
const emptySession_2 = require("./utils/emptySession");
const emptySession_3 = require("./utils/emptySession");
describe("basic module parsing", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    //dorunDelayed(() => { console.log("hi there")})
    let modPath = "/somedir/MODXYZ/src/MODXYZ.jl";
    let modFileContents = `x = 10  # some statements outside

module MODXYZ
  include("file1.jl")
  include("missing.jl")
  include("subdir/file2.jl")
end`;
    let path1 = "/somedir/MODXYZ/src/file1.jl";
    let contents1 = `foo = 10

function bar()
  println("hello")
end

baz^2
`;
    let path2 = "/somedir/MODXYZ/src/subdir/file2.jl";
    let contents2 = `x+1

foo *= 2 + bar()
baz = 5
`;
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    beforeAll(() => {
        let o = {};
        o[modPath] = modFileContents;
        o[path1] = contents1;
        o[path2] = contents2;
        emptySession_3.mockAll(o);
    });
    afterAll(() => {
        emptySession_2.unmockAll();
    });
    it("should only have 1 parse error for the missing file", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[modPath].parseErrors.length).toBe(1);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path2].parseErrors.length).toBe(0);
        done();
    }));
});
describe("multiple modules in a file", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let contents = `
module Mod1
  function foo()
  end
end

module Mod2
  function bar()
  end
end

Mod1.foo()
Mod2.bar()
`;
    let path = "/dir/only_file.jl";
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    beforeAll(() => {
        let o = {};
        o[path] = contents;
        emptySession_3.mockAll(o);
    });
    afterAll(() => {
        emptySession_2.unmockAll();
    });
    it("should be able to have multiple modules in a single file", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=module-parsing-spec.js.map