// @ts-check
module.exports = function(compilerData, {
    IntermediateInput,
    InputType,
    InputOpcode,
    Cast,
    isSafeInputForEqualsOptimization
}) {
    // Inputs  
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
        if (node.letter.isAlwaysType(InputType.NUMBER)) {
            return `(${jsg.descendInput(node.string)}[${jsg.descendInput(node.letter)}] || "")`;
        }
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
            // @ts-ignore
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
                // @ts-ignore
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: (nFrom <= nTo ? from : to).toType(InputType.NUMBER),
                    high: (nFrom <= nTo ? to : from).toType(InputType.NUMBER),
                    useInts: true,
                    useFloats: false
                });
            }
            // Otherwise hint that these are floats
            // @ts-ignore
            return new IntermediateInput(this.ir_opcode, this.type, {
                low: (nFrom <= nTo ? from : to).toType(InputType.NUMBER),
                high: (nFrom <= nTo ? to : from).toType(InputType.NUMBER),
                useInts: false,
                useFloats: true
            });
        } else if (from.opcode === InputOpcode.CONSTANT) {
            // If only one value is known at compile-time, we can still attempt some optimizations.
            if (!Cast.isInt(Cast.toNumber(from.inputs.value))) {
                // @ts-ignore
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: from.toType(InputType.NUMBER),
                    high: to.toType(InputType.NUMBER),
                    useInts: false,
                    useFloats: true
                });
            }
        } else if (to.opcode === InputOpcode.CONSTANT) {
            if (!Cast.isInt(Cast.toNumber(from.inputs.value))) {
                // @ts-ignore
                return new IntermediateInput(this.ir_opcode, this.type, {
                    low: from.toType(InputType.NUMBER),
                    high: to.toType(InputType.NUMBER),
                    useInts: false,
                    useFloats: true
                });
            }
        }
        // No optimizations possible
        // @ts-ignore
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
};