/**
 * @fileoverview
 * This is the compiler API. (used to interface)
 */

const inter = require('../compiler/intermediate');
const enums = require('../compiler/enums');
const BlockType = require('../extension-support/block-type.js');

/**
 * @callback CompileFunction
 * @param {import("../compiler/jsgen.js").JSGenerator} jsg JSGenerator.
 * @param {import("../compiler/intermediate.js").IntermediateInput} block The STG form of the block.
 * @param {boolean} [isInput] Is this block an input?
 * @returns {void|string} The JS if it is an input, otherwise void.
 */
/**
 * @callback STGFunction
 * @param {import("../compiler/irgen.js").ScriptTreeGenerator} stg ScriptTreeGenerator.
 * @returns {
 *   import("../compiler/intermediate.js").IntermediateInput |
 *   import("../compiler/intermediate.js").IntermediateStackBlock
 * } The generated STG form of the passed block.
 */
/**
 * @callback RegisterFunction
 * @param {InstanceType<Compiler>} [compilerData] The compiler API instance.
 * @param {InstanceType<Compiler>.exports} [exports] The compiler API exports.
 * @return {void}
 */

/**
 * @typedef {{type?: number, yields?: boolean, input?: boolean}} BlockOptions
 */

class Compiler {
    static Block = /** @typedef Block */class Block {
        static block = Symbol('Compiler.Block');
        /**
         * Intermediary Compiler API representation of a block.
         * @param {string} opcode The block opcode.
         * @param {BlockOptions?} opts Options for this block.
         * @param {object} [blockInfo] The block info.
         * @param {object} [categoryInfo] The category info.
         */
        constructor (opcode, opts, blockInfo, categoryInfo) {
            opts = opts || {
                type: enums.InputType.ANY,
                yields: false,
                input: false
            };
            /** @type {object|null} The ext-category information for this block. */
            this.categoryInfo = categoryInfo;
            /** @type {object|null} The ext-block information for this block. */
            this.blockInfo = blockInfo || {arguments: {}};
            /** @type {string} The category id for this block. */
            this.category = opcode.slice(0, opcode.indexOf('_'));
            /** @type {string} The block opcode for this block. */
            this.opcode = opcode.slice(opcode.indexOf('_') + 1);
            /** @type {string} The full opcode for this block. */
            this.extended_opcode = opcode;
            /** @type {string} The IR string for this block. */
            this.ir_opcode = `${this.category}.${this.opcode}`;
            /** @type {CompileFunction?} Compilation function. */
            this.compile = null;
            /** @type {STGFunction?} ScriptTreeGeneration function. */
            this.stg = null;
            /**
             * The original values of stuff that can change.
             * @type {{type: number, yields: boolean}}
             */
            this._original = {
                type: opts?.type ?? enums.InputType.ANY,
                yields: opts?.yields || false
            };
            this._reset();
            /**
             * Is this block an input?
             * @type {boolean}
             */
            this.isInput = opts?.input || false;
        }
        /**
         * Resets the values back to the original values.
         */
        _reset () {
            /** @type {number} The return type for this block. */
            this.type = this._original.type;
            /** @type {boolean} Does this block yield? */
            this.yields = this._original.yields;
        }
        /**
         * Descends the current block and gets its inputs based on the blockInfo.
         * @param {import("../compiler/irgen.js").ScriptTreeGenerator} stg ScriptTreeGenerator.
         * @param {object} block The block (VM).
         * @returns {object} The generated inputs.
         */
        _descendInputs (stg, block) {
            const inputs = {
                [Block.block]: block
            };
            if (!this.blockInfo.arguments) return inputs;
            Object.keys(this.blockInfo.arguments).forEach(argumentName => {
                inputs[argumentName] = stg.descendInputOfBlock(block, argumentName);
            });
            return inputs;
        }
        /**
         * Bind the scripttree and compilation functions to this block.
         * @param {boolean} dynamicChanges Does this block possibly change generation values?
         * @param {STGFunction} stg ScriptTreeGeneration function.
         * @param {CompileFunction} compile The compilation function.
         */
        // eslint-disable-next-line no-unused-vars
        useMethods (dynamicChanges, stg, compile) {
            compile = (typeof compile === 'function' ? compile : (
                this.isInput ?
                    (str => str) :
                    ((str, jsg) => void (jsg.source += str))
            ).bind(null, compile)).bind(this);
            stg = stg.bind(this);
            this.compile = compile;
            this.stg = stg;
        }
    };
    /**
     * The main compiler API.
     * @param {Runtime} runtime The runtime.
     */
    constructor (runtime) {
        /** @type {Runtime} The runtime */
        this.runtime = runtime;

        /** @type {Map<string, Block>} A map of opcodes to stack blocks. */
        this.stacks = new Map();
        /** @type {Map<string, Block>} A map of opcodes to input blocks. */
        this.inputs = new Map();
        /** @type {Map<string, CompileFunction>} A map of ir-opcodes to compilation functions. */
        this.compileFns = new Map();
        /** @type {object} @protected Internal exports. */
        this._internalExports = require('../compiler/exports.js');
        /**
         * All the exports for the compiler.
         *
         * Handled by {@file .\setup-compiler.js}
         * @type {object?}
         */
        this.exports = null;

        /**
         * A list of block types that act like stacks but arent specifically branches.
         * @type {Set<BlockType[?]>}
         */
        this.bt_stacks = new Set([
            BlockType.COMMAND,
            BlockType.HAT
        ]);

        /**
         * A list of block types that act or are branch specific blocks.
         * @type {Set<BlockType[?]>}
         */
        this.bt_branchables = new Set([
            BlockType.CONDITIONAL,
            BlockType.LOOP
        ]);

        /**
         * A list of block types that run like loops.
         * @type {Set<BlockType[?]>}
         */
        this.bt_loops = new Set([
            BlockType.LOOP
        ]);

        /**
         * A list of inline block types.
         * @type {Set<BlockType[?]>}
         */
        this.bt_inlines = new Set([
            // Inline behavior is now inferred from branchCount on input block types.
        ]);

        /**
         * A list of valid input block types.
         * @type {Set<BlockType[?]>}
         */
        this.bt_inputs = new Set([
            BlockType.REPORTER,
            BlockType.ARRAY,
            BlockType.OBJECT,
            BlockType.BOOLEAN
        ]);

        /**
         * A mapping of block types to output types.
         * @type {Map<BlockType[?], number>}
         */
        this.bt_to_type = new Map([
            [BlockType.REPORTER, enums.InputType.ANY],
            [BlockType.BOOLEAN, enums.InputType.BOOLEAN_INTERPRETABLE],
            [BlockType.ARRAY, enums.InputType.ARRAY],
            [BlockType.OBJECT, enums.InputType.OBJECT]
        ]);

        /**
         * Runs the wrapper function with {this} and {this.exports}.
         * @param {RegisterFunction} fn The wrapper to run.
         * @returns {void}
         */
        this.with = fn => fn(this, this.exports);
    }

    /**
     * Update the block to exist, or overwrite onto the data in the api.
     * @param {Block} block The block to update.
     */
    _updateBlock (block) {
        if (block.isInput) {
            this.inputs.set(block.extended_opcode, block);
        } else {
            this.stacks.set(block.extended_opcode, block);
        }
        const compile = (block.compile && block.compile.bind(block)) || null;
        this.registerCompileFn(block.ir_opcode, compile);
    }

    /**
     * Register the compilation function for the block(s) passed.
     * @param {string|Array<string>} irOpcode The ir-opcode(s) to register under. (should match Block.ir_opcode)
     * @param {CompileFunction|Array<CompileFunction>|null} fn The function(s) to use along side the ir-opcode(s).
     * @returns {void}
     */
    registerCompileFn (irOpcode, fn) {
        if (fn) {
            const irArray = Array.isArray(irOpcode);
            const fnArray = Array.isArray(fn);
            if (irArray || fnArray) {
                if (irArray && fnArray) {
                    irOpcode.forEach((irOpcodev, i) => {
                        if (fn[i] === null) return;
                        this.compileFns.set(irOpcodev, fn[i]);
                    });
                } else if (irArray) {
                    if (fn === null) return;
                    irOpcode.forEach(irOpcodev => {
                        this.compileFns.set(irOpcodev, fn);
                    });
                } else {
                    if (fn === null) return;
                    fn.forEach(fnv => {
                        this.compileFns.set(irOpcode, fnv);
                    });
                }
            } else {
                if (fn === null) return;
                this.compileFns.set(irOpcode, fn);
            }
        }
    }

    /**
     * Register a block to the API. (higher control function)
     * @param {string} opcode The block opcode (in extended form).
     * @param {STGFunction} stg ScriptTreeGeneration function.
     * @param {CompileFunction} compile Compilation function.
     * @param {BlockOptions?} opts The options for this block.
     */
    registerBlock (opcode, stg, compile, opts) {
        opts = opts || {};
        if (!Array.isArray(opcode)) {
            opcode = [opcode];
        }
        const compileArray = Array.isArray(compile);
        for (let i = 0; i < opcode.length; i++) {
            const opcodev = opcode[i];
            const compilev = compileArray ? compile[i] : compile;
            const block = new Compiler.Block(opcodev, opts);
            block.useMethods((opts.dynamicChanges || false), stg, compilev);
            this._updateBlock(block, opts);
        }
    }

    /**
     * Registers a block using extension data, skipping ScriptTreeGeneration with a pregenerated function.
     * @param {object} categoryInfo The
     * @param {object} blockInfo The block info.
     * @param {CompileFunction} compile Compilation function.
     * @param {BlockOptions?} opts The options for this block.
     * @private
     */
    _simpleRegister (categoryInfo, blockInfo, compile, opts) {
        opts = opts || {};
        if (!Array.isArray(blockInfo)) {
            blockInfo = [blockInfo];
        }
        const compileArray = Array.isArray(compile);
        /* eslint-disable no-invalid-this */
        // eslint-disable-next-line no-unused-vars
        const stg = function (stg_, block, preserveInputs) {
            if (this.isInput) {
                return new inter.IntermediateInput(
                    this.ir_opcode, this.type, this._descendInputs(stg_, block), this.yields
                );
            }
            return new inter.IntermediateStackBlock(
                this.ir_opcode, this._descendInputs(stg_, block), this.yields
            );
        };
        /* eslint-enable no-invalid-this */
        for (let i = 0; i < blockInfo.length; i++) {
            const blockInfov = blockInfo[i];
            const compilev = compileArray ? compile[i] : compile;
            const block = new Compiler.Block(`${categoryInfo.id}_${
                blockInfov.opcode ||
                blockInfov.func
            }`, opts, blockInfov, categoryInfo);
            block.useMethods((opts.dynamicChanges || false), stg, compilev);
            this._updateBlock(block);
        }
    }

    /**
     * Registers extension blocks to the API using the category info and a simpler API. (lower control)
     * @param {object} categoryInfo The category information for the extension.
     * @param {Object.<string, [CompileFunction, BlockOptions?]>} binds The compilation functions for this extension.
     */
    simpleRegister (categoryInfo, binds) {
        const opcodes = Object.keys(binds);
        for (let i = 0; i < opcodes.length; i++) {
            const opcode = opcodes[i];
            const compile = binds[opcode][0];
            const opts = binds[opcode][1] ?? {};
            const blockInfo = categoryInfo.blocks.find(block => block.opcode === opcode);
            opts.input = this.bt_inputs.has(blockInfo.blockType);
            opts.type = (opts.type ?? this.bt_to_type.get(blockInfo.blockType)) ?? enums.InputType.ANY;
            this._simpleRegister(categoryInfo, blockInfo, compile, opts);
        }
    }
}

// - Shrek was here
module.exports = Compiler;
