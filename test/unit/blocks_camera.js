const test = require('tap').test;
const Camera = require('../../src/blocks/scratch3_camera');
const Runtime = require('../../src/engine/runtime');

test('getPrimitives', t => {
    const rt = new Runtime();
    const camera = new Camera(rt);
    t.type(camera.getPrimitives(), 'object');
    t.end();
});

test('camera position reporter returns semantic position value', t => {
    const rt = new Runtime();
    const camera = new Camera(rt);

    rt.camera.x = 91;
    rt.camera.y = -14;

    const value = camera.getCameraPosition();
    t.equal(rt.getCustomTypeIdForValue(value), 'position');
    t.same(value.toJSON(), {x: 91, y: -14});
    t.end();
});