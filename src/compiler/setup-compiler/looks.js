// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    IntermediateInput,
    InputType
}) {
    // Stack
    compilerData.registerBlock('looks_changeeffectby', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            effect: block.fields.EFFECT.value.toLowerCase(),
            value: stg.descendInputOfBlock(block, 'CHANGE').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_changesizeby', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'CHANGE').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_cleargraphiceffects', function() {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_goforwardbackwardlayers', function(stg, block) {
        if (block.fields.FORWARD_BACKWARD.value === 'forward') {
            return new IntermediateStackBlock('looks.forwardlayer', {
                layers: stg.descendInputOfBlock(block, 'NUM').toType(InputType.NUMBER)
            });
        }
        return new IntermediateStackBlock('looks.backwardslayer', {
            layers: stg.descendInputOfBlock(block, 'NUM').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_gotofrontback', function(_, block) {
        if (block.fields.FRONT_BACK.value === 'front') {
            return new IntermediateStackBlock('looks.frontlayer');
        }
        return new IntermediateStackBlock('looks.backlayer');
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_hide', function() {
        return new IntermediateStackBlock(this.ir_opcode);
  }, null, {
        input: false
    });
    compilerData.registerBlock('looks_nextbackdrop', function() {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_nextcostume', function() {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_seteffectto', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            effect: block.fields.EFFECT.value.toLowerCase(),
            value: stg.descendInputOfBlock(block, 'VALUE').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_setsizeto', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            size: stg.descendInputOfBlock(block, 'SIZE').toType(InputType.NUMBER)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_show', function() {
        return new IntermediateStackBlock(this.ir_opcode);
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_switchbackdropto', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            backdrop: stg.descendInputOfBlock(block, 'BACKDROP', true)
        });
    }, null, {
        input: false
    });
    compilerData.registerBlock('looks_switchcostumeto', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode, {
            costume: stg.descendInputOfBlock(block, 'COSTUME', true)
        });
    }, null, {
        input: false
    });
    // Inputs
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('looks_backdropnumbername', function(_, block) {
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
    compilerData.registerBlock('looks_costumenumbername', function(_, block) {
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
    compilerData.registerBlock('looks_size', function() {
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
};