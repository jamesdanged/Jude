"use strict"

import {AssertError} from "./assert";

/// <reference path="../defs/jasmine/jasmine.d.ts" />

type FuncWithOptionalDone = (done?: () => void) => void

export function jasmine13to20() {
  return new DescribeScope()
}

class DescribeScope {

  beforeAllActionCompleted: boolean
  beforeAllAction: FuncWithOptionalDone
  newBeforeAll: (BeforeAllAction) => void
  newIt: (string, FuncWithOptionalDone) => void

  constructor() {
    this.beforeAllActionCompleted = false
    this.beforeAllAction = null
    this.newBeforeAll = newBeforeAll.bind(this)
    this.newIt = newIt.bind(this)
  }
}


function newBeforeAll(action: FuncWithOptionalDone): void {
  this.beforeAllAction = action
}

function newIt(expectation: string, assertion: FuncWithOptionalDone): void {
  let that = this
  let itTakesDoneArg = assertion.length === 1
  if (assertion.length > 1) throw new AssertError("'it' callback can only take up to 1 parameter.")


  it(expectation, () => {
    let itDone = false
    let itDoneCallback = (): void => {
      itDone = true
    }

    if (that.beforeAllAction !== null && !that.beforeAllActionCompleted) {
      runs(() => {
        let beforeAllDoneCb = () => {
          that.beforeAllActionCompleted = true
          if (itTakesDoneArg) {
            assertion(itDoneCallback)
          } else {
            assertion()
            itDone = true
          }
        }

        that.beforeAllAction(beforeAllDoneCb)
      })
      waitsFor(() => {
        return that.beforeAllActionCompleted && itDone
      }, "'beforeAll' or 'it' failed to complete", 500)
      runs(() => {
      })

    } else if (itTakesDoneArg) {
      runs(() => {
        assertion(itDoneCallback)
      })
      waitsFor(() => {
        return itDone
      }, "'it' async callback failed to complete", 500)
      runs(() => {
      })

    } else {
      runs(() => {
        assertion()
      })
    }


  })
}

