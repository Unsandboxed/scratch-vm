// @ts-check

const BlockUtility = require('../engine/block-utility');

class CompatibilityLayerBlockUtility extends BlockUtility {
    constructor () {
        super();
        /** @type {object} */
        this._stackFrame = {};
        /** @type {Array<[number, boolean]>} */
        this._startedBranch = [];
        /** @type {Array<{stackFrame: object, onEnd: Array<Function>}>} */
        this._branchInfo = [];
    }

    get stackFrame () {
        return this.thread?.compatibilityStackFrame;
    }

    /**
     * @param {boolean} includeWeakBoundarys
     */
    stopThisScript (includeWeakBoundarys) {
        const stackFrame = this.stackFrame;
        if (stackFrame && (stackFrame.fakeScriptTop || stackFrame.weakScriptTop)) {
            /** @type {Error & {__usbBranchStop?: boolean}} */
            const stopBranchError = new Error('Branch stop');
            stopBranchError.__usbBranchStop = true;
            throw stopBranchError;
        }

        return super.stopThisScript(includeWeakBoundarys);
    }

    /**
     * @param {number} branchNumber
     * @param {boolean} isLoop
     * @param {?(() => void)} onEnd
     */
    startBranch (branchNumber, isLoop, onEnd) {
        if (this._branchInfo[0] && onEnd) this._branchInfo[0].onEnd.push(onEnd);
        this._startedBranch.unshift([branchNumber, isLoop]);
    }

    startProcedure () {
        throw new Error('startProcedure is not supported by this BlockUtility');
    }

    // Parameters are not used by compiled scripts.
    initParams () {
        throw new Error('initParams is not supported by this BlockUtility');
    }
    pushParam () {
        throw new Error('pushParam is not supported by this BlockUtility');
    }
    getParam () {
        throw new Error('getParam is not supported by this BlockUtility');
    }

    // @ts-ignore - compiler compatibility layer uses a different init signature than the base utility.
    init (thread, fakeBlockId, stackFrame, branchInfo) {
        super.init(thread, thread.target.runtime.sequencer);
        this._startedBranch.length = 0;
        this._branchInfo.length = 0;
        if (branchInfo) {
            this._branchInfo.unshift(branchInfo);
        }
        thread.stack[0] = fakeBlockId;
        thread.compatibilityStackFrame = stackFrame;
    }
}

// Export a single instance to be reused.
module.exports = new CompatibilityLayerBlockUtility();

module.exports._CompatibilityLayerBlockUtility = CompatibilityLayerBlockUtility;
