"use strict"

import {AssertError} from "./assert";
import {throwErrorFromTimeout} from "./assert";

export function runDelayed(cb) {
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


export class TaskQueue {
  tasks: any[]
  running: boolean
  catchErrors: boolean  // Catch all errors even assert errors. Prevents the task queue runner from dying.
  constructor(catchErrors: boolean) {
    this.catchErrors = catchErrors
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
          let res = await asyncCallback()
          resolve(res)
      })
      if (!that.running) that._startFlush()
    })
  }

  private async _startFlush() {
    if (this.running) throw new AssertError("")  // Should only be called if queue is not already flushing.

    this.running = true
    while (this.tasks.length > 0) {
      let task = this.tasks.shift()
      if (this.catchErrors) {
        try {
          task()
        } catch (err) {
          console.error(err)
          //throwErrorFromTimeout(err)
        }
      } else {
        task()
      }
    }
    this.running = false
  }

}



