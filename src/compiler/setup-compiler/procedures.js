// @ts-check
module.exports = function(compilerData, {
    IntermediateInput,
    IntermediateStackBlock,
    InputType,
    sanitize
}) {
    // JSG Mixins
    compilerData.registerCompileFn('procedures.call', function(jsg, block) { 
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
                args.push(jsg.descendInput(input));
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
        const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
        if (yieldForRecursion) {
            // Direct yields.
            this.yieldNotWarp();
        }
        if (procedureData.yields) {
            jsg.source += 'yield* ';
            if (!this.script.yields) {
                throw new Error('Script uses yielding procedure but is not marked as yielding.');
            }
        }
        jsg.source += `thread.procedures["${sanitize(procedureVariant)}"](`;
        const args = [];
        for (const input of node.arguments) {
            args.push(jsg.descendInput(input));
        }
        jsg.source += args.join(',');
        jsg.source += `);\n`;
    });
    compilerData.registerCompileFn('procedures.debugger', (jsg) => (jsg.source += 'debugger;\n'));
    // Stack
    compilerData.registerBlock('procedures_return', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            value: stg.descendInputOfBlock(block, 'VALUE')
        });
    }, function(jsg, block) {
        jsg.stopScriptAndReturn(jsg.descendInput(block.inputs.value));
    }, {
        input: false
    });
    compilerData.registerBlock('procedures_call', function(stg, block) {
        const procedureCode = block.mutation.proccode;
        if (block.mutation.return) {
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
    }, null, {
        dynamicChanges: true
    });
    // Inputs
    compilerData.registerBlock('procedures_call', function(stg, block) {
      const procedureInfo = stg.getProcedureInfo(block);
      this.yields = procedureInfo.yields;
      // @ts-ignore
      return new IntermediateInput(procedureInfo.opcode, this.type, procedureInfo.inputs, this.yields);
    }, null, {
        input: true,
        type: InputType.ANY,
        dynamicChanges: true
    });
    compilerData.registerBlock('argument_reporter_string_number', function(stg, block) {
        const name = block.fields.VALUE.value;
        // lastIndexOf because multiple parameters with the same name will use the value of the last definition
        const index = stg.script.arguments.lastIndexOf(name);
        if (index === -1) {
            // Legacy support
            if (name.toLowerCase() === 'last key pressed') {
                return new IntermediateInput('tw.getLastKeyPressed', this.type);
            }
            return new IntermediateInput('procedures.paramater', this.type);
        }
        if (index === -1) {
            return stg.createConstantInput(0);
        }
        return new IntermediateInput(this.ir_opcode, this.type, {index});
        // eslint-disable-next-line no-unused-vars
    }, function(_, block) {
        return `p${block.inputs.index}`;
    }, {
        input: true,
        type: InputType.ANY
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerCompileFn('procedures.paramater', function(_, block) {
        return `(thread.getParam("${block.inputs.name}") ?? 0)`;
    })
    compilerData.registerBlock('argument_reporter_boolean', function(stg, block) {
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
    }, function(_, block) {
        return `toBoolean(p${block.arguments.index})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
};