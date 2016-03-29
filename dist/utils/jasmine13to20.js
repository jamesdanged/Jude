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
var assert_1 = require("./assert");
function jasmine13to20() {
    let o = new DescribeScope();
    o.beforeAll = o.beforeAll.bind(o);
    o.beforeEach = o.beforeEach.bind(o);
    o.it = o.it.bind(o);
    o.afterEach = o.afterEach.bind(o);
    o.afterAll = o.afterAll.bind(o);
    return o;
}
exports.jasmine13to20 = jasmine13to20;
class DescribeScope {
    constructor() {
        this.beforeAllActionCompleted = true;
        this.beforeAllAction = null;
        this.beforeEachAction = null;
        this.afterEachAction = null;
        this.afterAllAction = null;
        this.lastItMarker = null;
        this.afterAllActionCompleted = false;
    }
    beforeAll(action) {
        this.beforeAllActionCompleted = false;
        this.beforeAllAction = promisify(action);
    }
    beforeEach(action) {
        this.beforeEachAction = promisify(action);
    }
    afterEach(action) {
        this.afterEachAction = promisify(action);
    }
    afterAll(action) {
        this.afterAllAction = promisify(action);
    }
    it(expectation, assertion) {
        let that = this;
        if (assertion.length > 1)
            throw new assert_1.AssertError("'it' callback can only take up to 1 parameter.");
        let itAction = promisify(assertion);
        let allDone = false;
        let marker = {};
        this.lastItMarker = marker;
        let error = null;
        it(expectation, () => {
            runs(() => __awaiter(this, void 0, Promise, function* () {
                try {
                    if (!that.beforeAllActionCompleted) {
                        yield that.beforeAllAction();
                        that.beforeAllActionCompleted = true;
                    }
                    if (that.beforeEachAction !== null)
                        yield that.beforeEachAction();
                    yield itAction();
                    if (that.afterEachAction !== null)
                        yield that.afterEachAction();
                    if (that.afterAllAction !== null && marker === that.lastItMarker) {
                        if (that.afterAllActionCompleted)
                            throw new assert_1.AssertError("Ran after all twice!");
                        yield that.afterAllAction();
                        that.afterAllActionCompleted = true;
                    }
                    allDone = true;
                }
                catch (err) {
                    error = err;
                }
            }));
            waitsFor(() => {
                if (error)
                    throw error;
                return allDone;
            }, "async function failed to complete", 5000);
        });
    }
}
function promisify(action) {
    if (action.length > 1)
        throw new assert_1.AssertError("callback can only take up to 1 arg.");
    return () => {
        return new Promise((resolve, reject) => __awaiter(this, void 0, Promise, function* () {
            if (action.length === 0) {
                try {
                    action();
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            }
            else {
                try {
                    yield action(() => {
                        resolve();
                    });
                }
                catch (err) {
                    reject(err);
                }
            }
        }));
    };
}
//# sourceMappingURL=jasmine13to20.js.map