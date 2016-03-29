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
var emptySession_1 = require("./utils/emptySession");
var jasmine13to20_1 = require("../utils/jasmine13to20");
var atomApi_1 = require("../utils/atomApi");
var atomApi_2 = require("../utils/atomApi");
var parseWorkspace_1 = require("../core/parseWorkspace");
var parseWorkspace_2 = require("../core/parseWorkspace");
var parseWorkspace_3 = require("../core/parseWorkspace");
var taskUtils_1 = require("../utils/taskUtils");
var taskUtils_2 = require("../utils/taskUtils");
describe("module parsing", () => {
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
        parseWorkspace_1.mockProjectFiles(o);
        atomApi_1.mockOpenFiles([modPath, path1, path2]);
        taskUtils_1.mockRunDelayed();
    });
    afterAll(() => {
        parseWorkspace_2.unmockProjectFiles();
        atomApi_2.unmockOpenFiles();
        taskUtils_2.unmockRunDelayed();
    });
    it("should only have 1 parse error for the missing file", (done) => __awaiter(this, void 0, Promise, function* () {
        yield parseWorkspace_3.parseFullWorkspaceAsync(sessionModel);
        expect(errors[modPath].parseErrors.length).toBe(1);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path2].parseErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=module-parsing-spec.js.map