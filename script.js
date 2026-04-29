const path = require('path');
const VirtualMachine = require('./src/index');
const Variable = require('./src/engine/variable');
const sb3 = require('./src/serialization/sb3');
const readFileToBuffer = require('./test/fixtures/readProjectFile').readFileToBuffer;

class UnitPoint {
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
}

const registerPointType = runtime => runtime.registerCustomTypeFromClass('unit_point', UnitPoint, {
    serialize: value => ({x: value.x, y: value.y}),
    deserialize: value => new UnitPoint(value.x, value.y)
});

async function run() {
    const vm = new VirtualMachine();
    const exampleProjectPath = path.resolve(__dirname, 'test/fixtures/clone-cleanup.sb2');
    
    await vm.loadProject(readFileToBuffer(exampleProjectPath));
    registerPointType(vm.runtime);

    const stage = vm.runtime.targets.find(target => target.isStage);
    stage.createVariable('point-scalar-id', 'point scalar', Variable.SCALAR_TYPE, false);
    stage.createVariable('point-list-id', 'point list', Variable.LIST_TYPE, false);

    stage.variables['point-scalar-id'].value = new UnitPoint(7, 8);
    stage.variables['point-list-id'].value = [new UnitPoint(9, 10)];

    // Using the same logic as the test found in serialization_sb3.js line 518
    vm.runtime.store.unsafe({
        payload: {
            one: new UnitPoint(7, 8),
            many: [new UnitPoint(9, 10)]
        }
    });

    const serialized = sb3.serialize(vm.runtime);
    const serializedStage = serialized.targets.find(t => t.isStage);
    
    console.log('--- Serialized ---');
    console.log('Scalar Var:', JSON.stringify(serializedStage.variables['point-scalar-id']));
    console.log('List Var:', JSON.stringify(serializedStage.lists['point-list-id']));
    console.log('Project Storage:', JSON.stringify(serialized.meta.projectStorage));

    // Deserialization
    const vm2 = new VirtualMachine();
    registerPointType(vm2.runtime);
    
    await sb3.deserialize(JSON.stringify(serialized), vm2.runtime);
    
    const stage2 = vm2.runtime.targets.find(target => target.isStage);
    const scalarVal = stage2.variables['point-scalar-id'].value;
    const listVal = stage2.variables['point-list-id'].value;
    const storageVal = vm2.runtime.store.projectStorage;

    console.log('--- Deserialized ---');
    console.log('Scalar Value:', JSON.stringify(scalarVal));
    console.log('List Value:', JSON.stringify(listVal));
    console.log('Project Storage:', JSON.stringify(storageVal));
}

run().catch(err => {
    // If unsafe fails, try the newer internal property name or just direct set if it's a mock
    console.error(err);
    process.exit(1);
});