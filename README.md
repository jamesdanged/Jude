# Jude

**JUlia Development Extensions**

Jude is a set of development extensions for Julia in the Atom editor to improve developer productivity. Currently, it provides 

* autocomplete 
* jump to definition

Jude performs a full syntax parse of all your Julia files in the workspace, and does scoping analysis statically to resolve names. Names are resolved specific to the scope where they are used, not using fuzzy matching over the entire project. Your project files are not loaded into Julia or executed to run the analysis. All the parsing is done locally within Javascript. 

![Jude demo gif](https://raw.githubusercontent.com/jamesdanged/Jude/master/img/JudeDemo.gif)

##### Autocomplete
Autocomplete leverages Atom's built-in Autocomplete+. Just start typing and it will present choices relevant to the block scope (eg try block, for loop, function scope) where the cursor is located. Additionally, there is function signature help which can be brought up by pressing `ctrl-space` after the `...(`. This enables you to choose between various options if the function is overloaded, and then tab through the arguments. 

Julia is a dynamic language, so autocomplete currently only works for functions/types/variables, not for fields on types. This is because the type of the object often cannot be determined statically, so the fields are unknown. There is no fuzzy matching currently for fields. In the future, there may be some flow analysis that allows types to be inferred such as from function arg list signatures or type assertions. If Julia eventually allows return type declarations, these can be leveraged too.

##### Jump to definition
Jump to definition allows you to quickly go to the declaration of any given name. Just press `ctrl-space` with the cursor inside or next to the name. If it is a variable, the cursor will jump to the place where the variable was declared or first assigned. If it is a type, the cursor will jump to the type declaration. If it is a function name, then a popup will appear to choose between various definitions (if more than one) before jumping to the definition. You can even jump to some function declarations in files not in your workspace, such as in the base library. Your jump history is tracked, and you can go back/forward using `ctrl-alt-left`/`ctrl-alt-right`. (These keyboard shortcuts are only active when Julia files are being edited.)

##### Syntax and name resolution errors
Jude will additionally provide lint warnings and error messages when it cannot parse your code or resolve a name. This is a parser written in Javascript (actually Typescript) separate from the Julia compiler, so there are some gaps in its coverage. Currently, most Julia syntax should be parsed correctly, but this is a work in progress! Please help make it better by reporting any parsing problems or even submitting pull requests. The goal is not necessarily to be a full syntax checker for Julia, but just to be able to resolve names properly. Many errors are shown in the Chromium Dev Tools console, which can be opened with the command `Window: Toggle Dev Tools`. You can customize the linter, for example, to hide the error message panel that pops up at the bottom of the screen by going to the Linter package options and unselecting `Show Error Panel`. If you don't see the Linter package installed, type `apm install linter` in the console.

##### Imported modules
For imported modules that are not in the workspace, Jude starts up a short lived child Julia process and queries it for the module contents. It will import type definitions, function signatures, macros, and variables at the module level. During the first run with Jude newly installed, it may take a minute to retrieve the Base library and any modules you have imported into your files. Afterwards, the results are cached. The path to Julia is configurable in the Jude options.

##### Limitations
Julia is a very flexible language, but for Jude to provide these capabilities, some restrictions are in place. 

* Jude can only follow `include("...")` calls where the string is a constant literal.
* `include("...")` can only be present at the module level, not inside a function.
* Binary operators cannot be overridden to not be binary, eg: `+ = 5`
* Anonymous functions have no signature information. 
  * `foo = (a, b) -> a + b` has no signature information because foo is treated as a variable.
  * `foo(a,b) = a + b` is recognized.

Jude reparses some or all of your code as you type. This is done in <50 ms for small to medium sized codebases, especially if it is broken into modules. If you are editing a file that has no "module" declarations (maybe it is just included in another file that does), the reparse can be <5 ms. If the parsing starts to cause noticable slow down in the GUI, you can reduce the parsing intervals by changing the lint delay in the Linter package (`Lint As You Type Interval`, which defaults to 300 ms).

######Known issues

* The bodies of macro definitions are not parsed.
* Code quotes are not parsed, eg `:(a + b)`, `quote ... end`
* Jump to definition for overloaded functions currently leverages Autocomplete+ for the GUI to select the overload. When you jump, Autocomplete+ will insert the function signature you selected, and Jude will then undo the change. This clears any redos on your undo stack. Eventually, a separate GUI will be created, along with a separate shortcut from `ctrl-space`. 

##### Roadmap
* Testing. 
* Indicators to show when running julia in background or a running a long parse.
* Fix gaps in syntax coverage.
* Use own GUI for jump to function definitions.
* Refactor capability for variable and type names.
* Perhaps factor into service that can be plugged into other editors.
* Simple flow analysis to allow autocomplete of some fields.



