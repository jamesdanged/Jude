"use strict"

export type StringSet = {[s:string]: number}

export function createStringSet(strings: string[]): StringSet {
  let d: {[s:string]: number} = {}
  for (let s of strings) {
    d[s] = 1
  }
  return d
}

/**
 * Returns a new set containing merger of input sets
 * @param sets
 */
export function mergeSets(sets: StringSet[]): StringSet {
  let d: StringSet = {}
  for (let iset of sets) {
    for (let jstr in iset) {
      d[jstr] = 1
    }
  }
  return d
}

export function stringSetToArray(stringSet: StringSet): string[] {
  let arr = []
  for (let s in stringSet) {
    arr.push(s)
  }
  return arr
}


export function addToSet(stringSet: StringSet, s: string): void {
  stringSet[s] = 1
}