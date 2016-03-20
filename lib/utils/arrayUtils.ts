"use strict"

import {AssertError} from "./assert";


export function last<T>(array: T[]): T {
  if (array.length === 0) throw new AssertError("Array is empty.")
  return array[array.length - 1]
}

export function getFromHash<T>(obj: {[key:string]: T}, key: string): T {
  if (!(key in obj)) throw new AssertError("Key '" + key + "' not found in object.")
  return obj[key]
}

export function getAllFromHash<T>(obj: {[key:string]: T}): T[] {
  let arr: T[] = []
  for (let key in obj) {
    arr.push(obj[key])
  }
  return arr
}
