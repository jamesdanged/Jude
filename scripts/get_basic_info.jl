println("##DATA##\t$(Pkg.dir())")

for p in LOAD_PATH
  println("##DATA##\t$p")
end


