// @ts-check
/**
 * @fileoverview
 * Sets up all the main blocks for the compiler, aswell as exporting the exports.
 * (Base categorys etc)
 */

/**
 * Sets up the compiler.
 * @param {import("../engine/runtime.js")} runtime The runtime.
 */
const SetupCompiler = function (runtime) {
    const compilerData = runtime.compilerData;
    if (!runtime.compilerData) return;
    const exports = require('./exports');
    // CORE
    require('./setup-compiler/motion')(compilerData, exports);
    require('./setup-compiler/looks')(compilerData, exports);
    require('./setup-compiler/sound')(compilerData, exports);
    require('./setup-compiler/event')(compilerData, exports);
    require('./setup-compiler/control')(compilerData, exports);
    require('./setup-compiler/camera')(compilerData, exports);
    require('./setup-compiler/sensing')(compilerData, exports);
    require('./setup-compiler/operator')(compilerData, exports);
    require('./setup-compiler/string')(compilerData, exports);
    require('./setup-compiler/data')(compilerData, exports);
    require('./setup-compiler/procedures')(compilerData, exports);
    // Extensions
    require('./setup-compiler/pen')(compilerData, exports);
    // Other
    require('./setup-compiler/other')(compilerData, exports);
};

module.exports = SetupCompiler;
