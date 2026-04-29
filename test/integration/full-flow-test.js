const tap = require('tap');
const {test} = tap;
const Runtime = require('../../src/engine/runtime');
const Sprite = require('../../src/sprites/sprite');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Cast = require('../../src/util/cast');

test('Full flow: RenderedTarget -> toValue -> say block formatting', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'MySprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'sprite-id-42';
    target.isOriginal = true; // Not a clone
    runtime.targets = [target];

    const spriteValue = runtime.normalizeBuiltInCustomTypeValue(target);
    const bubbleText = Cast.toString(spriteValue).substr(0, 10000);

    t.equal(spriteValue.visualReportType, 'sprite', 'Normalized to sprite type');
    t.equal(bubbleText, 'MySprite', 'Say block displays sprite name without indicators');
    t.end();
});

test('Clone sprite display', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'CloneSprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'clone-sprite-id';
    target.isOriginal = false; // Is a clone
    runtime.targets = [target];

    const spriteValue = runtime.normalizeBuiltInCustomTypeValue(target);
    const displayText = Cast.toString(spriteValue);

    t.equal(displayText, 'CloneSprite (clone)', 'Clone sprite shows clone indicator');
    t.end();
});

test('Dynamic snapshot: sprite state change reflects in display', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'DynamicSprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'dynamic-sprite-id';
    target.isOriginal = true; // Starts as original (not clone)
    runtime.targets = [target];

    const spriteValue = runtime.normalizeBuiltInCustomTypeValue(target);
    
    // Display should not show clone indicator initially
    let displayText = Cast.toString(spriteValue);
    t.equal(displayText, 'DynamicSprite', 'Initial display has no indicators');

    // Change target to a clone
    target.isOriginal = false;
    
    // Display should now show clone indicator (dynamic snapshot updated)
    displayText = Cast.toString(spriteValue);
    t.equal(displayText, 'DynamicSprite (clone)', 'After state change, display reflects clone indicator');
    
    t.end();
});

test('Dynamic deleted flag', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'DeleteableSprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'deleteable-sprite-id';
    target.isOriginal = false; // Is a clone

    // Register the target in the runtime so getTargetById finds it
    runtime.targets = [target];

    const spriteValue = runtime.normalizeBuiltInCustomTypeValue(target);
    
    // Initially not deleted (target exists in runtime)
    let displayText = Cast.toString(spriteValue);
    t.equal(displayText, 'DeleteableSprite (clone)', 'Initial display shows clone, not deleted');

    // Remove target from runtime (simulates deletion)
    runtime.targets = [];
    
    displayText = Cast.toString(spriteValue);
    t.equal(displayText, 'DeleteableSprite (clone, deleted)', 'After removal from runtime, shows deleted');
    
    t.end();
});

test('Variable monitor display: RenderedTarget stored in variable', t => {
    const runtime = new Runtime();
    
    const sprite = new Sprite(runtime);
    sprite.name = 'MonitorSprite';
    
    const target = new RenderedTarget(sprite, runtime);
    target.id = 'monitor-sprite-id';
    runtime.targets = [target];

    const spriteValue = target.toValue();
    const monitorDisplay = Cast.toString(spriteValue);

    t.equal(monitorDisplay, 'MonitorSprite', 'Monitor displays sprite name');
    t.end();
});

test('Visual report emits sprite name instead of sprite snapshot object', t => {
    const runtime = new Runtime();

    const sprite = new Sprite(runtime);
    sprite.name = 'BubbleSprite';

    const target = new RenderedTarget(sprite, runtime);
    target.id = 'bubble-sprite-id';
    target.isOriginal = true;
    runtime.targets = [target];

    runtime.getEditingTarget = () => target;

    runtime.once(Runtime.VISUAL_REPORT, report => {
        t.type(report.value, 'object', 'visual report uses a semantic sprite payload');
        t.equal(report.value.name, 'BubbleSprite', 'visual report exposes the sprite display name');
        t.equal(report.value.isClone, false, 'visual report exposes clone status');
        t.equal(report.value.deleted, false, 'visual report exposes deletion status');
        t.equal(report.type, 'sprite', 'visual report preserves the sprite semantic type');
        t.equal(report.visualReportType, 'sprite', 'visual report exposes the sprite visual report type');
        t.end();
    });

    runtime.visualReport('test-block-id', target.toValue(), target);
});

test('Visual report does not treat plain objects as custom types', t => {
    const runtime = new Runtime();

    const sprite = new Sprite(runtime);
    sprite.name = 'PlainObjectGuard';

    const target = new RenderedTarget(sprite, runtime);
    target.id = 'plain-object-guard-target';
    runtime.targets = [target];
    runtime.getEditingTarget = () => target;

    const fakeCustomType = {
        visualReportType: 'sprite',
        value: 'spoofed-value'
    };

    runtime.once(Runtime.VISUAL_REPORT, report => {
        t.equal(report.value, fakeCustomType, 'plain object is reported as-is');
        t.equal(report.type, 'object', 'plain object keeps normal object report type');
        t.equal(report.visualReportType, null, 'plain object does not get custom visual report type');
        t.end();
    });

    runtime.visualReport('test-block-id-plain-object', fakeCustomType, target);
});

test('Sprite custom type persists and rebinds to target across serialization', t => {
    const runtime = new Runtime();

    const sprite = new Sprite(runtime);
    sprite.name = 'PersistSprite';

    const target = new RenderedTarget(sprite, runtime);
    target.id = 'persist-sprite-id';
    target.isOriginal = true;
    runtime.targets = [target];

    const encoded = runtime.serializeCustomTypeValueDeep(target.toValue());
    const decoded = runtime.deserializeCustomTypeValueDeep(encoded);

    t.equal(decoded.visualReportType, 'sprite', 'decoded value remains a sprite custom type');
    t.equal(Cast.toString(decoded), 'PersistSprite', 'decoded value resolves current sprite name');

    // Prove rebinding by changing live target state after decode.
    target.isOriginal = false;
    t.equal(Cast.toString(decoded), 'PersistSprite (clone)', 'decoded value tracks live target after rebind');
    t.end();
});
