"use strict"

import {AssertError} from "./assert";

/// <reference path="../defs/jasmine/jasmine.d.ts" />

type FuncWithOptionalDone = (done?: () => void) => void

export function jasmine13to20() {
  let o = new DescribeScope()
  o.beforeAll = o.beforeAll.bind(o)
  o.beforeEach = o.beforeEach.bind(o)
  o.it = o.it.bind(o)
  o.afterEach = o.afterEach.bind(o)
  o.afterAll = o.afterAll.bind(o)
  return o
}

class DescribeScope {

  private beforeAllActionCompleted: boolean
  private beforeAllAction: FuncWithOptionalDone
  private beforeEachAction: FuncWithOptionalDone
  private afterEachAction: FuncWithOptionalDone
  private afterAllAction: FuncWithOptionalDone
  private lastItMarker: any
  private afterAllActionCompleted: boolean

  constructor() {
    this.beforeAllActionCompleted = true
    this.beforeAllAction = null
    this.beforeEachAction = null
    this.afterEachAction = null
    this.afterAllAction = null
    this.lastItMarker = null
    this.afterAllActionCompleted = false
  }

  beforeAll(action: FuncWithOptionalDone): void {
    this.beforeAllActionCompleted = false
    this.beforeAllAction = promisify(action)
  }

  beforeEach(action: FuncWithOptionalDone): void {
    this.beforeEachAction = promisify(action)
  }

  afterEach(action: FuncWithOptionalDone): void {
    this.afterEachAction = promisify(action)
  }

  afterAll(action: FuncWithOptionalDone): void {
    this.afterAllAction = promisify(action)
  }

  it(expectation: string, assertion: FuncWithOptionalDone): void {
    let that = this
    if (assertion.length > 1) throw new AssertError("'it' callback can only take up to 1 parameter.")
    let itAction = promisify(assertion)

    let allDone = false
    let marker = {}
    this.lastItMarker = marker

    it(expectation, () => {

      runs(async () => {

        if (!that.beforeAllActionCompleted) {
          await that.beforeAllAction()
          that.beforeAllActionCompleted = true
        }

        if (that.beforeEachAction !== null) await that.beforeEachAction()

        await itAction()

        if (that.afterEachAction !== null) await that.afterEachAction()

        if (that.afterAllAction !== null && marker === that.lastItMarker) {
          if (that.afterAllActionCompleted) throw new AssertError("Ran after all twice!")
          await that.afterAllAction()
          that.afterAllActionCompleted = true
        }

        allDone = true
      })

      waitsFor(() => {
        return allDone
      }, "async function failed to complete", 500)

    })
  }

}


function promisify(action: FuncWithOptionalDone): () => Promise<any> {
  if (action.length > 1) throw new AssertError("callback can only take up to 1 arg.")

  return () => {
    return new Promise((resolve, reject) => {
      if (action.length === 0) {
        action()
        resolve()
      } else {
        action(() => {
          resolve()
        })
      }
    })
  }
}




