const test = require('tap').test;
const StringBlocks = require('../../src/blocks/scratch3_string');

const blocks = new StringBlocks(null);

test('joinExtends respects mutation order', t => {
    const result = blocks.joinExtends({
        TEXT3: 'World',
        TEXT1: 'Hello',
        TEXT2: ' '
    });

    t.equal(result, 'Hello World');
    t.end();
});

test('joinExtends includes all random-id inputs without mutation', t => {
    const result = blocks.joinExtends({
        alpha: 'A',
        beta: 'B',
        gamma: 'C'
    });

    t.equal(result.length, 3);
    t.ok(result.includes('A'));
    t.ok(result.includes('B'));
    t.ok(result.includes('C'));
    t.end();
});
