/**
 * @fileoverview Runtime for scripts generated by jsgen
 */

/* eslint-disable no-unused-vars */
/* eslint-disable prefer-template */
/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */

const globalState = {
    Timer: require('../util/timer'),
    Cast: require('../util/cast'),
    Clone: require('../util/clone'),
    log: require('../util/log'),
    blockUtility: require('./compat-block-utility'),
    thread: null
};

let baseRuntime = '';
const runtimeFunctions = {};

/**
 * Determine whether the current tick is likely stuck.
 * This implements similar functionality to the warp timer found in Scratch.
 * @returns {boolean} true if the current tick is likely stuck.
 */
baseRuntime += `let stuckCounter = 0;
const isStuck = () => {
    // The real time is not checked on every call for performance.
    stuckCounter++;
    if (stuckCounter === 100) {
        stuckCounter = 0;
        return globalState.thread.target.runtime.sequencer.timer.timeElapsed() > 500;
    }
    return false;
};`;

/**
 * Start hats by opcode.
 * @param {string} requestedHat The opcode of the hat to start.
 * @param {*} optMatchFields Fields to match.
 * @returns {Array} A list of threads that were started.
 */
runtimeFunctions.startHats = `const startHats = (requestedHat, optMatchFields) => {
    const thread = globalState.thread;
    const threads = thread.target.runtime.startHats(requestedHat, optMatchFields);
    return threads;
}`;

/**
 * Implements "thread waiting", where scripts are halted until all the scripts have finished executing.
 * @param {Array} threads The list of threads.
 */
runtimeFunctions.waitThreads = `const waitThreads = function*(threads) {
    const thread = globalState.thread;
    const runtime = thread.target.runtime;

    while (true) {
        // determine whether any threads are running
        let anyRunning = false;
        for (let i = 0; i < threads.length; i++) {
            if (runtime.threads.indexOf(threads[i]) !== -1) {
                anyRunning = true;
                break;
            }
        }
        if (!anyRunning) {
            // all threads are finished, can resume
            return;
        }

        let allWaiting = true;
        for (let i = 0; i < threads.length; i++) {
            if (!runtime.isWaitingThread(threads[i])) {
                allWaiting = false;
                break;
            }
        }
        if (allWaiting) {
            thread.status = 3; // STATUS_YIELD_TICK
        }

        yield;
    }
}`;

/**
 * waitPromise: Wait until a Promise resolves or rejects before continuing.
 * @param {Promise} promise The promise to wait for.
 * @returns {*} the value that the promise resolves to, otherwise undefined if the promise rejects
 */

/**
 * isPromise: Determine if a value is Promise-like
 * @param {unknown} promise The value to check
 * @returns {promise is PromiseLike} True if the value is Promise-like (has a .then())
 */

/**
 * executeInCompatibilityLayer: Execute a scratch-vm primitive.
 * @param {*} inputs The inputs to pass to the block.
 * @param {function} blockFunction The primitive's function.
 * @param {boolean} useFlags Whether to set flags (hasResumedFromPromise)
 * @param {string} blockId Block ID to set on the emulated block utility.
 * @param {*|null} branchInfo Extra information object for CONDITIONAL and LOOP blocks. See createBranchInfo().
 * @returns {*} the value returned by the block, if any.
 */
runtimeFunctions.executeInCompatibilityLayer = `let hasResumedFromPromise = false;
const waitPromise = function*(promise) {
    const thread = globalState.thread;
    let returnValue;

    // enter STATUS_PROMISE_WAIT and yield
    // this will stop script execution until the promise handlers reset the thread status
    // because promise handlers might execute immediately, configure thread.status here
    thread.status = 1; // STATUS_PROMISE_WAIT

    promise
        .then(value => {
            returnValue = value;
            thread.status = 0; // STATUS_RUNNING
        }, error => {
            globalState.log.warn('Promise rejected in compiled script:', error);
            returnValue = '' + error;
            thread.status = 0; // STATUS_RUNNING
        });

    yield;

    return returnValue;
};
const isPromise = value => (
    // see engine/execute.js
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
);
const executeInCompatibilityLayer = function*(inputs, blockFunction, isWarp, useFlags, blockId, branchInfo) {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    const stackFrame = branchInfo ? branchInfo.stackFrame : {};

    const finish = (returnValue) => {
        if (branchInfo) {
            if (typeof returnValue === 'undefined' && blockUtility._startedBranch) {
                branchInfo.isLoop = blockUtility._startedBranch[1];
                return blockUtility._startedBranch[0];
            }
            branchInfo.isLoop = branchInfo.defaultIsLoop;
            return returnValue;
        }
        return returnValue;
    };

    const executeBlock = () => {
        blockUtility.init(thread, blockId, stackFrame, branchInfo);
        return blockFunction(inputs, blockUtility);
    };

    let returnValue = executeBlock();
    if (isPromise(returnValue)) {
        returnValue = finish(yield* waitPromise(returnValue));
        if (useFlags) hasResumedFromPromise = true;
        return returnValue;
    }

    if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
        // Something external is forcing us to stop
        yield;
        // Make up a return value because whatever is forcing us to stop can't specify one
        return '';
    }

    while (thread.status === 2 /* STATUS_YIELD */ || thread.status === 3 /* STATUS_YIELD_TICK */) {
        // Yielded threads will run next iteration.
        if (thread.status === 2 /* STATUS_YIELD */) {
            thread.status = 0; // STATUS_RUNNING
            // Yield back to the event loop when stuck or not in warp mode.
            if (!isWarp || isStuck()) {
                yield;
            }
        } else {
            // status is STATUS_YIELD_TICK, always yield to the event loop
            yield;
        }

        returnValue = executeBlock();
        if (isPromise(returnValue)) {
            returnValue = finish(yield* waitPromise(returnValue));
            if (useFlags) hasResumedFromPromise = true;
            return returnValue;
        }

        if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
            yield;
            return finish('');
        }
    }

    return finish(returnValue);
}`;

/**
 * @param {boolean} isLoop True if the block is a LOOP by default (can be overridden by startBranch() call)
 * @returns {unknown} Branch info object for compatibility layer.
 */
runtimeFunctions.createBranchInfo = `const createBranchInfo = (isLoop) => ({
    defaultIsLoop: isLoop,
    isLoop: false,
    branch: 0,
    stackFrame: {},
    onEnd: []
});`;

/**
 * End the current script.
 */
runtimeFunctions.retire = `const retire = () => {
    const thread = globalState.thread;
    thread.target.runtime.sequencer.retireThread(thread);
}`;

/**
 * Scratch cast to boolean.
 * Similar to Cast.toBoolean()
 * @param {*} value The value to cast
 * @returns {boolean} The value cast to a boolean
 */
runtimeFunctions.asBoolean = `const asBoolean = value => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value === '' || value === '0' || value.toLowerCase() === 'false') {
            return false;
        }
        return true;
    }
    return !!value;
}`;

/**
 * Scratch cast to string
 * Similar to Cast.toString()
 * @param {*} value The value to cast
 * @returns {string} THe value cast to a string
 */
runtimeFunctions.asString = `const asString = value => {
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return '{}';
        }
    }
    return "" + value;
}`;

/**
 * If a number is very close to a whole number, round to that whole number.
 * @param {number} value Value to round
 * @returns {number} Rounded number or original number
 */
runtimeFunctions.limitPrecision = `const limitPrecision = value => {
    const rounded = Math.round(value);
    const delta = value - rounded;
    return (Math.abs(delta) < 1e-9) ? rounded : value;
}`;

/**
 * Used internally by the compare family of function.
 * See similar method in cast.js.
 * @param {*} val A value that evaluates to 0 in JS string-to-number conversation such as empty string, 0, or tab.
 * @returns {boolean} True if the value should not be treated as the number zero.
 */
baseRuntime += `const isNotActuallyZero = val => {
    if (typeof val !== 'string') return false;
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        if (code === 48 || code === 9) {
            return false;
        }
    }
    return true;
};`;

/**
 * Determine if two values are equal.
 * @param {*} v1 First value
 * @param {*} v2 Second value
 * @returns {boolean} true if v1 is equal to v2
 */
baseRuntime += `const compareEqualSlow = (v1, v2) => {
    const n1 = +v1;
    if (isNaN(n1) || (n1 === 0 && isNotActuallyZero(v1))) return ('' + v1).toLowerCase() === ('' + v2).toLowerCase();
    const n2 = +v2;
    if (isNaN(n2) || (n2 === 0 && isNotActuallyZero(v2))) return ('' + v1).toLowerCase() === ('' + v2).toLowerCase();
    return n1 === n2;
};
const compareEqual = (v1, v2) => (typeof v1 === 'number' && typeof v2 === 'number' && !isNaN(v1) && !isNaN(v2) || v1 === v2) ? v1 === v2 : compareEqualSlow(v1, v2);`;

/**
 * Determine if one value is greater than another.
 * @param {*} v1 First value
 * @param {*} v2 Second value
 * @returns {boolean} true if v1 is greater than v2
 */
runtimeFunctions.compareGreaterThan = `const compareGreaterThanSlow = (v1, v2) => {
    let n1 = +v1;
    let n2 = +v2;
    if (n1 === 0 && isNotActuallyZero(v1)) {
        n1 = NaN;
    } else if (n2 === 0 && isNotActuallyZero(v2)) {
        n2 = NaN;
    }
    if (isNaN(n1) || isNaN(n2)) {
        const s1 = ('' + v1).toLowerCase();
        const s2 = ('' + v2).toLowerCase();
        return s1 > s2;
    }
    return n1 > n2;
};
const compareGreaterThan = (v1, v2) => typeof v1 === 'number' && typeof v2 === 'number' && !isNaN(v1) ? v1 > v2 : compareGreaterThanSlow(v1, v2)`;

/**
 * Determine if one value is less than another.
 * @param {*} v1 First value
 * @param {*} v2 Second value
 * @returns {boolean} true if v1 is less than v2
 */
runtimeFunctions.compareLessThan = `const compareLessThanSlow = (v1, v2) => {
    let n1 = +v1;
    let n2 = +v2;
    if (n1 === 0 && isNotActuallyZero(v1)) {
        n1 = NaN;
    } else if (n2 === 0 && isNotActuallyZero(v2)) {
        n2 = NaN;
    }
    if (isNaN(n1) || isNaN(n2)) {
        const s1 = ('' + v1).toLowerCase();
        const s2 = ('' + v2).toLowerCase();
        return s1 < s2;
    }
    return n1 < n2;
};
const compareLessThan = (v1, v2) => typeof v1 === 'number' && typeof v2 === 'number' && !isNaN(v2) ? v1 < v2 : compareLessThanSlow(v1, v2)`;

/**
 * Generate a random integer.
 * @param {number} low Lower bound
 * @param {number} high Upper bound
 * @returns {number} A random integer between low and high, inclusive.
 */
runtimeFunctions.randomInt = `const randomInt = (low, high) => low + Math.floor(Math.random() * ((high + 1) - low))`;

/**
 * Generate a random float.
 * @param {number} low Lower bound
 * @param {number} high Upper bound
 * @returns {number} A random floating point number between low and high.
 */
runtimeFunctions.randomFloat = `const randomFloat = (low, high) => (Math.random() * (high - low)) + low`;

/**
 * Create and start a timer.
 * @returns {Timer} A started timer
 */
runtimeFunctions.timer = `const timer = () => {
    const t = new globalState.Timer({
        now: () => globalState.thread.target.runtime.currentMSecs
    });
    t.start();
    return t;
}`;

/**
 * Returns the amount of days since January 1st, 2000.
 * @returns {number} Days since 2000.
 */
// Date.UTC(2000, 0, 1) === 946684800000
// Hardcoding it is marginally faster
runtimeFunctions.daysSince2000 = `const daysSince2000 = () => (Date.now() - 946684800000) / (24 * 60 * 60 * 1000)`;

/**
 * Determine distance to a sprite or point.
 * @param {string} menu The name of the sprite or location to find.
 * @returns {number} Distance to the point, or 10000 if it cannot be calculated.
 */
runtimeFunctions.distance = `const distance = menu => {
    const thread = globalState.thread;
    if (thread.target.isStage) return 10000;

    let targetX = 0;
    let targetY = 0;
    if (menu === '_mouse_') {
        targetX = thread.target.runtime.ioDevices.mouse.getScratchX();
        targetY = thread.target.runtime.ioDevices.mouse.getScratchY();
    } else if (menu === '_camera_') {
        targetX = thread.target.runtime.camera.x;
        targetY = thread.target.runtime.camera.y;
    } else {
        const distTarget = thread.target.runtime.getSpriteTargetByName(menu);
        if (!distTarget) return 10000;
        targetX = distTarget.x;
        targetY = distTarget.y;
    }

    const dx = thread.target.x - targetX;
    const dy = thread.target.y - targetY;
    return Math.sqrt((dx * dx) + (dy * dy));
}`;

/**
 * Convert a Scratch list index to a JavaScript list index.
 * "all" is not considered as a list index.
 * Similar to Cast.toListIndex()
 * @param {number} index Scratch list index.
 * @param {number} length Length of the list.
 * @returns {number} 0 based list index, or -1 if invalid.
 */
baseRuntime += `const listIndexSlow = (index, length) => {
    if (index === 'last') {
        return length - 1;
    } else if (index === 'random' || index === 'any') {
        if (length > 0) {
            return (Math.random() * length) | 0;
        }
        return -1;
    }
    index = (+index || 0) | 0;
    if (index < 1 || index > length) {
        return -1;
    }
    return index - 1;
};
const listIndex = (index, length) => {
    if (typeof index !== 'number') {
      return listIndexSlow(index, length);
    }
    index = index | 0;
    return index < 1 || index > length ? -1 : index - 1;
};`;

/**
 * Get a value from a list.
 * @param {Array} list The list
 * @param {*} idx The 1-indexed index in the list.
 * @returns {*} The list item, otherwise empty string if it does not exist.
 */
runtimeFunctions.listGet = `const listGet = (list, idx) => {
    const index = listIndex(idx, list.length);
    if (index === -1) {
        return '';
    }
    return list[index];
}`;

/**
 * Replace a value in a list.
 * @param {import('../engine/variable')} list The list
 * @param {*} idx List index, Scratch style.
 * @param {*} value The new value.
 */
runtimeFunctions.listReplace = `const listReplace = (list, idx, value) => {
    const index = listIndex(idx, list.value.length);
    if (index === -1) {
        return;
    }
    list.value[index] = value;
    list._monitorUpToDate = false;
}`;

/**
 * Set the contents in a list.
 * @param {import('../engine/variable')} list The list
 * @param {*} array The new contents.
 */
runtimeFunctions.listSet = `const listSet = (list, array) => {
    list.value = Cast.toArray(array);
    list._monitorUpToDate = false;
}`;

/**
 * Insert a value in a list.
 * @param {import('../engine/variable')} list The list.
 * @param {*} idx The Scratch index in the list.
 * @param {*} value The value to insert.
 */
runtimeFunctions.listInsert = `const listInsert = (list, idx, value) => {
    const index = listIndex(idx, list.value.length + 1);
    if (index === -1) {
        return;
    }
    list.value.splice(index, 0, value);
    list._monitorUpToDate = false;
}`;

/**
 * Delete a value from a list.
 * @param {import('../engine/variable')} list The list.
 * @param {*} idx The Scratch index in the list.
 */
runtimeFunctions.listDelete = `const listDelete = (list, idx) => {
    if (idx === 'all') {
        list.value = [];
        return;
    }
    const index = listIndex(idx, list.value.length);
    if (index === -1) {
        return;
    }
    list.value.splice(index, 1);
    list._monitorUpToDate = false;
}`;

/**
 * Return whether a list contains a value.
 * @param {import('../engine/variable')} list The list.
 * @param {*} item The value to search for.
 * @returns {boolean} True if the list contains the item
 */
runtimeFunctions.listContains = `const listContains = (list, item) => {
    // TODO: evaluate whether indexOf is worthwhile here
    if (list.value.indexOf(item) !== -1) {
        return true;
    }
    for (let i = 0; i < list.value.length; i++) {
        if (compareEqual(list.value[i], item)) {
            return true;
        }
    }
    return false;
}`;

/**
 * Find the 1-indexed index of an item in a list.
 * @param {import('../engine/variable')} list The list.
 * @param {*} item The item to search for
 * @returns {number} The 1-indexed index of the item in the list, otherwise 0
 */
runtimeFunctions.listIndexOf = `const listIndexOf = (list, item) => {
    for (let i = 0; i < list.value.length; i++) {
        if (compareEqual(list.value[i], item)) {
            return i + 1;
        }
    }
    return 0;
}`;

/**
 * Get the stringified form of a list.
 * @param {import('../engine/variable')} list The list.
 * @returns {string} Stringified form of the list.
 */
runtimeFunctions.listContents = `const listContents = list => {
    for (let i = 0; i < list.value.length; i++) {
        const listItem = list.value[i];
        // this is an intentional break from what scratch 3 does to address our automatic string -> number conversions
        // it fixes more than it breaks
        if ((listItem + '').length !== 1) {
            return list.value.join(' ');
        }
    }
    return list.value.join('');
}`;

/**
 * Get the raw array form of a list.
 * @param {import('../engine/variable')} list The list.
 * @returns {string} Stringified form of the list.
 */
runtimeFunctions.listArrayContents = `const listArrayContents = list => {
    return Clone.structured(list.value);
}`;

/**
 * Convert a color to an RGB list
 * @param {*} color The color value to convert
 * @return {Array.<number>} [r,g,b], values between 0-255.
 */
runtimeFunctions.colorToList = `const colorToList = color => globalState.Cast.toRgbColorList(color)`;

/**
 * Implements Scratch modulo (floored division instead of truncated division)
 * @param {number} n Number
 * @param {number} modulus Base
 * @returns {number} n % modulus (floored division)
 */
runtimeFunctions.mod = `const mod = (n, modulus) => {
    let result = n % modulus;
    if (result / modulus < 0) result += modulus;
    return result;
}`;

/**
 * Implements Scratch tangent.
 * @param {number} angle Angle in degrees.
 * @returns {number} value of tangent or Infinity or -Infinity
 */
runtimeFunctions.tan = `const tan = (angle) => {
    switch (angle % 360) {
    case -270: case 90: return Infinity;
    case -90: case 270: return -Infinity;
    }
    return Math.round(Math.tan((Math.PI * angle) / 180) * 1e10) / 1e10;
}`;

/**
 * @param {function} callback The function to run
 * @param {...unknown} args The arguments to pass to the function
 * @returns {unknown} A generator that will yield once then call the function and return its value.
 */
runtimeFunctions.yieldThenCall = `const yieldThenCall = function* (callback, ...args) {
    yield;
    return callback(...args);
}`;

/**
 * @param {function} callback The generator function to run
 * @param {...unknown} args The arguments to pass to the generator function
 * @returns {unknown} A generator that will yield once then delegate to the generator function and return its value.
 */
runtimeFunctions.yieldThenCallGenerator = `const yieldThenCallGenerator = function* (callback, ...args) {
    yield;
    return yield* callback(...args);
}`;

/**
 * Step a compiled thread.
 * @param {Thread} thread The thread to step.
 */
const execute = thread => {
    globalState.thread = thread;
    thread.generator.next();
};

const threadStack = [];
const saveGlobalState = () => {
    threadStack.push(globalState.thread);
};
const restoreGlobalState = () => {
    globalState.thread = threadStack.pop();
};

const insertRuntime = source => {
    let result = baseRuntime;
    for (const functionName of Object.keys(runtimeFunctions)) {
        if (source.includes(functionName)) {
            result += `${runtimeFunctions[functionName]};`;
        }
    }
    result += `return ${source}`;
    return result;
};

/**
 * Evaluate arbitrary JS in the context of the runtime.
 * @param {string} source The string to evaluate.
 * @returns {*} The result of evaluating the string.
 */
const scopedEval = source => {
    const withRuntime = insertRuntime(source);
    try {
        return new Function('globalState', withRuntime)(globalState);
    } catch (e) {
        globalState.log.error('was unable to compile script', withRuntime);
        throw e;
    }
};

execute.scopedEval = scopedEval;
execute.runtimeFunctions = runtimeFunctions;
execute.saveGlobalState = saveGlobalState;
execute.restoreGlobalState = restoreGlobalState;

module.exports = execute;
