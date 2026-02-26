// @ts-check
module.exports = function (compilerData, {
    IntermediateInput,
    IntermediateStackBlock,
    Frame,
    InputType,
    sanitize
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback,arrow-parens */
    // @ts-ignore
    compilerData.registerCompileFn('procedures.debugger', (jsg) => (jsg.source += 'debugger;\n'));
    // Stack
    compilerData.registerBlock('procedures_return', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            value: stg.descendInputOfBlock(block, 'VALUE')
        });
    }, function (jsg, block) {
        jsg.stopScriptAndReturn(jsg.descendInput(block.inputs.value));
    }, {
        input: false
    });
    // Shared
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('procedures_call', function (stg, block, _, isInput) {
        this.isInput = !!isInput;
        if (this.isInput) {
            const procedureInfo = stg.getProcedureInfo(block);
            this.yields = procedureInfo.yields;
            // @ts-ignore
            return new IntermediateInput(procedureInfo.opcode, this.type, procedureInfo.inputs, this.yields);
        }
        const procedureCode = block.mutation.proccode;
        if (!!JSON.parse(block.mutation.return) && !JSON.parse(block.mutation.hat || false)) {
            const visualReport = stg.descendVisualReport(block);
            if (visualReport) {
                return visualReport;
            }
        }
        if (procedureCode === 'tw:debugger;') {
            return new IntermediateStackBlock('procedures.debugger');
        }
        const procedure = stg.getProcedureInfo(block);
        this.yields = procedure.yields;
        return new IntermediateStackBlock(procedure.opcode, procedure.inputs, this.yields);
    }, function (jsg, block) {
        const node = block.inputs;
        const procedureCode = node.code;
        const procedureVariant = node.variant;
        const procedureData = jsg.ir.procedures[procedureVariant];
        if (procedureData.stack === null) {
            // TODO still need to evaluate arguments for side effects
            return '""';
        }
        if (block instanceof IntermediateInput) {
            // Recursion makes this complicated because:
            //  - We need to yield *between* each call in the same command block
            //  - We need to evaluate arguments *before* that yield happens
            const procedureReference = `thread.procedures["${sanitize(procedureVariant)}"]`;
            const args = [];
            for (const input of node.arguments) {
                if (input instanceof IntermediateInput) {
                    args.push(jsg.descendInput(input));
                    continue;
                }

                const oldWarp = jsg.isWarp;
                const oldIsProcedureBranch = jsg.isProcedureBranch;
                jsg.isWarp = procedureData.isWarp;
                jsg.isProcedureBranch = true;
                args.push(`(function*(returnProcedure){;${
                    jsg.descendStackForSource(input, new Frame(false))
                };})`);
                jsg.isWarp = oldWarp;
                jsg.isProcedureBranch = oldIsProcedureBranch;
            }
            const joinedArgs = args.join(',');
            const yieldForRecursion = !jsg.isWarp && procedureCode === jsg.script.procedureCode;
            const yieldForHat = jsg.isInHat;
            if (yieldForRecursion || yieldForHat) {
                const runtimeFunction = procedureData.yields ? 'yieldThenCallGenerator' : 'yieldThenCall';
                return `(yield* ${runtimeFunction}(${procedureReference}, ${joinedArgs}))`;
            }
            if (procedureData.yields) {
                return `(yield* ${procedureReference}(${joinedArgs}))`;
            }
            return `${procedureReference}(${joinedArgs})`;
        }

        const yieldForRecursion = !jsg.isWarp && procedureCode === jsg.script.procedureCode;
        if (yieldForRecursion) {
            // Direct yields.
            jsg.yieldNotWarp();
        }

        let callSrc = `thread.procedures["${sanitize(procedureVariant)}"](`;
        const args = [];
        for (const input of node.arguments) {
            if (input instanceof IntermediateInput) {
                args.push(jsg.descendInput(input));
                continue;
            }

            const oldWarp = jsg.isWarp;
            const oldIsProcedureBranch = jsg.isProcedureBranch;
            jsg.isWarp = procedureData.isWarp;
            jsg.isProcedureBranch = true;
            args.push(`(function*(returnProcedure){;${
                jsg.descendStackForSource(input, new Frame(false))
            };})`);
            jsg.isWarp = oldWarp;
            jsg.isProcedureBranch = oldIsProcedureBranch;
        }
        callSrc += args.join(',');
        callSrc += `);\n`;

        if (procedureData.yields) {
            callSrc = `yield* ${callSrc}`;
            if (!jsg.script.yields) {
                throw new Error('Script uses yielding procedure but is not marked as yielding.');
            }
        }

        jsg.source += callSrc;
    }, {
        dynamicChanges: true,
        type: InputType.ANY
    });
    compilerData.registerBlock('procedures_set_parameter', function (stg, block) {
        let index = -1;
        if (block.inputs.PARAM && block.inputs.PARAM.block) {
            const input = stg.blocks.getBlock(block.inputs.PARAM.block);
            if (input && (
                input.opcode === 'argument_reporter_string_number' ||
                input.opcode === 'argument_reporter_boolean'
            ) && input.fields.VALUE) {
                index = stg.script.arguments.lastIndexOf(input.fields.VALUE.value);
            }
        }
        return new IntermediateStackBlock(this.ir_opcode, {
            index: index,
            param: stg.descendInputOfBlock(block, 'PARAM'),
            value: stg.descendInputOfBlock(block, 'VALUE')
        }, this.yields);
    }, function (jsg, block) {
        if (block.inputs.index === -1) {
            // Even if the param is not found we need to evaluate the params for side effects.
            // eslint-disable-next-line max-len
            jsg.source += `void(${jsg.descendInput(block.inputs.param)});void(${jsg.descendInput(block.inputs.value)});`;
            return;
        }
        jsg.source += `p${block.inputs.index} = ${jsg.descendInput(block.inputs.value)};`;
    }, {
        input: false
    });
    compilerData.registerBlock('argument_statement', function (stg, block) {
        const name = block.fields.VALUE.value;
        const index = stg.script.arguments.lastIndexOf(name);
        return new IntermediateStackBlock(this.ir_opcode, {index}, this.yields);
        // eslint-disable-next-line no-unused-vars
    }, function (jsg, block) {
        if (block.inputs.index === -1 || !jsg.isProcedure) {
            return;
        }
        // eslint-disable-next-line max-len
        jsg.source += `void(yield* p${block.inputs.index}(function(v) {procedureReturnV[0]=true;procedureReturnV[1]=v}));`;
        jsg.source += `if (procedureReturnV[0]) {`;
        jsg.stopScriptAndReturn(`procedureReturnV[1]`);
        jsg.source += `};`;
    }, {
        input: false,
        yields: true
    });
    // Inputs
    compilerData.inputs.set('procedures_call', compilerData.stacks.get('procedures_call'));
    compilerData.registerBlock('argument_reporter_string_number', function (stg, block) {
        const name = block.fields.VALUE.value;
        // lastIndexOf because multiple parameters with the same name will use the value of the last definition
        const index = stg.script.arguments.lastIndexOf(name);
        if (index === -1) {
            // Legacy support
            if (name.toLowerCase() === 'last key pressed') {
                return new IntermediateInput('tw.getLastKeyPressed', this.type);
            }
            return new IntermediateInput('procedures.paramater', this.type, {name});
        }
        if (index === -1) {
            return stg.createConstantInput(0);
        }
        return new IntermediateInput(this.ir_opcode, this.type, {index});
        // eslint-disable-next-line no-unused-vars
    }, function (_, block) {
        return `p${block.inputs.index}`;
    }, {
        input: true,
        type: InputType.ANY
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerCompileFn('procedures.paramater', function (_, block) {
        return `(thread.getParam("${sanitize(block.inputs.name)}") ?? 0)`;
    });
    compilerData.registerBlock('argument_reporter_boolean', function (stg, block) {
        // see argument_reporter_string_number above
        const name = block.fields.VALUE.value;
        const index = stg.script.arguments.lastIndexOf(name);
        if (index === -1) {
            if (name.toLowerCase() === 'is compiled?' || name.toLowerCase() === 'is unsandboxed?') {
                return stg.createConstantInput(true).toType(InputType.BOOLEAN);
            }
            return stg.createConstantInput(0);
        }
        return new IntermediateInput(this.ir_opcode, this.type, {index});
        // eslint-disable-next-line no-unused-vars
    }, function (_, block) {
        return `asBoolean(p${block.inputs.index})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
};
