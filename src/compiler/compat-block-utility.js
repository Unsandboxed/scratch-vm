// @ts-check

const BlockUtility = require('../engine/block-utility');

class CompatibilityLayerBlockUtility extends BlockUtility {
    constructor () {
        super();
        this._stackFrame = {};
        this._startedBranch = [];
        this._branchInfo = [];
    }

    get stackFrame () {
        return this.thread?.compatibilityStackFrame;
    }

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
