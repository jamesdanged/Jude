"use strict"

//class AssertError {
//  message: string
//  constructor() {
//    this.message = "Assertion Failed"
//  }
//}

/**
 * Denotes an error that should not happen unless programmer error.
 */
export class AssertError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}

export function assert(condition: boolean): void {
  if (!condition) {
    throw new AssertError("Assertion failed")
  }
}

export function throwErrorFromTimeout(err: Error): void {
  window.setTimeout(() => {
    throw err
  })
}



