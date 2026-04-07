// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    IntermediateStack,
    StackOpcode,
    InputType,
    Frame,
    SCALAR_TYPE
}) {
    const parseSwitchBranchKinds = mutation => {
        if (!mutation || typeof mutation !== 'object') {
            return [];
        }
        const raw = mutation.branchkinds;
        if (Array.isArray(raw)) {
            return raw.filter(kind => typeof kind === 'string');
        }
        if (typeof raw !== 'string') {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter(kind => typeof kind === 'string');
        } catch (_error) {
            return [];
        }
    };

    const countSwitchBranches = block => {
        let maxBranchNum = 0;
        for (const inputName in block.inputs) {
            if (!inputName.startsWith('SUBSTACK')) continue;
            const branchNum = inputName === 'SUBSTACK' ? 1 : +inputName.substring('SUBSTACK'.length);
            if (!Number.isNaN(branchNum) && branchNum > maxBranchNum) {
                maxBranchNum = branchNum;
            }
        }
        return maxBranchNum;
    };

    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock('control_all_at_once', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            stack: stg.descendSubstack(block, 'SUBSTACK')
        });
    }, function (jsg, block) {
        const previousWarp = jsg.isWarp;
        jsg.isWarp = true;
        // @ts-ignore
        jsg.descendStack(block.inputs.stack, new Frame(false));
        jsg.isWarp = previousWarp;
    }, {
        input: false
    });
    compilerData.registerBlock('control_create_clone_of', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            target: stg.descendInputOfBlock(block, 'CLONE_OPTION').toType(InputType.STRING)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.ext_scratch3_control._createClone(${jsg.descendInput(block.inputs.target)}, target);\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('control_delete_this_clone', function () {
        return new IntermediateStackBlock(this.ir_opcode, {}, this.yields);
        // eslint-disable-next-line no-unused-vars
    }, function (jsg, _) {
        jsg.source += 'if (!target.isOriginal) {\n';
        jsg.source += '  runtime.disposeTarget(target);\n';
        jsg.source += '  runtime.stopForTarget(target);\n';
        jsg.retire();
        jsg.source += '}\n';
    }, {
        input: false,
        yields: true
    });
    compilerData.registerBlock('control_forever', function (stg, block) {
        this.yields = stg.analyzeLoop();
        return new IntermediateStackBlock('control.while', {
            condition: stg.createConstantInput(true).toType(InputType.BOOLEAN),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_for_each', function (stg, block) {
        this.yields = stg.analyzeLoop();
        // @ts-ignore
        return new IntermediateStackBlock(this.ir_opcode, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE),
            count: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, function (jsg, block) {
        const index = jsg.localVariables.next();
        jsg.source += `var ${index} = 0; `;
        jsg.source += `while (${index} < ${jsg.descendInput(block.inputs.count)}) { `;
        jsg.source += `${index}++; `;
        jsg.source += `${jsg.referenceVariable(block.inputs.variable)}.value = ${index};\n`;
        jsg.descendStack(block.inputs.do, new Frame(true, true));
        jsg.yieldLoop();
        jsg.source += '}\n';
    }, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_if', function (stg, block) {
        return new IntermediateStackBlock('control.if_else', {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            whenTrue: stg.descendSubstack(block, 'SUBSTACK'),
            whenFalse: new IntermediateStack()
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('control_if_else', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            whenTrue: stg.descendSubstack(block, 'SUBSTACK'),
            whenFalse: stg.descendSubstack(block, 'SUBSTACK2')
        });
    }, function (jsg, block) {
        jsg.source += `if (${jsg.descendInput(block.inputs.condition)}) {\n`;
        jsg.descendStack(block.inputs.whenTrue, new Frame(false));
        // only add the else branch if it won't be empty
        // jsg makes scripts have a bit less useless noise in them
        if (block.inputs.whenFalse.blocks.length) {
            jsg.source += `} else {\n`;
            jsg.descendStack(block.inputs.whenFalse, new Frame(false));
        }
        jsg.source += `}\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('control_switch_case_extends', function (stg, block) {
        const branchKinds = parseSwitchBranchKinds(block.mutation);
        const branchCount = branchKinds.length || countSwitchBranches(block);

        const switchBranches = [];
        for (let i = 1; i <= branchCount; i++) {
            const branchKind = branchKinds[i - 1];
            const caseKey = i === 1 ? 'CASE_VALUE' : `CASE_VALUE${i}`;
            const substackName = i === 1 ? 'SUBSTACK' : `SUBSTACK${i}`;
            const isDefault = branchKind === 'default' || !block.inputs[caseKey];

            switchBranches.push({
                kind: isDefault ? 'default' : 'case',
                caseValue: isDefault ? null : stg.descendInputOfBlock(block, caseKey),
                stack: stg.descendSubstack(block, substackName)
            });
        }

        return new IntermediateStackBlock(this.ir_opcode, {
            switchValue: stg.descendInputOfBlock(block, 'SWITCH_VALUE'),
            branches: switchBranches
        });
    }, function (jsg, block) {
        const switchValue = jsg.localVariables.next();
        const startCase = jsg.localVariables.next();

        jsg.source += `const ${switchValue} = ${jsg.descendInput(block.inputs.switchValue)};\n`;
        jsg.source += `let ${startCase} = -1;\n`;

        for (let i = 0; i < block.inputs.branches.length; i++) {
            const switchBranch = block.inputs.branches[i];
            if (switchBranch.kind !== 'case') {
                continue;
            }
            const caseValue = jsg.localVariables.next();
            jsg.source += `const ${caseValue} = ${jsg.descendInput(switchBranch.caseValue)};\n`;
            jsg.source += `if (${startCase} === -1 && compareEqual(${switchValue}, ${caseValue})) ${startCase} = ${i};\n`;
        }

        let defaultIndex = -1;
        for (let i = 0; i < block.inputs.branches.length; i++) {
            if (block.inputs.branches[i].kind === 'default') {
                defaultIndex = i;
                break;
            }
        }

        if (defaultIndex !== -1) {
            jsg.source += `if (${startCase} === -1) ${startCase} = ${defaultIndex};\n`;
        }

        jsg.source += `if (${startCase} !== -1) {\n`;
        jsg.source += `switch (${startCase}) {\n`;
        for (let i = 0; i < block.inputs.branches.length; i++) {
            const switchBranch = block.inputs.branches[i];
            jsg.source += `case ${i}:\n`;
            // Intentionally no break here: cases should fall through unless control_break runs.
            jsg.descendStack(switchBranch.stack, new Frame(false, true));
        }
        jsg.source += '}\n';
        jsg.source += '}\n';
    }, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_repeat', function (stg, block) {
        this.yields = stg.analyzeLoop();
        // @ts-ignore
        return new IntermediateStackBlock(this.ir_opcode, {
            times: stg.descendInputOfBlock(block, 'TIMES').toType(InputType.NUMBER),
            do: stg.descendSubstack(block, 'SUBSTACK')
        }, this.yields);
    }, function (jsg, block) {
        const i = jsg.localVariables.next();
        jsg.source += `for (var ${i} = ${jsg.descendInput(block.inputs.times)}; ${i} >= 0.5; ${i}--) {\n`;
        jsg.descendStack(block.inputs.do, new Frame(true, true));
        jsg.yieldLoop();
        jsg.source += `}\n`;
    }, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerBlock('control_repeat_until', function (stg, block) {
        // Dirty hack: automatically enable warp timer for this block if it uses timer
        // This fixes project that do things like "repeat until timer > 0.5"
        stg.usesTimer = false;
        const needsWarpTimer = stg.usesTimer;
        this.yields = stg.analyzeLoop() || needsWarpTimer;
        const condition = stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN);
        return new IntermediateStackBlock('control.while', {
            condition: new IntermediateInput('operator.not', InputType.BOOLEAN, {
                operand: condition
            }),
            do: stg.descendSubstack(block, 'SUBSTACK'),
            warpTimer: needsWarpTimer
        }, this.yields);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_stop', function (_, block) {
        const level = block.fields.STOP_OPTION.value;
        if (level === 'all') {
            this.yields = true;
            return new IntermediateStackBlock('control.stop_all', {}, this.yields);
        } else if (level === 'other scripts in sprite' || level === 'other scripts in stage') {
            return new IntermediateStackBlock('control.stop_other');
        } else if (level === 'this script') {
            return new IntermediateStackBlock('control.stop_script');
        }
        return new IntermediateStackBlock(StackOpcode.NOP);
    }, null, {
        input: false,
        dynamicChanges: true
    });
    compilerData.registerCompileFn([
        'control.stop_all',
        'control.stop_other',
        'control.stop_script'
    ], [
        function (jsg) {
            jsg.source += 'runtime.stopAll();\n';
            jsg.retire();
        },
        function (jsg) {
            jsg.source += 'runtime.stopForTarget(target, thread);\n';
        },
        function (jsg) {
            jsg.stopScript();
        }
    ]);
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_break', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, function (jsg) {
        if (jsg.frames.find(frame =>
            frame.isLoop ||
            frame.isBreakable ||
            frame.isIterable
        )) jsg.source += 'break;\n';
    }, {
        input: false
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_continue', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, function (jsg) {
        if (
            jsg.frames.find(frame => frame.isLoop || frame.isIterable)
        ) jsg.source += 'continue;\n';
    }, {
        input: false
    });
    compilerData.registerBlock('control_wait', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            seconds: stg.descendInputOfBlock(block, 'DURATION').toType(InputType.NUMBER)
        }, this.yields);
    }, function (jsg, block) {
        const duration = jsg.localVariables.next();
        jsg.source += `thread.timer = timer();\n`;
        jsg.source += `var ${duration} = Math.max(0, 1000 * ${jsg.descendInput(block.inputs.seconds)});\n`;
        jsg.requestRedraw();
        // always yield at least once, even on 0 second durations
        jsg.yieldNotWarp();
        jsg.source += `while (thread.timer.timeElapsed() < ${duration}) {\n`;
        jsg.yieldStuckOrNotWarp();
        jsg.source += '}\n';
        jsg.source += 'thread.timer = null;\n';
    }, {
        input: false,
        yields: true
    });
    compilerData.registerBlock('control_wait_until', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN)
        }, this.yields);
    }, function (jsg, block) {
        jsg.source += `while (!${jsg.descendInput(block.inputs.condition)}) {\n`;
        jsg.yieldStuckOrNotWarp();
        jsg.source += `}\n`;
    }, {
        input: false,
        yields: true
    });
    compilerData.registerBlock('control_while', function (stg, block) {
        this.yields = stg.analyzeLoop();
        // @ts-ignore
        return new IntermediateStackBlock(this.ir_opcode, {
            condition: stg.descendInputOfBlock(block, 'CONDITION').toType(InputType.BOOLEAN),
            do: stg.descendSubstack(block, 'SUBSTACK'),
            // We should consider analyzing this like we do for control_repeat_until
            warpTimer: false
        }, this.yields);
    }, function (jsg, block) {
        jsg.source += `while (${jsg.descendInput(block.inputs.condition)}) {\n`;
        jsg.descendStack(block.inputs.do, new Frame(true, true));
        if (block.inputs.warpTimer) {
            jsg.yieldStuckOrNotWarp();
        } else {
            jsg.yieldLoop();
        }
        jsg.source += `}\n`;
    }, {
        input: false,
        dynamicChanges: true
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_clear_counter', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `runtime.ext_scratch3_control._counter = 0;\n`, {
        input: false
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('control_incr_counter', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `runtime.ext_scratch3_control._counter++;\n`, {
        input: false
    });
    // Inputs
    compilerData.registerBlock('control_get_counter', function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ext_scratch3_control._counter`, {
        input: true,
        type: InputType.NUMBER_POS_INT | InputType.NUMBER_ZERO
    });
};
