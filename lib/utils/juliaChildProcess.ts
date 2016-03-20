"use strict"

import {throwErrorFromTimeout} from "./assert";
import * as nodeChildProcess from "child_process"


export async function runJuliaToGetLoadPathsAsync() { // returns string[]
  return runJuliaToGetDataAsync("get_basic_info.jl", [])
}

export async function runJuliaToGetModuleDataAsync(moduleName: string) {  // returns string[][]
  let results = await runJuliaToGetDataAsync("print_names.jl", [moduleName])
  let nameData = results as string[]
  return nameData.map((line) => { return line.split("\t")})
}



function runJuliaToGetDataAsync(scriptFileName: string, additionalArgs: string[]) {  // returns string[]
  return new Promise((resolve, reject) => {
    console.log("Starting julia child process")

    let errorMessages = ""
    let results: string[][] = []

    // TODO resolve path
    let scriptDir = __dirname + "/../../scripts"
    let args = [scriptDir + "/" + scriptFileName]
    if (additionalArgs.length > 0) {
      args = args.concat(additionalArgs)
    }
    let proc = nodeChildProcess.spawn("julia", args)

    proc.stdout.on('data', (data) => {

      let dataPrefix = "##DATA##\t"
      let lines = data.toString().split("\n") // arrives as a byte array
      for (let line of lines) {
        if (line.trim().length === 0) continue
        if (line.length > dataPrefix.length && line.slice(0, dataPrefix.length) == dataPrefix) {
          let parts = line.slice(dataPrefix.length, line.length)
          results.push(parts)
        } else {
          console.log(`stdout: ${line}`);
        }
      }

    })

    proc.stderr.on('data', (data) => {
      errorMessages += data.toString() + "\n"
    })

    proc.on('close', (code) => {
      console.log(`Julia child process finished with code ${code}.`)
      if (errorMessages.length > 0) {
        if (code !== 0) {
          throwErrorFromTimeout(new Error("Julia child process unexpectedly threw an error:\n" + errorMessages))
          resolve(results)
        } else {
          console.log("Error messages from Julia process:\n" + errorMessages)
          resolve(results)
        }
      } else {
        resolve(results)
      }
    })

  })
}





