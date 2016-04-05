# Jude

**JUlia Development Extensions**

Jude statically parses your codebase in javascript to provide IDE like capabilities for Atom: 

* non-fuzzy autocomplete 
* jump to definition
* forward/back cursor history
* highlights incorrect name errors and some parsing errors

In the future, this may include tools to find usages of a function, limited static type checking, and some refactoring/renaming.

![Jude demo gif](https://raw.githubusercontent.com/jamesdanged/Jude/master/img/JudeDemo.gif)

### Getting started

`julia` should be on your PATH. You can customize the exact path to julia in the Jude package settings.

**Autocomplete** is triggered by typing. Only names available in the scope (eg try block, for loop, function scope) are shown. To get function signatures, press `ctrl-space` after the `...(`. You can `tab` through the arg list.

**Jump to defintion** is also triggered by `ctrl-space` when the cursor is on any word. You can jump to function definitions, type defintions, or variable declarations for files in your workspace. You can even jump to some function declarations in files not in your workspace, such as in the base library. Your jump history is tracked, and you can go back/forward using `ctrl-alt-left`/`ctrl-alt-right`. 

**Syntax errors** are highlighted as lint warnings. Jude shows these when it cannot parse your code or resolve a name. You can customize the linter to hide the error message panel that pops up at the bottom of the screen by going to the Linter package options and unselecting `Show Error Panel`.

### How it works

Jude performs a full syntax parse of all the Julia files in your workspace in Javascript, and does scoping analysis statically to resolve names. Names are resolved specific to the scope where they are used, not using fuzzy matching over the entire project. Your project files are not loaded into Julia or executed to run the analysis.  

Jude reparses some or all of your code as you type. This is done in <50 ms for small to medium sized codebases, especially if it is broken into modules. If you are editing a file that has no "module" declarations (maybe it is just included in another file that does), the reparse can be <5 ms. 

This is a parser written in Javascript (actually Typescript) separate from the Julia compiler, so there are some gaps in its coverage. Currently, most Julia syntax should be parsed correctly, but this is a work in progress! Please help make it better by reporting any parsing problems or even submitting pull requests. The goal is not necessarily to be a full syntax checker for Julia, but just to be able to resolve names properly. Many errors are shown in the Chromium Dev Tools console, which can be opened with the command `Window: Toggle Dev Tools`. 

For imported modules that are not in the workspace, Jude starts up a short lived child Julia process and queries it for the module contents. It will import type definitions, function signatures, macros, and variables at the module level. During the first run with Jude newly installed, it may take a minute to retrieve the Base library and any modules you have imported into your files. Afterwards, the results are cached. The path to Julia is configurable in the Jude options.

### Limitations
Julia is a very flexible language, but for Jude to provide these capabilities, some restrictions are in place. 

* Jude can only follow `include("...")` calls where the string is a constant literal.
* `include("...")` can only be present at the module level, not inside a function.
* Binary operators cannot be overridden to not be binary, eg: `+ = 5`
* Anonymous functions have no signature information. 
  * `foo = (a, b) -> a + b` has no signature information because foo is treated as a variable.
  * `foo(a,b) = a + b` is recognized.
* Jude can jump to function definitions not in your workspace, but Julia reflection doesn't provide the locations for type definitions or macro definitions.

Parsing should be very fast, but if it starts to cause noticable slow down in the GUI, you can reduce the parsing intervals by changing the lint delay in the Linter package (`Lint As You Type Interval`, which defaults to 300 ms). 

Julia is a dynamic language, so autocomplete currently only works for functions/types/variables, not for fields on types. This is because the type of the object often cannot be determined statically, so the fields are unknown. There is no fuzzy matching currently for fields. In the future, there may be some flow analysis that allows types to be inferred such as from function arg list signatures or type assertions. If Julia eventually allows return type declarations, these can be leveraged too.

### Known issues

* The bodies of macro definitions are not parsed.
* Code quotes are not parsed, eg `:(a + b)`, `quote ... end`
* Jump to definition for overloaded functions currently leverages Autocomplete+ for the GUI to select the overload. When you jump, Autocomplete+ will insert the function signature you selected, and Jude will then undo the change. This clears any redos on your undo stack. Eventually, a separate GUI will be created, along with a separate shortcut from `ctrl-space`. 

### Roadmap
* Testing. 
* Indicators to show when running julia in background or a running a long parse.
* Fix gaps in syntax coverage.
* Use own GUI for jump to function definitions.
* Refactor capability for variable and type names.
* Perhaps factor into service that can be plugged into other editors.
* Simple flow analysis to allow autocomplete of some fields.



