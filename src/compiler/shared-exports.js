const VariablePool = require('./variable-pool');

// Pen-related constants
const PEN_EXT = 'runtime.ext_pen';
const PEN_STATE = `${PEN_EXT}._getPenState(target)`;

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

/**
 * A frame contains some information about the current substack being compiled.
 */
class Frame {
  constructor (isLoop, isBreakable) {
      /**
       * Whether the current stack runs in a loop (while, for)
       * @type {boolean}
       * @readonly
       */
      this.isLoop = isLoop;

      /**
       * For compatibility with StackFrame
       * @type {boolean}
       */
      this.isIterable = this.isLoop;

      /**
       * Whether the current block is the last block in the stack.
       * @type {boolean}
       */
      this.isLastBlock = false;

      /**
       * Whether or not the current stack can be broken by continue or break
       * @type {boolean}
       * @readonly
       */
      this.isBreakable = isLoop ? true : (isBreakable ?? false);

      /**
       * Whether or not this block is ran in the compatibility layer
       * @type {boolean}
       */
      this.isCompat = false;
  }
}

const SCALAR_TYPE = '';
const LIST_TYPE = 'list';

/**
* Variable pool used for factory function names.
*/
const factoryNameVariablePool = new VariablePool('factory');

/**
* Variable pool used for generated functions (non-generator)
*/
const functionNameVariablePool = new VariablePool('fun');

/**
* Variable pool used for generated generator functions.
*/
const generatorNameVariablePool = new VariablePool('gen');

module.exports = {
  sanitize,
  environment: require('./environment'),
  SCALAR_TYPE,
  LIST_TYPE,
  Frame,
  PEN_EXT,
  PEN_STATE,
  factoryNameVariablePool,
  functionNameVariablePool,
  generatorNameVariablePool,
  VariablePool,
  Cast: require('../util/cast')
};