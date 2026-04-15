const test = require('tap').test;
const Control = require('../../src/blocks/scratch3_control');

const makeControl = () => new Control({on: () => {}});

test('switchCaseExtends falls through like JavaScript until end', t => {
    const c = makeControl();
    const calls = [];
    const util = {
        stackFrame: {},
        thread: {
            peekStackFrame: () => ({})
        },
        startBranch: (branchNum, isLoop) => {
            calls.push({branchNum, isLoop});
        }
    };

    const args = {
        SWITCH_VALUE: 'b',
        CASE_VALUE: 'a',
        CASE_VALUE2: 'b',
        mutation: {branchkinds: JSON.stringify(['case', 'case', 'default'])}
    };

    c.switchCaseExtends(args, util);
    c.switchCaseExtends(args, util);
    c.switchCaseExtends(args, util);

    t.same(calls, [
        {branchNum: 2, isLoop: true},
        {branchNum: 3, isLoop: true}
    ]);
    t.end();
});

test('switchCaseExtends starts at default when no case matches', t => {
    const c = makeControl();
    const calls = [];
    const util = {
        stackFrame: {},
        thread: {
            peekStackFrame: () => ({})
        },
        startBranch: (branchNum, isLoop) => {
            calls.push({branchNum, isLoop});
        }
    };

    c.switchCaseExtends({
        SWITCH_VALUE: 'z',
        CASE_VALUE: 'a',
        CASE_VALUE2: 'b',
        mutation: {branchkinds: JSON.stringify(['case', 'case', 'default'])}
    }, util);

    t.same(calls, [{branchNum: 3, isLoop: true}]);
    t.end();
});

test('switchCaseExtends marks switch frame as breakable', t => {
    const c = makeControl();
    const threadFrame = {};
    const util = {
        stackFrame: {},
        thread: {
            peekStackFrame: () => threadFrame
        },
        startBranch: () => {}
    };

    c.switchCaseExtends({
        SWITCH_VALUE: 'a',
        CASE_VALUE: 'a',
        mutation: {branchkinds: JSON.stringify(['case'])}
    }, util);

    t.equal(threadFrame.isBreakable, true);
    t.end();
});
