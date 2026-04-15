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
    Extendable
};

module.exports = Scratch;
