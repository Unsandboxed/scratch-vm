const tap = require('tap');
const {test} = tap;
const Runtime = require('../../src/engine/runtime');
const Sprite = require('../../src/sprites/sprite');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Cast = require('../../src/util/cast');

test('Sprite custom type value stringifies correctly', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'Sprite1';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'target-123';
    target.x = 42;
    target.y = -9;
    target.isOriginal = true; // Not a clone
    runtime.targets = [target];

    // Step 1: toValue() converts target to sprite value
    const spriteValue = target.toValue();
    
    console.log('=== Sprite Value Debug ===');
    console.log('spriteValue:', JSON.stringify(spriteValue, (k, v) => {
        if (typeof v === 'function') return '[Function]';
        if (v === undefined) return '[undefined]';
        return v;
    }, 2));
    console.log('spriteValue.spriteId:', spriteValue.spriteId);
    console.log('spriteValue.snapshot:', spriteValue.snapshot);
    console.log('spriteValue.snapshot.name:', spriteValue.snapshot.name);
    console.log('spriteValue.snapshot.isClone:', spriteValue.snapshot.isClone);
    console.log('spriteValue.toString():', spriteValue.toString());
    console.log('spriteValue[Symbol.toPrimitive]():', spriteValue[Symbol.toPrimitive]());
    console.log('Cast.toString(spriteValue):', Cast.toString(spriteValue));
    console.log('Cast.sanitize(spriteValue):', Cast.sanitize(spriteValue));
    
    // Step 2: Verify toString works for non-clone
    t.equal(spriteValue.toString(), 'Sprite1', 'Non-clone toString() returns sprite name');
    
    // Step 3: Verify Cast.toString works for non-clone
    t.equal(Cast.toString(spriteValue), 'Sprite1', 'Non-clone Cast.toString() returns sprite name');
    
    // Step 4: Verify Symbol.toPrimitive works
    t.equal(spriteValue[Symbol.toPrimitive](), 'Sprite1', 'Non-clone Symbol.toPrimitive() returns sprite name');
    
    // Step 5: Verify it works in string context
    const stringified = `${spriteValue}`;
    t.equal(stringified, 'Sprite1', `Non-clone string template returns sprite name (got "${stringified}")`);
    
    t.end();
});

test('Clone sprite custom type displays clone indicator', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'CloneSprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'clone-target-123';
    target.isOriginal = false; // Is a clone
    runtime.targets = [target];

    const spriteValue = target.toValue();
    
    console.log('=== Clone Sprite Debug ===');
    console.log('spriteValue.snapshot.isClone:', spriteValue.snapshot.isClone);
    console.log('spriteValue.toString():', spriteValue.toString());
    console.log('Cast.toString(spriteValue):', Cast.toString(spriteValue));
    
    t.equal(spriteValue.snapshot.isClone, true, 'snapshot indicates clone');
    t.equal(spriteValue.toString(), 'CloneSprite (clone)', 'Clone toString() includes (clone) indicator');
    t.equal(Cast.toString(spriteValue), 'CloneSprite (clone)', 'Clone Cast.toString() includes indicator');
    
    t.end();
});
