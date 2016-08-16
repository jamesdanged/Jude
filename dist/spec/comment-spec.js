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
describe("comments", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path1 = "/comment_1.jl";
    let contents1 = `
a = 1 #some comment
b = 2
`;
    let path2 = "/comment_2.jl";
    let contents2 = `
a = 1
#= some multiline
comment
#=
#=

=#
b = 2

arr = [1, 2, #= inserted comment =# 3]

`;
    beforeAll(() => {
        let o = {};
        o[path1] = contents1;
        o[path2] = contents2;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should parse single line comment", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path1].parseErrors.length).toBe(0);
        expect(errors[path1].nameErrors.length).toBe(0);
        let node = sessionModel.parseSet.fileLevelNodes[path1];
        expect(node.expressions[0].toString()).toBe("(a=1)");
        expect(node.expressions[1].toString()).toBe("(b=2)");
        done();
    }));
    it("should parse multi line comment", (done) => __awaiter(this, void 0, void 0, function* () {
        expect(errors[path2].parseErrors.length).toBe(0);
        expect(errors[path2].nameErrors.length).toBe(0);
        let node = sessionModel.parseSet.fileLevelNodes[path2];
        expect(node.expressions[0].toString()).toBe("(a=1)");
        expect(node.expressions[1].toString()).toBe("(b=2)");
        expect(node.expressions[2].toString()).toBe("(arr=[1,2,3])");
        done();
    }));
});
//# sourceMappingURL=comment-spec.js.map