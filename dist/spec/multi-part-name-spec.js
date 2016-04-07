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
};//"use strict"
//
///// <reference path="../defs/node/node.d.ts" />
///// <reference path="../defs/jasmine/jasmine.d.ts" />
//
//
//describe("multi part names", () => {
//
//  it("should be ok", () => {
//    expect(1).toBe(1)
//  })
//
//})
//# sourceMappingURL=multi-part-name-spec.js.map