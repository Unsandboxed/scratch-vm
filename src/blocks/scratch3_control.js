const Cast = require('../util/cast');

class Scratch3ControlBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "counter" block value. For compatibility with 2.0.
         * @type {number}
         */
        this._counter = 0; // used by compiler

        this.runtime.on('RUNTIME_DISPOSED', this.clearCounter.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            control_repeat: this.repeat,
            control_repeat_until: this.repeatUntil,
            control_while: this.repeatWhile,
            control_for_each: this.forEach,
            control_forever: this.forever,
            control_wait: this.wait,
            control_wait_until: this.waitUntil,
            control_if: this.if,
            control_if_else: this.ifElse,
            control_stop: this.stop,
            control_break: this.break,
            control_continue: this.continue,
            control_create_clone_of: this.createClone,
            control_delete_this_clone: this.deleteClone,
            control_get_counter: this.getCounter,
            control_incr_counter: this.incrCounter,
            control_clear_counter: this.clearCounter,
            control_all_at_once: this.allAtOnce
        };
    }

    getHats () {
        return {
            control_start_as_clone: {
                restartExistingThreads: false
            }
        };
    }

    repeat (args, util) {
        const times = Math.round(Cast.toNumber(args.TIMES));
        // Initialize loop
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            util.startBranch(1, true);
        }
    }

    repeatUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is false (repeat UNTIL), start the branch.
        if (!condition) {
            util.startBranch(1, true);
        }
    }

    repeatWhile (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is true (repeat WHILE), start the branch.
        if (condition) {
            util.startBranch(1, true);
        }
    }

    forEach (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);

        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }

        if (util.stackFrame.index < Number(args.VALUE)) {
            util.stackFrame.index++;
            variable.value = util.stackFrame.index;
            util.startBranch(1, true);
        }
    }

    waitUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (!condition) {
            util.yield();
        }
    }

    forever (args, util) {
        util.startBranch(1, true);
    }

    wait (args, util) {
        if (util.stackTimerNeedsInit()) {
            const duration = Math.max(0, 1000 * Cast.toNumber(args.DURATION));

            util.startStackTimer(duration);
            this.runtime.requestRedraw();
            util.yield();
        } else if (!util.stackTimerFinished()) {
            util.yield();
        }
    }

    if (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        }
    }

    ifElse (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        } else {
            util.startBranch(2, false);
        }
    }

    stop (args, util) {
        const option = args.STOP_OPTION;
        if (option === 'all') {
            util.stopAll();
        } else if (option === 'other scripts in sprite' ||
            option === 'other scripts in stage') {
            util.stopOtherTargetThreads();
        } else if (option === 'this script') {
            util.stopThisScript();
        }
    }

    // break and continue code borrowed from
    // https://github.com/surv-is-a-dev/gallery/blob/main/site-files/extensions/0znzw/tests/breakContinue.js
    _getLoopFrame(util) {
        const thread = util.thread, stackFrames = thread.stackFrames, frameCount = stackFrames.length;
        let loopFrameBlock = null, loopFrameIndex = -1;
        for (let i = frameCount - 1; i >= 0; i--) {
            if (!stackFrames[i].isLoop) continue;
            loopFrameBlock = stackFrames[i].op.id;
            loopFrameIndex = i;
            break;
        }
        if (!loopFrameBlock) return false;
        return [loopFrameBlock, loopFrameIndex];
    }
    break (_, util) {
        const thread = util.thread, stackFrame = thread.peekStackFrame();
        if (!stackFrame._breakData) {
            let frameData = false;
            if (!(frameData = this._getLoopFrame(util))) return console.warn('Not in a loop!');
            const loopFrameBlock = frameData[0];
            const afterLoop = thread.blockContainer.getBlock(loopFrameBlock).next;
            if (!afterLoop) return;
            stackFrame._breakData = { loopFrameBlock, afterLoop };
        }
        const { loopFrameBlock, afterLoop } = stackFrame._breakData;
        while(thread.stack.at(-1) !== loopFrameBlock) thread.popStack();
        thread.popStack();
        thread.pushStack(afterLoop);
    }
    continue (_, util) {
        const thread = util.thread, blocks = thread.blockContainer, stackFrame = thread.peekStackFrame();
        if (!stackFrame._continueData) {
        let frameData = false;
        if (!(frameData = this._getLoopFrame(util))) return console.warn('Not in a loop!');
            stackFrame._continueData = frameData[0];
        }
        while(thread.stack.at(-1) !== stackFrame._continueData) thread.popStack();
        thread.status = thread.constructor.STATUS_YIELD;
    }

    createClone (args, util) {
        this._createClone(Cast.toString(args.CLONE_OPTION), util.target);
    }
    _createClone (cloneOption, target) { // used by compiler
        // Set clone target
        let cloneTarget;
        if (cloneOption === '_myself_') {
            cloneTarget = target;
        } else {
            cloneTarget = this.runtime.getSpriteTargetByName(cloneOption);
        }

        // If clone target is not found, return
        if (!cloneTarget) return;

        // Create clone
        const newClone = cloneTarget.makeClone();
        if (newClone) {
            this.runtime.addTarget(newClone);

            // Place behind the original target.
            newClone.goBehindOther(cloneTarget);
        }
    }

    deleteClone (args, util) {
        if (util.target.isOriginal) return;
        this.runtime.disposeTarget(util.target);
        this.runtime.stopForTarget(util.target);
    }

    getCounter () {
        return this._counter;
    }

    clearCounter () {
        this._counter = 0;
    }

    incrCounter () {
        this._counter++;
    }

    allAtOnce (args, util) {
        // In Scratch 3.0 and TurboWarp, this would simply
        // run the contained substack. In Unsandboxed,
        // we've reimplemented the intended functionality
        // of running the stack all in one frame.
        util.thread.peekStackFrame().warpMode = false;
        util.startBranch(1, false);
        util.thread.peekStackFrame().warpMode = true;
    }
}

module.exports = Scratch3ControlBlocks;
