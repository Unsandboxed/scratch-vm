const inter = require('../compiler/intermediate');
const enums = require('../compiler/enums');

class Compiler {
    static Block = class Block {
        static block = Symbol('Compiler.Block');
        constructor(opcode, opts, blockInfo, categoryInfo) {
            opts = opts || {
              type: enums.InputType.ANY,
              yields: false,
              input: false
            };
            this.categoryInfo = categoryInfo;
            this.blockInfo = blockInfo || { arguments: {} };
            this.category = opcode.slice(0, opcode.indexOf('_'));
            this.opcode = opcode.slice(opcode.indexOf('_') + 1);
            this.extended_opcode = opcode;
            this.ir_opcode = `${this.category}.${this.opcode}`;
            this.compile = null;
            this.stg = null;
            this._original = {
              type: opts?.type ?? enums.InputType.ANY,
              yields: opts?.yields || false
            };
            this._reset();
            this.isInput = opts?.input || false;
        }
        _reset() {
          this.type = this._original.type;
          this.yields = this._original.yields;
        }
        _descendInputs(stg, block) {
            const inputs = {
                [Block.block]: block
            };
            if (!this.blockInfo.arguments) return inputs;
            Object.keys(this.blockInfo.arguments).forEach(argumentName => {
                inputs[argumentName] = stg.descendInput(block, argumentName);
            });
            return inputs;
        }
        // eslint-disable-next-line no-unused-vars
        useMethods(dynamicChanges, stg, compile) {
            compile = (typeof compile === 'function' ? compile : (() => compile)).bind(this);
            stg = (typeof stg === 'function' ? stg : (() => stg)).bind(this);
            this.compile = compile;
            this.stg = stg;
        }
    };
    constructor(runtime) {
        this.runtime = runtime;
        this.stacks = new Map();
        this.inputs = new Map();
        this.compileFns = new Map();
        this.exports = {
            ...inter,
            ...enums
        };
    }
    _updateBlock(block) {
        if (block.isInput) {
            this.inputs.set(block.extended_opcode, block);
        } else {
            this.stacks.set(block.extended_opcode, block);
        }
        this.registerCompileFn(block.ir_opcode, block?.compile?.bind?.(block));
    }
    registerCompileFn(ir_opcode, fn) {
        if (fn) {
            const irArray = Array.isArray(ir_opcode);
            const fnArray = Array.isArray(fn);
            if (irArray || fnArray) {
                if (irArray && fnArray) {
                    ir_opcode.forEach((ir_opcodev, i) => {
                        this.compileFns.set(ir_opcodev, fn[i]);
                    });
                } else if (irArray) {
                    ir_opcode.forEach(ir_opcodev => {
                        this.compileFns.set(ir_opcodev, fn);
                    });
                } else {
                    fn.forEach(fnv => {
                        this.compileFns.set(ir_opcode, fnv);
                    });
                }
            } else {
                this.compileFns.set(ir_opcode, fn);
            }
        }
    }
    registerBlock(opcode, stg, compile, opts) {
        opts = opts || {};
        if (!Array.isArray(opcode)) {
            opcode = [opcode];
        }
        const compileArray = Array.isArray(compile);
        for (let i = 0; i < opcode.length; i++) {
            const opcodev = opcode[i];
            const compilev = compileArray ? compile[i] : compile;
            const block = new Compiler.Block(opcodev, opts);
            block.useMethods((opts?.dynamicChanges || false), stg, compilev);
            this._updateBlock(block, opts);
        }
    }
    simpleRegister(blockInfo, categoryInfo, compile, opts) {
        opts = opts || {};
        if (!Array.isArray(blockInfo)) {
          blockInfo = [blockInfo];
        }
        const compileArray = Array.isArray(compile);
        // eslint-disable-next-line no-unused-vars
        const stg = function(stg, block, preserveInputs) {
            if (this.isInput) {
                return new inter.IntermediateInput(this.ir_opcode, this.type, this._descendInputs(stg, block), this.yields);
            }
            return new inter.IntermediateStackBlock(this.ir_opcode, this._descendInputs(stg, block), this.yields);
        };
        for (let i = 0; i < blockInfo.length; i++) {
            const blockInfov = blockInfo[i];
            const compilev = compileArray ? compile[i] : compile;
            const block = new Compiler.Block(`${categoryInfo.id}_${
              blockInfov.opcode ||
              blockInfov.func
            }`, opts, blockInfov, categoryInfo);
            block.useMethods((opts?.dynamicChanges || false), stg, compilev);
            this._updateBlock(block);
        }
    }
};

// - Shrek was here
module.exports = Compiler;