// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType,
    sanitize
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock([
        'motion_setx',
        'motion_sety',
        'motion_gotoxy',
        'motion_changexby',
        'motion_changeyby',
        'motion_changebyxy'
    ], function (stg, block) {
        const args = {};
        switch (this.ir_opcode) {
        case 'motion.setx':
        case 'motion.sety':
        case 'motion.gotoxy':
            if ('X' in block.inputs) args.x = stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER);
            if ('Y' in block.inputs) args.y = stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER);
            break;
        case 'motion.changexby':
        case 'motion.changeyby':
        case 'motion.changebyxy': {
            args.disableModulo = true;
            const DX = `${this.ir_opcode.endsWith('by') ? 'D' : ''}X`;
            const DY = `${this.ir_opcode.endsWith('by') ? 'D' : ''}Y`;
            if (DX in block.inputs) {
                args.x = new IntermediateInput(`operator.add`, InputType.NUMBER, {
                    left: new IntermediateInput('motion.xposition', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, DX).toType(InputType.NUMBER)
                });
            } else args.x = new IntermediateInput('motion.xposition', InputType.NUMBER);
            if (DY in block.inputs) {
                args.y = new IntermediateInput(`operator.add`, InputType.NUMBER, {
                    left: new IntermediateInput('motion.yposition', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, DY).toType(InputType.NUMBER)
                });
            } else args.y = new IntermediateInput('motion.yposition', InputType.NUMBER);
            break;
        }
        }
        return new IntermediateStackBlock('motion.gotoxy', args);
    }, function (jsg, block) {
        jsg.descendedIntoModulo = false;
        const x = 'x' in block.inputs ? jsg.descendInput(block.inputs.x) : 'target.x';
        const y = 'y' in block.inputs ? jsg.descendInput(block.inputs.y) : 'target.y';
        jsg.source += `target.setXY(${x}, ${y});\n`;
        if (jsg.descendedIntoModulo && !block.inputs.disableModulo) {
            jsg.source += `if (target.interpolationData) target.interpolationData = null;\n`;
        }
    }, {
        input: false
    });
    compilerData.registerBlock('motion_ifonedgebounce', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `runtime.ext_scratch3_motion._ifOnEdgeBounce(target);\n`, {
        input: false
    });
    compilerData.registerBlock('motion_movesteps', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            steps: stg.descendInputOfBlock(block, 'STEPS').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.ext_scratch3_motion._moveSteps(${jsg.descendInput(block.inputs.steps)}, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock([
        'motion_pointindirection',
        'motion_turnleft',
        'motion_turnright'
    ], function (stg, block) {
        if (this.ir_opcode === 'motion.pointindirection') {
            return new IntermediateStackBlock(this.ir_opcode, {
                direction: stg.descendInputOfBlock(block, 'DIRECTION').toType(InputType.NUMBER)
            });
        }
        return new IntermediateStackBlock('motion.pointindirection', {
            direction: new IntermediateInput(`operator.${
                this.ir_opcode === 'motion.turnright' ? 'add' : 'subtract'
            }`, InputType.NUMBER, {
                left: new IntermediateInput('motion.direction', InputType.NUMBER),
                right: stg.descendInputOfBlock(block, 'DEGREES')
            })
        });
    }, function (jsg, block) {
        jsg.source += `target.setDirection(${jsg.descendInput(block.inputs.direction)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('motion_setrotationstyle', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            style: block.fields.STYLE.value
        });
    }, function (jsg, block) {
        jsg.source += `target.setRotationStyle("${sanitize(block.inputs.style)}");\n`;
    }, {
        input: false
    });
    // Inputs
    compilerData.registerBlock([
        'motion_direction',
        'motion_xposition',
        'motion_yposition'
    ], function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
        `target.direction`,
        `limitPrecision(target.x)`,
        `limitPrecision(target.y)`
    ], {
        input: true,
        type: InputType.NUMBER_REAL
    });
    compilerData.registerBlock('motion_rotationstyle', function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `target.rotationStyle`, {
        input: true,
        type: InputType.STRING
    });
};
