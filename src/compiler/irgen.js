// @ts-check

const StringUtil = require('../util/string-util');
const BlockType = require('../extension-support/block-type');
const Variable = require('../engine/variable');
const log = require('../util/log');
const compatBlocks = require('./compat-blocks');
const {StackOpcode, InputOpcode, InputType} = require('./enums.js');
const {
    IntermediateStackBlock,
    IntermediateInput,
    IntermediateStack,
    IntermediateScript,
    IntermediateRepresentation
} = require('./intermediate');

/**
 * @fileoverview Generate intermediate representations from Scratch blocks.
 */

/* eslint-disable max-len */

/**
 * Create a variable codegen object.
 * @param {'target'|'stage'} scope The scope of this variable -- which object owns it.
 * @param {import('../engine/variable.js')} varObj The Scratch Variable
 * @returns {*} A variable codegen object.
 */
const createVariableData = (scope, varObj) => ({
    scope,
    id: varObj.id,
    name: varObj.name,
    isCloud: varObj.isCloud
});

/**
 * @param {string} code
 * @param {boolean} warp
 * @returns {string}
 */
const generateProcedureVariant = (code, warp) => {
    if (warp) {
        return `W${code}`;
    }
    return `Z${code}`;
};

/**
 * @param {string} variant Variant generated by generateProcedureVariant()
 * @returns {string} original procedure code
 */
const parseProcedureCode = variant => variant.substring(1);

/**
 * @param {string} variant Variant generated by generateProcedureVariant()
 * @returns {boolean} true if warp enabled
 */
const parseIsWarp = variant => variant.charAt(0) === 'W';

class ScriptTreeGenerator {
    constructor (thread) {
        /** @private */
        this.thread = thread;
        /** @private */
        this.target = thread.target;
        /** @private */
        this.blocks = thread.blockContainer;
        /** @private */
        this.runtime = this.target.runtime;
        /** @private */
        this.stage = this.runtime.getTargetForStage();

        /**
         * This script's intermediate representation.
         */
        this.script = new IntermediateScript();
        this.script.warpTimer = this.target.runtime.compilerOptions.warpTimer;

        /**
         * Cache of variable ID to variable data object.
         * @type {Object.<string, object>}
         * @private
         */
        this.variableCache = {};

        this.usesTimer = false;

        this.namesOfCostumesAndSounds = new Set();
        for (const target of this.runtime.targets) {
            if (target.isOriginal) {
                const sprite = target.sprite;
                for (const costume of sprite.costumes) {
                    this.namesOfCostumesAndSounds.add(costume.name);
                }
                for (const sound of sprite.sounds) {
                    this.namesOfCostumesAndSounds.add(sound.name);
                }
            }
        }
    }

    setProcedureVariant (procedureVariant) {
        const procedureCode = parseProcedureCode(procedureVariant);

        this.script.procedureVariant = procedureVariant;
        this.script.procedureCode = procedureCode;
        this.script.isProcedure = true;
        this.script.yields = false;

        const paramNamesIdsAndDefaults = this.blocks.getProcedureParamNamesIdsAndDefaults(procedureCode);
        if (paramNamesIdsAndDefaults === null) {
            throw new Error(`IR: cannot find procedure: ${procedureVariant}`);
        }

        const [paramNames, _paramIds, _paramDefaults] = paramNamesIdsAndDefaults;
        this.script.arguments = paramNames;
    }

    enableWarp () {
        this.script.isWarp = true;
    }

    getBlockById (blockId) {
        // Flyout blocks are stored in a special container.
        return this.blocks.getBlock(blockId) || this.blocks.runtime.flyoutBlocks.getBlock(blockId);
    }

    getBlockInfo (fullOpcode) {
        const [category, opcode] = StringUtil.splitFirst(fullOpcode, '_');
        if (!category || !opcode) {
            return null;
        }
        const categoryInfo = this.runtime._blockInfo.find(ci => ci.id === category);
        if (!categoryInfo) {
            return null;
        }
        const blockInfo = categoryInfo.blocks.find(b => b.info.opcode === opcode);
        if (!blockInfo) {
            return null;
        }
        return blockInfo;
    }

    createConstantInput (constant, preserveStrings = false) {
        if (constant === null) throw new Error('IR: Constant cannot have a null value.');

        constant += '';
        const numConstant = +constant;
        const preserve = preserveStrings && this.namesOfCostumesAndSounds.has(constant);

        if (!Number.isNaN(numConstant) && (constant.trim() !== '' || constant.includes('\t'))) {
            if (!preserve && numConstant.toString() === constant) {
                return new IntermediateInput(InputOpcode.CONSTANT, IntermediateInput.getNumberInputType(numConstant), {value: numConstant});
            }
            return new IntermediateInput(InputOpcode.CONSTANT, InputType.STRING_NUM, {value: constant});
        }

        if (!preserve) {
            if (constant === 'true') {
                return new IntermediateInput(InputOpcode.CONSTANT, InputType.STRING_BOOLEAN, {value: constant});
            } else if (constant === 'false') {
                return new IntermediateInput(InputOpcode.CONSTANT, InputType.STRING_BOOLEAN, {value: constant});
            }
        }

        return new IntermediateInput(InputOpcode.CONSTANT, InputType.STRING_NAN, {value: constant});
    }

    /**
     * Descend into a child input of a block. (eg. the input STRING of "length of ( )")
     * @param {*} parentBlock The parent Scratch block that contains the input.
     * @param {string} inputName The name of the input to descend into.
     * @param {boolean} preserveStrings Should this input keep the names of costumes and sounds at strings.
     * @private
     * @returns {IntermediateInput} Compiled input node for this input.
     */
    descendInputOfBlock (parentBlock, inputName, preserveStrings = false) {
        const input = parentBlock.inputs[inputName];
        if (!input) {
            log.warn(`IR: ${parentBlock.opcode}: missing input ${inputName}`, parentBlock);
            return this.createConstantInput(0);
        }
        const inputId = input.block;
        const block = this.getBlockById(inputId);
        if (!block) {
            log.warn(`IR: ${parentBlock.opcode}: could not find input ${inputName} with ID ${inputId}`);
            return this.createConstantInput(0);
        }

        const intermediate = this.descendInput(block, preserveStrings);
        this.script.yields = this.script.yields || intermediate.yields;
        return intermediate;
    }

    /**
     * Descend into an input. (eg. "length of ( )")
     * @param {*} block The parent Scratch block input.
     * @param {boolean} preserveStrings Should this input keep the names of costumes and sounds at strings.
     * @private
     * @returns {IntermediateInput} Compiled input node for this input.
     */
    descendInput (block, preserveStrings = false) {
        if (!block) console.trace('DI IR');
        if (this.runtime.compilerData.inputs.has(block.opcode)) {
            block = this.runtime.compilerData.inputs.get(block.opcode).stg(this, block, preserveStrings);
            console.log('DI IR', block);
            return block;
        }
        
        const opcodeFunction = this.runtime.getOpcodeFunction(block.opcode);
        if (opcodeFunction) {
            // It might be a non-compiled primitive from a standard category
            if (compatBlocks.inputs.includes(block.opcode)) {
                return this.descendCompatLayerInput(block);
            }
            // It might be an extension block.
            const blockInfo = this.getBlockInfo(block.opcode);
            if (blockInfo) {
                const type = blockInfo.info.blockType;
                if (
                    type === BlockType.ARRAY || type === BlockType.OBJECT ||
                    type === BlockType.REPORTER || type === BlockType.BOOLEAN ||
                    type === BlockType.INLINE
                ) {
                    return this.descendCompatLayerInput(block);
                }
            }
        }

        // It might be a menu.
        const inputs = Object.keys(block.inputs);
        const fields = Object.keys(block.fields);
        if (inputs.length === 0 && fields.length === 1) {
            return this.createConstantInput(block.fields[fields[0]].value, preserveStrings);
        }

        log.warn(`IR: Unknown input: ${block.opcode}`, block);
        throw new Error(`IR: Unknown input: ${block.opcode}`);
    }

    /**
     * Descend into a stacked block. (eg. "move ( ) steps")
     * @param {*} block The Scratch block to parse.
     * @private
     * @returns {IntermediateStackBlock} Compiled node for this block.
     */
    descendStackedBlock (block) {
        if (!block) console.trace('DSB IR');
        if (this.runtime.compilerData.stacks.has(block.opcode)) {
            block = this.runtime.compilerData.stacks.get(block.opcode).stg(this, block, null);
            console.log('DSB IR', block);
            return block;
        }
        const opcodeFunction = this.runtime.getOpcodeFunction(block.opcode);
        if (opcodeFunction) {
            // It might be a non-compiled primitive from a standard category
            if (compatBlocks.stacked.includes(block.opcode)) {
                return this.descendCompatLayerStack(block);
            }
            // It might be an extension block.
            const blockInfo = this.getBlockInfo(block.opcode);
            if (blockInfo) {
                const type = blockInfo.info.blockType;
                if (type === BlockType.COMMAND || type === BlockType.CONDITIONAL || type === BlockType.LOOP) {
                    return this.descendCompatLayerStack(block);
                }
            }
        }

        const asVisualReport = this.descendVisualReport(block);
        if (asVisualReport) {
            return asVisualReport;
        }

        log.warn(`IR: Unknown stacked block: ${block.opcode}`, block);
        throw new Error(`IR: Unknown stacked block: ${block.opcode}`);
    }

    /**
     * Descend into a stack of blocks (eg. the blocks contained within an "if" block)
     * @param {*} parentBlock The parent Scratch block that contains the stack to parse.
     * @param {string} substackName The name of the stack to descend into.
     * @private
     * @returns {IntermediateStack} Stacked blocks.
     */
    descendSubstack (parentBlock, substackName) {
        const input = parentBlock.inputs[substackName];
        if (!input) {
            return new IntermediateStack();
        }
        const stackId = input.block;
        return this.walkStack(stackId);
    }

    /**
     * Descend into and walk the siblings of a stack.
     * @param {string} startingBlockId The ID of the first block of a stack.
     * @private
     * @returns {IntermediateStack} List of stacked block nodes.
     */
    walkStack (startingBlockId) {
        const result = new IntermediateStack();
        let blockId = startingBlockId;

        while (blockId !== null) {
            const block = this.getBlockById(blockId);
            if (!block) {
                break;
            }

            const node = this.descendStackedBlock(block);
            this.script.yields = this.script.yields || node.yields;
            result.blocks.push(node);

            blockId = block.next;
        }

        return result;
    }

    /**
     * @param {*} block
     * @returns {{
     *  opcode: StackOpcode & InputOpcode,
     *  inputs?: *,
     *  yields: boolean
     * }}
     */
    getProcedureInfo (block) {
        const procedureCode = block.mutation.proccode;
        const paramNamesIdsAndDefaults = this.blocks.getProcedureParamNamesIdsAndDefaults(procedureCode);

        if (paramNamesIdsAndDefaults === null) {
            return {opcode: StackOpcode.NOP, yields: false};
        }

        const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

        const addonBlock = this.runtime.getAddonBlock(procedureCode);
        if (addonBlock) {
            const args = {};
            for (let i = 0; i < paramIds.length; i++) {
                let value;
                if (block.inputs[paramIds[i]] && block.inputs[paramIds[i]].block) {
                    value = this.descendInputOfBlock(block, paramIds[i], true);
                } else {
                    value = this.createConstantInput(paramDefaults[i], true);
                }
                args[paramNames[i]] = value;
            }

            return {
                opcode: StackOpcode.ADDON_CALL,
                inputs: {
                    code: procedureCode,
                    arguments: args,
                    blockId: block.id
                },
                yields: true
            };
        }

        const definitionId = this.blocks.getProcedureDefinition(procedureCode);
        const definitionBlock = this.blocks.getBlock(definitionId);
        if (!definitionBlock) {
            return {opcode: StackOpcode.NOP, yields: false};
        }
        const innerDefinition = this.blocks.getBlock(definitionBlock.inputs.custom_block.block);

        let isWarp = this.script.isWarp;
        if (!isWarp) {
            if (innerDefinition && innerDefinition.mutation) {
                const warp = innerDefinition.mutation.warp;
                if (typeof warp === 'boolean') {
                    isWarp = warp;
                } else if (typeof warp === 'string') {
                    isWarp = JSON.parse(warp);
                }
            }
        }

        const variant = generateProcedureVariant(procedureCode, isWarp);

        if (!this.script.dependedProcedures.includes(variant)) {
            this.script.dependedProcedures.push(variant);
        }

        const args = [];
        for (let i = 0; i < paramIds.length; i++) {
            let value;
            if (block.inputs[paramIds[i]] && block.inputs[paramIds[i]].block) {
                value = this.descendInputOfBlock(block, paramIds[i], true);
            } else {
                value = this.createConstantInput(paramDefaults[i], true);
            }
            args.push(value);
        }

        return {
            opcode: StackOpcode.PROCEDURE_CALL,
            inputs: {
                code: procedureCode,
                variant,
                arguments: args
            },
            yields: !this.script.isWarp && procedureCode === this.script.procedureCode
        };
    }

    /**
     * @param {*} block
     * @returns {IntermediateStackBlock | null}
     */
    descendVisualReport (block) {
        if (!this.thread.stackClick || block.next) {
            return null;
        }
        try {
            return new IntermediateStackBlock(StackOpcode.VISUAL_REPORT, {
                input: this.descendInput(block)
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Descend into a variable.
     * @param {*} block The block that has the variable.
     * @param {string} fieldName The name of the field that the variable is stored in.
     * @param {''|'list'} type Variable type, '' for scalar and 'list' for list.
     * @private
     * @returns {*} A parsed variable object.
     */
    descendVariable (block, fieldName, type) {
        const variable = block.fields[fieldName];
        const id = variable.id;

        if (Object.prototype.hasOwnProperty.call(this.variableCache, id)) {
            return this.variableCache[id];
        }

        const data = this._descendVariable(id, variable.value, type);
        this.variableCache[id] = data;
        return data;
    }

    /**
     * @param {string} id The ID of the variable.
     * @param {string} name The name of the variable.
     * @param {''|'list'} type The variable type.
     * @private
     * @returns {*} A parsed variable object.
     */
    _descendVariable (id, name, type) {
        const target = this.target;
        const stage = this.stage;

        // Look for by ID in target...
        if (Object.prototype.hasOwnProperty.call(target.variables, id)) {
            return createVariableData('target', target.variables[id]);
        }

        // Look for by ID in stage...
        if (!target.isStage) {
            if (stage && Object.prototype.hasOwnProperty.call(stage.variables, id)) {
                return createVariableData('stage', stage.variables[id]);
            }
        }

        // Look for by name and type in target...
        for (const varId in target.variables) {
            if (Object.prototype.hasOwnProperty.call(target.variables, varId)) {
                const currVar = target.variables[varId];
                if (currVar.name === name && currVar.type === type) {
                    return createVariableData('target', currVar);
                }
            }
        }

        // Look for by name and type in stage...
        if (!target.isStage && stage) {
            for (const varId in stage.variables) {
                if (Object.prototype.hasOwnProperty.call(stage.variables, varId)) {
                    const currVar = stage.variables[varId];
                    if (currVar.name === name && currVar.type === type) {
                        return createVariableData('stage', currVar);
                    }
                }
            }
        }

        // Create it locally...
        const newVariable = new Variable(id, name, type, false);
        target.variables[id] = newVariable;

        if (target.sprite) {
            // Create the variable in all instances of this sprite.
            // This is necessary because the script cache is shared between clones.
            // sprite.clones has all instances of this sprite including the original and all clones
            for (const clone of target.sprite.clones) {
                if (!Object.prototype.hasOwnProperty.call(clone.variables, id)) {
                    clone.variables[id] = new Variable(id, name, type, false);
                }
            }
        }

        return createVariableData('target', newVariable);
    }

    /**
     * Descend into an input block that uses the compatibility layer.
     * @param {*} block The block to use the compatibility layer for.
     * @private
     * @returns {IntermediateInput} The parsed node.
     */
    descendCompatLayerInput (block) {
        const inputs = {};
        const fields = {};
        for (const name of Object.keys(block.inputs)) {
            inputs[name] = this.descendInputOfBlock(block, name, true);
        }
        for (const name of Object.keys(block.fields)) {
            fields[name] = block.fields[name].value;
        }
        return new IntermediateInput(InputOpcode.COMPATIBILITY_LAYER, InputType.ANY, {
            opcode: block.opcode,
            id: block.id,
            inputs,
            fields,
            breakable: false,
            iterable: false
        }, true);
    }

    /**
     * Descend into a stack block that uses the compatibility layer.
     * @param {*} block The block to use the compatibility layer for.
     * @private
     * @returns {IntermediateStackBlock} The parsed node.
     */
    descendCompatLayerStack (block) {
        const inputs = {};
        for (const name of Object.keys(block.inputs)) {
            if (!name.startsWith('SUBSTACK')) {
                inputs[name] = this.descendInputOfBlock(block, name, true);
            }
        }

        const fields = {};
        for (const name of Object.keys(block.fields)) {
            fields[name] = block.fields[name].value;
        }

        const blockInfo = this.getBlockInfo(block.opcode);
        const blockType = (blockInfo && blockInfo.info && blockInfo.info.blockType) || BlockType.COMMAND;
        const substacks = {};
        if (blockType === BlockType.CONDITIONAL || blockType === BlockType.LOOP || blockType === BlockType.INLINE) {
            for (const inputName in block.inputs) {
                if (!inputName.startsWith('SUBSTACK')) continue;
                const branchNum = inputName === 'SUBSTACK' ? 1 : +inputName.substring('SUBSTACK'.length);
                if (!isNaN(branchNum)) {
                    substacks[branchNum] = this.descendSubstack(block, inputName);
                }
            }
        }

        return new IntermediateStackBlock(StackOpcode.COMPATIBILITY_LAYER, {
            opcode: block.opcode,
            id: block.id,
            blockType,
            inputs,
            fields,
            substacks,
            breakable: block.isBreakable ?? false,
            iterable: block.isIterable ?? false
        }, true);
    }

    analyzeLoop () {
        return !this.script.isWarp || this.script.warpTimer;
    }

    readTopBlockComment (commentId) {
        const comment = this.target.comments[commentId];
        if (!comment) {
            // can't find the comment
            // this is safe to ignore
            return;
        }

        const text = comment.text;

        for (const line of text.split('\n')) {
            if (!/^tw\b/.test(line)) {
                continue;
            }

            const flags = line.split(' ');
            for (const flag of flags) {
                switch (flag) {
                case 'nocompile':
                    throw new Error('Script explicitly disables compilation');
                case 'stuck':
                    this.script.warpTimer = true;
                    break;
                }
            }

            // Only the first 'tw' line is parsed.
            break;
        }
    }

    /**
     * @param {*} hatBlock
     * @returns {IntermediateStack}
     */
    walkHat (hatBlock) {
        const nextBlock = hatBlock.next;
        const opcode = hatBlock.opcode;
        const hatInfo = this.runtime._hats[opcode];

        if (this.thread.stackClick) {
            // We still need to treat the hat as a normal block (so executableHat should be false) for
            // interpreter parity, but the reuslt is ignored.
            const opcodeFunction = this.runtime.getOpcodeFunction(opcode);
            if (opcodeFunction) {
                return new IntermediateStack([
                    this.descendCompatLayerStack(hatBlock),
                    ...this.walkStack(nextBlock).blocks
                ]);
            }
            return this.walkStack(nextBlock);
        }

        if (hatInfo.edgeActivated) {
            // Edge-activated HAT
            this.script.yields = true;
            this.script.executableHat = true;
            return new IntermediateStack([
                new IntermediateStackBlock(StackOpcode.HAT_EDGE, {
                    id: hatBlock.id,
                    condition: this.descendCompatLayerInput(hatBlock).toType(InputType.BOOLEAN)
                }),
                ...this.walkStack(nextBlock).blocks
            ]);
        }

        const opcodeFunction = this.runtime.getOpcodeFunction(opcode);
        if (opcodeFunction) {
            // Predicate-based HAT
            this.script.yields = true;
            this.script.executableHat = true;
            return new IntermediateStack([
                new IntermediateStackBlock(StackOpcode.HAT_PREDICATE, {
                    condition: this.descendCompatLayerInput(hatBlock).toType(InputType.BOOLEAN)
                }),
                ...this.walkStack(nextBlock).blocks
            ]);
        }

        return this.walkStack(nextBlock);
    }

    /**
     * @param {string} topBlockId The ID of the top block of the script.
     * @returns {IntermediateScript}
     */
    generate (topBlockId) {
        this.blocks.populateProcedureCache();

        this.script.topBlockId = topBlockId;

        const topBlock = this.getBlockById(topBlockId);
        if (!topBlock) {
            if (this.script.isProcedure) {
                // Empty procedure
                return this.script;
            }
            throw new Error('Cannot find top block');
        }

        if (topBlock.comment) {
            this.readTopBlockComment(topBlock.comment);
        }

        // We do need to evaluate empty hats
        const hatInfo = this.runtime._hats[topBlock.opcode];
        const isHat = !!hatInfo;
        if (isHat) {
            this.script.stack = this.walkHat(topBlock);
        } else {
            // We don't evaluate the procedures_definition top block as it never does anything
            // We also don't want it to be treated like a hat block
            let entryBlock;
            if (topBlock.opcode === 'procedures_definition') {
                entryBlock = topBlock.next;
            } else {
                entryBlock = topBlockId;
            }

            if (entryBlock) {
                this.script.stack = this.walkStack(entryBlock);
            }
        }

        return this.script;
    }
}

class IRGenerator {
    constructor (thread) {
        this.thread = thread;
        this.blocks = thread.blockContainer;

        this.proceduresToCompile = new Map();
        this.compilingProcedures = new Map();
        /** @type {Object.<string, IntermediateScript>} */
        this.procedures = {};

        this.analyzedProcedures = [];
    }

    addProcedureDependencies (dependencies) {
        for (const procedureVariant of dependencies) {
            if (Object.prototype.hasOwnProperty.call(this.procedures, procedureVariant)) {
                continue;
            }
            if (this.compilingProcedures.has(procedureVariant)) {
                continue;
            }
            if (this.proceduresToCompile.has(procedureVariant)) {
                continue;
            }
            const procedureCode = parseProcedureCode(procedureVariant);
            const definition = this.blocks.getProcedureDefinition(procedureCode);
            this.proceduresToCompile.set(procedureVariant, definition);
        }
    }

    /**
     * @param {ScriptTreeGenerator} generator The generator to run.
     * @param {string} topBlockId The ID of the top block in the stack.
     * @returns {IntermediateScript} Intermediate script.
     */
    generateScriptTree (generator, topBlockId) {
        const result = generator.generate(topBlockId);
        this.addProcedureDependencies(result.dependedProcedures);
        return result;
    }

    /**
     * Recursively analyze a script and its dependencies.
     * @param {IntermediateScript} script Intermediate script.
     */
    analyzeScript (script) {
        let madeChanges = false;
        for (const procedureCode of script.dependedProcedures) {
            const procedureData = this.procedures[procedureCode];

            // Analyze newly found procedures.
            if (!this.analyzedProcedures.includes(procedureCode)) {
                this.analyzedProcedures.push(procedureCode);
                if (this.analyzeScript(procedureData)) {
                    madeChanges = true;
                }
                this.analyzedProcedures.pop();
            }

            // If a procedure used by a script may yield, the script itself may yield.
            if (procedureData.yields && !script.yields) {
                script.yields = true;
                madeChanges = true;
            }
        }
        return madeChanges;
    }

    /**
     * @returns {IntermediateRepresentation} Intermediate representation.
     */
    generate () {
        const entry = this.generateScriptTree(new ScriptTreeGenerator(this.thread), this.thread.topBlock);

        // Compile any required procedures.
        // As procedures can depend on other procedures, this process may take several iterations.
        const procedureTreeCache = this.blocks._cache.compiledProcedures;
        while (this.proceduresToCompile.size > 0) {
            this.compilingProcedures = this.proceduresToCompile;
            this.proceduresToCompile = new Map();

            for (const [procedureVariant, definitionId] of this.compilingProcedures.entries()) {
                if (procedureTreeCache[procedureVariant]) {
                    const result = procedureTreeCache[procedureVariant];
                    this.procedures[procedureVariant] = result;
                    this.addProcedureDependencies(result.dependedProcedures);
                } else {
                    const isWarp = parseIsWarp(procedureVariant);
                    const generator = new ScriptTreeGenerator(this.thread);
                    generator.setProcedureVariant(procedureVariant);
                    if (isWarp) generator.enableWarp();
                    const compiledProcedure = this.generateScriptTree(generator, definitionId);
                    this.procedures[procedureVariant] = compiledProcedure;
                    procedureTreeCache[procedureVariant] = compiledProcedure;
                }
            }
        }

        // Analyze scripts until no changes are made.
        while (this.analyzeScript(entry));

        return new IntermediateRepresentation(entry, this.procedures);
    }
}

module.exports = {
    ScriptTreeGenerator,
    IRGenerator
};
