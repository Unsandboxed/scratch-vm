// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType,
    LIST_TYPE,
    SCALAR_TYPE,
    environment,
    sanitize
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock('data_addtolist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            item: stg.descendInputOfBlock(block, 'ITEM', true)
        });
    }, function (jsg, block) {
        const list = jsg.referenceVariable(block.inputs.list);
        jsg.source += `${list}.value.push(${jsg.descendInput(block.inputs.item)});\n`;
        jsg.source += `${list}._monitorUpToDate = false;\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_changevariableby', function (stg, block) {
        const variable = stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE);
        return new IntermediateStackBlock('data.setvariableto', {
            variable,
            value: new IntermediateInput('operator.add', InputType.NUMBER_OR_NAN, {
                left: new IntermediateInput('data.variable', InputType.ANY, {variable}).toType(InputType.NUMBER),
                right: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
            })
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('data_deletealloflist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        jsg.source += `${jsg.referenceVariable(block.inputs.list)}.value = [];\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_deleteoflist', function (stg, block) {
        const index = stg.descendInputOfBlock(block, 'INDEX');
        if (index.isConstant('all')) {
            return new IntermediateStackBlock('data.deletealloflist', {
                list: stg.descendVariable(block, 'LIST', LIST_TYPE)
            });
        }
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            index: index
        });
    }, function (jsg, block) {
        const list = jsg.referenceVariable(block.inputs.list);
        if (block.inputs.index.isConstant('last')) {
            jsg.source += `${list}.value.pop();\n`;
            jsg.source += `${list}._monitorUpToDate = false;\n`;
            return;
        }
        if (block.inputs.index.isConstant(1)) {
            jsg.source += `${list}.value.shift();\n`;
            jsg.source += `${list}._monitorUpToDate = false;\n`;
            return;
        }
        // do not need a special case for all as that is handled in IR generation (list.deleteAll)
        jsg.source += `listDelete(${list}, ${jsg.descendInput(block.inputs.index)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_hidelist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.monitorBlocks.changeBlock({ id: "${
            sanitize(block.inputs.list.id)
        }", element: "checkbox", value: false }, runtime);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_hidevariable', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.monitorBlocks.changeBlock({ id: "${
            sanitize(block.inputs.variable.id)
        }", element: "checkbox", value: false }, runtime);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_insertatlist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            index: stg.descendInputOfBlock(block, 'INDEX'),
            item: stg.descendInputOfBlock(block, 'ITEM', true)
        });
    }, function (jsg, block) {
        const list = jsg.referenceVariable(block.inputs.list);
        const item = jsg.descendInput(block.inputs.item);
        if (block.inputs.index.isConstant(1)) {
            jsg.source += `${list}.value.unshift(${item});\n`;
            jsg.source += `${list}._monitorUpToDate = false;\n`;
            return;
        }
        jsg.source += `listInsert(${list}, ${jsg.descendInput(block.inputs.index)}, ${item});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_replaceitemoflist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            index: stg.descendInputOfBlock(block, 'INDEX'),
            item: stg.descendInputOfBlock(block, 'ITEM', true)
        });
    }, function (jsg, block) {
        jsg.source += `listReplace(${jsg.referenceVariable(block.inputs.list)}, ${
            jsg.descendInput(block.inputs.index)
        }, ${jsg.descendInput(block.inputs.item)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_setvariableto', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE),
            value: stg.descendInputOfBlock(block, 'VALUE', true)
        });
    }, function (jsg, block) {
        const varReference = jsg.referenceVariable(block.inputs.variable);
        jsg.source += `${varReference}.value = ${jsg.descendInput(block.inputs.value)};\n`;
        if (block.inputs.variable.isCloud) {
            jsg.source += `runtime.ioDevices.cloud.requestUpdateVariable("${
                sanitize(block.inputs.variable.name)
            }", ${varReference}.value);\n`;
        }
    }, {
        input: false
    });
    compilerData.registerBlock('data_setlist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            value: stg.descendInputOfBlock(block, 'ARRAY').toType(InputType.ARRAY)
        });
    }, function (jsg, block) {
        const varReference = jsg.referenceVariable(block.inputs.list);
        jsg.source += `if (!${varReference}.locked) {
            ${varReference}.value = ${jsg.descendInput(block.inputs.value)}
        };\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_showlist', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.monitorBlocks.changeBlock({ id: "${
            sanitize(block.inputs.list.id)
        }", element: "checkbox", value: true }, runtime);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('data_showvariable', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.monitorBlocks.changeBlock({ id: "${
            sanitize(block.inputs.variable.id)
        }", element: "checkbox", value: true }, runtime);\n`;
    }, {
        input: false
    });
    // Inputs
    compilerData.registerBlock('data_variable', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE)
        });
    }, function (jsg, block) {
        return `${jsg.referenceVariable(block.inputs.variable)}.value`;
    }, {
        input: true
    });
    compilerData.registerBlock('data_itemoflist', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            index: stg.descendInputOfBlock(block, 'INDEX')
        });
    }, function (jsg, block) {
        const node = block.inputs;
        if (environment.supportsNullishCoalescing) {
            if (node.index.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
                return `(${
                    jsg.referenceVariable(node.list)
                }.value[${jsg.descendInput(node.index.toType(InputType.NUMBER_INDEX))} - 1] ?? "")`;
            }
            if (node.index.isConstant('last')) {
                return `(${
                    jsg.referenceVariable(node.list)
                }.value[${jsg.referenceVariable(node.list)}.value.length - 1] ?? "")`;
            }
        }
        return `listGet(${jsg.referenceVariable(node.list)}.value, ${jsg.descendInput(node.index)})`;
    }, {
        input: true
    });
    compilerData.registerBlock('data_lengthoflist', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        return `${jsg.referenceVariable(block.inputs.list)}.value.length`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('data_listcontainsitem', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            item: stg.descendInputOfBlock(block, 'ITEM')
        });
    }, function (jsg, block) {
        const node = block.inputs;
        return `listContains(${jsg.referenceVariable(node.list)}, ${jsg.descendInput(node.item)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('data_itemnumoflist', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            item: stg.descendInputOfBlock(block, 'ITEM')
        });
    }, function (jsg, block) {
        const node = block.inputs;
        return `listIndexOf(${jsg.referenceVariable(node.list)}, ${jsg.descendInput(node.item)})`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('data_listcontents', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        return `listContents(${jsg.referenceVariable(block.inputs.list)})`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('data_listarraycontents', function (stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function (jsg, block) {
        return `listContentsArray(${jsg.referenceVariable(block.inputs.list)})`;
    }, {
        input: true,
        type: InputType.ARRAY
    });
};
