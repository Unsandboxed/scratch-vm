// @ts-check
module.exports = function(compilerData, {
    IntermediateInput,
    IntermediateStackBlock,
    InputType,
    InputOpcode,
    sanitize
}) {
    // Stack
    compilerData.registerBlock('sensing_resettimer', function(stg, block) {
        return new IntermediateStackBlock(this.ir_opcode);
    }, 'runtime.ioDevices.clock.resetProjectTimer();\n', {
        input: false
    });
    // Inputs
    compilerData.registerBlock('sensing_answer', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ext_scratch3_sensing._answer`, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('sensing_coloristouchingcolor', function(stg, block) {
      return new IntermediateInput(this.ir_opcode, this.type, {
          target: stg.descendInputOfBlock(block, 'COLOR2').toType(InputType.COLOR),
          mask: stg.descendInputOfBlock(block, 'COLOR').toType(InputType.COLOR)
      });
    }, function(jsg, block) {
        const node = block.inputs;
        return `target.colorIsTouchingColor(${jsg.descendInput(node.target)}, ${jsg.descendInput(node.mask)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('sensing_current', function(_, block) {
        switch (block.fields.CURRENTMENU.value.toLowerCase()) {
            case 'year': return new IntermediateInput('sensing.currenttime.year', this.type);
            case 'month':
              this.type = InputType.NUMBER_POS_REAL;
              return new IntermediateInput('sensing.currenttime.month', this.type);
            case 'date':
              this.type = InputType.NUMBER_POS_REAL;
              return new IntermediateInput('sensing.currenttime.date', this.type);
            case 'dayofweek':
              this.type = InputType.NUMBER_POS_REAL;
              return new IntermediateInput('sensing.currenttime.weekday', this.type);
            case 'hour': return new IntermediateInput('sensing.currenttime.hour', this.type);
            case 'minute': return new IntermediateInput('sensing.currenttime.minute', this.type);
            case 'second': return new IntermediateInput('sensing.currenttime.second', this.type);
            case 'millisecond': return new IntermediateInput('sensing.currenttime.millisecond', this.type);
            // @ts-ignore
            default: return this.createConstantInput(0);
        }
    }, null, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO,
        dynamicChanges: true
    });
    compilerData.registerCompileFn([
        'sensing.currenttime.year',
        'sensing.currenttime.month',
        'sensing.currenttime.date',
        'sensing.currenttime.weekday',
        'sensing.currenttime.hour',
        'sensing.currenttime.minute',
        'sensing.currenttime.second',
        'sensing.currenttime.millisecond'
    ], [
        () => `(new Date().getFullYear())`,
        () => `(new Date().getMonth() + 1)`,
        () => `(new Date().getDate())`,
        () => `(new Date().getDay() + 1)`,
        () => `(new Date().getHours())`,
        () => `(new Date().getMinutes())`,
        () => `(new Date().getSeconds())`,
        () => `(new Date().getMilliseconds())`
    ]);
    compilerData.registerBlock([
        'sensing_dayssince2000',
        'sensing_mousex',
        'sensing_mousey'
    ], function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
        `daysSince2000()`,
        `runtime.ioDevices.mouse.getScratchX()`,
        `runtime.ioDevices.mouse.getScratchY()`
    ], {
        input: true,
        type: InputType.NUMBER
    });
    compilerData.registerBlock('sensing_distanceto', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            target: stg.descendInputOfBlock(block, 'DISTANCETOMENU').toType(InputType.STRING)
        });
    }, function(jsg, block) {
        // TODO: on stages, this can be computed at compile time
        return `distance(${jsg.descendInput(block.inputs.target)})`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('sensing_keypressed', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            key: stg.descendInputOfBlock(block, 'KEY_OPTION', true)
        });
    }, function(jsg, block) {
        return `runtime.ioDevices.keyboard.getKeyIsDown(${jsg.descendInput(block.inputs.key)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('sensing_mousedown', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ioDevices.mouse.getIsDown()`, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('sensing_of', function(stg, block) {
        const property = block.fields.PROPERTY.value;
        const object = stg.descendInputOfBlock(block, 'OBJECT').toType(InputType.STRING);
        if (object.opcode !== InputOpcode.CONSTANT) {
            return new IntermediateInput('sensing.of', this.type, {object, property});
        }
        if (property === 'volume') {
            this.type = InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO;
            return new IntermediateInput('sensing.of.volume', this.type, {object, property});
        }
        if (object.isConstant('_stage_')) {
            switch (property) {
                case 'background #': // fallthrough for scratch 1.0 compatibility
                case 'backdrop #':
                    this.type = InputType.NUMBER_POS_REAL;
                    return new IntermediateInput('sensing.of.backdrop_number', this.type);
                case 'backdrop name':
                    this.type = InputType.STRING;
                    return new IntermediateInput('sensing.of.backdrop_name', this.type);
            }
        } else {
            switch (property) {
                case 'x position':
                    this.type = InputType.NUMBER_REAL;
                    return new IntermediateInput('sensing.of.pos_x', this.type, {object});
                case 'y position':
                    this.type = InputType.NUMBER_REAL;
                    return new IntermediateInput('sensing.of.pos_y', this.type, {object});
                case 'direction':
                    this.type = InputType.NUMBER_REAL;
                    return new IntermediateInput('sensing.of.direction', this.type, {object});
                case 'costume #':
                    this.type = InputType.NUMBER_POS_REAL;
                    return new IntermediateInput('sensing.of.costume_number', this.type, {object});
                case 'costume name':
                    this.type = InputType.STRING;
                    return new IntermediateInput('sensing.of.costume_name', this.type, {object});
                case 'size':
                    this.type = InputType.NUMBER_POS_REAL;
                    return new IntermediateInput('sensing.of.size', this.type, {object});
            }
        }
        return new IntermediateInput('sensing.of.var', this.type, {object, property});
    }, function(jsg, block) {
        const node = block.inputs;
        return `runtime.ext_scratch3_sensing.getAttributeOf({OBJECT: ${jsg.descendInput(node.object)}, PROPERTY: "${sanitize(node.property)}" })`;
    }, {
        input: true,
        type: InputType.ANY,
        dynamicChanges: true
    });
    compilerData.registerCompileFn([
        'sensing.of.volume',
        'sensing.of.backdrop_number',
        'sensing.of.backdrop_name',
        'sensing.of.pos_x',
        'sensing.of.pos_y',
        'sensing.of.direction',
        'sensing.of.costume_number',
        'sensing.of.costume_name',
        `sensing.of.size`,
        `sensing.of.var`
    ], [
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.volume : 0)`;
        },
        () => `(stage.currentCostume + 1)`,
        () => `stage.getCostumes()[stage.currentCostume].name`,
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.x : 0)`;
        },
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.y : 0)`;
        },
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.direction : 0)`;
        },
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.currentCostume + 1 : 0)`;
        },
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.getCostumes()[${targetRef}.currentCostume].name : 0)`;
        },
        function(jsg, block) {
          const targetRef = jsg.descendTargetReference(block.inputs.object);
          return `(${targetRef} ? ${targetRef}.size : 0)`;
        },
        function(jsg, block) {
          const node = block.inputs;
          const targetRef = jsg.descendTargetReference(node.object);
          const varRef = jsg.evaluateOnce(`${targetRef} && ${targetRef}.lookupVariableByNameAndType("${sanitize(node.property)}", "", true)`);
          return `(${varRef} ? ${varRef}.value : 0)`;
        }
    ]);
    compilerData.registerBlock('sensing_timer', function(stg) {
        stg.usesTimer = true;
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ioDevices.clock.projectTimer()`, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('sensing_touchingcolor', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            color: stg.descendInputOfBlock(block, 'COLOR').toType(InputType.COLOR)
        });
    }, function(jsg, block) {
        return `target.isTouchingColor(${jsg.descendInput(block.inputs.color)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('sensing_touchingobject', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            object: stg.descendInputOfBlock(block, 'TOUCHINGOBJECTMENU')
        });
    }, function(jsg, block) {
        return `target.isTouchingObject(${jsg.descendInput(block.inputs.object)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('sensing_username', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ioDevices.userData.getUsername()`, {
        input: true,
        type: InputType.STRING
    });
};