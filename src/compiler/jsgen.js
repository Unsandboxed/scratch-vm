// @ts-check

const log = require('../util/log');
const jsexecute = require('./jsexecute');
const {StackOpcode, InputOpcode, InputType} = require('./enums.js');
const oldCompilerCompatibility = require('./old-compiler-compatibility.js');

// These imports are used by jsdoc comments but eslint doesn't know that
/* eslint-disable no-unused-vars */
const {
    IntermediateStackBlock,
    IntermediateInput,
    IntermediateStack,
    IntermediateScript,
    IntermediateRepresentation
} = require('./intermediate');
/* eslint-enable no-unused-vars */

/**
 * @fileoverview Convert intermediate representations to JavaScript functions.
 */

/* eslint-disable max-len */
/* eslint-disable prefer-template */

const {
    sanitize,
    Frame,
    factoryNameVariablePool,
    functionNameVariablePool,
    generatorNameVariablePool,
    VariablePool
} = require('./shared-exports');

class JSGenerator {
    /**
     * @param {IntermediateScript} script
     * @param {IntermediateRepresentation} ir
     * @param {import("../sprites/rendered-target")} target
     */
    constructor (script, ir, target) {
        this.script = script;
        this.ir = ir;
        this.target = target;
        this.source = '';

        this.isWarp = script.isWarp;
        this.isProcedure = script.isProcedure;
        this.warpTimer = script.warpTimer;

        /**
         * Stack of frames, most recent is last item.
         * @type {InstanceType<Frame>[]}
         */
        this.frames = [];

        /**
         * The current Frame.
         * @type {InstanceType<Frame>?}
         */
        this.currentFrame = null;

        this.localVariables = new VariablePool('a');
        this._setupVariablesPool = new VariablePool('b');
        this._setupVariables = {};

        this.descendedIntoModulo = false;
        this.isInHat = false;

        this.debug = this.target.runtime.debug;

        this.oldCompilerStub = new oldCompilerCompatibility.JSGeneratorStub(this);
    }

    /**
     * Enter a new frame
     * @param {InstanceType<Frame>} frame New frame.
     */
    pushFrame (frame) {
        this.frames.push(frame);
        this.currentFrame = frame;
    }

    /**
     * Exit the current frame
     */
    popFrame () {
        this.frames.pop();
        this.currentFrame = this.frames[this.frames.length - 1];
    }

    /**
     * @returns {boolean} true if the current block is the last command of a loop
     */
    isLastBlockInLoop () {
        for (let i = this.frames.length - 1; i >= 0; i--) {
            const frame = this.frames[i];
            if (!frame.isLastBlock) {
                return false;
            }
            if (frame.isLoop) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {IntermediateInput} block Input node to compile.
     * @returns {string} Compiled input.
     */
    descendInput (block) {
        if (this.target.runtime.compilerData.compileFns.has(block.opcode)) {
            return this.target.runtime.compilerData.compileFns.get(block.opcode)(this, block, true);
        }
        const node = block.inputs;
        switch (block.opcode) {
        case InputOpcode.NOP:
            return `""`;

        case InputOpcode.ADDON_CALL:
            return `(${this.descendAddonCall(node)})`;

        case InputOpcode.CAST_BOOLEAN:
            return `asBoolean(${this.descendInput(node.target)})`;
        case InputOpcode.CAST_NUMBER:
            if (node.target.isAlwaysType(InputType.BOOLEAN_INTERPRETABLE)) {
                return `(+${this.descendInput(node.target.toType(InputType.BOOLEAN))})`;
            }
            if (node.target.isAlwaysType(InputType.NUMBER_OR_NAN)) {
                return `toNotNaN(${this.descendInput(node.target)})`;
            }
            return `toNotNaN(+${this.descendInput(node.target)})`;
        case InputOpcode.CAST_NUMBER_OR_NAN:
            return `(+${this.descendInput(node.target)})`;
        case InputOpcode.CAST_NUMBER_INDEX:
            return `(${this.descendInput(node.target.toType(InputType.NUMBER_OR_NAN))} | 0)`;
        case InputOpcode.CAST_STRING:
            if (node.target.isSometimesType(InputType.OBJECTLIKE)) {
                return `asString(${this.descendInput(node.target)})`;
            }
            return `("" + ${this.descendInput(node.target)})`;
        case InputOpcode.CAST_COLOR:
            return `colorToList(${this.descendInput(node.target)})`;
        case InputOpcode.CAST_ARRAY:
            return `asArray(${this.descendInput(node.target)})`;
        case InputOpcode.CAST_OBJECT:
            return `asObject(${this.descendInput(node.target)}, false)`;
        case InputOpcode.CAST_OBJECTLIKE:
            return `asObject(${this.descendInput(node.target)}, true)`;

        case InputOpcode.COMPATIBILITY_LAYER:
            if (this.target.runtime.compilerData.bt_inlines.has(node.blockType)) {
                const branchVariable = this.localVariables.next();
                const returnVariable = this.localVariables.next();
                let source = '(yield* (function*() {\n';
                source += `let ${returnVariable} = undefined;\n`;
                source += `const ${branchVariable} = createBranchInfo(false);\n`;
                source += `${returnVariable} = (${this.generateCompatibilityLayerCall(node, false, branchVariable)});\n`;
                source += `${branchVariable}.branch = globalState.blockUtility._startedBranch[0];\n`;
                source += `switch (${branchVariable}.branch) {\n`;
                for (const index in node.substacks) {
                    source += `case ${+index}: {\n`;
                    const _frame = new Frame(false, node.breakable);
                    _frame.isIterable = node.iterable;
                    _frame.isCompat = true;
                    source += `break;\n`;
                    source += `}\n`; // close case
                }
                source += '}\n'; // close switch
                source += `if (${branchVariable}.onEnd[0]) yield ${branchVariable}.onEnd.shift()(${branchVariable});\n`;
                source += `return ${returnVariable};\n`;
                source += '})())'; // close function and yield
                return source;
            }
            // Compatibility layer inputs never use flags.
            return `(${this.generateCompatibilityLayerCall(node, false)})`;

        case InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER:
            return this.oldCompilerStub.descendInputFromNewCompiler(block);

        case InputOpcode.CONSTANT:
            if (block.isAlwaysType(InputType.NUMBER)) {
                if (typeof node.value !== 'number') throw new Error(`JS: '${block.type}' type constant had ${typeof node.value} type value. Expected number.`);
                if (Object.is(node.value, -0)) return '-0';
                return node.value.toString();
            } else if (block.isAlwaysType(InputType.BOOLEAN)) {
                if (typeof node.value !== 'boolean') throw new Error(`JS: '${block.type}' type constant had ${typeof node.value} type value. Expected boolean.`);
                return node.value.toString();
            } else if (block.isAlwaysType(InputType.COLOR)) {
                if (!Array.isArray(node.value)) throw new Error(`JS: '${block.type}' type constant was not an array.`);
                if (node.value.length !== 3) throw new Error(`JS: '${block.type}' type constant had an array of length '${node.value.length}'. Expected 3.`);
                for (let i = 0; i < 3; i++) {
                    if (typeof node.value[i] !== 'number') {
                        throw new Error(`JS: '${block.type}' type constant element ${i} had a value of type '${node.value[i]}'. Expected number.`);
                    }
                }
                return `[${node.value[0]},${node.value[1]},${node.value[2]}]`;
            } else if (block.isSometimesType(InputType.STRING)) {
                return `"${sanitize(node.value.toString())}"`;
            } throw new Error(`JS: Unknown constant input type '${block.type}'.`);

        default:
            log.warn(`JS: Unknown input: ${block.opcode}`, node, block);
            throw new Error(`JS: Unknown input: ${block.opcode}`);
        }
    }

    /**
     * @param {IntermediateStackBlock} block Stacked block to compile.
     */
    descendStackedBlock (block) {
        if (this.target.runtime.compilerData.compileFns.has(block.opcode)) {
            return this.target.runtime.compilerData.compileFns.get(block.opcode)(this, block, false);
        }
        const node = block.inputs;
        switch (block.opcode) {
        case StackOpcode.ADDON_CALL: {
            this.source += `${this.descendAddonCall(node)};\n`;
            break;
        }

        case StackOpcode.COMPATIBILITY_LAYER: {
            // If the last command in a loop returns a promise, immediately continue to the next iteration.
            // If you don't do this, the loop effectively yields twice per iteration and will run at half-speed.
            const isLastInLoop = this.isLastBlockInLoop();

            const blockType = node.blockType;
            if (this.target.runtime.compilerData.bt_stacks.has(blockType)) {
                this.source += `${this.generateCompatibilityLayerCall(node, isLastInLoop)};\n`;
            } else if (this.target.runtime.compilerData.bt_branchables.has(blockType)) {
                const branchVariable = this.localVariables.next();
                this.source += `const ${branchVariable} = createBranchInfo(${this.target.runtime.compilerData.bt_loops.has(blockType)});\n`;
                this.source += `while (${branchVariable}.branch = +(${this.generateCompatibilityLayerCall(node, false, branchVariable)})) {\n`;
                this.source += `switch (${branchVariable}.branch) {\n`;
                for (const index in node.substacks) {
                    this.source += `case ${+index}: {\n`;
                    const _frame = new Frame(false, node.breakable);
                    _frame.isIterable = node.iterable;
                    _frame.isCompat = true;
                    this.source += this.descendStackForSource(node.substacks[index], _frame);
                    this.source += `break;\n`;
                    this.source += `}\n`; // close case
                }
                this.source += '}\n'; // close switch
                this.source += `if (${branchVariable}.onEnd[0]) yield ${branchVariable}.onEnd.shift()(${branchVariable});\n`;
                this.source += `if (!${branchVariable}.isLoop) break;\n`;
                this.yieldLoop();
                this.source += '}\n'; // close while
            } else {
                throw new Error(`Unknown block type: ${blockType}`);
            }

            if (isLastInLoop) {
                this.source += 'if (hasResumedFromPromise) {hasResumedFromPromise = false;continue;}\n';
            }
            break;
        }

        case InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER:
            return this.oldCompilerStub.descendStackedBlockFromNewCompiler(block);

        case StackOpcode.HAT_EDGE:
            this.isInHat = true;
            this.source += '{\n';
            // For exact Scratch parity, evaluate the input before checking old edge state.
            // Can matter if the input is not instantly evaluated.
            this.source += `const resolvedValue = ${this.descendInput(node.condition)};\n`;
            if (node.info.alwaysActivated || (node.mutation && !!JSON.parse(node.mutation.hatalwaysactivated || false))) {
                this.source += `if (!resolvedValue) {\n`;
                this.retire();
                this.source += '}\n';
            } else {
                this.source += `const id = "${sanitize(node.id)}";\n`;
                this.source += 'const hasOldEdgeValue = target.hasEdgeActivatedValue(id);\n';
                this.source += `const oldEdgeValue = target.updateEdgeActivatedValue(id, resolvedValue);\n`;
                this.source += `const edgeWasActivated = hasOldEdgeValue ? (!oldEdgeValue && resolvedValue) : resolvedValue;\n`;
                this.source += `if (!edgeWasActivated) {\n`;
                this.retire();
                this.source += '}\n';
            }
            this.source += 'yield;\n';
            this.source += '}\n';
            this.isInHat = false;
            break;

        case StackOpcode.HAT_PREDICATE:
            this.isInHat = true;
            this.source += `if (!${this.descendInput(node.condition)}) {\n`;
            this.retire();
            this.source += '}\n';
            this.source += 'yield;\n';
            this.isInHat = false;
            break;

        case StackOpcode.NOP:
            break;

        case StackOpcode.VISUAL_REPORT: {
            const value = this.localVariables.next();
            this.source += `const ${value} = ${this.descendInput(node.input)};`;
            // blocks like legacy no-ops can return a literal `undefined`
            this.source += `if (${value} !== undefined) runtime.visualReport("${sanitize(this.script.topBlockId)}", ${value}, target);\n`;
            break;
        }

        default:
            log.warn(`JS: Unknown stacked block: ${block.opcode}`, node, block);
            throw new Error(`JS: Unknown stacked block: ${block.opcode}`);
        }
    }

    /**
     * Compiles a reference to a target.
     * @param {IntermediateInput} input The target reference. Must be a string.
     * @returns {string} The compiled target reference
     */
    descendTargetReference (input) {
        if (!input.isAlwaysType(InputType.STRING)) {
            throw new Error(`JS: Object references must be strings!`);
        }
        if (input.isConstant('_stage_')) return 'stage';
        return this.evaluateOnce(`runtime.getSpriteTargetByName(${this.descendInput(input)})`);
    }

    /**
     * Compile a Record of input objects into a safe JS string.
     * @param {Record<string, IntermediateInput>} inputs
     * @returns {string}
     */
    descendInputRecord (inputs) {
        let result = '{';
        for (const name of Object.keys(inputs)) {
            const node = inputs[name];
            result += `"${sanitize(name)}":${this.descendInput(node)},`;
        }
        result += '}';
        return result;
    }

    /**
     * @param {IntermediateStack} stack
     * @param {InstanceType<Frame>} frame
     */
    descendStack (stack, frame) {
        // Entering a stack -- all bets are off.
        // TODO: allow if/else to inherit values
        this.pushFrame(frame);

        for (let i = 0; i < stack.blocks.length; i++) {
            frame.isLastBlock = i === stack.blocks.length - 1;
            this.descendStackedBlock(stack.blocks[i]);
        }

        // Leaving a stack -- any assumptions made in the current stack do not apply outside of it
        // TODO: in if/else this might create an extra unused object
        this.popFrame();
    }

    descendStackForSource (nodes, frame) {
        // Wrapper for descendStack to get the source
        const oldSource = this.source;
        this.source = '';
        this.descendStack(nodes, frame);
        const stackSource = this.source;
        this.source = oldSource;
        return stackSource;
    }

    /* descendVariable (variable) {
        if (Object.prototype.hasOwnProperty.call(this.variableInputs, variable.id)) {
            return this.variableInputs[variable.id];
        }
        const input = new VariableInput(`${this.referenceVariable(variable)}.value`);
        this.variableInputs[variable.id] = input;
        return input;
    } */

    referenceVariable (variable) {
        if (variable.scope === 'target') {
            return this.evaluateOnce(`target.variables["${sanitize(variable.id)}"]`);
        }
        return this.evaluateOnce(`stage.variables["${sanitize(variable.id)}"]`);
    }

    /**
     * @param {*} node
     * @returns {string}
     */
    descendAddonCall (node) {
        const inputs = this.descendInputRecord(node.arguments);
        const blockFunction = `runtime.getAddonBlock("${sanitize(node.code)}").callback`;
        const blockId = `"${sanitize(node.blockId)}"`;
        return `yield* executeInCompatibilityLayer(${inputs}, ${blockFunction}, ${this.isWarp}, false, ${blockId})`;
    }

    /**
     * @param {string} source
     * @returns {string}
     */
    evaluateOnce (source) {
        if (Object.prototype.hasOwnProperty.call(this._setupVariables, source)) {
            return this._setupVariables[source];
        }
        const variable = this._setupVariablesPool.next();
        this._setupVariables[source] = variable;
        return variable;
    }

    retire () {
        // After running retire() (sets thread status and cleans up some unused data), we need to return to the event loop.
        // When in a procedure, return will only send us back to the previous procedure, so instead we yield back to the sequencer.
        // Outside of a procedure, return will correctly bring us back to the sequencer.
        if (this.isProcedure) {
            this.source += 'retire(); yield;\n';
        } else {
            this.source += 'retire(); return;\n';
        }
    }

    yieldLoop () {
        if (this.warpTimer) {
            this.yieldStuckOrNotWarp();
        } else {
            this.yieldNotWarp();
        }
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled.
     */
    yieldNotWarp () {
        if (!this.isWarp) {
            this.source += 'yield;\n';
            this.yielded();
        }
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled or if the script seems to be stuck.
     */
    yieldStuckOrNotWarp () {
        if (this.isWarp) {
            this.source += 'if (isStuck()) yield;\n';
        } else {
            this.source += 'yield;\n';
        }
        this.yielded();
    }

    yielded () {
        if (!this.script.yields) {
            throw new Error('Script yielded but is not marked as yielding.');
        }
        // Control may have been yielded to another script -- all bets are off.
    }

    /**
     * Write JS to request a redraw.
     */
    requestRedraw () {
        this.source += 'runtime.requestRedraw();\n';
    }

    /**
     * Generate a call into the compatibility layer.
     * @param {*} node The node of the block to generate from.
     * @param {boolean} setFlags Whether flags should be set describing how this function was processed.
     * @param {string|null} [frameName] Name of the stack frame variable, if any
     * @returns {string} The JS of the call.
     */
    generateCompatibilityLayerCall (node, setFlags, frameName = null) {
        const opcode = node.opcode;

        let result = 'yield* executeInCompatibilityLayer({';

        for (const inputName of Object.keys(node.inputs)) {
            const input = node.inputs[inputName];
            const compiledInput = this.descendInput(input);
            if (inputName !== 'mutation' || node.mutation === null) {
                result += `"${sanitize(inputName)}":${compiledInput},`;
            }
        }
        for (const fieldName of Object.keys(node.fields)) {
            const field = node.fields[fieldName];
            result += `"${sanitize(fieldName)}":"${sanitize(field)}",`;
        }
        if (node.mutation !== null) {
            try {
                result += `"mutation":${JSON.stringify(node.mutation)},`;
            } catch (error) {
                console.error('Failed to sanitize mutation', node.mutation, 'for node', node);
            }
        }

        const opcodeFunction = this.evaluateOnce(`runtime.getOpcodeFunction("${sanitize(opcode)}")`);
        result += `}, ${opcodeFunction}, ${this.isWarp}, ${setFlags}, "${sanitize(node.id)}", ${frameName})`;

        this.yielded();

        return result;
    }

    getScriptFactoryName () {
        return factoryNameVariablePool.next();
    }

    getScriptName (yields) {
        let name = yields ? generatorNameVariablePool.next() : functionNameVariablePool.next();
        if (this.isProcedure) {
            const simplifiedProcedureCode = this.script.procedureCode
                .replace(/%[\w]/g, '') // remove arguments
                .replace(/[^a-zA-Z0-9]/g, '_') // remove unsafe
                .substring(0, 20); // keep length reasonable
            name += `_${simplifiedProcedureCode}`;
        }
        return name;
    }

    stopScript () {
        if (this.isProcedure) {
            this.source += 'return "";\n';
        } else {
            this.retire();
        }
    }

    /**
     * @param {string} valueJS JS code of value to return.
     */
    stopScriptAndReturn (valueJS) {
        if (this.isProcedure) {
            this.source += `return ${valueJS};\n`;
        } else {
            this.retire();
        }
    }

    /**
     * Generate the JS to pass into eval() based on the current state of the compiler.
     * @returns {string} JS to pass into eval()
     */
    createScriptFactory () {
        let script = '';

        // Setup the factory
        script += `(function ${this.getScriptFactoryName()}(thread) { `;
        script += 'const target = thread.target; ';
        script += 'const runtime = target.runtime; ';
        script += 'const stage = runtime.getTargetForStage();\n';
        for (const varValue of Object.keys(this._setupVariables)) {
            const varName = this._setupVariables[varValue];
            script += `const ${varName} = ${varValue};\n`;
        }

        // Generated script
        script += 'return ';
        if (this.script.yields) {
            script += `function* `;
        } else {
            script += `function `;
        }
        script += this.getScriptName(this.script.yields);
        script += ' (';
        if (this.script.arguments.length) {
            const args = [];
            for (let i = 0; i < this.script.arguments.length; i++) {
                args.push(`p${i}`);
            }
            script += args.join(',');
        }
        script += ') {\n';

        script += this.source;

        script += '}; })';

        return script;
    }

    /**
     * Compile this script.
     * @returns {Function} The factory function for the script.
     */
    compile () {
        if (this.script.stack) {
            this.descendStack(this.script.stack, new Frame(false));
        }
        this.stopScript();

        const factory = this.createScriptFactory();
        const fn = jsexecute.scopedEval(factory);

        if (this.debug) {
            log.info(`JS: ${this.target.getName()}: compiled ${this.script.procedureCode || 'script'}`, factory);
        }

        if (JSGenerator.testingApparatus) {
            JSGenerator.testingApparatus.report(this, factory);
        }

        return fn;
    }

    static get exports () {
        throw new Error('Depricated syntax, please use the new exports.');
    }
    static get unstable_exports () {
        throw new Error('Depricated syntax, please use the new exports.');
    }
}

// Test hook used by automated snapshot testing.
JSGenerator.testingApparatus = null;

module.exports = JSGenerator;
