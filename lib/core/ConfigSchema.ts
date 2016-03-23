"use strict"


export class ConfigSchema {
  juliaPath
  constructor() {
    this.juliaPath = {
      type: 'string',
      default: "julia",
      description: "Absolute path to julia binary, or file name on PATH."
    }
  }
}

