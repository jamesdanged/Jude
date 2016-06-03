"use strict"

import {AssertError} from "./assert";
import {throwErrorFromTimeout} from "./assert";


var runDelayedSynchronously = false
export function mockRunDelayed() { // for testing. Jasmine on atom has a broken spied setTimeout during test runs.
  runDelayedSynchronously = true
}
export function unmockRunDelayed() {
  runDelayedSynchronously = false
}
export function runDelayed(cb) {
  if (runDelayedSynchronously) {
    return new Promise((resolve, reject) => {
      try {
        let res = cb()
        resolve(res)
      } catch (err) {
        reject(err)
      }
    })

  } else {
    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        try {
          let res = cb()
          resolve(res)
        } catch (err) {
          reject(err)
        }
      })
    })
  }
}


export class TaskQueue {
  private tasks: any[]
  private running: boolean
  constructor() {
    this.tasks = []
    this.running = false
  }

  /**
   *
   * @param asyncCallback  Either an async function or a function that returns a promise.
   * @returns a promise that resolves to the callback's return value
   */
  addToQueueAndRun(asyncCallback) {
    let that = this
    return new Promise((resolve, reject) => {
      that.tasks.push(async () => {
        try {
          let res = await asyncCallback()
          resolve(res)
        } catch(err) {
          // Even if the task threw an error, it doesn't cause the flush to be interrupted.
          // The error is sent back to the original caller.
          reject(err)
        }
      })
      if (!that.running) that._startFlush()
    })
  }

  private async _startFlush() {
    if (this.running) throw new AssertError("")  // Should only be called if queue is not already flushing.

    this.running = true
    while (this.tasks.length > 0) {
      await this.tasks.shift()()
    }
    this.running = false
  }

}




var showTimings = false
export function logElapsed(msg: string): void{
  if (showTimings) {
    console.log(msg)
  }
}
