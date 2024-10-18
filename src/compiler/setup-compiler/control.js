// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    IntermediateStack,
    StackOpcode,
    InputType,
    Frame,
    SCALAR_TYPE
}) {
    // Stack
    compilerData.registerBlock('control_all_at_once', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            stack: stg.descendSubstack(block, 'SUBSTACK'),
        });
    }, function(jsg, block) {
        const previousWarp = jsg.isWarp;
        jsg.isWarp = true;
        // @ts-ignore
        jsg.descendStack(block.inputs.stack, new Frame(false));
        jsg.isWarp = previousWarp;
    }, {
        input: false
    });
    compilerData.registerBlock('contorl_create_clone_of', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            target: stg.descendInputOfBlock(block, 'CLONE_OPTION').toType(InputType.STRING)
        });
    }, function(jsg, block) {
        jsg.source += `runtime.ext_scratch3_control._createClone(${this.descendInput(block.inputs.target)}, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('control_delete_this_clone', function() {
        return new IntermediateStackBlock(this.ir_opcode, {}, true);
        // eslint-disable-next-line no-unused-vars  
    }, function(jsg, _) {
        jsg.source += 'if (!target.isOriginal) {\n';
        jsg.source += '  runtime.disposeTarget(target);\n';
        jsg.source += '  runtime.stopForTarget(target);\n';
        jsg.retire();
        jsg.source += '}\n';
    }, {
        input: false
    });
    compilerData.registerBlock('control_forever', function(stg, block) {
        this.yields = stg.analyzeLoop();
        return new IntermediateStackBlock('control.while', {
            condition: stg.createConstantInput(true).toType(InputType.BOOLEAN),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_for_each', function(stg, block) {
        this.yields = stg.analyzeLoop();
        return new IntermediateStackBlock(this.ir_opcode, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE),
            count: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_if', function(stg, block) {
        return new IntermediateStackBlock('control.if_else', {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            whenTrue: stg.descendSubstack(block, 'SUBSTACK'),
            whenFalse: new IntermediateStack()
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('control_if_else', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            whenTrue: stg.descendSubstack(block, 'SUBSTACK'),
            whenFalse: new IntermediateStack()
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('control_repeat', function(stg, block) {
        this.yields = stg.analyzeLoop();
        return new IntermediateStackBlock(this.ir_opcode, {
            times: stg.descendInputOfBlock(block, 'TIMES').toType(InputType.NUMBER),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_repeat_until', function(stg, block) {
        // Dirty hack: automatically enable warp timer for this block if it uses timer
        // This fixes project that do things like "repeat until timer > 0.5"
        stg.usesTimer = false;
        const needsWarpTimer = stg.usesTimer;
        this.yields = stg.analyzeLoop() || needsWarpTimer;
        const condition = stg.descendInputOfBlock(block, 'CONDITION');
        return new IntermediateStackBlock(StackOpcode.CONTROL_WHILE, {
            condition: new IntermediateInput('operator.not', InputType.BOOLEAN, {
                operand: condition
            }),
            do: stg.descendSubstack(block, 'SUBSTACK'),
            warpTimer: needsWarpTimer
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_stop', function(_, block) {
        const level = block.fields.STOP_OPTION.value;
        if (level === 'all') {
            return new IntermediateStackBlock('control.stop_all', {}, true);
        } else if (level === 'other scripts in sprite' || level === 'other scripts in stage') {
            return new IntermediateStackBlock('control.stop_other');
        } else if (level === 'this script') {
            return new IntermediateStackBlock('control.stop_script');
        }
        return new IntermediateStackBlock(StackOpcode.NOP);
    }, null, {
        input: false
    });
    compilerData.registerBlock('control_wait', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            seconds: stg.descendInputOfBlock(block, 'DURATION').toType(InputType.NUMBER)
        }, true);
    }, null, {
        input: false,
        yields: true
    });
    compilerData.registerBlock('control_wait_until', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN)
        }, true);
    }, null, {
        input: false,
        yields: true
    });
    compilerData.registerBlock('control_wait_until', function(stg, block) {
        this.yields = stg.analyzeLoop();
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            do: stg.descendSubstack(block, 'SUBSTACK'),
            // We should consider analyzing this like we do for control_repeat_until
            warpTimer: false
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_clear_counter', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('control_incr_counter', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    // Inputs
    compilerData.registerBlock('control_get_counter', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ext_scratch3_control._counter`, {
        input: true,
        type: InputType.NUMBER_POS_INT | InputType.NUMBER_ZERO
    });
};