// @ts-check

const {IRGenerator} = require('./irgen');
const {IROptimizer} = require('./iroptimizer');
const JSGenerator = require('./jsgen');

const compile = (/** @type {import("../engine/thread")} */ thread) => {
    const irGenerator = new IRGenerator(thread);
    const ir = irGenerator.generate();

    const irOptimizer = new IROptimizer(ir);
    irOptimizer.optimize();

    const procedures = {};
    const target = thread.target;

    const compileScript = (/** @type {import("./intermediate").IntermediateScript} */ script, parentScript) => {
        if (script.cachedCompileResult) {
            return script.cachedCompileResult;
        }

        const compiler = new JSGenerator(script, ir, target);
        const result = compiler.compile(parentScript);
        script.cachedCompileResult = result;
        return result;
    };

    const entry = compileScript(ir.entry, null);

    for (const procedureVariant of Object.keys(ir.procedures)) {
        const procedureData = ir.procedures[procedureVariant];
        const procedureTree = compileScript(procedureData, entry);
        procedures[procedureVariant] = procedureTree;
    }

    return {
        startingFunction: entry,
        procedures,
        executableHat: ir.entry.executableHat
    };
};

module.exports = compile;
