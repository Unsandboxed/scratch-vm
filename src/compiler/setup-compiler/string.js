// @ts-check
module.exports = function (compilerData, {
    IntermediateInput,
    InputType
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    compilerData.registerBlock('string_exactly', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING1'),
            right: stg.descendInputOfBlock(block, 'STRING2')
        });
    }, function (jsg, block) {
        return `(${jsg.descendInput(block.inputs.left)} === ${jsg.descendInput(block.inputs.right)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_is', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
            right: String(block.fields.CONVERT.value).toLowerCase()
        });
    }, function (jsg, block) {
        if (block.inputs.right === 'uppercase') {
            return `(${jsg.descendInput(block.inputs.left)}.toUpperCase() === ${jsg.descendInput(block.inputs.left)})`;
        }
        return `(${jsg.descendInput(block.inputs.left)}.toLowerCase() === ${jsg.descendInput(block.inputs.left)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_repeat', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
            num: stg.descendInputOfBlock(block, 'NUMBER').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        return `(${jsg.descendInput(block.inputs.str)}.repeat(${jsg.descendInput(block.inputs.num)}))`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_replace', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            prev: stg.descendInputOfBlock(block, 'REPLACE').toType(InputType.STRING),
            next: stg.descendInputOfBlock(block, 'WITH').toType(InputType.STRING),
            str: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING)
        });
    }, function (jsg, block) {
        return `(${
            jsg.descendInput(block.inputs.str)
        }.replace(runtime.ext_scratch3_string.RegExpString(${
            jsg.descendInput(block.inputs.prev)
        }, 'gi'), ${
            jsg.descendInput(block.inputs.next)
        }))`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_reverse', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING)
        });
    }, function (jsg, block) {
        return `(${jsg.descendInput(block.inputs.str)}.split('').toReversed().join(''))`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_index_of', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str1: stg.descendInputOfBlock(block, 'STRING1').toType(InputType.STRING),
            str2: stg.descendInputOfBlock(block, 'STRING2').toType(InputType.STRING),
            i: stg.descendInputOfBlock(block, 'INDEX').toType(InputType.STRING)
        });
    }, function (jsg, block) {
        return `runtime.ext_scratch3_string._getNumberIndex(${
            jsg.descendInput(block.inputs.str1)
        }.toLowerCase(), ${
            jsg.descendInput(block.inputs.str2)
        }.toLowerCase(), ${jsg.descendInput(block.inputs.i)})`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_item_split', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
            split: stg.descendInputOfBlock(block, 'SPLIT').toType(InputType.STRING),
            i: stg.descendInputOfBlock(block, 'INDEX').toType(InputType.STRING)
        });
    }, function (jsg, block) {
        return `runtime.ext_scratch3_string._getItemFromSplit(${
            jsg.descendInput(block.inputs.str)
        }, ${jsg.descendInput(block.inputs.split)}, ${jsg.descendInput(block.inputs.i)})`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_ternary', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str1: stg.descendInputOfBlock(block, 'STRING1').toType(InputType.STRING),
            str2: stg.descendInputOfBlock(block, 'STRING2').toType(InputType.STRING),
            cond: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN)
        });
    }, function (jsg, block) {
        return `((${jsg.descendInput(block.inputs.cond)}) ? (${
            jsg.descendInput(block.inputs.str1)
        }) : (${
            jsg.descendInput(block.inputs.str2)
        }))`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_convert', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
            right: String(block.fields.CONVERT.value).toLowerCase()
        });
    }, function (jsg, block) {
        if (block.inputs.right === 'uppercase') {
            return `(${jsg.descendInput(block.inputs.left)}.toUpperCase())`;
        }
        return `(${jsg.descendInput(block.inputs.left)}.toLowerCase())`;
    }, {
        input: true,
        type: InputType.STRING
    });
};
