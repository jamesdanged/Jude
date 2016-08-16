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
describe("':' symbols", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let sessionModel = emptySession_2.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let path = "/file.jl";
    let contents = `if :asdf == :asdf
end

val = :asdf
`;
    beforeAll(() => {
        let o = {};
        o[path] = contents;
        emptySession_1.mockAll(o);
    });
    afterAll(() => {
        emptySession_3.unmockAll();
    });
    it("should not be a parse error to have a symbol after a keyword", (done) => __awaiter(this, void 0, void 0, function* () {
        yield parseWorkspace_1.parseFullWorkspaceAsync(sessionModel);
        expect(errors[path].parseErrors.length).toBe(0);
        expect(errors[path].nameErrors.length).toBe(0);
        done();
    }));
});
//# sourceMappingURL=symbol-spec.js.map