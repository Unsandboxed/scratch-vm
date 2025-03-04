// @ts-check
const SetupCompiler = function (runtime) {
    const log = require('../util/log');
    const compilerData = runtime.compilerData;
    const {
        IntermediateStackBlock,
        IntermediateInput,
        IntermediateStack,
        IntermediateScript,
        IntermediateRepresentation,
        InputType,
        InputOpcode,
        StackOpcode
    } = compilerData._internalExports;
    const {
        sanitize,
        Frame,
        SCALAR_TYPE,
        LIST_TYPE,
        environment,
        Cast,
        PEN_EXT,
        PEN_STATE
    } = require('./shared-exports');
    const exports = {
        log,
        environment,
        IntermediateStackBlock,
        IntermediateInput,
        IntermediateStack,
        IntermediateScript,
        IntermediateRepresentation,
        InputType,
        InputOpcode,
        StackOpcode,
        Frame,
        SCALAR_TYPE,
        LIST_TYPE,
        Cast,
        sanitize,
        PEN_EXT,
        PEN_STATE,
        isSafeInputForEqualsOptimization: (input, other) => {
            // Only optimize constants
            if (input.opcode !== InputOpcode.CONSTANT) return false;
            // Only optimize when the constant can always be thought of as a number
            if (input.isAlwaysType(InputType.NUMBER) || input.isAlwaysType(InputType.STRING_NUM)) {
                if (
                    other.isSometimesType(InputType.STRING_NAN) ||
                    other.isSometimesType(InputType.BOOLEAN_INTERPRETABLE)
                ) {
                    // Never optimize 0 if the other input can be '' or a boolean.
                    // eg. if '< 0 = "" >' was optimized it would turn into `0 === +""`,
                    //  which would be true even though Scratch would return false.
                    return (+input.inputs.value) !== 0;
                }
                return true;
            }
            return false;
        }
    };
    compilerData.exports = Object.assign(Object.create(null), exports, {
        JSGenerator: require('./jsgen.js'),
        IRGenerator: require('./irgen.js').IRGenerator,
        ScriptTreeGenerator: require('./irgen.js').ScriptTreeGenerator,
        log: null
    });
    // CORE
    require('./setup-compiler/motion')(compilerData, exports);
    require('./setup-compiler/looks')(compilerData, exports);
    require('./setup-compiler/sound')(compilerData, exports);
    require('./setup-compiler/event')(compilerData, exports);
    require('./setup-compiler/control')(compilerData, exports);
    require('./setup-compiler/camera')(compilerData, exports);
    require('./setup-compiler/sensing')(compilerData, exports);
    require('./setup-compiler/operator')(compilerData, exports);
    require('./setup-compiler/string')(compilerData, exports);
    require('./setup-compiler/data')(compilerData, exports);
    require('./setup-compiler/procedures')(compilerData, exports);
    // Extensions
    require('./setup-compiler/pen')(compilerData, exports);
    // Other
    require('./setup-compiler/other')(compilerData, exports);
};

module.exports = SetupCompiler;
