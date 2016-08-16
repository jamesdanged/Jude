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
const atomApi_1 = require("../utils/atomApi");
const nodes_1 = require("../parseTree/nodes");
const Token_1 = require("../tokens/Token");
const parseFile_1 = require("../parseTree/parseFile");
const resolveFullWorkspace_1 = require("../nameResolution/resolveFullWorkspace");
const jasmine13to20_1 = require("../utils/jasmine13to20");
const emptySession_1 = require("./utils/emptySession");
const nodes_2 = require("../parseTree/nodes");
const Resolve_1 = require("../nameResolution/Resolve");
const nodes_3 = require("../parseTree/nodes");
const atomApi_2 = require("../utils/atomApi");
// TODO
// test for ccall
// should not throw error in promise when
//   resolve recursing a macro/type/function node with no name
// autocomplete should show when trying to get function signature, even if function in a used module, eg println
describe("basic function parsing", () => {
    let j13to20 = jasmine13to20_1.jasmine13to20();
    let beforeAll = j13to20.beforeAll;
    let beforeEach = j13to20.beforeEach;
    let it = j13to20.it;
    let afterEach = j13to20.afterEach;
    let afterAll = j13to20.afterAll;
    let path = "/some_dir/basic_function.jl";
    let sessionModel = emptySession_1.createTestSessionModel();
    let errors = sessionModel.parseSet.errors;
    let contents = `function basic_function{T <: Int}(arg1::T, arg2::Float64=3.3; keyword_arg=5)
  arg1 + arg2
  arg3
end`;
    beforeAll(() => {
        atomApi_1.mockOpenFiles([path]);
    });
    afterAll(() => {
        atomApi_2.unmockOpenFiles();
    });
    it("should not have any entries before parse", () => {
        expect(errors[path]).toBeUndefined();
    });
    it("should have no parse errors", (done) => __awaiter(this, void 0, void 0, function* () {
        sessionModel.parseSet.createEntriesForFile(path);
        parseFile_1.parseFile(path, contents, sessionModel);
        expect(errors[path].parseErrors.length).toBe(0);
        done();
    }));
    it("should have no name errors before resolution", () => {
        expect(errors[path].nameErrors.length).toBe(0);
    });
    it("should have one name error after resolution", (done) => __awaiter(this, void 0, void 0, function* () {
        yield resolveFullWorkspace_1.resolveFullWorkspaceAsync(sessionModel);
        expect(errors[path].nameErrors.length).toBe(1);
        expect(errors[path].nameErrors[0].token.str).toBe("arg3");
        done();
    }));
    it("should be fully resolved", () => {
        expect(sessionModel.partiallyResolved).toBe(false);
    });
    let arg1Node = null;
    let fileNode = null;
    let identifiers = null;
    it("should have 2 ordered args, 1 keyword arg, and 1 generic arg", () => {
        fileNode = sessionModel.parseSet.fileLevelNodes[path];
        let node = fileNode.expressions[0];
        expect(node instanceof nodes_2.FunctionDefNode).toBe(true);
        let funcNode = node;
        expect(funcNode.args.orderedArgs.length).toBe(2);
        arg1Node = funcNode.args.orderedArgs[0]; // use later test
        let arg2Node = funcNode.args.orderedArgs[1];
        expect(arg2Node.defaultValue instanceof nodes_1.NumberNode).toBe(true);
        expect(funcNode.args.keywordArgs.length).toBe(1);
        let arg3Node = funcNode.args.keywordArgs[0];
        expect(arg3Node.type).toBeNull();
        expect(arg3Node.defaultValue instanceof nodes_1.NumberNode).toBe(true);
        expect(funcNode.genericArgs.args.length).toBe(1);
        let genArg1 = funcNode.genericArgs.args[0];
        expect(genArg1.name.str).toBe("T");
        expect(genArg1.restriction instanceof nodes_3.IdentifierNode).toBe(true);
        let restriction = genArg1.restriction;
        expect(restriction.str).toBe("Int");
        identifiers = sessionModel.parseSet.identifiers[path];
    });
    it("should resolve arg1 to the param list", () => {
        let ident = sessionModel.parseSet.identifiers[path].getIdentifierForPoint(new Token_1.Point(1, 2));
        expect(ident.token.str).toBe("arg1");
        let resolve = identifiers.map.get(ident);
        expect(resolve instanceof Resolve_1.VariableResolve).toBe(true);
        let varResolve = resolve;
        expect(varResolve.token).toBe(arg1Node.name.token);
    });
});
//# sourceMappingURL=simple-parse-spec.js.map