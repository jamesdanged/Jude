"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert_1 = require("./assert");
var runDelayedSynchronously = false;
function mockRunDelayed() {
    runDelayedSynchronously = true;
}
exports.mockRunDelayed = mockRunDelayed;
function unmockRunDelayed() {
    runDelayedSynchronously = false;
}
exports.unmockRunDelayed = unmockRunDelayed;
function runDelayed(cb) {
    if (runDelayedSynchronously) {
        return new Promise((resolve, reject) => {
            try {
                let res = cb();
                resolve(res);
            }
            catch (err) {
                reject(err);
            }
        });
    }
    else {
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
}
exports.runDelayed = runDelayed;
class TaskQueue {
    constructor() {
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
            that.tasks.push(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    let res = yield asyncCallback();
                    resolve(res);
                }
                catch (err) {
                    // Even if the task threw an error, it doesn't cause the flush to be interrupted.
                    // The error is sent back to the original caller.
                    reject(err);
                }
            }));
            if (!that.running)
                that._startFlush();
        });
    }
    _startFlush() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.running)
                throw new assert_1.AssertError(""); // Should only be called if queue is not already flushing.
            this.running = true;
            while (this.tasks.length > 0) {
                yield this.tasks.shift()();
            }
            this.running = false;
        });
    }
}
exports.TaskQueue = TaskQueue;
var showTimings = false;
function logElapsed(msg) {
    if (showTimings) {
        console.log(msg);
    }
}
exports.logElapsed = logElapsed;
//# sourceMappingURL=taskUtils.js.map