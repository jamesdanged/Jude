"use strict"

export = async function throwWrapper(func) {
  try {
    await func()
  } catch (e) {
    console.error(e)
  }
}