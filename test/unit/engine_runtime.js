const tap = require('tap');
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const MonitorRecord = require('../../src/engine/monitor-record');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Variable = require('../../src/engine/variable');
const {
    BUILT_IN_CUSTOM_TYPES,
    TargetValue,
    CostumeValue,
    SoundValue,
    ScriptValue,
    VariableValue,
    ListValue,
    VectorValue,
    PositionValue
} = require('../../src/engine/custom-types');

const test = tap.test;

test('spec', t => {
    const r = new Runtime();

    t.type(Runtime, 'function');
    t.type(r, 'object');

    // Test types of cloud data managing functions
    t.type(r.hasCloudData, 'function');
    t.type(r.canAddCloudVariable, 'function');
    t.type(r.addCloudVariable, 'function');
    t.type(r.removeCloudVariable, 'function');

    t.ok(r instanceof Runtime);

    t.end();
});

test('monitorStateEquals', t => {
    const r = new Runtime();
    const id = 'xklj4#!';
    const prevMonitorState = new MonitorRecord({
        id,
        opcode: 'turtle whereabouts',
        value: '25'
    });
    const newMonitorDelta = {
        id,
        value: String(25)
    };
    r.requestAddMonitor(prevMonitorState);
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(true, prevMonitorState === r._monitorState.get(id));
    t.equals(String(25), r._monitorState.get(id).get('value'));
    t.end();
});

test('monitorStateDoesNotEqual', t => {
    const r = new Runtime();
    const id = 'xklj4#!';
    const params = {seven: 7};
    const prevMonitorState = new MonitorRecord({
        id,
        opcode: 'turtle whereabouts',
        value: '25'
    });

    // Value change
    let newMonitorDelta = {
        id,
        value: String(24)
    };
    r.requestAddMonitor(prevMonitorState);
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(true, r._monitorState.dirty);
    t.equals(String(24), r._monitorState.get(id).get('value'));

    // Prop change
    r._monitorState.dirty = false;
    newMonitorDelta = {
        id: 'xklj4#!',
        params: params
    };
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(true, r._monitorState.dirty);
    t.equals(String(24), r._monitorState.get(id).value);
    t.equals(params, r._monitorState.get(id).params);

    t.end();
});

test('built-in custom types include sprite by default', t => {
    const r = new Runtime();
    t.same(r.getCustomTypeIds(), ['sprite', 'costume', 'sound', 'script', 'variable', 'list', 'vector', 'position']);
    t.end();
});

test('built-in custom type IDs are reserved', t => {
    const r = new Runtime();

    t.equal(r.registerCustomType('sprite', {
        test: () => true,
        serialize: value => value,
        deserialize: value => value
    }), false);

    t.equal(r.unregisterCustomType('sprite'), false);
    t.end();
});

test('deserialize built-in custom type wrapper returns sprite value', t => {
    const r = new Runtime();
    const payload = {
        spriteId: 'target-id',
        snapshot: {name: 'Sprite1'}
    };

    const deserialized = r.deserializeCustomTypeValue({
        type: 'sprite',
        value: payload
    });

    t.equal(deserialized.visualReportType, 'sprite');
    t.equal(deserialized.spriteId, 'target-id');
    t.same(deserialized.value, {
        spriteId: 'target-id',
        name: 'Sprite1',
        isClone: false,
        deleted: false,
        image: ''
    });
    t.end();
});

test('sprite built-in custom type is declared', t => {
    t.type(BUILT_IN_CUSTOM_TYPES.sprite, 'object');
    t.equal(BUILT_IN_CUSTOM_TYPES.sprite.id, 'sprite');
    t.type(BUILT_IN_CUSTOM_TYPES.sprite.serialize, 'function');
    t.type(BUILT_IN_CUSTOM_TYPES.sprite.deserialize, 'function');
    t.end();
});

test('sprite-shaped values round-trip through built-in sprite type', t => {
    const r = new Runtime();
    const runtimeValue = new TargetValue({
        spriteId: 'target-id',
        snapshot: {
            name: 'Sprite1',
            x: 12,
            y: -3
        }
    }, r);

    const serialized = r.serializeCustomTypeValue(runtimeValue);
    t.equal(serialized.type, 'sprite');
    t.same(serialized.value, {
        spriteId: 'target-id',
        snapshot: {
            name: 'Sprite1',
            x: 12,
            y: -3
        }
    });

    const deserialized = r.deserializeCustomTypeValue(serialized);
    t.equal(deserialized.visualReportType, 'sprite');
    t.equal(deserialized.spriteId, 'target-id');
    t.equal(deserialized.toString(), 'Sprite1');
    t.same(deserialized.value, {
        spriteId: 'target-id',
        name: 'Sprite1',
        isClone: false,
        deleted: false,
        image: ''
    });
    t.end();
});

test('new built-in custom value types serialize and deserialize', t => {
    const r = new Runtime();
    const values = [
        new CostumeValue({costumeName: 'Costume 1'}, r),
        new SoundValue({soundName: 'Sound 1'}, r),
        new ScriptValue({source: 'when flag clicked'}),
        new VariableValue({variableId: 'var-id'}, r),
        new ListValue({listId: 'list-id'}, r),
        new VectorValue([1, 2]),
        new PositionValue([3, 4])
    ];

    const serializedTypes = values.map(value => r.serializeCustomTypeValue(value).type);
    t.same(serializedTypes, ['costume', 'sound', 'script', 'variable', 'list', 'vector', 'position']);

    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[0])), CostumeValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[1])), SoundValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[2])), ScriptValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[3])), VariableValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[4])), ListValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[5])), VectorValue);
    t.type(r.deserializeCustomTypeValue(r.serializeCustomTypeValue(values[6])), PositionValue);
    t.end();
});

test('variable and list values resolve dynamically by id', t => {
    const r = new Runtime();
    const target = {
        variables: {}
    };
    const variable = new Variable('var-id', 'score', Variable.SCALAR_TYPE, false);
    variable.value = 10;
    const list = new Variable('list-id', 'items', Variable.LIST_TYPE, false);
    list.value = ['a', 'b'];
    target.variables[variable.id] = variable;
    target.variables[list.id] = list;
    r.targets = [target];

    const variableValue = new VariableValue({variableId: 'var-id'}, r);
    const listValue = new ListValue({listId: 'list-id'}, r);

    t.equal(variableValue.toString(), '10');
    t.equal(listValue.toString(), 'a, b');

    variable.value = 25;
    list.value = ['x', 'y', 'z'];

    t.equal(variableValue.toString(), '25');
    t.equal(listValue.toString(), 'x, y, z');
    t.end();
});

test('RenderedTarget.toValue() converts to sprite custom type', t => {
    const r = new Runtime();
    const sprite = {
        name: 'Sprite1',
        costumes: []
    };
    const target = new RenderedTarget(sprite, r);
    target.id = 'target-id';
    target.isOriginal = false; // This is a clone
    target.x = 42;
    target.y = -9;
    r.targets = [target];

    const spriteValue = target.toValue();
    t.equal(spriteValue.visualReportType, 'sprite');
    t.equal(spriteValue.spriteId, 'target-id');
    t.equal(spriteValue.snapshot.name, 'Sprite1');
    t.equal(spriteValue.snapshot.isClone, true);
    t.equal(spriteValue.toString(), 'Sprite1 (clone)', 'Clone shows (clone) indicator');
    t.end();
});

test('normalizeBuiltInCustomTypeValue calls toValue() if present', t => {
    const r = new Runtime();
    const sprite = {
        name: 'Sprite1',
        costumes: []
    };
    const target = new RenderedTarget(sprite, r);
    target.id = 'target-id';
    target.isOriginal = true; // Not a clone
    r.targets = [target];

    const normalized = r.normalizeBuiltInCustomTypeValue(target);
    t.equal(normalized.visualReportType, 'sprite');
    t.equal(normalized.spriteId, 'target-id');
    t.equal(normalized.toString(), 'Sprite1', 'Non-clone shows name only');
    t.end();
});

test('getLabelForOpcode', t => {
    const r = new Runtime();

    const fakeExtension = {
        id: 'fakeExtension',
        name: 'Fake Extension',
        blocks: [
            {
                info: {
                    opcode: 'foo',
                    json: {},
                    text: 'Foo',
                    xml: ''
                }
            },
            {
                info: {
                    opcode: 'foo_2',
                    json: {},
                    text: 'Foo 2',
                    xml: ''
                }
            }
        ]
    };

    r._blockInfo.push(fakeExtension);

    const result1 = r.getLabelForOpcode('fakeExtension_foo');
    t.type(result1.category, 'string');
    t.type(result1.label, 'string');
    t.equals(result1.label, 'Fake Extension: Foo');

    const result2 = r.getLabelForOpcode('fakeExtension_foo_2');
    t.type(result2.category, 'string');
    t.type(result2.label, 'string');
    t.equals(result2.label, 'Fake Extension: Foo 2');

    t.end();
});

test('Project loaded emits runtime event', t => {
    const vm = new VirtualMachine();
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
    const project = readFileToBuffer(projectUri);
    let projectLoaded = false;

    vm.runtime.addListener('PROJECT_LOADED', () => {
        projectLoaded = true;
    });

    vm.loadProject(project).then(() => {
        t.equal(projectLoaded, true, 'Project load event emitted');
        t.end();
    });
});

test('Cloud variable limit allows only 10 cloud variables', t => {
    // This is a test of just the cloud variable limit mechanism
    // The functions being tested below need to be used when
    // creating and deleting cloud variables in the runtime.

    const rt = new Runtime();

    t.equal(rt.hasCloudData(), false);

    for (let i = 0; i < 10; i++) {
        t.equal(rt.canAddCloudVariable(), true);
        rt.addCloudVariable();
        // Adding a cloud variable should change the
        // result of the hasCloudData check
        t.equal(rt.hasCloudData(), true);
    }


    // We should be at the cloud variable limit now
    t.equal(rt.canAddCloudVariable(), false);

    // Removing a cloud variable should allow the addition of exactly one more
    // when we are at the cloud variable limit
    rt.removeCloudVariable();

    t.equal(rt.canAddCloudVariable(), true);
    rt.addCloudVariable();
    t.equal(rt.canAddCloudVariable(), false);

    // Disposing of the runtime should reset the cloud variable limitations
    rt.dispose();
    t.equal(rt.hasCloudData(), false);

    for (let i = 0; i < 10; i++) {
        t.equal(rt.canAddCloudVariable(), true);
        rt.addCloudVariable();
        t.equal(rt.hasCloudData(), true);
    }

    // We should be at the cloud variable limit now
    t.equal(rt.canAddCloudVariable(), false);

    t.end();

});

test('Starting the runtime emits an event', t => {
    let started = false;
    const rt = new Runtime();
    rt.addListener('RUNTIME_STARTED', () => {
        started = true;
    });
    rt.start();
    t.equal(started, true);
    rt.quit();
    t.end();
});

test('Runtime cannot be started while already running', t => {
    const rt = new Runtime();
    rt.start(); // Start the first time

    // Set up a flag/listener to check if it can be started again
    let started = false;
    rt.addListener('RUNTIME_STARTED', () => {
        started = true;
    });

    // Starting again should not emit another event
    rt.start();
    t.equal(started, false);
    rt.quit();
    t.end();
});

test('setCompatibilityMode restarts if it was already running', t => {
    const rt = new Runtime();
    rt.start(); // Start the first time

    // Set up a flag/listener to check if it gets started again
    let started = false;
    rt.addListener('RUNTIME_STARTED', () => {
        started = true;
    });

    rt.setCompatibilityMode(true);
    // TW: We make an intentional API change here. Changing compatibility mode won't emit a RUNTIME_STARTED
    // if the runtime is already running.
    t.equal(started, false);
    rt.quit();
    t.end();
});

test('setCompatibilityMode does not restart if it was not running', t => {
    const rt = new Runtime();

    let started = false;
    rt.addListener('RUNTIME_STARTED', () => {
        started = true;
    });

    rt.setCompatibilityMode(true);
    t.equal(started, false);
    t.end();
});

test('Disposing the runtime emits an event', t => {
    let disposed = false;
    const rt = new Runtime();
    rt.addListener('RUNTIME_DISPOSED', () => {
        disposed = true;
    });
    rt.dispose();
    t.equal(disposed, true);
    t.end();
});

test('Clock is reset on runtime dispose', t => {
    const rt = new Runtime();
    const c = rt.ioDevices.clock;
    let simulatedTime = 0;

    c._projectTimer = {
        timeElapsed: () => simulatedTime,
        start: () => {
            simulatedTime = 0;
        }
    };

    t.ok(c.projectTimer() === 0);
    simulatedTime += 1000;
    t.ok(c.projectTimer() === 1);
    rt.dispose();
    // When the runtime is disposed, the clock should be reset
    t.ok(c.projectTimer() === 0);
    t.end();
});
