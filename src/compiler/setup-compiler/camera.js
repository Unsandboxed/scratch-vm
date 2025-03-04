// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock([
        'camera_setx',
        'camera_sety',
        'camera_movetoxy',
        'camera_changex',
        'camera_changey',
        'camera_changebyxy'
    ], function (stg, block) {
        const args = {};
        switch (this.ir_opcode) {
        case 'camera.setx':
        case 'camera.sety':
        case 'camera.movetoxy':
            if ('X' in block.inputs) args.x = stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER);
            if ('Y' in block.inputs) args.y = stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER);
            break;
        case 'camera.changex':
        case 'camera.changey':
        case 'camera.changebyxy': {
            args.disableModulo = true;
            const DX = `X`;
            const DY = `Y`;
            if (DX in block.inputs) {
                args.x = new IntermediateInput(`operator.add`, InputType.NUMBER, {
                    left: new IntermediateInput('camera.xposition', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, DX).toType(InputType.NUMBER)
                });
            } else args.x = new IntermediateInput('camera.xposition', InputType.NUMBER);
            if (DY in block.inputs) {
                args.y = new IntermediateInput(`operator.add`, InputType.NUMBER, {
                    left: new IntermediateInput('camera.yposition', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, DY).toType(InputType.NUMBER)
                });
            } else args.y = new IntermediateInput('camera.yposition', InputType.NUMBER);
            break;
        }
        }
        return new IntermediateStackBlock('camera.movetoxy', args);
    }, function (jsg, block) {
        jsg.descendedIntoModulo = false;
        const x = 'x' in block.inputs ? jsg.descendInput(block.inputs.x) : 'runtime.camera.x';
        const y = 'y' in block.inputs ? jsg.descendInput(block.inputs.y) : 'runtime.camera.y';
        jsg.source += `runtime.camera.setXY(${x}, ${y});\n`;
    }, {
        input: false
    });
    // Inputs
    compilerData.registerBlock([
        'camera_xposition',
        'camera_yposition'
    ], function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
        `runtime.camera.x`,
        `runtime.camera.y`
    ], {
        input: true,
        type: InputType.NUMBER
    });
};
