// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType,
    StackOpcode
}) {
    // Stack
    compilerData.registerBlock('motion_changexby', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            dx: stg.descendInputOfBlock(block, 'DX').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_changeyby', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            dy: stg.descendInputOfBlock(block, 'DY').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_gotoxy', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            x: stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER),
            y: stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_changebyxy', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            dx: stg.descendInputOfBlock(block, 'DX').toType(InputType.NUMBER),
            dy: stg.descendInputOfBlock(block, 'DY').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_ifonedgebounce', function() {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_movesteps', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            steps: stg.descendInputOfBlock(block, 'STEPS').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_pointindirection', function(stg, block) {
        return new IntermediateStackBlock(StackOpcode.MOTION_DIRECTION_SET, {
            direction: stg.descendInputOfBlock(block, 'DIRECTION').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_setrotationstyle', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            style: block.fields.STYLE.value
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_setx', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            x: stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_sety', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            y: stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_turnleft', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            direction: new IntermediateInput('opertor.subtract', InputType.NUMBER, {
                left: new IntermediateInput('motion.direction', InputType.NUMBER),
                right: stg.descendInputOfBlock(block, 'DEGREES')
            })
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('motion_turnright', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            direction: new IntermediateInput('operator.add', InputType.NUMBER, {
                left: new IntermediateInput('motion.direction', InputType.NUMBER),
                right: stg.descendInputOfBlock(block, 'DEGREES')
            })
        });
    }, null, {
        input: false
    });
    // Inputs
    compilerData.registerBlock([
        'motion_direction',
        'motion_xposition',
        'motion_yposition'
    ], function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
      `target.direction`,
      `limitPrecision(target.x)`,
      `limitPrecision(target.y)`
    ], {
        input: true,
        type: InputType.NUMBER_REAL
    });
    compilerData.registerBlock('motion_rotationstyle', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `target.rotationStyle`, {
        input: true,
        type: InputType.STRING
    });
};