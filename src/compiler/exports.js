const E1 = (() => {
    const VariablePool = require('./variable-pool');
    const log = require('../util/log');

    // Pen-related constants
    const PEN_EXT = 'runtime.ext_pen';
    const PEN_STATE = `${PEN_EXT}._getPenState(target)`;

    const sanitize = string => {
        if (typeof string !== 'string') {
            log.warn(`sanitize got unexpected type: ${typeof string}`);
            if (typeof string === 'object') {
                return JSON.stringify(string);
            }
            // eslint-disable-next-line prefer-template
            string = '' + string;
        }
        return JSON.stringify(string).slice(1, -1);
    };

    /**
     * A frame contains some information about the current substack being compiled.
     */
    class Frame {
        constructor (isLoop, isBreakable) {
            /**
             * Whether the current stack runs in a loop (while, for)
             * @type {boolean}
             * @readonly
             */
            this.isLoop = isLoop;

            /**
             * For compatibility with StackFrame
             * @type {boolean}
             */
            this.isIterable = this.isLoop;

            /**
             * Whether the current block is the last block in the stack.
             * @type {boolean}
             */
            this.isLastBlock = false;

            /**
             * Whether or not the current stack can be broken by continue or break
             * @type {boolean}
             * @readonly
             */
            this.isBreakable = isLoop ? true : (isBreakable ?? false);

            /**
             * Whether or not this block is ran in the compatibility layer
             * @type {boolean}
             */
            this.isCompat = false;
        }
    }

    const SCALAR_TYPE = '';
    const LIST_TYPE = 'list';

    /**
    * Variable pool used for factory function names.
    */
    const factoryNameVariablePool = new VariablePool('factory');

    /**
    * Variable pool used for generated functions (non-generator)
    */
    const functionNameVariablePool = new VariablePool('fun');

    /**
    * Variable pool used for generated generator functions.
    */
    const generatorNameVariablePool = new VariablePool('gen');

    return {
        sanitize,
        environment: require('./environment'),
        SCALAR_TYPE,
        LIST_TYPE,
        Frame,
        PEN_EXT,
        PEN_STATE,
        factoryNameVariablePool,
        functionNameVariablePool,
        generatorNameVariablePool,
        VariablePool,
        Cast: require('../util/cast'),
        InputType: require('./enums.js').InputType,
        InputOpcode: require('./enums.js').InputOpcode,
        StackOpcode: require('./enums.js').StackOpcode
    };
})();

const E2 = Object.assign(E1, (() => {
    const {
        InputType,
        InputOpcode
    } = E1;
    const exports = {
        log: require('../util/log'),
        IntermediateStackBlock: require('./intermediate.js').IntermediateStackBlock,
        IntermediateInput: require('./intermediate.js').IntermediateInput,
        IntermediateStack: require('./intermediate.js').IntermediateStack,
        IntermediateScript: require('./intermediate.js').IntermediateScript,
        IntermediateRepresentation: require('./intermediate.js').IntermediateRepresentation,
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
        },
        JSGenerator: require('./jsgen.js'),
        IRGenerator: require('./irgen.js').IRGenerator,
        ScriptTreeGenerator: require('./irgen.js').ScriptTreeGenerator,
        IROptimizer: require('./iroptimizer.js').IROptimizer,
        TypeState: require('./iroptimizer.js').TypeState,
        VariablePool: require('./variable-pool.js'),
        execute: require('./jsexecute.js'),
        compile: require('./compile'),
        CompatBlocks: require('./compat-blocks.js'),
        compatBlockUtility: require('./compat-block-utility.js')
    };
    return exports;
})());

module.exports = E2;
