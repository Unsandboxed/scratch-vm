const ArgumentType = require('./argument-type');
const BlockType = require('./block-type');
const BlockShape = require('./block-shape');
const TargetType = require('./target-type');
const Cast = require('../util/cast');
const external = require('./tw-external');
const {getOrderedExtendableValues} = require('../util/extendable-arguments');

const ExtenderInputType = {
    INPUT_VALUE: 'input_value',
    INPUT_DUMMY: 'input_dummy',
    INPUT_STATEMENT: 'input_statement'
};

const defineExtendableInput = (type, {
    shadow = null,
    field = null,
    check = null,
    transient = false,
    forceNewRow = false,
    fieldLabel = null
} = {}) => ({
    type,
    shadow,
    field,
    check,
    transient,
    forceNewRow,
    fieldLabel
});

const createExtendableBlock = (blockInfo, extendable) => Object.assign({}, blockInfo, {
    extendable: Object.assign({}, extendable)
});

const Extendable = {
    block: createExtendableBlock,
    input: defineExtendableInput,
    value: options => defineExtendableInput(ExtenderInputType.INPUT_VALUE, options),
    dummy: options => {
        if (typeof options === 'string') {
            return defineExtendableInput(ExtenderInputType.INPUT_DUMMY, {fieldLabel: options});
        }
        return defineExtendableInput(ExtenderInputType.INPUT_DUMMY, options);
    },
    statement: options => defineExtendableInput(ExtenderInputType.INPUT_STATEMENT, options)
};

class ParameterReporterRenamerService {
    constructor (runtime, gui, cast) {
        this.runtime = runtime;
        this.gui = gui;
        this.Cast = cast;

        this._started = false;
        this._refreshTimer = null;
        this._isUpdatingReporterNames = false;

        this._opcodeInputs = new Map();
        this._opcodeDefaults = new Map();
        this._loopParameterNames = new Map();
        this._reporterOwnership = new Map();

        this._queueRefresh = this._queueRefresh.bind(this);
    }

    register (opcode, inputNames, defaultsByInput = {}) {
        if (!opcode || !Array.isArray(inputNames) || inputNames.length === 0) {
            return;
        }

        this._opcodeInputs.set(opcode, inputNames.slice());
        this._opcodeDefaults.set(opcode, Object.assign({}, defaultsByInput));

        this._ensureStarted();
        this._queueRefresh();
    }

    _ensureStarted () {
        if (this._started) {
            return;
        }
        if (!this.gui || typeof this.gui.getBlockly !== 'function') {
            return;
        }

        this._started = true;
        this.gui.getBlockly().then(Blockly => {
            this.blockly = Blockly;
            const workspace = Blockly.getMainWorkspace();
            if (!workspace) {
                return;
            }

            workspace.addChangeListener(event => {
                if (this._isUpdatingReporterNames) return;

                if (this._shouldDelayRefresh(event, workspace)) {
                    this._queueRefresh(120);
                    return;
                }

                this._queueRefresh();
            });

            this._queueRefresh();
        });
    }

    _queueRefresh (delayMs = 0) {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }

        this._refreshTimer = setTimeout(() => {
            this._refreshTimer = null;
            this._refreshParameterReporters();
        }, delayMs);
    }

    _isWorkspaceDragging (workspace) {
        if (!workspace) return false;

        if (typeof workspace.isDragging === 'function' && workspace.isDragging()) {
            return true;
        }

        if (this.blockly && typeof this.blockly.dragMode_ === 'number' && this.blockly.dragMode_ !== 0) {
            return true;
        }

        return false;
    }

    _shouldDelayRefresh (event, workspace) {
        if (this._isWorkspaceDragging(workspace)) {
            return true;
        }

        if (!event || !this.blockly || !this.blockly.Events) {
            return false;
        }

        if (event.isUiEvent) {
            return true;
        }

        return event.type === this.blockly.Events.MOVE || event.type === this.blockly.Events.BLOCK_DRAG;
    }

    _refreshParameterReporters () {
        if (!this.blockly || this._opcodeInputs.size === 0) return;

        const target = this.runtime.getEditingTarget();
        if (!target || !target.blocks || !target.blocks._blocks) return;

        const workspace = this.blockly.getMainWorkspace();
        if (!workspace) return;

        if (this._isWorkspaceDragging(workspace)) {
            this._queueRefresh(120);
            return;
        }

        const blocks = Object.values(target.blocks._blocks)
            .filter(model => this._isRegisteredOpcode(model.opcode))
            .sort((left, right) => this._getDepthForBlock(left, target.blocks) - this._getDepthForBlock(right, target.blocks));

        this._refreshReporterOwnership(workspace);

        const liveBlockIds = new Set(blocks.map(model => model.id));
        const events = this.blockly.Events;
        const previousGroup = events && typeof events.getGroup === 'function' ? events.getGroup() : null;

        this._isUpdatingReporterNames = true;
        try {
            if (!previousGroup && events && typeof events.setGroup === 'function') {
                events.setGroup(true);
            }

            for (const block of blocks) {
                const workspaceBlock = workspace.getBlockById(block.id);
                if (!workspaceBlock) continue;

                const previousNames = this._loopParameterNames.get(block.id) || Object.create(null);
                const currentNames = Object.create(null);
                const forbiddenNames = this._getAncestorParameterLabels(workspaceBlock);
                const inputNames = this._getLoopParameterInputs(block.opcode);
                const defaults = this._opcodeDefaults.get(block.opcode) || Object.create(null);

                for (const inputName of inputNames) {
                    const inputReporter = this._getLoopInputReporterBlock(workspaceBlock, inputName);
                    const rawLabel = inputReporter ? this.Cast.toString(inputReporter.getFieldValue('VALUE')) : '';
                    const fallback = defaults[inputName] || '';

                    const previousLabel = rawLabel || previousNames[inputName] || fallback;
                    const baseLabel = this._removeTrailingNumbers(previousLabel);
                    const nextLabel = this._makeUniqueLabel(baseLabel, forbiddenNames);
                    currentNames[inputName] = nextLabel;
                    forbiddenNames.add(nextLabel);

                    if (previousLabel !== nextLabel) {
                        this._renameOwnedLoopReporterUsages(workspaceBlock, previousLabel, nextLabel);
                    }

                    this._setLoopInputReporterLabel(workspaceBlock, inputName, nextLabel);
                }

                this._loopParameterNames.set(block.id, currentNames);
            }

            for (const trackedId of Array.from(this._loopParameterNames.keys())) {
                if (!liveBlockIds.has(trackedId)) {
                    this._loopParameterNames.delete(trackedId);
                }
            }
        } finally {
            if (!previousGroup && events && typeof events.setGroup === 'function') {
                events.setGroup(false);
            }
            this._isUpdatingReporterNames = false;
        }
    }

    _getLoopParameterInputs (opcode) {
        return this._opcodeInputs.get(opcode) || [];
    }

    _getLoopInputReporterBlock (loopBlock, inputName) {
        const inputBlock = loopBlock.getInputTargetBlock(inputName);
        if (!inputBlock) return null;
        if (inputBlock.type !== 'argument_reporter_string_number') return null;
        return inputBlock;
    }

    _setLoopInputReporterLabel (loopBlock, inputName, label) {
        const reporter = this._getLoopInputReporterBlock(loopBlock, inputName);
        if (!reporter) return;
        if (this.Cast.toString(reporter.getFieldValue('VALUE')) === label) return;
        reporter.setFieldValue(label, 'VALUE');

        this._reporterOwnership.set(reporter.id, {
            label,
            ownerLoopId: loopBlock.id
        });
    }

    _refreshReporterOwnership (workspace) {
        const allReporters = workspace
            .getAllBlocks(false)
            .filter(block => block.type === 'argument_reporter_string_number');

        const liveIds = new Set(allReporters.map(block => block.id));
        for (const trackedId of Array.from(this._reporterOwnership.keys())) {
            if (!liveIds.has(trackedId)) {
                this._reporterOwnership.delete(trackedId);
            }
        }

        for (const reporter of allReporters) {
            const label = this.Cast.toString(reporter.getFieldValue('VALUE'));
            const previous = this._reporterOwnership.get(reporter.id);

            if (this._isLoopParameterDeclarationReporter(reporter)) {
                const ownerLoop = reporter.getParent();
                this._reporterOwnership.set(reporter.id, {
                    label,
                    ownerLoopId: ownerLoop ? ownerLoop.id : null
                });
                continue;
            }

            if (previous && previous.label === label) {
                const ownerStillExists = previous.ownerLoopId ? workspace.getBlockById(previous.ownerLoopId) : null;
                if (ownerStillExists) {
                    continue;
                }
            }

            this._reporterOwnership.set(reporter.id, {
                label,
                ownerLoopId: this._computeNearestOwnerLoopId(reporter, label)
            });
        }
    }

    _computeNearestOwnerLoopId (reporter, label) {
        let current = reporter;
        while (current) {
            if (this._isRegisteredOpcode(current.type)) {
                const labels = this._getLoopParameterLabels(current);
                if (labels.has(label)) {
                    return current.id;
                }
            }
            current = current.getSurroundParent();
        }
        return null;
    }

    _renameOwnedLoopReporterUsages (loopBlock, previousLabel, nextLabel) {
        if (!previousLabel || previousLabel === nextLabel) return;

        for (const block of loopBlock.getDescendants()) {
            if (block.type !== 'argument_reporter_string_number') continue;
            if (this._isLoopParameterDeclarationReporter(block)) continue;

            const current = this.Cast.toString(block.getFieldValue('VALUE'));
            if (current !== previousLabel) continue;

            const ownership = this._reporterOwnership.get(block.id);
            if (!ownership || ownership.ownerLoopId !== loopBlock.id) continue;

            block.setFieldValue(nextLabel, 'VALUE');
            this._reporterOwnership.set(block.id, {
                label: nextLabel,
                ownerLoopId: loopBlock.id
            });
        }
    }

    _getAncestorParameterLabels (loopBlock) {
        const labels = new Set();
        let current = loopBlock.getSurroundParent();

        while (current) {
            if (this._isRegisteredOpcode(current.type)) {
                const ancestorLabels = this._getLoopParameterLabels(current);
                for (const label of ancestorLabels) {
                    labels.add(label);
                }
            }
            current = current.getSurroundParent();
        }

        return labels;
    }

    _makeUniqueLabel (preferredLabel, forbiddenNames) {
        const preferred = this.Cast.toString(preferredLabel || '');
        if (!forbiddenNames.has(preferred)) {
            return preferred;
        }

        const base = this._removeTrailingNumbers(preferred) || preferred;
        let suffix = 2;
        let candidate = `${base}${suffix}`;
        while (forbiddenNames.has(candidate)) {
            suffix++;
            candidate = `${base}${suffix}`;
        }
        return candidate;
    }

    _getLoopParameterLabels (loopBlock) {
        const labels = new Set();
        const inputNames = this._getLoopParameterInputs(loopBlock.type);

        for (const inputName of inputNames) {
            const reporter = this._getLoopInputReporterBlock(loopBlock, inputName);
            if (!reporter) continue;
            labels.add(this.Cast.toString(reporter.getFieldValue('VALUE')));
        }

        return labels;
    }

    _isLoopParameterDeclarationReporter (block) {
        if (!block || block.type !== 'argument_reporter_string_number') return false;

        const parent = block.getParent();
        if (!parent || !this._isRegisteredOpcode(parent.type)) return false;

        const inputNames = this._getLoopParameterInputs(parent.type);
        for (const inputName of inputNames) {
            const reporter = this._getLoopInputReporterBlock(parent, inputName);
            if (reporter && reporter.id === block.id) {
                return true;
            }
        }

        return false;
    }

    _isRegisteredOpcode (opcode) {
        return this._opcodeInputs.has(opcode);
    }

    _getDepthForBlock (block, container) {
        let previous = block;
        let depth = 0;

        while (previous) {
            if (previous.opcode === block.opcode) {
                depth++;
            }
            previous = this._getOuterParent(previous, container);
        }

        return depth;
    }

    _getOuterParent (block, container) {
        let previousId;
        do {
            previousId = block.id;
            block = container.getBlock(block.parent);
            if (!block) {
                return null;
            }
        } while (block.next === previousId);
        return block;
    }

    _removeTrailingNumbers (value) {
        let text = this.Cast.toString(value);
        if (!text) return text;

        let index = text.length - 1;
        while (index >= 0) {
            const char = text[index];
            if (char < '0' || char > '9') break;
            index--;
        }

        return text.slice(0, index + 1);
    }
}

const ensureParameterReporterRenamer = (runtime, gui, cast) => {
    if (!runtime || !cast) return null;
    if (!runtime.__usbParameterReporterRenamer) {
        runtime.__usbParameterReporterRenamer = new ParameterReporterRenamerService(runtime, gui, cast);
    }
    return runtime.__usbParameterReporterRenamer;
};

const Scratch = {
    ArgumentType,
    BlockType,
    BlockShape,
    TargetType,
    Cast,
    external,
    getOrderedExtendableValues,
    ExtenderInputType,
    defineExtendableInput,
    createExtendableBlock,
    Extendable,
    ensureParameterReporterRenamer
};

module.exports = Scratch;
