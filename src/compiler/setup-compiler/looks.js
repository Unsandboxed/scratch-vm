// @ts-check
module.exports = function (compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType,
    sanitize
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    // Stack
    compilerData.registerBlock('looks_changeeffectby', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            effect: block.fields.EFFECT.value.toLowerCase(),
            value: stg.descendInputOfBlock(block, 'CHANGE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        if (Object.prototype.hasOwnProperty.call(jsg.target.effects, block.inputs.effect)) {
            jsg.source += `target.setEffect("${
                sanitize(block.inputs.effect)
            }", runtime.ext_scratch3_looks.clampEffect("${
                sanitize(block.inputs.effect)
            }", ${jsg.descendInput(block.inputs.value)} + target.effects["${
                sanitize(block.inputs.effect)
            }"]));\n`;
        }
    }, {
        input: false
    });
    compilerData.registerBlock('looks_changesizeby', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'CHANGE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `target.setSize(target.size + ${jsg.descendInput(block.inputs.size)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('looks_cleargraphiceffects', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `target.clearEffects();\n`, {
        input: false
    });
    compilerData.registerBlock('looks_goforwardbackwardlayers', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            forward: (block.fields.FORWARD_BACKWARD.value === 'forward'),
            layers: stg.descendInputOfBlock(block, 'NUM').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        if (jsg.target.isStage) return;
        jsg.source += `target.go${
            block.inputs.forward ? 'For' : 'Back'
        }wardLayers(${jsg.descendInput(block.inputs.layers)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('looks_gotofrontback', function (_, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            front: (block.fields.FRONT_BACK.value === 'front')
        });
    }, function (jsg, block) {
        if (jsg.target.isStage) return;
        jsg.source += `target.goTo${block.inputs.front ? 'Front' : 'Back'}();\n`;
    }, {
        input: false
    });
    compilerData.registerBlock([
        'looks_hide',
        'looks_show'
    ], function () {
        return new IntermediateStackBlock('looks.c.setvisibility', {
            visible: this.ir_opcode === 'looks.show'
        });
    }, null, {
        input: false
    });
    compilerData.registerCompileFn('looks.c.setvisibility', function (jsg, block) {
        jsg.source += `target.setVisible(${block.inputs.visible});\n`;
        jsg.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
    });
    compilerData.registerBlock('looks_nextbackdrop', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume + 1, true);\n`, {
        input: false
    });
    compilerData.registerBlock('looks_nextcostume', function () {
        return new IntermediateStackBlock(this.ir_opcode);
    }, `target.setCostume(target.currentCostume + 1);\n`, {
        input: false
    });
    compilerData.registerBlock('looks_seteffectto', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            effect: block.fields.EFFECT.value.toLowerCase(),
            value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        if (Object.prototype.hasOwnProperty.call(jsg.target.effects, block.inputs.effect)) {
            jsg.source += `target.setEffect("${
                sanitize(block.inputs.effect)
            }", runtime.ext_scratch3_looks.clampEffect("${
                sanitize(block.inputs.effect)
            }", ${jsg.descendInput(block.inputs.value)}));\n`;
        }
    }, {
        input: false
    });
    compilerData.registerBlock('looks_setsizeto', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
        });
    }, function (jsg, block) {
        jsg.source += `target.setSize(${jsg.descendInput(block.inputs.size)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('looks_switchbackdropto', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            backdrop: stg.descendInputOfBlock(block, 'BACKDROP', true)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.ext_scratch3_looks._setBackdrop(stage, ${jsg.descendInput(block.inputs.backdrop)});\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('looks_switchcostumeto', function (stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            costume: stg.descendInputOfBlock(block, 'COSTUME', true)
        });
    }, function (jsg, block) {
        jsg.source += `runtime.ext_scratch3_looks._setCostume(target, ${jsg.descendInput(block.inputs.costume)});\n`;
    }, {
        input: false
    });
    // Inputs
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('looks_backdropnumbername', function (_, block) {
        if (block.fields.NUMBER_NAME.value === 'number') {
            this.type = InputType.NUMBER_POS_REAL;
            return new IntermediateInput('looks.backdrop.number', this.type);
        }
        this.type = InputType.STRING;
        return new IntermediateInput('looks.backdrop.string', this.type);
    }, null, {
        input: true,
        dynamicChanges: true
    });
    compilerData.registerBlock('looks_costumenumbername', function (_, block) {
        if (block.fields.NUMBER_NAME.value === 'number') {
            this.type = InputType.NUMBER_POS_REAL;
            return new IntermediateInput('looks.costume.number', this.type);
        }
        this.type = InputType.STRING;
        return new IntermediateInput('looks.costume.string', this.type);
    }, null, {
        input: true,
        dynamicChanges: true
    });
    compilerData.registerBlock('looks_size', function () {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `Math.round(target.size)`, {
        input: true,
        type: InputType.NUMBER_POS_REAL
    });
    compilerData.registerCompileFn([
        'looks.backdrop.number',
        'looks.backdrop.string',
        'looks.costume.number',
        'looks.costume.string'
    ], [
        () => `(stage.currentCostume + 1)`,
        () => `stage.getCostumes()[stage.currentCostume].name`,
        () => `(target.currentCostume + 1)`,
        () => `target.getCostumes()[target.currentCostume].name`
    ]);
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('looks_effect', function (_, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            effect: block.fields.EFFECT.value
        });
        // eslint-disable-next-line no-unused-vars
    }, function (_, block) {
        return `target.getEffect("${sanitize(block.inputs.effect)}".toLowerCase()) || 0`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL
    });
};
