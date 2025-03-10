// @ts-check

/**
 * @fileoverview Common enums shared amongst parts of the compiler.
 */


/**
 * Enum for the type of the value that is returned by reporter blocks and stored in constants.
 *
 * At compile time, often we don't know exactly type a value will be but we can tell it must be one of a
 * set of types. For this reason, the number value of each type represents a possibility space, where set
 * bits indicate that their corropoding type *could* be encountered at runtime.
 * For example, a type of InputType.NUMBER | InputType.STRING means the value will be either a number or
 * a string at runtime, the compiler can't tell which, but we do know that it's not a boolean or NaN as
 * those bits are not set.
 *
 * @readonly
 * @enum {number}
 */
const InputType = {
    /** The value Infinity */
    NUMBER_POS_INF: 0x001,
    /** Any natural number */
    NUMBER_POS_INT: 0x002,
    /** Any positive fractional number, excluding integers. */
    NUMBER_POS_FRACT: 0x004,
    /** Any positive number excluding 0 and Infinity. Equal to NUMBER_POS_INT | NUMBER_POS_FRACT */
    NUMBER_POS_REAL: 0x006,
    /** The value 0 */
    NUMBER_ZERO: 0x008,
    /** The value -0 */
    NUMBER_NEG_ZERO: 0x010,
    /** Any negitive integer excluding -0 */
    NUMBER_NEG_INT: 0x020,
    /** Any negitive fractional number, excluding integers. */
    NUMBER_NEG_FRACT: 0x040,
    /** Any negitive number excluding -0 and -Infinity. Equal to NUMBER_NEG_INT | NUMBER_NEG_FRACT */
    NUMBER_NEG_REAL: 0x060,
    /** The value -Infinity */
    NUMBER_NEG_INF: 0x080,
  
    /** The value NaN */
    NUMBER_NAN: 0x100,
  
    /** Either 0 or -0. Equal to NUMBER_ZERO | NUMBER_NEG_ZERO */
    NUMBER_ANY_ZERO: 0x018,
    /** Either Infinity or -Infinity. Equal to NUMBER_POS_INF | NUMBER_NEG_INF */
    NUMBER_INF: 0x081,
    /** Any positive number, excluding 0. Equal to NUMBER_POS_REAL | NUMBER_POS_INF */
    NUMBER_POS: 0x007,
    /** Any negitive number, excluding -0. Equal to NUMBER_NEG_REAL | NUMBER_NEG_INF */
    NUMBER_NEG: 0x0E0,
    /** Any whole number. Equal to NUMBER_POS_INT | NUMBER_ZERO */
    NUMBER_WHOLE: 0x00A,
    /** Any integer. Equal to NUMBER_POS_INT | NUMBER_ANY_ZERO | NUMBER_NEG_INT */
    NUMBER_INT: 0x03A,
    /** Any number that works as an array index. Equal to NUMBER_INT | NUMBER_INF | NUMBER_NAN */
    NUMBER_INDEX: 0x1BB,
    /** Any fractional non-integer numbers. Equal to NUMBER_POS_FRACT | NUMBER_NEG_FRACT */
    NUMBER_FRACT: 0x44,
    /** Any real number. Equal to NUMBER_POS_REAL | NUMBER_ANY_ZERO | NUMBER_NEG_REAL */
    NUMBER_REAL: 0x07E,
  
    /** Any number, excluding NaN. Equal to NUMBER_REAL | NUMBER_INF */
    NUMBER: 0x0FF,
    /** Any number, including NaN. Equal to NUMBER | NUMBER_NAN */
    NUMBER_OR_NAN: 0x1FF,
    /** Anything that can be interperated as a number. Equal to NUMBER | STRING_NUM | BOOLEAN */
    NUMBER_INTERPRETABLE: 0x12FF,
  
    /** Any string which as a non-NaN neumeric interpretation, excluding ''.  */
    STRING_NUM: 0x200,
    /** Any string which has no non-NaN neumeric interpretation, including ''. */
    STRING_NAN: 0x400,
    /** Either of the strings 'true' or 'false'. */
    STRING_BOOLEAN: 0x800,
  
    /** Any string. Equal to STRING_NUM | STRING_NAN | STRING_BOOLEAN */
    STRING: 0xE00,
  
    /** Any boolean. */
    BOOLEAN: 0x1000,
    /** Any input that can be interperated as a boolean. Equal to BOOLEAN | STRING_BOOLEAN */
    BOOLEAN_INTERPRETABLE: 0x1800,
  
    /** Any value type (a type a scratch variable can hold). Equal to NUMBER_OR_NAN | STRING | BOOLEAN | OBJECTLIKE */
    ANY: 0x27FFF,
  
    /** An array of values in the form [R, G, B] */
    COLOR: 0x2000,

    /** Any object like value, array, object, and null. Equal to ARRAY | OBJECT */
    OBJECTLIKE: 0x26000,
    /** An array */
    ARRAY: 0x22000,
    /** A object */
    OBJECT: 0x24000
};
  
/**
* Enum for the opcodes of the stackable blocks used in the IR AST.
* @readonly
* @enum {string}
*/
const StackOpcode = {
    NOP: 'noop',
  
    ADDON_CALL: 'addons.call',
    VISUAL_REPORT: 'visualReport',
    COMPATIBILITY_LAYER: 'compat',
  
    HAT_EDGE: 'hat.edge',
    HAT_PREDICATE: 'hat.predicate'
};

/**
* Enum for the opcodes of the reporter blocks used in the IR AST.
* @readonly
* @enum {string}
*/
const InputOpcode = {
    NOP: 'noop',
  
    ADDON_CALL: 'addons.call',
    CONSTANT: 'constant',
  
    CAST_NUMBER: 'cast.toNumber',
    CAST_NUMBER_INDEX: 'cast.toInteger',
    CAST_NUMBER_OR_NAN: 'cast.toNumberOrNaN',
    CAST_STRING: 'cast.toString',
    CAST_BOOLEAN: 'cast.toBoolean',
    CAST_COLOR: 'cast.toColor',
    CAST_ARRAY: 'cast.toArray',
    CAST_OBJECT: 'cast.toObject',
    CAST_OBJECTLIKE: 'cast.toObjectLike',
  
    COMPATIBILITY_LAYER: 'compat'
};

module.exports = {
    StackOpcode,
    InputOpcode,
    InputType
};
