// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    InputType,
    PEN_EXT, PEN_STATE
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock('pen_clear', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `${PEN_EXT}.clear();\n`, {
        input: false
    });
    compilerData.registerBlock('pen_changePenColorParamBy', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            param: stg.descendInputOfBlock(block, 'COLOR_PARAM').toType(InputType.STRING),
            value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setOrChangeColorParam(${
            jsg.descendInput(block.inputs.param)
        }, ${jsg.descendInput(block.inputs.value)}, ${PEN_STATE}, true);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_changePenHueBy', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            hue: stg.descendInputOfBlock(block, 'HUE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._changePenHueBy(${
            jsg.descendInput(block.inputs.hue)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_changePenShadeBy', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            shade: stg.descendInputOfBlock(block, 'SHADE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._changePenShadeBy(${
            jsg.descendInput(block.inputs.shade)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_penDown', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `${PEN_EXT}._penDown(target);\n`, {
        input: false
    });
    compilerData.registerBlock('pen_penUp', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `${PEN_EXT}._penUp(target);\n`, {
        input: false
    });
    compilerData.registerBlock('pen_setPenColorParamTo', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            param: stg.descendInputOfBlock(block, 'COLOR_PARAM').toType(InputType.STRING),
            value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setOrChangeColorParam(${
            jsg.descendInput(block.inputs.param)
        }, ${jsg.descendInput(block.inputs.value)}, ${PEN_STATE}, false);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_setPenColorToColor', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            color: stg.descendInputOfBlock(block, 'COLOR')
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setPenColorToColor(${
            jsg.descendInput(block.inputs.color)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_setPenHueToNumber', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            hue: stg.descendInputOfBlock(block, 'HUE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setPenHueToNumber(${
            jsg.descendInput(block.inputs.hue)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_setPenShadeToNumber', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            shade: stg.descendInputOfBlock(block, 'SHADE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setPenShadeToNumber(${
            jsg.descendInput(block.inputs.hue)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_setPenSizeTo', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setPenSizeTo(${
            jsg.descendInput(block.inputs.size)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_changePenSizeBy', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._changePenSizeBy(${
            jsg.descendInput(block.inputs.size)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_stamp', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `${PEN_EXT}._stamp(target);\n`, {
        input: false
    });
    compilerData.registerBlock('pen_setStageColour', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            color: stg.descendInputOfBlock(block, 'COLOR').toType(InputType.COLOR)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setStageColour(${
            jsg.descendInput(block.inputs.color)
        }, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('pen_setStageTransparency', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            transparency: stg.descendInputOfBlock(block, 'TRANSPARENCY').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `${PEN_EXT}._setStageTransparency(${
            jsg.descendInput(block.inputs.transparency)
        }, target);\n`;
    }, {
        input: false
    });
};
