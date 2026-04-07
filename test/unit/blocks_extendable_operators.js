const test = require('tap').test;
const Operators = require('../../src/blocks/scratch3_operators');

const blocks = new Operators(null);

test('addExtends uses predictable NUM ordering', t => {
    const result = blocks.addExtends({
        NUM2: '3',
        NUM1: '2',
        NUM3: '5'
    });
    t.equal(result, 10);
    t.end();
});

test('comparison extends chain semantics', t => {
    t.equal(blocks.ltExtends({TEXT1: 1, TEXT2: 2, TEXT3: 3}), true);
    t.equal(blocks.gtEqualsExtends({TEXT1: 3, TEXT2: 3, TEXT3: 2}), true);
    t.equal(blocks.equalsExtends({TEXT1: '4', TEXT2: 4}), true);
    t.end();
});

test('boolean extends operations', t => {
    t.equal(blocks.andExtends({OPERAND1: true, OPERAND2: '1'}), true);
    t.equal(blocks.orExtends({OPERAND1: false, OPERAND2: '0'}), false);
    t.equal(blocks.xorExtends({OPERAND1: true, OPERAND2: false, OPERAND3: true}), false);
    t.end();
});

test('numeric extends min/max/sub/div', t => {
    t.same(blocks.numberArrayExtends({NUM1: 7, NUM2: 2, NUM3: 9}), [7, 2, 9]);
    t.equal(blocks.minExtends({ARRAY: [7, 2, 9]}), 2);
    t.equal(blocks.maxExtends({ARRAY: [7, 2, 9]}), 9);
    t.equal(blocks.minExtends({ARRAY: '[7, 2, 9]'}), 2);
    t.equal(blocks.maxExtends({ARRAY: '[7, 2, 9]'}), 9);
    t.equal(blocks.subtractExtends({NUM1: 10, NUM2: 3, NUM3: 2}), 5);
    t.equal(blocks.divideExtends({NUM1: 12, NUM2: 3, NUM3: 2}), 2);
    t.end();
});

test('fallback still includes non-standard inputs', t => {
    const result = blocks.addExtends({
        foo: 1,
        bar: 2,
        baz: 3
    });
    t.equal(result, 6);
    t.end();
});

