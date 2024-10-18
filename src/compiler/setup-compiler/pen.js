// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    InputType
  }) {
      // Stack
      compilerData.registerBlock('pen_clear', function() {
          return new IntermediateStackBlock(this.ir_opcode);
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_changePenColorParamBy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              param: stg.descendInputOfBlock(block, 'COLOR_PARAM').toType(InputType.STRING),
              value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_changePenHueBy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              hue: stg.descendInputOfBlock(block, 'HUE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_changePenShadeBy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              shade: stg.descendInputOfBlock(block, 'SHADE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_penDown', function() {
          return new IntermediateStackBlock(this.ir_opcode);
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_penUp', function() {
          return new IntermediateStackBlock(this.ir_opcode);
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_setPenColorParamTo', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              param: stg.descendInputOfBlock(block, 'COLOR_PARAM').toType(InputType.STRING),
              value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_setPenColorToColor', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              color: stg.descendInputOfBlock(block, 'COLOR')
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_setPenHueToNumber', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              hue: stg.descendInputOfBlock(block, 'HUE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_setPenShadeToNumber', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              shade: stg.descendInputOfBlock(block, 'SHADE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_setPenSizeTo', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_changePenSizeBy', function(stg, block) {
          return new IntermediateStackBlock(this.ir_opcode, {
              size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
          });
      }, null, {
          input: false
      });
      compilerData.registerBlock('pen_stamp', function() {
          return new IntermediateStackBlock(this.ir_opcode);
      }, null, {
          input: false
      });
  };