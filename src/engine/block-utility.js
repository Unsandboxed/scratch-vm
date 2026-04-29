const Thread = require('./thread');
const Timer = require('../util/timer');
const {TargetValue: TargetType} = require('./custom-types');

/**
 * @fileoverview
 * Interface provided to block primitive functions for interacting with the
 * runtime, thread, target, and convenient methods.
 */

class BlockUtility {
    /**
     * A sequencer block primitives use to branch or start procedures with
     * @type {?Sequencer}
     */
    sequencer;

    /**
     * The block primitives thread with the block's target, stackFrame and
     * modifiable status.
     * @type {?Thread}
     */
    thread;

    constructor (sequencer = null, thread = null) {
        this._cleanInit(thread, sequencer);

        this._nowObj = {
            now: () => this.sequencer.runtime.currentMSecs
        };
    }

    get defTarget_ () {
        return this.thread.defTarget_;
    }

    /**
     * @returns {Resolvers}
     */
    get resolves () {
        return this.sequencer.runtime.vm.resolvesTool;
    }

    /**
     * The target the primitive is working on.
     * @type {Target}
     */
    get target () {
        return this.thread.target;
    }

    /**
     * The runtime the block primitive is running in.
     * @type {Runtime}
     */
    get runtime () {
        return this.sequencer.runtime;
    }

    /**
     * Use the runtime's currentMSecs value as a timestamp value for now
     * This is useful in some cases where we need compatibility with Scratch 2
     * @type {function}
     */
    get nowObj () {
        if (this.runtime) {
            return this._nowObj;
        }
        return null;
    }

    /**
     * The stack frame used by loop and other blocks to track internal state.
     * @type {object}
     */
    get stackFrame () {
        const frame = this.thread.peekStackFrame();
        if (frame.executionContext === null) {
            frame.executionContext = {};
        }
        return frame.executionContext;
    }

    lookupOrCreateVariable (id, name) {
        let psfi = null;
        for (let i = this.thread.stackFrames.length - 1, sf; i >= 0; i--) {
            sf = this.thread.stackFrames[i];

            if (sf.polluteLocals === false) {
                psfi = null;
                break;
            }
            if (sf.polluteLocals) {
                psfi = sf;
                break;
            }
        }
        let v;
        if (psfi) {
            v = this.target.lookupVariableById(id);
            if (!v) {
                v = Object.values(this.target.variables).find(vr => vr.name === name);
            }
        }
        if (!v) {
            const defTargetSf = this.thread.peekStackFrame();
            if (defTargetSf && defTargetSf.targetContext) {
                v = defTargetSf.targetContext.lookupOrCreateVariable(id, name);
            } else if (psfi) {
                console.warn('polluting local variable', name, 'because the target context could not be found.');
                v = this.target.lookupOrCreateVariable(id, name);
            }
        }
        return v;
    }

    /**
     * Resolve an ambiguous value into a runtime target.
     *
     * Accepted input forms:
     * - Target-like object: return that target (or runtime-rebound target by id).
     * - Target custom-type value object: {spriteId|targetId|id|name, ...}
     * - String target id: return the exact target.
     * - String sprite name: return the parent/original sprite target.
     *
     * @param {*} value Ambiguous target reference.
     * @return {?Target} Resolved target, if found.
     */
    resolveTarget (value) {
        const runtime = this.runtime;
        if (!runtime || value === null || typeof value === 'undefined') {
            return null;
        }

        const getTargetById = targetId => {
            if (typeof targetId !== 'string' || !targetId) {
                return null;
            }
            return runtime.getTargetById(targetId) || null;
        };

        const getParentSpriteTarget = target => {
            if (!target) {
                return null;
            }
            if (target.isStage) {
                return target;
            }
            const clones = target.sprite && Array.isArray(target.sprite.clones) ? target.sprite.clones : null;
            if (clones && clones.length > 0) {
                return clones[0] || target;
            }
            return target;
        };

        const getBySpriteName = spriteName => {
            if (typeof spriteName !== 'string' || !spriteName) {
                return null;
            }
            const byName = runtime.getSpriteTargetByName(spriteName);
            return getParentSpriteTarget(byName);
        };

        if (typeof value === 'string') {
            return getTargetById(value) || getBySpriteName(value);
        }

        if (typeof value !== 'object') {
            return null;
        }

        // Handle target custom type instances explicitly.
        if (value instanceof TargetType) {
            if (value._liveTarget && typeof value._liveTarget.id === 'string') {
                const reboundLive = getTargetById(value._liveTarget.id);
                if (reboundLive) {
                    return reboundLive;
                }
            }
            if (typeof value.spriteId === 'string') {
                const byCustomSpriteId = getTargetById(value.spriteId);
                if (byCustomSpriteId) {
                    return byCustomSpriteId;
                }
            }
        }

        // Direct target object, or a target-like object with an id.
        if (typeof value.id === 'string') {
            const rebound = getTargetById(value.id);
            if (rebound) {
                return rebound;
            }
            if (value.sprite || typeof value.isStage === 'boolean') {
                return value;
            }
        }

        // Fallback for plain object payloads with custom-type-like fields.
        if (value._liveTarget && typeof value._liveTarget.id === 'string') {
            const reboundLive = getTargetById(value._liveTarget.id);
            return reboundLive || value._liveTarget;
        }

        // Target custom-type serialized/value shapes.
        if (typeof value.targetId === 'string') {
            const byTargetId = getTargetById(value.targetId);
            if (byTargetId) {
                return byTargetId;
            }
        }
        if (typeof value.spriteId === 'string') {
            const bySpriteId = getTargetById(value.spriteId);
            if (bySpriteId) {
                return bySpriteId;
            }
        }
        if (typeof value.name === 'string') {
            const byName = getBySpriteName(value.name);
            if (byName) {
                return byName;
            }
        }

        return null;
    }

    /**
     * Resolve a parameter input on the currently executing block.
     *
     * - If the input is empty or unsupported, returns the provided fallback name.
     * - If the input is a parameter reporter, returns its parameter name.
     * - If the input is a variable/temporary-data reporter, returns that block model.
     *
     * @param {string} inputName Input name on the active block.
     * @param {string=} fallbackName Fallback parameter name.
     * @return {string|object} Parameter name string or reporter block model.
     */
    resolveParameterArgument (inputName, fallbackName = '') {
        const fallback = String(fallbackName || '');
        if (!this.thread || !this.target || !this.target.blocks || !this.thread.peekStack) {
            return fallback;
        }

        const blockId = this.thread.peekStack();
        if (!blockId) {
            return fallback;
        }

        const block = this.target.blocks.getBlock(blockId);
        if (!block || !block.inputs || !block.inputs[inputName]) {
            return fallback;
        }

        const input = block.inputs[inputName];
        if (!input || !input.block) {
            return fallback;
        }

        const inputBlock = this.target.blocks.getBlock(input.block);
        if (!inputBlock) {
            return fallback;
        }

        if (inputBlock.opcode === 'argument_reporter_string_number') {
            const valueField = inputBlock.fields && inputBlock.fields.VALUE;
            const value = valueField ? valueField.value : null;
            if (typeof value === 'undefined' || value === null || value === '') {
                return fallback;
            }
            return String(value);
        }

        // TODO: We really shouldn't reference extension opcodes internally.
        if (inputBlock.opcode === 'data_variable' || inputBlock.opcode === 'usbTemporaryData_get') {
            return inputBlock;
        }

        return fallback;
    }

    /**
     * Check the stack timer and return a boolean based on whether it has finished or not.
     * @return {boolean} - true if the stack timer has finished.
     */
    stackTimerFinished () {
        const timeElapsed = this.stackFrame.timer.timeElapsed();
        if (timeElapsed < this.stackFrame.duration) {
            return false;
        }
        return true;
    }

    /**
     * Check if the stack timer needs initialization.
     * @return {boolean} - true if the stack timer needs to be initialized.
     */
    stackTimerNeedsInit () {
        return !this.stackFrame.timer;
    }

    /**
     * Create and start a stack timer
     * @param {number} duration - a duration in milliseconds to set the timer for.
     */
    startStackTimer (duration) {
        if (this.nowObj) {
            this.stackFrame.timer = new Timer(this.nowObj);
        } else {
            this.stackFrame.timer = new Timer();
        }
        this.stackFrame.timer.start();
        this.stackFrame.duration = duration;
    }

    /**
     * Set the thread to yield.
     */
    yield () {
        this.thread.setStatus(Thread.STATUS_YIELD);
    }

    /**
     * Set the thread to yield until the next tick of the runtime.
     */
    yieldTick () {
        this.thread.setStatus(Thread.STATUS_YIELD_TICK);
    }

    /**
     * Start a branch in the current block.
     * @param {number} branchNum Which branch to step to (i.e., 1, 2).
     * @param {boolean} isLoop Whether this block is a loop.
     * @param {?(() => void)} onEnd Optional callback for when the branch ends.
     */
    startBranch (branchNum, isLoop, onEnd) {
        this.sequencer.stepToBranch(this.thread, branchNum, isLoop, onEnd);
    }

    /**
     * Stop all threads.
     */
    stopAll () {
        this.sequencer.runtime.stopAll();
    }

    /**
     * Stop threads other on this target other than the thread holding the
     * executed block.
     */
    stopOtherTargetThreads () {
        this.sequencer.runtime.stopForTarget(this.thread.target, this.thread);
    }

    /**
     * Stop this thread.
     */
    stopThisScript (includeWeakBoundarys) {
        this.thread.stopThisScript(includeWeakBoundarys);
    }

    /**
     * Start a specified procedure on this thread.
     * @param {string} procedureCode Procedure code for procedure to start.
     */
    startProcedure (procedureCode) {
        this.sequencer.stepToProcedure(this.thread, procedureCode);
    }

    /**
     * Get names and ids of parameters for the given procedure.
     * @param {string} procedureCode Procedure code for procedure to query.
     * @return {Array.<string>} List of param names for a procedure.
     */
    getProcedureParamNamesAndIds (procedureCode) {
        const paramNamesAndIds = this.thread.blockContainer.getProcedureParamNamesAndIds(procedureCode);
        if (!paramNamesAndIds) return this.sequencer.runtime.getGlobalProcedureParamNamesAndIds(procedureCode);
        return paramNamesAndIds;
    }

    /**
     * Get names, ids, and defaults of parameters for the given procedure.
     * @param {string} procedureCode Procedure code for procedure to query.
     * @return {Array.<string>} List of param names for a procedure.
     */
    getProcedureParamNamesIdsAndDefaults (procedureCode) {
        const paramNamesIdsAndDefaults = this.thread.blockContainer.getProcedureParamNamesIdsAndDefaults(procedureCode);
        if (!paramNamesIdsAndDefaults) {
            return this.sequencer.runtime.getGlobalProcedureParamNamesIdsAndDefaults(procedureCode);
        }
        return paramNamesIdsAndDefaults;
    }

    /**
     * Initialize procedure parameters in the thread before pushing parameters.
     */
    initParams () {
        this.thread.initParams();
    }

    /**
     * Store a procedure parameter value by its name.
     * @param {string} paramName The procedure's parameter name.
     * @param {*} paramValue The procedure's parameter value.
     */
    pushParam (paramName, paramValue) {
        this.thread.pushParam(paramName, paramValue);
    }

    /**
     * Retrieve the stored parameter value for a given parameter name.
     * @param {string} paramName The procedure's parameter name.
     * @return {*} The parameter's current stored value.
     */
    getParam (paramName) {
        return this.thread.getParam(paramName);
    }

    /**
     * Start all relevant hats.
     * @param {!string} requestedHat Opcode of hats to start.
     * @param {object=} optMatchFields Optionally, fields to match on the hat.
     * @param {Target=} optTarget Optionally, a target to restrict to.
     * @param {Target=} optParams Optionally, parameters to push onto the hat.
     * @return {Array.<Thread>} List of threads started by this function.
     */
    startHats (requestedHat, optMatchFields, optTarget, optParams) {
        // Store thread and sequencer to ensure we can return to the calling block's context.
        // startHats may execute further blocks and dirty the BlockUtility's execution context
        // and confuse the calling block when we return to it.
        const callerThread = this.thread;
        const callerSequencer = this.sequencer;
        const result = this.sequencer.runtime.startHats(requestedHat, optMatchFields, optTarget, optParams);

        // Restore thread and sequencer to prior values before we return to the calling block.
        this._cleanInit(callerThread, callerSequencer);

        return result;
    }

    /**
     * Query a named IO device.
     * @param {string} device The name of like the device, like keyboard.
     * @param {string} func The name of the device's function to query.
     * @param {Array.<*>} args Arguments to pass to the device's function.
     * @return {*} The expected output for the device's function.
     */
    ioQuery (device, func, args) {
        // Find the I/O device and execute the query/function call.
        if (
            this.sequencer.runtime.ioDevices[device] &&
            this.sequencer.runtime.ioDevices[device][func]) {
            const devObject = this.sequencer.runtime.ioDevices[device];
            // TODO: verify correct `this` after switching from apply to spread
            // eslint-disable-next-line prefer-spread
            return devObject[func].apply(devObject, args);
        }
    }

    _cleanInit (thread, sequencer) {
        this.thread = thread;
        if (this.thread) {
            this.thread.blockUtility = this;
        }
        this.sequencer = sequencer;
    }

    /**
     * @param {?Thread} thread Current thread.
     * @param {?Sequencer} sequencer Sequencer instance.
     */
    init (thread, sequencer) {
        this._cleanInit(thread, sequencer);
    }
}

module.exports = BlockUtility;
