// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType
  }) {
      // Stack
      compilerData.registerBlock('camera_changex', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              dx: stg.descendInputOfBlock(block, 'DX').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('camera_changey', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              dy: stg.descendInputOfBlock(block, 'DY').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('camera_changebyxy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              dx: stg.descendInputOfBlock(block, 'DX').toType(InputType.NUMBER),
              dy: stg.descendInputOfBlock(block, 'DY').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('camera_movetoxy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              x: stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER),
              y: stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('camera_setx', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              x: stg.descendInputOfBlock(block, 'X').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('camera_sety', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              y: stg.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      // Inputs
      compilerData.registerBlock([
        'camera_xposition',
        'camera_yposition'
      ], function() {
          return new IntermediateInput(this.ir_opcode, this.type);
      }, [
        `runtime.camera.x`,
        `runtime.camera.y`
      ], {
          input: true,
          type: InputType.NUMBER
      });
};