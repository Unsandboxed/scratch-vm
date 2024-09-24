const inter = requre('../compiler/intermediate');
const enums = require('../compiler/enums');

class Compiler {
    static Block = class Block {
        constructor(opcode, opts, blockInfo) {
            this.blockInfo = blockInfo || {};
            this.category = opcode.slice(0, opcode.indexOf('_') - 1);
            this.opcode = opcode.slice(opcode.indexOf('_') + 1);
            this.extended_opcode = opcode;
            this.ir_opcode = `${this.category}.${this.opcode}`;
            this.compile = null;
            this.stg = null;
            this.type = opts.type ?? enums.InputType.ANY;
            this.isInput = opts.input || false;
        }
        useMethods(stg, compile) {
            this.compile = (typeof compile === 'function' ? compile : (() => compile)).bind(this);
            this.stg = (typeof stg === 'function' ? stg : (() => stg)).bind(this);
        }
    };
    constructor(runtime) {
        this.runtime = runtime;
        this.stacks = new Map();
        this.inputs = new Map();
        this.compileFns = new Map();
    }
    _updateBlock(block) {
        if (block.isInput) {
            this.inputs.set(block.extended_opcode, block);
        } else {
            this.stacks.set(block.extended_opcode, block);
        }
        this.compileFns.set(block.ir_opcode, block.compile.bind(block));
    }
    registerBlock(opcode, stg, compile, opts) {
        const block = new Compiler.Block(opcode, opts);
        block.updateMethods(stg, compile);
        this._updateBlock(block, opts);
    }
    simpleRegister(blockInfo, categoryInfo, compile, opts) {
        const block = new Compiler.Block(`${categoryInfo.id}_${blockInfo.opcode || blockInfo.func}`, opts, blockInfo);
        block.useMethods(function() {
            if (this.isInput) {
                return new inter.IntermediateInput(this.ir_opcode, this.type, {}, this.yields);
            }
            return new inter.IntermediateStackBlock(this.ir_opcode, {}, this.yields);
        }, compile);
        this._updateBlock(block);
    }
};

// - Shrek was here
module.exports = Compiler;