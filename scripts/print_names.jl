module_name = ARGS[1]
println("Retrieving $module_name")

eval(parse("import $module_name"))
module_object = eval(parse(module_name))

allSymbols = Set{Symbol}(names(module_object, true, true)) # all names + imported
exportedSymbols = Set{Symbol}(names(module_object))

hiddenSymbols = Set{Symbol}()
for k in allSymbols
  if !(k in exportedSymbols)
    push!(hiddenSymbols, k)
  end
end
hiddenSymbols

function print_name_info(symbol::Symbol, isExported::Bool)
  name = string(symbol)
  local symbol_obj
  try
    symbol_obj = eval(module_object, symbol)
  catch
    println("Failed to evaluate '$name'. Skipping.")
    return
  end

  if typeof(symbol_obj) == Function
    if name[1] == '@'
      print_macro_info(name, isExported)
    else
      print_function_info(symbol, symbol_obj, name, isExported)
    end
  elseif typeof(symbol_obj) == DataType
    print_type_info(symbol, symbol_obj, name, isExported)
  elseif typeof(symbol_obj) == Module
    # TODO
  else
    #println("Neither type nor function: $name. Is a $(typeof(symbol_obj))")
    print_variable_info(symbol, symbol_obj, name, isExported)
  end
end


function print_variable_info(symbol::Symbol, obj, name::AbstractString, isExported::Bool)
  exp = isExported ? "exported" : "hidden"
  println("##DATA##\tvariable\t$name\t$exp")
end

function print_type_info(symbol::Symbol, type_obj::DataType, name::AbstractString, isExported::Bool)
  super = type_obj.super
  generic_params = type_obj.parameters
  field_names = fieldnames(type_obj)
  field_types = type_obj.types
  is_abstract = type_obj.abstract
  is_immutable = !type_obj.mutable

  code = "type "
  code *= name

  if length(generic_params) > 0
    code *= "{"
    for i = 1:length(generic_params)
      param = generic_params[i]
      code *= string(param)
      if i != length(generic_params)
        code *= ","
      end
    end
    code *= "}"
  end

  if super != Any
    code *= " <: "
    code *= string(super.name)
  end

  code *= " "

  if length(field_names) != length(field_types)
    # known cases: Dims, StdIOSet, Tuple
    # Rather than omit, simply return an empty type
    println("Warning: $name has different number of field names from field types. Omitting fields.")

  else

    for i = 1:length(field_names)
      iname = string(field_names[i])
      itype = field_types[i]

      # cannot have field named same as a keyword. Will cause parsing problems.
      # Known issue with type: TypeName, MethodTable, LambdaStaticData
      if iname == "module"
        println("Warning: type '$name' has field name 'module'. Skipping.")
        return
      end

      code *= iname
      if itype != Any
        code *= "::$(string(itype))"
      end
      code *= "; "
    end

  end
  code *= " end"

  exp = isExported ? "exported" : "hidden"

  println("##DATA##\ttype\t$name\t$exp\t$code")
end


function print_macro_info(name::AbstractString, isExported::Bool)
  exp = isExported ? "exported" : "hidden"
  println("##DATA##\tmacro\t$name\t$exp")
end

function print_function_info(symbol::Symbol, function_obj::Function, name::AbstractString, isExported::Bool)
  exp = isExported ? "exported" : "hidden"

  # no method table exists for these
  # And we cannot get the signature
  if Base.function_name(function_obj) == :anonymous
    sig = ""
    path = ""
    line_number = 0
    println("##DATA##\tfunction\t$name\t$exp\t$sig\t$path\t$line_number")
    return
  end

  try
    mets = methods(function_obj)
    for m in mets
      sig = string(m)
      sig = split(sig, " at ")[1]
      if contains(sig, "#")
        #println("Warning: skipping strange signature: $sig")
        continue
      end


      path = ""
      line_number = 0
      try
        path_tup = functionloc(m)
        path = path_tup[1]
        line_number = path_tup[2]
      catch err
        #println("Warning: failed to get location of method '$name'")
      end

      println("##DATA##\tfunction\t$name\t$exp\t$sig\t$path\t$line_number")
    end
  catch err
    println("Failed to get methods for $name")
    println(function_obj)
    println("Error: $err")
  end

end



function run()
#   halt_early_counter = 0
#   halt_after = 100
  for symbol in exportedSymbols
    print_name_info(symbol, true)
#     halt_early_counter += 1
#     if halt_early_counter > halt_after
#       return
#     end
  end
  for symbol in hiddenSymbols
    print_name_info(symbol, false)
  end
end

run()
