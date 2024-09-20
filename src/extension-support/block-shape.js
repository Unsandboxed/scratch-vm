// Use the constants instead of manually redefining them again
const ScratchBlocksConstants = require('../engine/scratch-blocks-constants');

/**
 * Types of block shapes
 * @enum {number}
 */
const BlockShape = {
    /**
     * Output shape: hexagonal (booleans/predicates).
     */
    HEXAGONAL: ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL,

    /**
     * Output shape: rounded (numbers).
     */
    ROUND: ScratchBlocksConstants.OUTPUT_SHAPE_ROUND,

    /**
     * Output shape: squared (any/all values; strings).
     */
    SQUARE: ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE,

    /**
     * Output shape: array (this is just squared as of now)
     */
    ARRAY: ScratchBlocksConstants.OUTPUT_SHAPE_ARRAY,

    /**
     * Output shape: object (objects)
     */
    OBJECT: ScratchBlocksConstants.OUTPUT_SHAPE_OBJECT
};

module.exports = BlockShape;
