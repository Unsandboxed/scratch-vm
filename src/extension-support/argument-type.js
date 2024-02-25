/**
 * Block argument types
 * @enum {string}
 */
const ArgumentType = {
    /**
     * Numeric value with angle picker
     */
    ANGLE: 'angle',

    /**
     * A representation of a JSON array.
     */
    ARRAY: 'array',

    /**
     * Boolean value with hexagonal placeholder
     */
    BOOLEAN: 'Boolean',

    /**
     * Numeric value with color picker
     */
    COLOR: 'color',

    /**
     * Name of costume in the current target
     */
    COSTUME: 'costume',

    /**
     * Inline image on block (as part of the label)
     */
    IMAGE: 'image',

    /**
     * A label text that can be dynamically changed
     */
    LABEL: 'label',

    /**
     * String value with matrix field
     */
    MATRIX: 'matrix',

    /**
     * MIDI note number with note picker (piano) field
     */
    NOTE: 'note',

    /**
     * Numeric value with text field
     */
    NUMBER: 'number',

    /**
     * A representation of a JSON object.
     */
    OBJECT: 'Object',

    /**
     * A reporter that can be defined using startHats.
     */
    PARAMETER: 'parameter',

    /**
     * Name of sound in the current target
     */
    SOUND: 'sound',

    /**
     * String value with text field
     */
    STRING: 'string',

    /**
     * Name of variable in the current specified target(s)
     */
    VARIABLE: 'variable',
};

module.exports = ArgumentType;
