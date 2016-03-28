"use strict"

import {runDelayed} from "./taskUtils";

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
  runDelayed(() => {
    throw err
  })
}



