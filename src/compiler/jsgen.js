// @ts-check

const log = require('../util/log');
const jsexecute = require('./jsexecute');
const {StackOpcode, InputOpcode, InputType} = require('./enums.js');

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
                return `(${this.descendInput(node.target)} || 0)`;
            }
            return `(+${this.descendInput(node.target)} || 0)`;
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

<<<<<<< HEAD
        case 'constant':
            return this.safeConstantInput(node.value);

        case 'counter.get':
            return new TypedInput('runtime.ext_scratch3_control._counter', TYPE_NUMBER);

        case 'keyboard.pressed':
            return new TypedInput(`runtime.ioDevices.keyboard.getKeyIsDown(${this.descendInput(node.key).asSafe()})`, TYPE_BOOLEAN);

        case 'list.contains':
            return new TypedInput(`listContains(${this.referenceVariable(node.list)}, ${this.descendInput(node.item).asUnknown()})`, TYPE_BOOLEAN);
        case 'list.contents':
            return new TypedInput(`listContents(${this.referenceVariable(node.list)})`, TYPE_STRING);
        case 'list.arraycontents':
            return new TypedInput(`listArrayContents(${this.referenceVariable(node.list)})`, TYPE_STRING);
        case 'list.get': {
            const index = this.descendInput(node.index);
            if (environment.supportsNullishCoalescing) {
                if (index.isAlwaysNumberOrNaN()) {
                    return new TypedInput(`(${this.referenceVariable(node.list)}.value[(${index.asNumber()} | 0) - 1] ?? "")`, TYPE_UNKNOWN);
                }
                if (index instanceof ConstantInput && index.constantValue === 'last') {
                    return new TypedInput(`(${this.referenceVariable(node.list)}.value[${this.referenceVariable(node.list)}.value.length - 1] ?? "")`, TYPE_UNKNOWN);
                }
            }
            return new TypedInput(`listGet(${this.referenceVariable(node.list)}.value, ${index.asUnknown()})`, TYPE_UNKNOWN);
        }
        case 'list.indexOf':
            return new TypedInput(`listIndexOf(${this.referenceVariable(node.list)}, ${this.descendInput(node.item).asUnknown()})`, TYPE_NUMBER);
        case 'list.length':
            return new TypedInput(`${this.referenceVariable(node.list)}.value.length`, TYPE_NUMBER);

        case 'looks.size':
            return new TypedInput('Math.round(target.size)', TYPE_NUMBER);
        case 'looks.backdropName':
            return new TypedInput('stage.getCostumes()[stage.currentCostume].name', TYPE_STRING);
        case 'looks.backdropNumber':
            return new TypedInput('(stage.currentCostume + 1)', TYPE_NUMBER);
        case 'looks.costumeName':
            return new TypedInput('target.getCostumes()[target.currentCostume].name', TYPE_STRING);
        case 'looks.costumeNumber':
            return new TypedInput('(target.currentCostume + 1)', TYPE_NUMBER);

        case 'motion.direction':
            return new TypedInput('target.direction', TYPE_NUMBER);
        case 'motion.rotationStyle':
            return new TypedInput('target.rotationStyle', TYPE_NUMBER);
        case 'motion.x':
            return new TypedInput('limitPrecision(target.x)', TYPE_NUMBER);
        case 'motion.y':
            return new TypedInput('limitPrecision(target.y)', TYPE_NUMBER);

        case 'mouse.down':
            return new TypedInput('runtime.ioDevices.mouse.getIsDown()', TYPE_BOOLEAN);
        case 'mouse.x':
            return new TypedInput('runtime.ioDevices.mouse.getScratchX()', TYPE_NUMBER);
        case 'mouse.y':
            return new TypedInput('runtime.ioDevices.mouse.getScratchY()', TYPE_NUMBER);

        case 'noop':
            return new TypedInput('""', TYPE_STRING);

        case 'op.abs':
            return new TypedInput(`Math.abs(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.acos':
            // Needs to be marked as NaN because Math.acos(1.0001) === NaN
            return new TypedInput(`((Math.acos(${this.descendInput(node.value).asNumber()}) * 180) / Math.PI)`, TYPE_NUMBER_NAN);
        case 'op.add':
            // Needs to be marked as NaN because Infinity + -Infinity === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} + ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.and':
            return new TypedInput(`(${this.descendInput(node.left).asBoolean()} && ${this.descendInput(node.right).asBoolean()})`, TYPE_BOOLEAN);
        case 'op.asin':
            // Needs to be marked as NaN because Math.asin(1.0001) === NaN
            return new TypedInput(`((Math.asin(${this.descendInput(node.value).asNumber()}) * 180) / Math.PI)`, TYPE_NUMBER_NAN);
        case 'op.atan':
            return new TypedInput(`((Math.atan(${this.descendInput(node.value).asNumber()}) * 180) / Math.PI)`, TYPE_NUMBER);
        case 'op.ceiling':
            return new TypedInput(`Math.ceil(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.clamp':
            return new TypedInput(`Math.min(Math.max(${this.descendInput(node.num).asNumber()}, ${this.descendInput(node.left).asNumber()}), ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER);
        case 'op.contains':
            return new TypedInput(`(${this.descendInput(node.string).asString()}.toLowerCase().indexOf(${this.descendInput(node.contains).asString()}.toLowerCase()) !== -1)`, TYPE_BOOLEAN);
        case 'op.cos':
            return new TypedInput(`(Math.round(Math.cos((Math.PI * ${this.descendInput(node.value).asNumber()}) / 180) * 1e10) / 1e10)`, TYPE_NUMBER_NAN);
        case 'op.divide':
            // Needs to be marked as NaN because 0 / 0 === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} / ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.equals': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When both operands are known to never be numbers, only use string comparison to avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() === ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            const leftAlwaysNumber = left.isAlwaysNumber();
            const rightAlwaysNumber = right.isAlwaysNumber();
            // When both operands are known to be numbers, we can use ===
            if (leftAlwaysNumber && rightAlwaysNumber) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // In certain conditions, we can use === when one of the operands is known to be a safe number.
            if (leftAlwaysNumber && left instanceof ConstantInput && isSafeConstantForEqualsOptimization(left)) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            if (rightAlwaysNumber && right instanceof ConstantInput && isSafeConstantForEqualsOptimization(right)) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareEqual(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.exponent':
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} ** ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER);
        case 'op.e^':
            return new TypedInput(`Math.exp(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.floor':
            return new TypedInput(`Math.floor(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.greater': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When the left operand is a number and the right operand is a number or NaN, we can use >
            if (left.isAlwaysNumber() && right.isAlwaysNumberOrNaN()) {
                return new TypedInput(`(${left.asNumber()} > ${right.asNumberOrNaN()})`, TYPE_BOOLEAN);
            }
            // When the left operand is a number or NaN and the right operand is a number, we can negate <=
            if (left.isAlwaysNumberOrNaN() && right.isAlwaysNumber()) {
                return new TypedInput(`!(${left.asNumberOrNaN()} <= ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() > ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareGreaterThan(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.greaterEqual': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            return new TypedInput(`(${left.asUnknown()} >= ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.join':
            return new TypedInput(`(${this.descendInput(node.left).asString()} + ${this.descendInput(node.right).asString()})`, TYPE_STRING);
        case 'op.length':
            return new TypedInput(`${this.descendInput(node.string).asString()}.length`, TYPE_NUMBER);
        case 'op.less': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When the left operand is a number or NaN and the right operand is a number, we can use <
            if (left.isAlwaysNumberOrNaN() && right.isAlwaysNumber()) {
                return new TypedInput(`(${left.asNumberOrNaN()} < ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // When the left operand is a number and the right operand is a number or NaN, we can negate >=
            if (left.isAlwaysNumber() && right.isAlwaysNumberOrNaN()) {
                return new TypedInput(`!(${left.asNumber()} >= ${right.asNumberOrNaN()})`, TYPE_BOOLEAN);
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() < ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareLessThan(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.lessEqual': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            return new TypedInput(`(${left.asUnknown()} <= ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        // case 'op.letterOf':
        //     return new TypedInput(`((${this.descendInput(node.string).asString()})[(${this.descendInput(node.letter).asNumber()} | 0) - 1] || "")`, TYPE_STRING);
        case 'op.lettersOf':
            return new TypedInput(`((${this.descendInput(node.string).asString()}).substring(${this.descendInput(node.left).asNumber() - 1}, ${this.descendInput(node.right).asNumber()}) || "")`, TYPE_STRING);
        case 'op.ln':
            // Needs to be marked as NaN because Math.log(-1) == NaN
            return new TypedInput(`Math.log(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.log':
            // Needs to be marked as NaN because Math.log(-1) == NaN
            return new TypedInput(`(Math.log(${this.descendInput(node.value).asNumber()}) / Math.LN10)`, TYPE_NUMBER_NAN);
        case 'op.mod':
            this.descendedIntoModulo = true;
            // Needs to be marked as NaN because mod(0, 0) (and others) == NaN
            return new TypedInput(`mod(${this.descendInput(node.left).asNumber()}, ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.min':
            return new TypedInput(`Math.min(${this.descendInput(node.left).asNumber()}, ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER);
        case 'op.max':
            return new TypedInput(`Math.max(${this.descendInput(node.left).asNumber()}, ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER);
        case 'op.multiply':
            // Needs to be marked as NaN because Infinity * 0 === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} * ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.not':
            return new TypedInput(`!${this.descendInput(node.operand).asBoolean()}`, TYPE_BOOLEAN);
        case 'op.or':
            return new TypedInput(`(${this.descendInput(node.left).asBoolean()} || ${this.descendInput(node.right).asBoolean()})`, TYPE_BOOLEAN);
        case 'op.xor':
            return new TypedInput(`(${this.descendInput(node.left).asBoolean()} !== ${this.descendInput(node.right).asBoolean()})`, TYPE_BOOLEAN);
        case 'op.random':
            if (node.useInts) {
                // Both inputs are ints, so we know neither are NaN
                return new TypedInput(`randomInt(${this.descendInput(node.low).asNumber()}, ${this.descendInput(node.high).asNumber()})`, TYPE_NUMBER);
            }
            if (node.useFloats) {
                return new TypedInput(`randomFloat(${this.descendInput(node.low).asNumber()}, ${this.descendInput(node.high).asNumber()})`, TYPE_NUMBER_NAN);
            }
            return new TypedInput(`runtime.ext_scratch3_operators._random(${this.descendInput(node.low).asUnknown()}, ${this.descendInput(node.high).asUnknown()})`, TYPE_NUMBER_NAN);
        case 'op.round':
            return new TypedInput(`Math.round(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.sin':
            return new TypedInput(`(Math.round(Math.sin((Math.PI * ${this.descendInput(node.value).asNumber()}) / 180) * 1e10) / 1e10)`, TYPE_NUMBER_NAN);
        case 'op.sqrt':
            // Needs to be marked as NaN because Math.sqrt(-1) === NaN
            return new TypedInput(`Math.sqrt(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.subtract':
            // Needs to be marked as NaN because Infinity - Infinity === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} - ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.tan':
            return new TypedInput(`tan(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.10^':
            return new TypedInput(`(10 ** ${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);

        case 'procedures.call': {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            const procedureData = this.ir.procedures[procedureVariant];

            if (procedureData.stack === null) {
                // TODO still need to evaluate arguments for side effects
                return new TypedInput('""', TYPE_STRING);
            }

            // Recursion makes this complicated because:
            //  - We need to yield *between* each call in the same command block
            //  - We need to evaluate arguments *before* that yield happens

            const procedureReference = `thread.procedures["${sanitize(procedureVariant)}"]`;
            const args = [];
            for (const input of node.arguments) {
                args.push(this.descendInput(input).asSafe());
            }
            const joinedArgs = args.join(',');

            const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
            const yieldForHat = this.isInHat;
            if (yieldForRecursion || yieldForHat) {
                const runtimeFunction = procedureData.yields ? 'yieldThenCallGenerator' : 'yieldThenCall';
                return new TypedInput(`(yield* ${runtimeFunction}(${procedureReference}, ${joinedArgs}))`, TYPE_UNKNOWN);
            }
            if (procedureData.yields) {
                return new TypedInput(`(yield* ${procedureReference}(${joinedArgs}))`, TYPE_UNKNOWN);
            }
            return new TypedInput(`${procedureReference}(${joinedArgs})`, TYPE_UNKNOWN);
        }
        case 'procedures.argument':
            return new TypedInput(`p${node.index}`, TYPE_UNKNOWN);

        case 'sensing.answer':
            return new TypedInput(`runtime.ext_scratch3_sensing._answer`, TYPE_STRING);
        case 'sensing.colorTouchingColor':
            return new TypedInput(`target.colorIsTouchingColor(colorToList(${this.descendInput(node.target).asColor()}), colorToList(${this.descendInput(node.mask).asColor()}))`, TYPE_BOOLEAN);
        case 'sensing.date':
            return new TypedInput(`(new Date().getDate())`, TYPE_NUMBER);
        case 'sensing.dayofweek':
            return new TypedInput(`(new Date().getDay() + 1)`, TYPE_NUMBER);
        case 'sensing.daysSince2000':
            return new TypedInput('daysSince2000()', TYPE_NUMBER);
        case 'sensing.distance':
            // TODO: on stages and invalid values, this can be computed at compile time
            return new TypedInput(`distance(${this.descendInput(node.target).asString()})`, TYPE_NUMBER);
        case 'sensing.hour':
            return new TypedInput(`(new Date().getHours())`, TYPE_NUMBER);
        case 'sensing.minute':
            return new TypedInput(`(new Date().getMinutes())`, TYPE_NUMBER);
        case 'sensing.month':
            return new TypedInput(`(new Date().getMonth() + 1)`, TYPE_NUMBER);
        case 'sensing.of': {
            const object = this.descendInput(node.object).asString();
            const property = node.property;
            if (node.object.kind === 'constant') {
                const isStage = node.object.value === '_stage_';
                // Note that if target isn't a stage, we can't assume it exists
                const objectReference = isStage ? 'stage' : this.evaluateOnce(`runtime.getSpriteTargetByName(${object})`);
                if (property === 'volume') {
                    return new TypedInput(`(${objectReference} ? ${objectReference}.volume : 0)`, TYPE_NUMBER);
                }
                if (isStage) {
                    switch (property) {
                    case 'background #':
                        // fallthrough for scratch 1.0 compatibility
                    case 'backdrop #':
                        return new TypedInput(`(${objectReference}.currentCostume + 1)`, TYPE_NUMBER);
                    case 'backdrop name':
                        return new TypedInput(`${objectReference}.getCostumes()[${objectReference}.currentCostume].name`, TYPE_STRING);
                    }
                } else {
                    switch (property) {
                    case 'x position':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.x : 0)`, TYPE_NUMBER);
                    case 'y position':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.y : 0)`, TYPE_NUMBER);
                    case 'direction':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.direction : 0)`, TYPE_NUMBER);
                    case 'costume #':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.currentCostume + 1 : 0)`, TYPE_NUMBER);
                    case 'costume name':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.getCostumes()[${objectReference}.currentCostume].name : 0)`, TYPE_UNKNOWN);
                    case 'size':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.size : 0)`, TYPE_NUMBER);
=======
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
>>>>>>> origin/develop
                    }
                }
                return `[${node.value[0]},${node.value[1]},${node.value[2]}]`;
            } else if (block.isSometimesType(InputType.STRING)) {
                return `"${sanitize(node.value.toString())}"`;
            } throw new Error(`JS: Unknown constant input type '${block.type}'.`);

        default:
            log.warn(`JS: Unknown input: ${block.opcode}`, node);
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

        case StackOpcode.HAT_EDGE:
            this.isInHat = true;
            this.source += '{\n';
            // For exact Scratch parity, evaluate the input before checking old edge state.
            // Can matter if the input is not instantly evaluated.
            this.source += `const resolvedValue = ${this.descendInput(node.condition)};\n`;
            this.source += `const id = "${sanitize(node.id)}";\n`;
            this.source += 'const hasOldEdgeValue = target.hasEdgeActivatedValue(id);\n';
            this.source += `const oldEdgeValue = target.updateEdgeActivatedValue(id, resolvedValue);\n`;
            this.source += `const edgeWasActivated = hasOldEdgeValue ? (!oldEdgeValue && resolvedValue) : resolvedValue;\n`;
            this.source += `if (!edgeWasActivated) {\n`;
            this.retire();
            this.source += '}\n';
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

<<<<<<< HEAD
        // TODO: Lists that are locked don't need their monitors updated.
        // In fact, they don't need to be executed at all, since right
        // now, locked is a static value that cannot be changed.
        case 'list.add': {
            const list = this.referenceVariable(node.list);
            this.source += `if (!${list}.locked) ${list}.value.push(${this.descendInput(node.item).asSafe()});\n`;
            this.source += `${list}._monitorUpToDate = false;\n`;
            break;
        }
        case 'list.delete': {
            const list = this.referenceVariable(node.list);
            const index = this.descendInput(node.index);
            if (index instanceof ConstantInput) {
                if (index.constantValue === 'last') {
                    this.source += `if (!${list}.locked) ${list}.value.pop();\n`;
                    this.source += `${list}._monitorUpToDate = false;\n`;
                    break;
                }
                if (+index.constantValue === 1) {
                    this.source += `if (!${list}.locked) ${list}.value.shift();\n`;
                    this.source += `${list}._monitorUpToDate = false;\n`;
                    break;
                }
                // do not need a special case for all as that is handled in IR generation (list.deleteAll)
            }
            this.source += `listDelete(${list}, ${index.asUnknown()});\n`;
            break;
        }
        case 'list.deleteAll': {
            const list = this.referenceVariable(node.list);
            this.source += `if (!${list}.locked) ${list}.value = [];\n`;
            break;
        }
        case 'list.hide':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case 'list.insert': {
            const list = this.referenceVariable(node.list);
            const index = this.descendInput(node.index);
            const item = this.descendInput(node.item);
            if (index instanceof ConstantInput && +index.constantValue === 1) {
                this.source += `if (!${list}.locked) ${list}.value.unshift(${item.asSafe()});\n`;
                this.source += `${list}._monitorUpToDate = false;\n`;
                break;
            }
            this.source += `if (!${list}.locked) listInsert(${list}, ${index.asUnknown()}, ${item.asSafe()});\n`;
            break;
        }
        case 'list.replace': {
            const list = this.referenceVariable(node.list);
            this.source += `if (!${list}.locked) listReplace(${list}, ${this.descendInput(node.index).asUnknown()}, ${this.descendInput(node.item).asSafe()});\n`;
            break;
        }
        case 'list.set': {
            const list = this.referenceVariable(node.list);
            this.source += `if (!${list}.locked) listSet(${list}, ${this.descendInput(node.array).asUnknown()});\n`;
            break;
        }
        case 'list.show':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;

        case 'looks.backwardLayers':
            if (!this.target.isStage) {
                this.source += `target.goBackwardLayers(${this.descendInput(node.layers).asNumber()});\n`;
            }
            break;
        case 'looks.clearEffects':
            this.source += 'target.clearEffects();\n';
            break;
        case 'looks.changeEffect':
            if (Object.prototype.hasOwnProperty.call(this.target.effects, node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value).asNumber()} + target.effects["${sanitize(node.effect)}"]));\n`;
            }
            break;
        case 'looks.changeSize':
            this.source += `target.setSize(target.size + ${this.descendInput(node.size).asNumber()});\n`;
            break;
        case 'looks.forwardLayers':
            if (!this.target.isStage) {
                this.source += `target.goForwardLayers(${this.descendInput(node.layers).asNumber()});\n`;
            }
            break;
        case 'looks.goToBack':
            if (!this.target.isStage) {
                this.source += 'target.goToBack();\n';
            }
            break;
        case 'looks.goToFront':
            if (!this.target.isStage) {
                this.source += 'target.goToFront();\n';
            }
            break;
        case 'looks.hide':
            this.source += 'target.setVisible(false);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case 'looks.nextBackdrop':
            this.source += 'runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume + 1, true);\n';
            break;
        case 'looks.nextCostume':
            this.source += 'target.setCostume(target.currentCostume + 1);\n';
            break;
        case 'looks.setEffect':
            if (Object.prototype.hasOwnProperty.call(this.target.effects, node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value).asNumber()}));\n`;
            }
            break;
        case 'looks.setSize':
            this.source += `target.setSize(${this.descendInput(node.size).asNumber()});\n`;
            break;
        case 'looks.show':
            this.source += 'target.setVisible(true);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case 'looks.switchBackdrop':
            this.source += `runtime.ext_scratch3_looks._setBackdrop(stage, ${this.descendInput(node.backdrop).asSafe()});\n`;
            break;
        case 'looks.switchCostume':
            this.source += `runtime.ext_scratch3_looks._setCostume(target, ${this.descendInput(node.costume).asSafe()});\n`;
            break;

        case 'motion.changeX':
            this.source += `target.setXY(target.x + ${this.descendInput(node.dx).asNumber()}, target.y);\n`;
            break;
        case 'motion.changeY':
            this.source += `target.setXY(target.x, target.y + ${this.descendInput(node.dy).asNumber()});\n`;
            break;
        case 'motion.ifOnEdgeBounce':
            this.source += `runtime.ext_scratch3_motion._ifOnEdgeBounce(target);\n`;
            break;
        case 'motion.setDirection':
            this.source += `target.setDirection(${this.descendInput(node.direction).asNumber()});\n`;
            break;
        case 'motion.setRotationStyle':
            this.source += `target.setRotationStyle("${sanitize(node.style)}");\n`;
            break;
        case 'motion.setX': // fallthrough
        case 'motion.setY': // fallthrough
        case 'motion.setXY': {
            this.descendedIntoModulo = false;
            const x = 'x' in node ? this.descendInput(node.x).asNumber() : 'target.x';
            const y = 'y' in node ? this.descendInput(node.y).asNumber() : 'target.y';
            this.source += `target.setXY(${x}, ${y});\n`;
            if (this.descendedIntoModulo) {
                this.source += `if (target.interpolationData) target.interpolationData = null;\n`;
            }
            break;
        }
        case 'motion.step':
            this.source += `runtime.ext_scratch3_motion._moveSteps(${this.descendInput(node.steps).asNumber()}, target);\n`;
            break;

        case 'noop':
            break;

        case 'pen.clear':
            this.source += `${PEN_EXT}.clear();\n`;
            break;
        case 'pen.down':
            this.source += `${PEN_EXT}._penDown(target);\n`;
            break;
        case 'pen.changeParam':
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param).asString()}, ${this.descendInput(node.value).asNumber()}, ${PEN_STATE}, true);\n`;
            break;
        case 'pen.changeSize':
            this.source += `${PEN_EXT}._changePenSizeBy(${this.descendInput(node.size).asNumber()}, target);\n`;
            break;
        case 'pen.legacyChangeHue':
            this.source += `${PEN_EXT}._changePenHueBy(${this.descendInput(node.hue).asNumber()}, target);\n`;
            break;
        case 'pen.legacyChangeShade':
            this.source += `${PEN_EXT}._changePenShadeBy(${this.descendInput(node.shade).asNumber()}, target);\n`;
            break;
        case 'pen.legacySetHue':
            this.source += `${PEN_EXT}._setPenHueToNumber(${this.descendInput(node.hue).asNumber()}, target);\n`;
            break;
        case 'pen.legacySetShade':
            this.source += `${PEN_EXT}._setPenShadeToNumber(${this.descendInput(node.shade).asNumber()}, target);\n`;
            break;
        case 'pen.setColor':
            this.source += `${PEN_EXT}._setPenColorToColor(${this.descendInput(node.color).asColor()}, target);\n`;
            break;
        case 'pen.setParam':
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param).asString()}, ${this.descendInput(node.value).asNumber()}, ${PEN_STATE}, false);\n`;
            break;
        case 'pen.setSize':
            this.source += `${PEN_EXT}._setPenSizeTo(${this.descendInput(node.size).asNumber()}, target);\n`;
            break;
        case 'pen.stamp':
            this.source += `${PEN_EXT}._stamp(target);\n`;
            break;
        case 'pen.up':
            this.source += `${PEN_EXT}._penUp(target);\n`;
            break;

        case 'procedures.call': {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            const procedureData = this.ir.procedures[procedureVariant];
            this.substacks = node.substacks;
            if (procedureData.stack === null) {
                // TODO still need to evaluate arguments
                break;
            }

            this.ir.procedures[procedureVariant].substacks = node.substacks;

            const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
            if (yieldForRecursion) {
                this.yieldNotWarp();
            }

            if (procedureData.yields) {
                this.source += 'yield* ';
            }
            this.source += `thread.procedures["${sanitize(procedureVariant)}"](`;
            const args = [];
            for (const input of node.arguments) {
                args.push(this.descendInput(input).asSafe());
            }
            this.source += args.join(',');
            this.source += ');\n';

            this.resetVariableInputs();
            break;
        }
        case 'procedures.return':
            this.stopScriptAndReturn(this.descendInput(node.value).asSafe());
            break;
        case 'procedures.statement': {
            const procedureVariant = this.script.procedureVariant;
            const procedureData = this.ir.procedures[procedureVariant];
            const substacks = procedureData.substacks;

            this.descendStack(substacks[node.name], new Frame(false));

            break;
        }
        case 'timer.reset':
            this.source += 'runtime.ioDevices.clock.resetProjectTimer();\n';
            break;

        case 'tw.debugger':
            this.source += 'debugger;\n';
            break;

        case 'var.hide':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case 'var.set': {
            const variable = this.descendVariable(node.variable);
            const value = this.descendInput(node.value);
            variable.setInput(value);
            this.source += `${variable.source} = ${value.asSafe()};\n`;
            if (node.variable.isCloud) {
                this.source += `runtime.ioDevices.cloud.requestUpdateVariable("${sanitize(node.variable.name)}", ${variable.source});\n`;
            }
            break;
        }
        case 'var.show':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;

        case 'visualReport': {
=======
        case StackOpcode.VISUAL_REPORT: {
>>>>>>> origin/develop
            const value = this.localVariables.next();
            this.source += `const ${value} = ${this.descendInput(node.input)};`;
            // blocks like legacy no-ops can return a literal `undefined`
            this.source += `if (${value} !== undefined) runtime.visualReport("${sanitize(this.script.topBlockId)}", ${value});\n`;
            break;
        }

        default:
            log.warn(`JS: Unknown stacked block: ${block.opcode}`, node);
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
            result += `"${sanitize(inputName)}":${compiledInput},`;
        }
        for (const fieldName of Object.keys(node.fields)) {
            const field = node.fields[fieldName];
            result += `"${sanitize(fieldName)}":"${sanitize(field)}",`;
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
