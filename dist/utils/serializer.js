'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var assert_1 = require("./assert");
var StringSet_1 = require("./StringSet");
class DecyclingSerializer {
    constructor(funcs) {
        this.prototypeLookup = {};
        for (let func of funcs) {
            let name = func.name;
            if (name in this.prototypeLookup) {
                throw new assert_1.AssertError("Multiple prototypes for constructors named '" + name + "'");
            }
            this.prototypeLookup[name] = func.prototype;
        }
        this.classesWhichDontNeedPrototype = StringSet_1.createStringSet(["Object", "Array"]);
    }
    serialize(obj) {
        return JSON.stringify(decycle(obj), this.storePrototypeInfo.bind(this));
    }
    deserialize(s) {
        return retrocycle(JSON.parse(s, this.restorePrototypeChain.bind(this)));
    }
    restorePrototypeChain(key, value) {
        if (typeof (value) === "object") {
            if ("@type" in value) {
                let typeName = value["@type"];
                if (typeName in this.prototypeLookup) {
                    delete value["@type"];
                    Object.setPrototypeOf(value, this.prototypeLookup[typeName]);
                }
                else {
                    throw new assert_1.AssertError("No prototype found for " + typeName);
                }
            }
        }
        return value;
    }
    storePrototypeInfo(key, value) {
        if (typeof (value) === "object" && value !== null) {
            let protoName = Object.getPrototypeOf(value).constructor.str;
            if (!(protoName in this.classesWhichDontNeedPrototype)) {
                if (!(protoName in this.prototypeLookup)) {
                    throw new assert_1.AssertError("Type " + protoName + " not set up for serialization.");
                }
                value["@type"] = protoName;
            }
        }
        //if (key === "") {
        //  value.typeInfo = Object.getPrototypeOf(value).constructor.name
        //}
        //if (this instanceof Foo) {
        //  console.log("Proessing Foo: " + key + ": " + value)
        //}
        //if (this instanceof Bar) {
        //  console.log("Proessing Bar: " + key + ": " + value)
        //}
        //if (value instanceof Foo) {
        //  console.log("Proessing value Foo: " + key + ": " + value)
        //}
        //if (value instanceof Bar) {
        //  console.log("Proessing value Bar: " + key + ": " + value)
        //}
        return value;
    }
}
exports.DecyclingSerializer = DecyclingSerializer;
// Based on JSON2 package.
// Added modifications:
// Using ES6 maps internally for speed.
// Copies the prototype over for all objects.
//
// Note, this doesn't support ES6 maps for decycling, yet...
// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form
//      {$ref: PATH}
// where the PATH is a JSONPath string that locates the first occurance.
// So,
//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));
// produces the string '[{"$ref":"$"}]'.
// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child member or
// property.
function decycle(object) {
    var map = new Map(); // map object to paths
    //var objects = [],   // Keep a reference to each unique object or array
    //  paths = [];     // Keep the path to each unique object or array
    // The derez recurses through the object, producing the deep copy.
    function derez(value, path) {
        var i, // The loop counter
        name, // Property name
        nu; // The new object or array
        switch (typeof value) {
            case 'object':
                // typeof null === 'object', so get out if this value is not really an object.
                if (!value) {
                    return null;
                }
                // If the value is an object or array, look to see if we have already
                // encountered it. If so, return a $ref/path object. This is a hard way,
                // linear search that will get slower as the number of unique objects grows.
                if (map.has(value)) {
                    return { $ref: map.get(value) };
                }
                //for (i = 0; i < objects.length; i += 1) {
                //  if (objects[i] === value) {
                //    return {$ref: paths[i]};
                //  }
                //}
                // Don't allow ES6 maps to be serialized.
                if (value instanceof Map) {
                    throw new Error("Cannot serialize instances of ES6 map!");
                }
                // Otherwise, accumulate the unique value and its path.
                map.set(value, path);
                //objects.push(value);
                //paths.push(path);
                // If it is an array, replicate the array.
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    nu = [];
                    for (i = 0; i < value.length; i += 1) {
                        nu[i] = derez(value[i], path + '[' + i + ']');
                    }
                }
                else {
                    // If it is an object, replicate the object.
                    nu = {};
                    Object.setPrototypeOf(nu, Object.getPrototypeOf(value)); // Copy prototype over
                    for (name in value) {
                        if (Object.prototype.hasOwnProperty.call(value, name)) {
                            nu[name] = derez(value[name], path + '[' + JSON.stringify(name) + ']');
                        }
                    }
                }
                return nu;
            case 'number':
            case 'string':
            case 'boolean':
                return value;
        }
    }
    return derez(object, '$');
}
// Restore an object that was reduced by decycle. Members whose values are
// objects of the form
//      {$ref: PATH}
// are replaced with references to the value found by the PATH. This will
// restore cycles. The object will be mutated.
// The eval function is used to locate the values described by a PATH. The
// root object is kept in a $ variable. A regular expression is used to
// assure that the PATH is extremely well formed. The regexp contains nested
// * quantifiers. That has been known to have extremely bad performance
// problems on some browsers for very long strings. A PATH is expected to be
// reasonably short. A PATH is allowed to belong to a very restricted subset of
// Goessner's JSONPath.
// So,
//      var s = '[{"$ref":"$"}]';
//      return JSON.retrocycle(JSON.parse(s));
// produces an array containing a single element which is the array itself.
function retrocycle($) {
    var px = /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;
    // The rez function walks recursively through the object looking for $ref
    // properties. When it finds one that has a value that is a path, then it
    // replaces the $ref object with a reference to the value that is found by
    // the path.
    function rez(value) {
        var i, item, name, path;
        if (value && typeof value === 'object') {
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                for (i = 0; i < value.length; i += 1) {
                    item = value[i];
                    if (item && typeof item === 'object') {
                        path = item.$ref;
                        if (typeof path === 'string' && px.test(path)) {
                            value[i] = eval(path);
                        }
                        else {
                            rez(item);
                        }
                    }
                }
            }
            else {
                for (name in value) {
                    if (typeof value[name] === 'object') {
                        item = value[name];
                        if (item) {
                            path = item.$ref;
                            if (typeof path === 'string' && px.test(path)) {
                                value[name] = eval(path);
                            }
                            else {
                                rez(item);
                            }
                        }
                    }
                }
            }
        }
    }
    rez($);
    return $;
}
//# sourceMappingURL=serializer.js.map