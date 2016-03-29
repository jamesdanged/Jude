"use strict";
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
class ConfigSchema {
    constructor() {
        this.juliaPath = {
            type: 'string',
            default: "julia",
            description: "Absolute path to julia binary, or file name on PATH."
        };
        this.onlyShowAutocompleteSuggestionsFromJude = {
            type: 'boolean',
            default: false,
            description: 'Excludes the default autocomplete results from Atom, as well as any other autocomplete packages which have lower priority than Jude.'
        };
        this.autocompletePriority = {
            type: 'number',
            default: 2,
            description: "Priority level of Jude's autocomplete results relative to other Atom packages. Higher numbers have higher priority."
        };
    }
}
exports.ConfigSchema = ConfigSchema;
//# sourceMappingURL=ConfigSchema.js.map