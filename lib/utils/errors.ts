"use strict"

import {AssertError} from "./assert";
import {Token} from "./../tokens/Token";
import {throwErrorFromTimeout} from "./assert";

export class InvalidParseError extends Error {
  detailedMessage: string
  constructor(message: string, public token: Token) { //  = null
    super(message)
    if (!token) {
      throw new AssertError("Invalid parse error needs token")
    }
    this.detailedMessage = null
  }
}

export class NameError { //extends Error {
  constructor(public message: string, public token: Token) {
    //super(message)
    if (!token) {
      throw new AssertError("Name error needs token")
    }
  }
}


