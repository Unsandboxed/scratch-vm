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
        'camera_changebyxy',
        'camera_setzoom',
        'camera_changezoom',
        'camera_turnright',
        'camera_turnleft',
        'camera_pointindirection'
    ], function (stg, block) {
        const args = {};
        switch (this.ir_opcode) {
        case 'camera.setx':
        case 'camera.sety':
        case 'camera.movetoxy':
            if ('X' in block.inputs) args.x = stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER);
            if ('Y' in block.inputs) args.y = stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER);
            break;
        case 'camera.setzoom':
            if ('ZOOM' in block.inputs) args.zoom = stg.descendInputOfBlock(block, 'ZOOM').toType(InputType.NUMBER);
            break;
        case 'camera.pointindirection':
            if ('DIRECTION' in block.inputs) args.rotation = stg.descendInputOfBlock(block, 'DIRECTION').toType(InputType.NUMBER);
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
        case 'camera.changezoom':
            args.disableModulo = true;
            if ('ZOOM' in block.inputs) {
                args.zoom = new IntermediateInput('operator.add', InputType.NUMBER, {
                    left: new IntermediateInput('camera.zoom', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, 'ZOOM').toType(InputType.NUMBER)
                });
            } else {
                args.zoom = new IntermediateInput('camera.zoom', InputType.NUMBER);
            }
            break;
        case 'camera.turnright':
            args.disableModulo = true;
            if ('DEGREES' in block.inputs) {
                args.rotation = new IntermediateInput('operator.add', InputType.NUMBER, {
                    left: new IntermediateInput('camera.rotation', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, 'DEGREES').toType(InputType.NUMBER)
                });
            } else {
                args.rotation = new IntermediateInput('camera.rotation', InputType.NUMBER);
            }
            break;
        case 'camera.turnleft':
            args.disableModulo = true;
            if ('DEGREES' in block.inputs) {
                args.rotation = new IntermediateInput('operator.subtract', InputType.NUMBER, {
                    left: new IntermediateInput('camera.rotation', InputType.NUMBER),
                    right: stg.descendInputOfBlock(block, 'DEGREES').toType(InputType.NUMBER)
                });
            } else {
                args.rotation = new IntermediateInput('camera.rotation', InputType.NUMBER);
            }
            break;
        }
        switch (this.ir_opcode) {
        case 'camera.setzoom':
        case 'camera.changezoom':
            return new IntermediateStackBlock('camera.setzoom', args);
        case 'camera.pointindirection':
        case 'camera.turnright':
        case 'camera.turnleft':
            return new IntermediateStackBlock('camera.setrotation', args);
        default:
            return new IntermediateStackBlock('camera.movetoxy', args);
        }
    }, function (jsg, block) {
        jsg.descendedIntoModulo = false;
        switch (block.kind) {
        case 'camera.setzoom': {
            const zoom = 'zoom' in block.inputs ? jsg.descendInput(block.inputs.zoom) : 'runtime.camera.zoom';
            jsg.source += `runtime.camera.setZoom(${zoom});\n`;
            break;
        }
        case 'camera.setrotation': {
            const rotation = 'rotation' in block.inputs ? jsg.descendInput(block.inputs.rotation) : 'runtime.camera.direction';
            jsg.source += `runtime.camera.setDirection(${rotation});\n`;
            break;
        }
        default: {
            const x = 'x' in block.inputs ? jsg.descendInput(block.inputs.x) : 'runtime.camera.x';
            const y = 'y' in block.inputs ? jsg.descendInput(block.inputs.y) : 'runtime.camera.y';
            jsg.source += `runtime.camera.setXY(${x}, ${y});\n`;
            break;
        }
        }
    }, {
        input: false
    });
    // Inputs
    compilerData.registerBlock([
        'camera_xposition',
        'camera_yposition',
        'camera_zoom',
        'camera_rotation'
    ], function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
        `runtime.camera.x`,
        `runtime.camera.y`,
        `runtime.camera.zoom`,
        `runtime.camera.direction`
    ], {
        input: true,
        type: InputType.NUMBER
    });
};
