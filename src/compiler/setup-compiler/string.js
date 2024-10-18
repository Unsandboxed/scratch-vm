// @ts-check
module.exports = function(compilerData, {
    IntermediateInput,
    InputType
}) {
      compilerData.registerBlock('string_exactly', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING1'),
            right: stg.descendInputOfBlock(block, 'STRING2')
        });
    }, null, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_is', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING'),
            right: block.fields.CONVERT.value
        });
    }, null, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_repeat', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING'),
            num: stg.descendInputOfBlock(block, 'NUMBER')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_replace', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'REPLACE'),
            right: stg.descendInputOfBlock(block, 'WITH'),
            str: stg.descendInputOfBlock(block, 'STRING')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_reverse', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
};