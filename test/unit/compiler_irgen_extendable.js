const test = require('tap').test;
const {ScriptTreeGenerator} = require('../../src/compiler/irgen');
const {InputOpcode, StackOpcode} = require('../../src/compiler/enums');
const compatBlocks = require('../../src/compiler/compat-blocks');

test('descendInput prioritizes compatibility layer for extendable blocks', t => {
    const fallbackNode = {opcode: 'compiled-input'};
    const context = {
        runtime: {
            compilerData: {
                inputs: new Map([[
                    'operator_add_extends',
                    {stg: () => fallbackNode}
                ]]),
                bt_inputs: new Set()
            },
            getOpcodeFunction: () => (() => 0)
        },
        descendCompatLayerInput: block => ({opcode: InputOpcode.COMPATIBILITY_LAYER, sourceOpcode: block.opcode}),
        getBlockInfo: () => null,
        createConstantInput: () => ({opcode: InputOpcode.CONSTANT}),
        script: {yields: false}
    };

    const block = {opcode: 'operator_add_extends', inputs: {}, fields: {}};
    const result = ScriptTreeGenerator.prototype.descendInput.call(context, block, false);

    t.equal(result.opcode, InputOpcode.COMPATIBILITY_LAYER);
    t.equal(result.sourceOpcode, 'operator_add_extends');
    t.end();
});

test('descendStackedBlock prioritizes compatibility layer for extendable branch blocks', t => {
    const fallbackNode = {opcode: 'compiled-stack'};
    const context = {
        runtime: {
            compilerData: {
                stacks: new Map([[
                    'control_if_else_extends',
                    {stg: () => fallbackNode}
                ]]),
                bt_stacks: new Set(),
                bt_branchables: new Set(),
                bt_inlines: new Set()
            },
            getOpcodeFunction: () => (() => 0)
        },
        descendCompatLayerStack: block => ({opcode: StackOpcode.COMPATIBILITY_LAYER, sourceOpcode: block.opcode}),
        descendVisualReport: () => null,
        getBlockInfo: () => null
    };

    const block = {opcode: 'control_if_else_extends', inputs: {}, fields: {}};
    const result = ScriptTreeGenerator.prototype.descendStackedBlock.call(context, block);

    t.equal(result.opcode, StackOpcode.COMPATIBILITY_LAYER);
    t.equal(result.sourceOpcode, 'control_if_else_extends');
    t.end();
});

test('descendStackedBlock uses native compiler registration for control_switch_case_extends', t => {
    const fallbackNode = {opcode: 'compiled-switch-stack'};
    const context = {
        runtime: {
            compilerData: {
                stacks: new Map([[
                    'control_switch_case_extends',
                    {stg: () => fallbackNode}
                ]]),
                bt_stacks: new Set(),
                bt_branchables: new Set(),
                bt_inlines: new Set()
            },
            getOpcodeFunction: () => (() => 0)
        },
        descendCompatLayerStack: block => ({opcode: StackOpcode.COMPATIBILITY_LAYER, sourceOpcode: block.opcode}),
        descendVisualReport: () => null,
        getBlockInfo: () => null
    };

    const block = {opcode: 'control_switch_case_extends', inputs: {}, fields: {}};
    const result = ScriptTreeGenerator.prototype.descendStackedBlock.call(context, block);

    t.equal(result.opcode, 'compiled-switch-stack');
    t.same(result, fallbackNode);
    t.end();
});

test('descendInput prioritizes compatibility layer for all compat input opcodes', t => {
    const context = {
        runtime: {
            compilerData: {
                inputs: new Map(compatBlocks.inputs.map(opcode => [opcode, {stg: () => ({opcode: 'compiled'})}])),
                bt_inputs: new Set()
            },
            getOpcodeFunction: () => (() => 0)
        },
        descendCompatLayerInput: block => ({opcode: InputOpcode.COMPATIBILITY_LAYER, sourceOpcode: block.opcode}),
        getBlockInfo: () => null,
        createConstantInput: () => ({opcode: InputOpcode.CONSTANT}),
        script: {yields: false}
    };

    for (const opcode of compatBlocks.inputs) {
        const block = {opcode, inputs: {}, fields: {}};
        const result = ScriptTreeGenerator.prototype.descendInput.call(context, block, false);
        t.equal(result.opcode, InputOpcode.COMPATIBILITY_LAYER, opcode);
        t.equal(result.sourceOpcode, opcode, `${opcode} source`);
    }

    t.end();
});

test('descendStackedBlock prioritizes compatibility layer for all compat stacked opcodes', t => {
    const context = {
        runtime: {
            compilerData: {
                stacks: new Map(compatBlocks.stacked.map(opcode => [opcode, {stg: () => ({opcode: 'compiled'})}])),
                bt_stacks: new Set(),
                bt_branchables: new Set(),
                bt_inlines: new Set()
            },
            getOpcodeFunction: () => (() => 0)
        },
        descendCompatLayerStack: block => ({opcode: StackOpcode.COMPATIBILITY_LAYER, sourceOpcode: block.opcode}),
        descendVisualReport: () => null,
        getBlockInfo: () => null
    };

    for (const opcode of compatBlocks.stacked) {
        const block = {opcode, inputs: {}, fields: {}};
        const result = ScriptTreeGenerator.prototype.descendStackedBlock.call(context, block);
        t.equal(result.opcode, StackOpcode.COMPATIBILITY_LAYER, opcode);
        t.equal(result.sourceOpcode, opcode, `${opcode} source`);
    }

    t.end();
});
