const Cast = require('../util/cast.js');

class Scratch3ProcedureBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            procedures_definition: this.definition,
            procedures_call: this.call,
            procedures_set_parameter: this.setParameter,
            procedures_return: this.return,
            argument_statement: this.argumentStatement,
            argument_reporter_string_number: this.argumentReporterStringNumber,
            argument_reporter_boolean: this.argumentReporterBoolean,
            argument_reporter_array: this.argumentReporterArray,
            argument_reporter_object: this.argumentReporterObject
        };
    }

    getHats () {
        return {
            procedures_call: {
                restartExistingThreads: false,
                edgeActivated: true,
                alwaysActivated: false,
                isProcedure: true
            }
        };
    }

    definition () {
        // No-op: execute the blocks.
    }

    call (args, util) {
        const stackFrame = util.stackFrame;
        const isReporter = Cast.toBooleanSimple(args.mutation.return);
        const isHat = Cast.toBooleanSimple(args.mutation.hat);

        if (stackFrame.executed) {
            if (isReporter || isHat) {
                const returnValue = stackFrame.returnValue;
                // This stackframe will be reused for other reporters in this block, so clean it up for them.
                // Can't use reset() because that will reset too much.
                const threadStackFrame = util.thread.peekStackFrame();
                threadStackFrame.params = null;
                delete stackFrame.returnValue;
                delete stackFrame.executed;
                return isHat ? Cast.toBoolean(returnValue) : returnValue;
            }
            return;
        }

        const procedureCode = args.mutation.proccode;
        const paramNamesIdsAndDefaults = util.getProcedureParamNamesIdsAndDefaults(procedureCode);

        // If null, procedure could not be found, which can happen if custom
        // block is dragged between sprites without the definition.
        // Match Scratch 2.0 behavior and noop.
        if (paramNamesIdsAndDefaults === null) {
            if (isHat) {
                return false;
            }
            if (isReporter) {
                return '';
            }
            return;
        }

        const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

        // Initialize params for the current stackFrame to {}, even if the procedure does
        // not take any arguments. This is so that `getParam` down the line does not look
        // at earlier stack frames for the values of a given parameter (#1729)
        util.initParams();
        for (let i = 0, j = 0; i < paramIds.length; i++) {
            if (Object.prototype.hasOwnProperty.call(args, paramIds[i])) {
                util.pushParam(paramNames[i], args[paramIds[i]]);
            } else if (paramIds[i].startsWith('SUBSTACK')) {
                util.pushParam(paramNames[i], {
                    blockId: util.thread.peekStackFrame().op.id,
                    fieldId: paramIds[i],
                    i: i,
                    j: ++j
                });
            } else {
                util.pushParam(paramNames[i], paramDefaults[i]);
            }
        }

        const addonBlock = util.runtime.getAddonBlock(procedureCode);
        if (addonBlock) {
            const result = addonBlock.callback(util.thread.getAllparams(), util);
            if (util.thread.status === 1 /* STATUS_PROMISE_WAIT */) {
                // If the addon block is using STATUS_PROMISE_WAIT to force us to sleep,
                // make sure to not re-run this block when we resume.
                stackFrame.executed = true;
            }
            return result;
        }

        stackFrame.executed = true;

        if (isReporter || isHat) {
            util.thread.peekStackFrame().waitingReporter = true;
            // Default return value
            stackFrame.returnValue = isHat ? false : '';
        }

        util.startProcedure(procedureCode);
    }

    setParameter (args, util) {
        const blockId = util.thread.peekStack();
        const block = util.target.blocks.getBlock(blockId);
        if (!block) return;

        const paramInput = block.inputs.PARAM;
        if (!paramInput) return;

        const param = util.target.blocks.getBlock(paramInput.block);
        if (!param) return;

        if (
            param.opcode !== 'argument_reporter_string_number' &&
            param.opcode !== 'argument_reporter_boolean' &&
            param.opcode !== 'argument_reporter_array' &&
            param.opcode !== 'argument_reporter_object'
        ) return;

        const field = param.fields.VALUE;
        if (!field) return;

        const paramName = field.value;
        const paramFrame = util.thread.stackFrames[0];
        if (!paramFrame.params) return;

        paramFrame.params[paramName] = args.VALUE;
    }

    return (args, util) {
        util.stopThisScript();

        // If used outside of a custom block, there may be no stackframe.
        if (util.thread.peekStackFrame()) {
            util.stackFrame.returnValue = args.VALUE;
        }
    }

    argumentReporterStringNumber (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // tw: support legacy block
            const param = String(args.VALUE).toLowerCase();
            if (param === 'last key pressed') {
                return util.ioQuery('keyboard', 'getLastKeyPressed');
            } else if (Object.prototype.hasOwnProperty.call(this.runtime.spoofedProcedureParamValues, param)) {
                return this.runtime.spoofedProcedureParamValues[param](1);
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
        // if (typeof value === 'number') {
        //     return value;
        // }
        // return Cast.toString(value);
    }

    argumentReporterBoolean (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // tw: implement is compiled? and is turbowarp?
            const lowercaseValue = String(args.VALUE).toLowerCase();
            if (util.target.runtime.compilerOptions.enabled && lowercaseValue === 'is compiled?') {
                return true;
            } else if (lowercaseValue === 'is unsandboxed?') {
                return true;
            } else if (Object.prototype.hasOwnProperty.call(this.runtime.spoofedProcedureParamValues, lowercaseValue)) {
                return this.runtime.spoofedProcedureParamValues[lowercaseValue](2);
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return Cast.toBoolean(value);
    }

    argumentReporterArray (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            const lowercaseValue = String(args.VALUE).toLowerCase();
            if (Object.prototype.hasOwnProperty.call(this.runtime.spoofedProcedureParamValues, lowercaseValue)) {
                return this.runtime.spoofedProcedureParamValues[lowercaseValue](2);
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always [].
            return [];
        }
        return Cast.toArray(value);
    }

    argumentReporterObject (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            const lowercaseValue = String(args.VALUE).toLowerCase();
            if (Object.prototype.hasOwnProperty.call(this.runtime.spoofedProcedureParamValues, lowercaseValue)) {
                return this.runtime.spoofedProcedureParamValues[lowercaseValue](2);
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always {}.
            return Object.create(null);
        }
        return Cast.toObject(value);
    }

    argumentStatement (args, util) {

        const branchInfo = util.getParam(args.VALUE) || {};
        if (!branchInfo.fieldId) return;

        const target = util.thread.target;

        // In global procedures the blockContainer might not be the one for the target.
        const block = target.blocks.getBlock(branchInfo.blockId);
        if (!block) return;

        const branch = block.inputs[branchInfo.fieldId];
        if (!branch) return;

        const stackFrame = util.thread.peekStackFrame();
        const params = stackFrame.params;
        stackFrame.params = {};

        stackFrame.isBranch = true;
        stackFrame.isLoop = false;

        stackFrame.branchDepth = stackFrame.branchDepth + 1;
        stackFrame.onBranchEnd.push(() => {
            if (params) {
                util.thread.peekStackFrame().params = params;
            } else {
                util.thread.peekStackFrame().params = null;
            }
        });

        util.thread.pushStack(branch.block, target);
        util.thread.peekStackFrame().polluteLocals = true;
    }
}

module.exports = Scratch3ProcedureBlocks;
