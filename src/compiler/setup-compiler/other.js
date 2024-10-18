// @ts-check
module.exports = function(compilerData, {
    IntermediateInput,
    InputType
}) {
    // Inputs
    compilerData.registerBlock('colour_picker', function(stg, block) {
        return stg.createConstantInput(block.fields.COLOUR.value, true);
    }, null, {
        input: true
    });
    compilerData.registerBlock([
        'math_angle',
        'math_integer',
        'math_number',
        'math_positive_number',
        'math_whole_number'
    ], function(stg, block, preserveStrings) {
        return stg.createConstantInput(block.fields.NUM.value, preserveStrings);
    }, null, {
        input: true
    });
    compilerData.registerBlock('text', function(stg, block, preserveStrings) {
        return stg.createConstantInput(block.fields.TEXT.value, preserveStrings);
    }, null, {
        input: true
    });
    compilerData.registerBlock('tw_getLastKeyPressed', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ioDevices.keyboard.getLastKeyPressed()`, {
        input: true,
        type: InputType.STRING
    });
};