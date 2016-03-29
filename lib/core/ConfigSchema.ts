"use strict"


export class ConfigSchema {
  juliaPath
  onlyShowAutocompleteSuggestionsFromJude
  autocompletePriority
  constructor() {
    this.juliaPath = {
      type: 'string',
      default: "julia",
      description: "Absolute path to julia binary, or file name on PATH."
    }
    this.onlyShowAutocompleteSuggestionsFromJude = {
      type: 'boolean',
      default: false,
      description: 'Excludes the default autocomplete results from Atom, as well as any other autocomplete packages which have lower priority than Jude.'
    }
    this.autocompletePriority = {
      type: 'number',
      default: 2,
      description: "Priority level of Jude's autocomplete results relative to other Atom packages. Higher numbers have higher priority."
    }
  }
}

