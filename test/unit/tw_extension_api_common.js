const ScratchCommon = require('../../src/extension-support/tw-extension-api-common');
const {test} = require('tap');

test('ArgumentType', t => {
    t.equal(ScratchCommon.ArgumentType.ANGLE, 'angle');
    t.end();
});

test('BlockType', t => {
    t.equal(ScratchCommon.BlockType.BOOLEAN, 'Boolean');
    t.end();
});

test('TargetType', t => {
    t.equal(ScratchCommon.TargetType.SPRITE, 'sprite');
    t.end();
});

test('Cast', t => {
    // Cast is thoroughly tested elsewhere. We just want to make sure that the public methods
    // don't get deleted unexpectedly.
    t.equal(ScratchCommon.Cast.toNumber('5'), 5);
    t.equal(ScratchCommon.Cast.toBoolean('true'), true);
    t.equal(ScratchCommon.Cast.toString('something'), 'something');
    t.same(ScratchCommon.Cast.toRgbColorList('#abcdef'), [0xab, 0xcd, 0xef]);
    t.same(ScratchCommon.Cast.toRgbColorObject('#abcdef'), {r: 0xab, g: 0xcd, b: 0xef});
    t.equal(ScratchCommon.Cast.isWhiteSpace(''), true);
    t.equal(ScratchCommon.Cast.compare(1, 2), -1);
    t.equal(ScratchCommon.Cast.isInt(5.5), false);
    t.type(ScratchCommon.Cast.LIST_INVALID, 'string');
    t.type(ScratchCommon.Cast.LIST_ALL, 'string');
    t.equal(ScratchCommon.Cast.toListIndex('1.5', 10, false), 1);
    t.end();
});

test('external', t => {
    // has more tests in separate file, mostly just making sure that external exists at all
    ScratchCommon.external.fetch('data:text/plain;,test').then(r => {
        r.text().then(text => {
            t.equal(text, 'test');
            t.end();
        });
    });
});

test('getOrderedExtendableValues', t => {
    t.same(
        ScratchCommon.getOrderedExtendableValues(
            {NUM2: '2', mutation: {argumentids: '["NUM","NUM2"]'}, NUM: '1'},
            ['NUM']
        ),
        ['1', '2']
    );

    t.same(
        ScratchCommon.getOrderedExtendableValues(
            {NUM: '1', mutation: {argumentids: '["NUM","NUM2","LABEL"]'}},
            ['NUM'],
            0
        ),
        ['1', 0]
    );

    t.same(
        ScratchCommon.getOrderedExtendableValues(null),
        []
    );

    t.end();
});

test('extendable block helper API', t => {
    t.equal(ScratchCommon.ExtenderInputType.INPUT_VALUE, 'input_value');
    t.equal(ScratchCommon.ExtenderInputType.INPUT_DUMMY, 'input_dummy');
    t.equal(ScratchCommon.ExtenderInputType.INPUT_STATEMENT, 'input_statement');

    const definition = ScratchCommon.defineExtendableInput(
        ScratchCommon.ExtenderInputType.INPUT_VALUE,
        {shadow: 'math_number', field: 'NUM', check: 'Number'}
    );
    t.same(definition, {
        type: 'input_value',
        shadow: 'math_number',
        field: 'NUM',
        check: 'Number',
        transient: false,
        forceNewRow: false,
        fieldLabel: null
    });

    const block = ScratchCommon.createExtendableBlock(
        {opcode: 'sum', text: 'sum [NUM] + [NUM2]'},
        {starts: [definition], proceeds: []}
    );
    t.equal(block.opcode, 'sum');
    t.same(block.extendable.starts, [definition]);

    const dummy = ScratchCommon.Extendable.dummy('+');
    t.same(dummy, {
        type: 'input_dummy',
        shadow: null,
        field: null,
        check: null,
        transient: false,
        forceNewRow: false,
        fieldLabel: '+'
    });

    const value = ScratchCommon.Extendable.value({shadow: 'math_number', field: 'NUM'});
    t.equal(value.type, 'input_value');
    t.equal(value.shadow, 'math_number');

    const blockViaNamespace = ScratchCommon.Extendable.block(
        {opcode: 'sum2'},
        {starts: [value], proceeds: [dummy]}
    );
    t.same(blockViaNamespace.extendable.proceeds[0], dummy);

    t.end();
});
