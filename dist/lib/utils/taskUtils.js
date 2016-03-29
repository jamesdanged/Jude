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
function runDelayed(cb) {
    return new Promise((resolve, reject) => {
        window.setTimeout(() => {
            try {
                let res = cb();
                resolve(res);
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
exports.runDelayed = runDelayed;
class TaskQueue {
    constructor(catchErrors) {
        this.catchErrors = catchErrors;
        this.tasks = [];
        this.running = false;
    }
    /**
     *
     * @param asyncCallback  Either an async function or a function that returns a promise.
     * @returns a promise that resolves to the callback's return value
     */
    addToQueueAndRun(asyncCallback) {
        let that = this;
        return new Promise((resolve, reject) => {
            that.tasks.push(() => __awaiter(this, void 0, Promise, function* () {
                let res = yield asyncCallback();
                resolve(res);
            }));
            if (!that.running)
                that._startFlush();
        });
    }
    _startFlush() {
        return __awaiter(this, void 0, Promise, function* () {
            if (this.running)
                throw new assert_1.AssertError(""); // Should only be called if queue is not already flushing.
            this.running = true;
            while (this.tasks.length > 0) {
                let task = this.tasks.shift();
                if (this.catchErrors) {
                    try {
                        task();
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
                else {
                    task();
                }
            }
            this.running = false;
        });
    }
}
exports.TaskQueue = TaskQueue;
//# sourceMappingURL=taskUtils.js.map