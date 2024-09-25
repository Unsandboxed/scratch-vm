module.exports = function(runtime) {
    const log = require('../util/log');
    const environment = require('./environment');
    const Cast = require('../util/cast');
    const compilerData = runtime.compilerData;
    const {
        IntermediateStackBlock,
        IntermediateInput,
        IntermediateStack,
        InputType,
        InputOpcode
    } = compilerData.exports;
    /**
     * A frame contains some information about the current substack being compiled.
     */
    class Frame {
        constructor (isLoop) {
            /**
             * Whether the current stack runs in a loop (while, for)
             * @type {boolean}
             * @readonly
             */
            this.isLoop = isLoop;

            /**
             * Whether the current block is the last block in the stack.
             * @type {boolean}
             */
            this.isLastBlock = false;
        }
    }
    const SCALAR_TYPE = '';
    const LIST_TYPE = 'list';
    const sanitize = string => {
        if (typeof string !== 'string') {
            log.warn(`sanitize got unexpected type: ${typeof string}`);
            if (typeof string === 'object') {
                return JSON.stringify(string);
            }
            string = '' + string;
        }
        return JSON.stringify(string).slice(1, -1);
    };
    // motion
    compilerData.registerBlock([
        'motion_direction',
        'motion_xposition',
        'motion_yposition'
    ], function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
      `target.direction`,
      `limitPrecision(target.x)`,
      `limitPrecision(target.y)`
    ], {
        input: true,
        type: InputType.NUMBER_REAL
    });
    compilerData.registerBlock('motion_rotationstyle', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `target.rotationStyle`, {
        input: true,
        type: InputType.STRING
    });
    // looks
    // eslint-disable-next-line no-unused-vars
    compilerData.registerBlock('looks_backdropnumbername', function(_, block) {
        if (block.fields.NUMBER_NAME.value === 'number') {
            this.type = InputType.NUMBER_POS_REAL;
            return new IntermediateInput('looks.backdrop.number', this.type);
        }
        this.type = InputType.STRING;
        return new IntermediateInput('looks.backdrop.string', this.type);
    }, null, {
        input: true
    });
    compilerData.registerBlock('looks_costumenumbername', function(_, block) {
        if (block.fields.NUMBER_NAME.value === 'number') {
            this.type = InputType.NUMBER_POS_REAL;
            return new IntermediateInput('looks.costume.number', this.type);
        }
        this.type = InputType.STRING;
        return new IntermediateInput('looks.costume.string', this.type);
    }, null, {
        input: true
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
    // sound
    compilerData.registerBlock('sound_sounds_menu', function(stg, block) {
        // This menu is special compared to other menus -- it actually has an opcode function.
        return stg.createConstantInput(block.fields.SOUND_MENU.value);
    }, null, {
        input: true
    });
    // events
    compilerData.registerBlock('event_broadcast_menu', function(stg, block) {
        const broadcastOption = block.fields.BROADCAST_OPTION;
        const broadcastVariable = stg.target.lookupBroadcastMsg(broadcastOption.id, broadcastOption.value);
        // TODO: empty string probably isn't the correct fallback
        const broadcastName = broadcastVariable ? broadcastVariable.name : '';
        return stg.createConstantInput(broadcastName);
    }, null, {
        input: true
    });
    // control
    compilerData.registerBlock('control_get_counter', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ext_scratch3_control._counter`, {
        input: true,
        type: InputType.NUMBER_POS_INT | InputType.NUMBER_ZERO
    })
    compilerData.registerBlock('control_all_at_once', function(stg, block) {
        // In Scratch 3, this block behaves like "if 1 = 1"
        return new IntermediateStackBlock(this.ir_opcode, {
            stack: stg.descendSubstack(block, 'SUBSTACK'),
        });
    }, function(jsg, block) {
        const previousWarp = jsg.isWarp;
        jsg.isWarp = true;
        jsg.descendStack(block.inputs.stack, new Frame(false, this.ir_opcode));
        jsg.isWarp = previousWarp;
    }, {
        input: false
    });
    // camera
    compilerData.registerBlock([
      'camera_xposition',
      'camera_yposition'
    ], function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, [
      `runtime.camera.x`,
      `runtime.camera.y`
    ], {
        input: true,
        type: InputType.NUMBER
    });
    // sensing
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
    // operators
    compilerData.registerBlock([
        'operator_add',
        'operator_subtract',
        'operator_multiply',
        'operator_divide',
        'operator_mod',
        'operator_min',
        'operator_max',
        'operator_exponent'
    ], function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'NUM1').toType(InputType.NUMBER),
            right: stg.descendInputOfBlock(block, 'NUM2').toType(InputType.NUMBER)
        });
    }, [
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} + ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} - ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} * ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} / ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          jsg.descendedIntoModulo = true;
          return `mod(${jsg.descendInput(node.left)}, ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `Math.min(${jsg.descendInput(node.left)}, ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `Math.max(${jsg.descendInput(node.left)}, ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} ** ${jsg.descendInput(node.right)})`;
      }
    ], {
        input: true,
        type: InputType.NUMBER_OR_NAN
    });
    compilerData.registerBlock([
        'operator_and',
        'operator_or',
        'operator_xor'
    ], function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'OPERAND1').toType(InputType.BOOLEAN),
            right: stg.descendInputOfBlock(block, 'OPERAND2').toType(InputType.BOOLEAN)
        });
    }, [
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} && ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(${jsg.descendInput(node.left)} || ${jsg.descendInput(node.right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          return `(!!(!${jsg.descendInput(node.left)} ^ !${jsg.descendInput(node.right)}))`;
      },
    ], {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock([
        'operator_equals',
        'operator_gt',
        'operator_gt_equals',
        'operator_lt',
        'operator_lt_equals'
    ], function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'OPERAND1'),
            right: stg.descendInputOfBlock(block, 'OPERAND2')
        });
    }, [
      function(jsg, block) {
          const node = block.inputs;
          const left = node.left;
          const right = node.right;
  
          // When both operands are known to be numbers, we can use ===
          if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
              return `(${jsg.descendInput(left.toType(InputType.NUMBER))} === ${jsg.descendInput(right.toType(InputType.NUMBER))})`;
          }
          // In certain conditions, we can use === when one of the operands is known to be a safe number.
          if (isSafeInputForEqualsOptimization(left, right) || isSafeInputForEqualsOptimization(right, left)) {
              return `(${jsg.descendInput(left.toType(InputType.NUMBER))} === ${jsg.descendInput(right.toType(InputType.NUMBER))})`;
          }
          // When either operand is known to never be a number, only use string comparison to avoid all number parsing.
          if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
              return `(${jsg.descendInput(left.toType(InputType.STRING))}.toLowerCase() === ${jsg.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
          }
          // No compile-time optimizations possible - use fallback method.
          return `compareEqual(${jsg.descendInput(left)}, ${jsg.descendInput(right)})`;
      },
      function(jsg, block) {
          const node = block.inputs;
          const left = node.left;
          const right = node.right;
          // When the left operand is a number and the right operand is a number or NaN, we can use >
          if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
              return `(${jsg.descendInput(left.toType(InputType.NUMBER))} > ${jsg.descendInput(right.toType(InputType.NUMBER_OR_NAN))})`;
          }
          // When the left operand is a number or NaN and the right operand is a number, we can negate <=
          if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
              return `!(${jsg.descendInput(left.toType(InputType.NUMBER_OR_NAN))} <= ${jsg.descendInput(right.toType(InputType.NUMBER))})`;
          }
          // When either operand is known to never be a number, avoid all number parsing.
          if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
              return `(${jsg.descendInput(left.toType(InputType.STRING))}.toLowerCase() > ${jsg.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
          }
          // No compile-time optimizations possible - use fallback method.
          return `compareGreaterThan(${jsg.descendInput(left)}, ${jsg.descendInput(right)})`;
      },
      `('not implemented >=', false)`,
      function(jsg, block) {
          const node = block.inputs;
          const left = node.left;
          const right = node.right;
          // When the left operand is a number or NaN and the right operand is a number, we can use <
          if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
              return `(${jsg.descendInput(left.toType(InputType.NUMBER_OR_NAN))} < ${jsg.descendInput(right.toType(InputType.NUMBER))})`;
          }
          // When the left operand is a number and the right operand is a number or NaN, we can negate >=
          if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
              return `!(${jsg.descendInput(left.toType(InputType.NUMBER))} >= ${jsg.descendInput(right.toType(InputType.NUMBER_OR_NAN))})`;
          }
          // When either operand is known to never be a number, avoid all number parsing.
          if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
              return `(${jsg.descendInput(left.toType(InputType.STRING))}.toLowerCase() < ${jsg.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
          }
          // No compile-time optimizations possible - use fallback method.
          return `compareLessThan(${jsg.descendInput(left)}, ${jsg.descendInput(right)})`;
      },
      `('not implemented <=', false)`,
    ], {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('operator_not', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            operand: stg.descendInputOfBlock(block, 'OPERAND')
        });
    }, function(jsg, block) {
        return `!${jsg.descendInput(block.inputs.operand)}`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('operator_contains', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            string: stg.descendInputOfBlock(block, 'STRING1').toType(InputType.STRING),
            contains: stg.descendInputOfBlock(block, 'STRING2').toType(InputType.STRING)
        });
    }, function(jsg, block) {
        const node = block.inputs;
        return `(${jsg.descendInput(node.string)}.toLowerCase().indexOf(${jsg.descendInput(node.contains)}.toLowerCase()) !== -1)`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('operator_join', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING1').toType(InputType.STRING),
            right: stg.descendInputOfBlock(block, 'STRING2').toType(InputType.STRING)
        });
    }, function(jsg, block) {
        const node = block.inputs;
        return `(${jsg.descendInput(node.left)} + ${jsg.descendInput(node.right)})`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('operator_length', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            string: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING)
          });
    }, function(jsg, block) {
        return `${jsg.descendInput(block.inputs.string)}.length`;
    }, {
        input: true,
        type: InputType.NUMBER_REAL
    });
    compilerData.registerBlock('operator_letter_of', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            letter: stg.descendInputOfBlock(block, 'LETTER').toType(InputType.STRING),
            string: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING)
        });
    }, function(jsg, block) {
        const node = block.inputs;
        if (node.letter.isConstant('random')) {
            if (node.string.opcode === InputOpcode.CONSTANT) {
                const str = jsg.descendInput(node.string);
                const length = str.length - 2;
                return `((${str})[${Math.round(Math.random() * (length - 1))}] || "")`;
            } else {
                return `randomCharacter(${jsg.descendInput(node.string)})`;
            }
        }
        if (node.letter.isConstant('last')) {
            return `((${jsg.descendInput(node.string)}).at(-1) || "")`;
        }
        // todo: maybe use some IR trickery to scan for "random" and "last" to midigate this
        return `(getCharacter(${jsg.descendInput(node.string)}, ${jsg.descendInput(node.letter)}) || "")`;
    }, {
        input: true,
        type: InputType.STRING
    });
    /*compilerData.registerBlock('operator_letters_of', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'LETTER1').toType(InputType.NUMBER_INDEX),
            right: stg.descendInputOfBlock(block, 'LETTER2').toType(InputType.NUMBER_INDEX),
            string: stg.descendInputOfBlock(block, 'STRING').toType(InputType.STRING)
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });*/
    compilerData.registerBlock('operator_mathop', function(stg, block) {
        const value = stg.descendInputOfBlock(block, 'NUM').toType(InputType.NUMBER);
        const operator = block.fields.OPERATOR.value.toLowerCase();
        switch (operator) {
            case 'abs':
                this.type = InputType.NUMBER_POS | InputType.NUMBER_ZERO;
                return new IntermediateInput('operator.mathop.abs', this.type, {value});
            case 'floor':
                this.type = InputType.NUMBER;
                return new IntermediateInput('operator.mathop.floor', this.type, {value});
            case 'ceiling':
                this.type = InputType.NUMBER;
                return new IntermediateInput('operator.mathop.ceiling', this.type, {value});
            case 'sqrt': return new IntermediateInput('operator.mathop.sqrt', this.type, {value});
            case 'sin': return new IntermediateInput('operator.mathop.sin', this.type, {value});
            case 'cos': return new IntermediateInput('operator.mathop.cos', this.type, {value});
            case 'tan': return new IntermediateInput('operator.mathop.tan', this.type, {value});
            case 'asin': return new IntermediateInput('operator.mathop.asin', this.type, {value});
            case 'acos': return new IntermediateInput('operator.mathop.acos', this.type, {value});
            case 'atan':
                this.type = InputType.NUMBER;
                return new IntermediateInput('operator.mathop.atan', this.type, {value});
            case 'ln': return new IntermediateInput('operator.mathop.log_e', this.type, {value});
            case 'log': return new IntermediateInput('operator.mathop.log_10', this.type, {value});
            case 'e ^':
                this.type = InputType.NUMBER;
                return new IntermediateInput('operator.mathop.pow_e', this.type, {value});
            case '10 ^':
                this.type = InputType.NUMBER;
                return new IntermediateInput('operator.mathop.pow_10', this.type, {value});
            default: return this.createConstantInput(0);
        }
    }, null, {
        input: true,
        type: InputType.NUMBER_OR_NAN,
        dynamicChanges: true
    });
    compilerData.registerCompileFn([
      'operator.mathop.abs',
      'operator.mathop.floor',
      'operator.mathop.ceiling',
      'operator.mathop.sqrt',
      'operator.mathop.sin',
      'operator.mathop.cos',
      'operator.mathop.tan',
      'operator.mathop.asin',
      'operator.mathop.acos',
      'operator.mathop.atan',
      'operator.mathop.log_e',
      'operator.mathop.log_10',
      'operator.mathop.pow_e',
      'operator.mathop.pow_10'
    ], [
      function(jsg, block) {
        const node = block.inputs;
          return `Math.abs(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `Math.floor(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `Math.ceil(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `Math.sqrt(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `(Math.round(Math.sin((Math.PI * ${jsg.descendInput(node.value)}) / 180) * 1e10) / 1e10)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `(Math.round(Math.cos((Math.PI * ${jsg.descendInput(node.value)}) / 180) * 1e10) / 1e10)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `tan(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `((Math.asin(${jsg.descendInput(node.value)}) * 180) / Math.PI)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `((Math.acos(${jsg.descendInput(node.value)}) * 180) / Math.PI)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `((Math.atan(${jsg.descendInput(node.value)}) * 180) / Math.PI)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `Math.log(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `(Math.log(${jsg.descendInput(node.value)}) / Math.LN10)`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return`Math.exp(${jsg.descendInput(node.value)})`;
      },
      function(jsg, block) {
        const node = block.inputs;
        return `(10 ** ${jsg.descendInput(node.value)})`;
      }
    ]);
    compilerData.registerBlock('operator_random', function(stg, block) {
        const from = stg.descendInputOfBlock(block, 'FROM');
        const to = stg.descendInputOfBlock(block, 'TO');
        // If both values are known at compile time, we can do some optimizations.
        // TODO: move optimizations to jsgen?
        if (from.opcode === InputOpcode.CONSTANT && to.opcode === InputOpcode.CONSTANT) {
            const sFrom = from.inputs.value;
            const sTo = to.inputs.value;
            const nFrom = Cast.toNumber(sFrom);
            const nTo = Cast.toNumber(sTo);
            // If both numbers are the same, random is unnecessary.
            // todo: this probably never happens so consider removing
            if (nFrom === nTo) {
                return stg.createConstantInput(nFrom);
            }
            // If both are ints, hint this to the compiler
            if (Cast.isInt(sFrom) && Cast.isInt(sTo)) {
                // Both inputs are ints, so we know neither are NaN
                this.type = InputType.NUMBER;
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: (nFrom <= nTo ? from : to).toType(InputType.NUMBER),
                    high: (nFrom <= nTo ? to : from).toType(InputType.NUMBER),
                    useInts: true,
                    useFloats: false
                });
            }
            // Otherwise hint that these are floats
            return new IntermediateInput(this.ir_opcode, this.type, {
                low: (nFrom <= nTo ? from : to).toType(InputType.NUMBER),
                high: (nFrom <= nTo ? to : from).toType(InputType.NUMBER),
                useInts: false,
                useFloats: true
            });
        } else if (from.opcode === InputOpcode.CONSTANT) {
            // If only one value is known at compile-time, we can still attempt some optimizations.
            if (!Cast.isInt(Cast.toNumber(from.inputs.value))) {
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: from.toType(InputType.NUMBER),
                    high: to.toType(InputType.NUMBER),
                    useInts: false,
                    useFloats: true
                });
            }
        } else if (to.opcode === InputOpcode.CONSTANT) {
            if (!Cast.isInt(Cast.toNumber(from.inputs.value))) {
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: from.toType(InputType.NUMBER),
                    high: to.toType(InputType.NUMBER),
                    useInts: false,
                    useFloats: true
                });
            }
        }
        // No optimizations possible
        return new IntermediateInput(this.ir_opcode, this.type, {
            low: from,
            high: to,
            useInts: false,
            useFloats: false
        });
    }, function(jsg, block) {
        const node = block.inputs;
        if (node.useInts) {
            return `randomInt(${jsg.descendInput(node.low)}, ${jsg.descendInput(node.high)})`;
        }
        if (node.useFloats) {
            return `randomFloat(${jsg.descendInput(node.low)}, ${jsg.descendInput(node.high)})`;
        }
        return `runtime.ext_scratch3_operators._random(${jsg.descendInput(node.low)}, ${jsg.descendInput(node.high)})`;
    }, {
        input: true,
        type: InputType.NUMBER_OR_NAN,
        dynamicChanges: true
    });
    compilerData.registerBlock('operator_round', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            value: stg.descendInputOfBlock(block, 'NUM').toType(InputType.NUMBER)
        });
    }, function(jsg, block) {
        return `Math.round(${jsg.descendInput(block.inputs.value)})`;
    }, {
        input: true,
        type: InputType.NUMBER
    });
    // strings
    compilerData.registerBlock('string_exactly', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING1'),
            right: stg.descendInputOfBlock(block, 'STRING2')
        });
    }, null, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_is', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'STRING'),
            right: block.fields.CONVERT.value
        });
    }, null, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('string_repeat', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING'),
            num: stg.descendInputOfBlock(block, 'NUMBER')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_replace', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            left: stg.descendInputOfBlock(block, 'REPLACE'),
            right: stg.descendInputOfBlock(block, 'WITH'),
            str: stg.descendInputOfBlock(block, 'STRING')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('string_reverse', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            str: stg.descendInputOfBlock(block, 'STRING')
        });
    }, null, {
        input: true,
        type: InputType.STRING
    });
    // data
    compilerData.registerBlock('data_variable', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            variable: stg.descendVariable(block, 'VARIABLE', SCALAR_TYPE)
        });
    }, function(jsg, block) {
        return `${jsg.referenceVariable(block.inputs.variable)}.value`;
    }, {
        input: true
    });
    compilerData.registerBlock('data_itemoflist', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            index: stg.descendInputOfBlock(block, 'INDEX')
        });
    }, function(jsg, block) {
        const node = block.inputs;
        if (environment.supportsNullishCoalescing) {
            if (node.index.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
                return `(${jsg.referenceVariable(node.list)}.value[${jsg.descendInput(node.index.toType(InputType.NUMBER_INDEX))} - 1] ?? "")`;
            }
            if (node.index.isConstant('last')) {
                return `(${jsg.referenceVariable(node.list)}.value[${jsg.referenceVariable(node.list)}.value.length - 1] ?? "")`;
            }
        }
        return `listGet(${jsg.referenceVariable(node.list)}.value, ${jsg.descendInput(node.index)})`;
    }, {
        input: true
    });
    compilerData.registerBlock('data_lengthoflist', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE)
        });
    }, function(jsg, block) {
      return `${jsg.referenceVariable(block.inputs.list)}.value.length`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('data_listcontainsitem', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            item: stg.descendInputOfBlock(block, 'ITEM')
        });
    }, function(jsg, block) {
        const node = block.inputs;
        return `listContains(${jsg.referenceVariable(node.list)}, ${jsg.descendInput(node.item)})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    compilerData.registerBlock('data_itemnumoflist', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
            item: stg.descendInputOfBlock(block, 'ITEM')
        });
    }, function(jsg, block) {
        const node = block.inputs;
        return `listIndexOf(${jsg.referenceVariable(node.list)}, ${jsg.descendInput(node.item)})`;
    }, {
        input: true,
        type: InputType.NUMBER_POS_REAL | InputType.NUMBER_ZERO
    });
    compilerData.registerBlock('data_listcontents', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
        });
    }, function(jsg, block) {
        return `listContents(${jsg.referenceVariable(block.inputs.list)})`;
    }, {
        input: true,
        type: InputType.STRING
    });
    compilerData.registerBlock('data_listarraycontents', function(stg, block) {
        return new IntermediateInput(this.ir_opcode, this.type, {
            list: stg.descendVariable(block, 'LIST', LIST_TYPE),
        });
    }, function(jsg, block) {
        return `listContentsArray(${jsg.referenceVariable(block.inputs.list)})`;
    }, {
        input: true,
        type: InputType.ANY
    });
    // procedures
    compilerData.registerBlock('procedures_call', function(stg, block) {
      const procedureInfo = stg.getProcedureInfo(block);
      this.yields = procedureInfo.yields;
      return new IntermediateInput(procedureInfo.opcode, this.type, procedureInfo.inputs, this.yields);
    }, function(jsg, block) {
        const node = block.inputs;
        const procedureCode = node.code;
        const procedureVariant = node.variant;
        const procedureData = jsg.ir.procedures[procedureVariant];
        if (procedureData.stack === null) {
            // TODO still need to evaluate arguments for side effects
            return '""';
        }
  
        // Recursion makes this complicated because:
        //  - We need to yield *between* each call in the same command block
        //  - We need to evaluate arguments *before* that yield happens
  
        const procedureReference = `thread.procedures["${sanitize(procedureVariant)}"]`;
        const args = [];
        for (const input of node.arguments) {
            args.push(jsg.descendInput(input));
        }
        const joinedArgs = args.join(',');
  
        const yieldForRecursion = !jsg.isWarp && procedureCode === jsg.script.procedureCode;
        const yieldForHat = jsg.isInHat;
        if (yieldForRecursion || yieldForHat) {
            const runtimeFunction = procedureData.yields ? 'yieldThenCallGenerator' : 'yieldThenCall';
            return `(yield* ${runtimeFunction}(${procedureReference}, ${joinedArgs}))`;
        }
        if (procedureData.yields) {
            return `(yield* ${procedureReference}(${joinedArgs}))`;
        }
        return `${procedureReference}(${joinedArgs})`;
    }, {
        input: true,
        type: InputType.ANY,
        dynamicChanges: true
    });
    compilerData.registerBlock('argument_reporter_string_number', function(stg, block) {
        const name = block.fields.VALUE.value;
        // lastIndexOf because multiple parameters with the same name will use the value of the last definition
        const index = stg.script.arguments.lastIndexOf(name);
        if (index === -1) {
            // Legacy support
            if (name.toLowerCase() === 'last key pressed') {
                return new IntermediateInput('tw.getLastKeyPressed', this.type);
            }
            return new IntermediateInput('procedures.paramater', this.type);
        }
        if (index === -1) {
            return stg.createConstantInput(0);
        }
        return new IntermediateInput(this.ir_opcode, this.type, {index});
        // eslint-disable-next-line no-unused-vars
    }, function(_, block) {
        return `p${block.inputs.index}`;
    }, {
        input: true,
        type: InputType.ANY
    });
    // eslint-disable-next-line no-unused-vars
    compilerData.registerCompileFn('procedures.paramater', function(_, block) {
        return `(thread.getParam("${block.inputs.name}") ?? 0)`;
    })
    compilerData.registerBlock('argument_reporter_boolean', function(stg, block) {
        // see argument_reporter_string_number above
        const name = block.fields.VALUE.value;
        const index = stg.script.arguments.lastIndexOf(name);
        if (index === -1) {
            if (name.toLowerCase() === 'is compiled?' || name.toLowerCase() === 'is unsandboxed?') {
                return stg.createConstantInput(true).toType(InputType.BOOLEAN);
            }
            return stg.createConstantInput(0);
        }
        return new IntermediateInput(this.ir_opcode, this.type, {index});
        // eslint-disable-next-line no-unused-vars
    }, function(_, block) {
        return `toBoolean(p${block.arguments.index})`;
    }, {
        input: true,
        type: InputType.BOOLEAN
    });
    // other
    compilerData.registerBlock('colour_picker', function(stg, block) {
        return stg.createConstantInput(block.fields.COLOUR.value, true);
    }, null, {
        input: true
    });
    compilerData.registerBlock([
        'math_angle',
        'math_integer',
        'math_number',
        'math_positive_number',
        'math_whole_number'
    ], function(stg, block, preserveStrings) {
        return stg.createConstantInput(block.fields.NUM.value, preserveStrings);
    }, null, {
        input: true
    });
    compilerData.registerBlock('text', function(stg, block, preserveStrings) {
        return stg.createConstantInput(block.fields.TEXT.value, preserveStrings);
    }, null, {
        input: true
    });
    compilerData.registerBlock('tw_getLastKeyPressed', function() {
        return new IntermediateInput(this.ir_opcode, this.type);
    }, `runtime.ioDevices.keyboard.getLastKeyPressed()`, {
        input: true,
        type: InputType.STRING
    });
};