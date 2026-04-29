const tap = require('tap');
const {test} = tap;
const VirtualMachine = require('../../src/virtual-machine');
const RenderedTarget = require('../../src/sprites/rendered-target');

test('RenderedTarget toValue() converts to sprite custom type', t => {
    const runtime = new (require('../../src/engine/runtime'))();
    const Sprite = require('../../src/sprites/sprite');
    
    const sprite = new Sprite(runtime);
    sprite.name = 'TestSprite';
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'test-target-id';
    runtime.targets = [target];

    // Call toValue() directly (what normalization does)
    const spriteValue = target.toValue();

    t.equal(spriteValue.visualReportType, 'sprite', 'toValue() returns sprite custom type');
    t.equal(spriteValue.spriteId, 'test-target-id', 'spriteValue has correct spriteId');
    t.ok(spriteValue.snapshot, 'spriteValue has snapshot');
    t.equal(typeof spriteValue.toString, 'function', 'spriteValue has toString method');
    t.equal(spriteValue.toString(), 'TestSprite', 'toString() returns sprite name');
    t.end();
});

test('Runtime normalization calls toValue() on RenderedTarget', t => {
    const runtime = new (require('../../src/engine/runtime'))();
    const Sprite = require('../../src/sprites/sprite');
    
    const sprite = new Sprite(runtime);
    sprite.name = 'TestSprite2';
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'test-target-id-2';
    runtime.targets = [target];

    // Simulate what execute.js does: normalize a reporter result
    const normalized = runtime.normalizeBuiltInCustomTypeValue(target);

    t.equal(normalized.visualReportType, 'sprite', 'normalization produces sprite custom type');
    t.equal(normalized.spriteId, 'test-target-id-2', 'normalized value has correct spriteId');
    t.ok(normalized.snapshot, 'normalized value has snapshot');
    t.equal(normalized.toString(), 'TestSprite2', 'toString() returns sprite name');
    t.end();
});

test('Plain objects without toValue() are passed through', t => {
    const runtime = new (require('../../src/engine/runtime'))();

    const plainObj = {foo: 'bar', x: 0, y: 0};
    const normalized = runtime.normalizeBuiltInCustomTypeValue(plainObj);

    t.equal(normalized, plainObj, 'plain objects are not modified');
    t.end();
});

