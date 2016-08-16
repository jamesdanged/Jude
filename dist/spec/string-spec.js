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
describe("strings", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
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
    let path5 = "/string_5.jl";
    let contents5 = `
regex = r"^[foo]+"isx
arr = [r"^[foo]+"isx, r"(0-9){3}"]
`;
    beforeAll(() => {
        let o = {};
        o[path1] = contents1;
        o[path2] = contents2;
        o[path3] = contents3;
        o[path4] = contents4;
        o[path5] = contents5;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should parse simple interpolation", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse interpolated expression", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path2].parseErrors.length).toBe(0);
        expect(errors[path2].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse backtick strings", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path3].parseErrors.length).toBe(0);
        expect(errors[path3].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse triple quoted strings", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path4].parseErrors.length).toBe(0);
        expect(errors[path4].nameErrors.length).toBe(0);
        done();
    }));
    it("should parse regexes", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path5].parseErrors.length).toBe(0);
        expect(errors[path5].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=string-spec.js.map