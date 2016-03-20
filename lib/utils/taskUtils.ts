"use strict"

import {AssertError} from "./assert";

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
      await this.tasks.shift()()
    }
    this.running = false
  }

}



