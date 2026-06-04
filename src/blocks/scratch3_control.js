const Cast = require('../util/cast');

const parseBranchKinds = mutation => {
    if (!mutation || typeof mutation !== 'object') {
        return [];
    }
    const raw = mutation.branchkinds;
    if (Array.isArray(raw)) {
        return raw.filter(kind => typeof kind === 'string');
    }
    if (typeof raw !== 'string') {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(kind => typeof kind === 'string');
    } catch (_error) {
        return [];
    }
};

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
            control_if_else_extends: this.ifElseExtends,
            control_switch_case_extends: this.switchCaseExtends,
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
        const variable = util.lookupOrCreateVariable(
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

    ifElseExtends (args, util) {
        const branchKinds = parseBranchKinds(args.mutation);
        if (branchKinds.length > 0) {
            for (let i = 0; i < branchKinds.length; i++) {
                const kind = branchKinds[i];
                const branchNum = i + 1;
                if (kind === 'else') {
                    util.startBranch(branchNum, false);
                    return;
                }

                const conditionKey = branchNum === 1 ? 'CONDITION' : `CONDITION${branchNum}`;
                if (Cast.toBoolean(args[conditionKey])) {
                    util.startBranch(branchNum, false);
                    return;
                }
            }
            return;
        }

        const conditionKeys = Object.keys(args)
            .filter(key => /^CONDITION\d*$/.test(key))
            .sort((a, b) => {
                const aNum = a === 'CONDITION' ? 1 : parseInt(a.substring('CONDITION'.length), 10);
                const bNum = b === 'CONDITION' ? 1 : parseInt(b.substring('CONDITION'.length), 10);
                return aNum - bNum;
            });

        let maxBranchNum = 0;
        for (const key of conditionKeys) {
            const branchNum = key === 'CONDITION' ? 1 : parseInt(key.substring('CONDITION'.length), 10);
            if (branchNum > maxBranchNum) {
                maxBranchNum = branchNum;
            }
            if (Cast.toBoolean(args[key])) {
                util.startBranch(branchNum, false);
                return;
            }
        }

        if (maxBranchNum > 0) {
            util.startBranch(maxBranchNum + 1, false);
        }
    }

    switchCaseExtends (args, util) {
        const branchKinds = parseBranchKinds(args.mutation);
        if (branchKinds.length === 0) {
            return;
        }

        // Mark the switch frame as breakable so control_break exits the switch.
        const threadFrame = util.thread && util.thread.peekStackFrame ? util.thread.peekStackFrame() : null;
        if (threadFrame) {
            threadFrame.isBreakable = true;
        }

        const frameState = util.stackFrame;

        // Initialize fall-through start point once, then continue from saved state.
        if (typeof frameState.nextSwitchBranchIndex === 'undefined') {
            const switchValue = args.SWITCH_VALUE;
            let startIndex = -1;
            let defaultIndex = -1;

            for (let i = 0; i < branchKinds.length; i++) {
                const kind = branchKinds[i];
                const branchNum = i + 1;

                if (kind === 'default') {
                    defaultIndex = i;
                    continue;
                }

                const caseKey = branchNum === 1 ? 'CASE_VALUE' : `CASE_VALUE${branchNum}`;
                if (Cast.compare(switchValue, args[caseKey]) === 0) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex === -1) {
                if (defaultIndex === -1) {
                    return;
                }
                startIndex = defaultIndex;
            }

            frameState.nextSwitchBranchIndex = startIndex;
        }

        const branchIndex = frameState.nextSwitchBranchIndex;
        if (branchIndex === null || branchIndex >= branchKinds.length) {
            delete frameState.nextSwitchBranchIndex;
            return;
        }

        // Prepare next fall-through target for the next switch iteration.
        frameState.nextSwitchBranchIndex = branchIndex + 1 < branchKinds.length ?
            branchIndex + 1 : null;

        // Use loop semantics so this switch block is re-evaluated after branch ends.
        util.startBranch(branchIndex + 1, true);
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

    break (_, util) {
        util.thread.breakCurrentLoop();
    }

    continue (_, util) {
        util.thread.continueCurrentLoop();
    }

    createClone (args, util) {
        this._createClone(args.CLONE_OPTION, util.target, util);
    }
    _createClone (cloneOption, target, util) { // used by compiler
        // Set clone target
        let cloneTarget;
        if (cloneOption === '_myself_') {
            cloneTarget = target;
        } else {
            if (util && typeof util.resolveTarget === 'function') {
                cloneTarget = util.resolveTarget(cloneOption);
            } else {
                const optionAsObject = cloneOption && typeof cloneOption === 'object' ? cloneOption : null;
                cloneTarget =
                    this.runtime.getTargetById(optionAsObject?.targetId) ||
                    this.runtime.getTargetById(optionAsObject?.spriteId) ||
                    this.runtime.getTargetById(optionAsObject?.id) ||
                    this.runtime.getTargetById(optionAsObject?._liveTarget?.id) ||
                    this.runtime.getTargetById(Cast.toString(cloneOption)) ||
                    this.runtime.getSpriteTargetByName(optionAsObject?.name || Cast.toString(cloneOption));
            }
        }

        // If clone target is not found, return
        if (!cloneTarget) return;

        // Create clone
        const newClone = cloneTarget.makeClone({deferCloneStartHats: true});
        if (newClone) {
            this.runtime.addTarget(newClone);

            // Place behind the original target.
            newClone.goBehindOther(cloneTarget);

            // Start clone hats only after the clone is registered with runtime
            // so startup scripts run against a fully-initialized target.
            newClone.startAsClone();
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
