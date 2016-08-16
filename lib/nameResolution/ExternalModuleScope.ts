import {ExternalModuleResolve} from "./Resolve";
import {VariableResolve} from "./Resolve";
import {MacroResolve} from "./Resolve";
import {Tokenizer} from "../tokens/Tokenizer";
import {TokenType} from "../tokens/operatorsAndKeywords";
import {BracketGrouper} from "../parseTree/BracketGrouper";
import {WholeFileParseState} from "../fsas/general/ModuleContentsFsa";
import {parseWholeTypeDef} from "../fsas/declarations/TypeDefFsa";
import {TypeResolve} from "./Resolve";
import {FunctionResolve} from "./Resolve";
import {parseWholeFunctionDef} from "../fsas/declarations/FunctionDefFsa";
import {ModuleScope} from "./ModuleScope"
import {throwErrorFromTimeout} from "../utils/assert";
import {ModuleLineSet} from "../core/ModuleLibrary";
import {ModuleLibrary} from "./../core/ModuleLibrary";
import {Point} from "../tokens/Token";
import {FunctionDefNode} from "../parseTree/nodes";
import {Range} from "../tokens/Token";
import {last} from "../utils/arrayUtils";
import {addToSet} from "../utils/StringSet";
import {IdentifierNode} from "../parseTree/nodes";
import {createPrefixTree} from "./PrefixTree";
import {Resolve} from "./Resolve";
import {AssertError} from "../utils/assert";
import {Token} from "../tokens/Token";
import {getResolveInfoType} from "./Resolve";



/**
 * For modules external to the project.
 */
export class ExternalModuleScope extends ModuleScope {
  private moduleFullName: string
  private initializedLibraryReference: boolean  // delayed init to save startup time
  private serializedLines: ModuleLineSet
  private moduleLibrary: ModuleLibrary  // need to notify the library when unresolved inner module

  /**
   * The module scope is not fully populated initially. Names are lazily loaded from the serializedLines.
   * The names are all immediately loaded into prefix trees.
   *
   * @param moduleFullName  Can have '.'
   * @param serializedLines
   * @param moduleLibrary
   */
  constructor(moduleFullName: string, serializedLines: ModuleLineSet, moduleLibrary: ModuleLibrary) {
    super()
    this.moduleFullName = moduleFullName
    this.serializedLines = serializedLines
    this.initializedLibraryReference = false
    this.moduleShortName = last(moduleFullName.split("."))
    this.prefixTree = createPrefixTree(serializedLines)
    this.moduleLibrary = moduleLibrary
  }

  reset(): void { throw new AssertError("")}
  getSerializedLines(): ModuleLineSet { return this.serializedLines }  // just for serialization

  addUsingModule(scope: ModuleScope): void { throw new AssertError("") }
  addImportAllModule(scope: ModuleScope): void { throw new AssertError("") }

  tryResolveExportedName(name: string): Resolve {
    if (!this.initializedLibraryReference)
      this.initializeLibraryReference()

    if (!(name in this.exportedNames)) {
      return null
    }
    return this.tryResolveNameThisLevel(name)
  }

  /**
   * Resolves only at this scope, not a parent scope.
   * Also resolves to used modules.
   * For modules outside workspace, their scopes are lazy populated. This populates only the requested name.
   *
   * @param name
   * @returns Matching resolve. Null if not found.
   */
  tryResolveNameThisLevel(name: string): Resolve {
    if (!this.initializedLibraryReference)
      this.initializeLibraryReference()

    if (name in this.names) return this.names[name]

    this.tryAddNameFromSerializedState(name)
    if (name in this.names) return this.names[name]

    let result = this.searchUsedImportAlldModules(name)
    if (result === null) return null
    return result as Resolve
  }


  /**
   * simply loads exported names into the export list of the scope
   *
   */
  private initializeLibraryReference(): void {
    for (let name in this.serializedLines) {
      let arr: string[][] = this.serializedLines[name]
      for (let line of arr) {
        if (line[2] === "exported") {
          addToSet(this.exportedNames, name)
          break
        } else if (line[2] === "hidden") {
          // do nothing
        } else {
          throw new AssertError("")
        }
      }
    }

    this.initializedLibraryReference = true
  }

  private tryAddNameFromSerializedState(name: string): void {
    let arr: string[][] = this.serializedLines[name]
    if (!arr) return // name not in module

    for (let line of arr) {
      if (line[0] === "function") {
        this.addFunctionFromSerialized(line)
      } else if (line[0] === "type") {
        this.addTypeFromSerialized(line)
      } else if (line[0] === "variable") {
        this.addVariableFromSerialized(line)
      } else if (line[0] === "macro") {
        this.addMacroFromSerialized(line)
      } else if (line[0] === "module") {
        this.addModuleFromSerialized(line)
      }
    }
  }


  private addModuleFromSerialized(parts: string[]) {
    if (parts.length !== 4) throw new AssertError("")
    let name = parts[1]
    let fullModulePath = parts[3]
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    if (fullModulePath in this.moduleLibrary.modules) {
      let innerModuleScope = this.moduleLibrary.modules[fullModulePath]
      this.names[name] = new ExternalModuleResolve(fullModulePath, innerModuleScope)
    } else {
      // module hasn't been retrieved from Julia yet
      addToSet(this.moduleLibrary.toQueryFromJulia, fullModulePath)
    }
  }

  private addVariableFromSerialized(parts: string[]): void {
    if (parts.length !== 3) throw new AssertError("")
    let name = parts[1]
    // store it
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new VariableResolve(Token.createEmptyIdentifier(name), null)
  }

  private addMacroFromSerialized(parts: string[]): void {
    if (parts.length !== 3) throw new AssertError("")
    let name = parts[1]
    // store it
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new MacroResolve(name)
  }


  private addTypeFromSerialized(parts: string[]): void {
    if (parts.length !== 4) throw new AssertError("")

    let name = parts[1]

    // parse the type def block
    let code = parts[3]
    let tokens = Tokenizer.tokenizeThrowIfError(code)
    if (tokens[2].type !== TokenType.Identifier) {
      console.log("Skipping type due to name: " + code)
      return
    }
    let tree = BracketGrouper.groupIntoOneThrowIfError(tokens)
    let wholeState = new WholeFileParseState()
    let node = parseWholeTypeDef(tree, wholeState)
    if (wholeState.parseErrors.length > 0) {
      // TODO improve parsing
      // console.error("Failed to parse type def from julia: " + code)
    }

    // store it
    if (name in this.names) {
      throwErrorFromTimeout(new AssertError("'" + name + "' declared multiple times in loaded Julia module??"))
    }
    this.names[name] = new TypeResolve(node, null)
  }



  private addFunctionFromSerialized(parts: string[]): void {
    if (parts.length !== 6) throw new AssertError("")

    let name = parts[1]
    let signature = parts[3]
    let path = parts[4]
    if (path === "") path = null
    let lineNumber = 0
    if (parts[5] !== "") lineNumber = parseInt(parts[5])

    let resolve = this.names[name]
    if (resolve) {
      if (!(resolve instanceof FunctionResolve)) {
        throwErrorFromTimeout(new AssertError("'" + name + "' declared both as function and as " +
          getResolveInfoType(resolve) + " in module loaded from Julia??"))
        return
      }
    } else {
      resolve = new FunctionResolve(name)
      this.names[name] = resolve
    }
    let functionResolve = resolve as FunctionResolve

    if (signature.length === 0) {
      // no info on function signature. But we still want to recognize the name exists.
      // Just put in an empty function.
      let node = new FunctionDefNode()
      node.name = [new IdentifierNode(Token.createEmptyIdentifier(name))]
      functionResolve.functionDefs.push([path, node])

    } else {
      // create parsable code, and simply parse as a function definition node
      let code = "function " + signature + "\nend"
      let tokens = Tokenizer.tokenizeThrowIfError(code)
      let tree = BracketGrouper.groupIntoOneThrowIfError(tokens)
      let wholeState = new WholeFileParseState()
      let node = parseWholeFunctionDef(tree, wholeState)
      if (wholeState.parseErrors.length > 0) {
        // TODO improve parsing
        // console.error("Failed to parse function def from julia: " + code)
      }

      // update where the name token points to
      if (node.name.length > 0) {  // may have been a parse failure
        let range: Range = null
        if (lineNumber === 0) {
          range = Range.createEmptyRange()
        } else {
          range = new Range(new Point(lineNumber - 1, 0), new Point(lineNumber - 1, 1))
        }
        node.name[0].token.range = range
      } else {
        console.error("Operator need to handle: " + name)
      }

      functionResolve.functionDefs.push([path, node])
    }

  }


}
