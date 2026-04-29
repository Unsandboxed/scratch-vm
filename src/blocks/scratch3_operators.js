const Cast = require('../util/cast.js');
const MathUtil = require('../util/math-util.js');
const {getOrderedExtendableValues} = require('../util/extendable-arguments');

class Scratch3OperatorsBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            operator_add: this.add,
            operator_subtract: this.subtract,
            operator_multiply: this.multiply,
            operator_divide: this.divide,
            operator_exponent: this.exponent,
            operator_clamp: this.clamp,
            operator_lt: this.lt,
            operator_lt_equals: this.ltEquals,
            operator_equals: this.equals,
            operator_gt: this.gt,
            operator_gt_equals: this.gtEquals,
            operator_and: this.and,
            operator_or: this.or,
            operator_xor: this.xor,
            operator_not: this.not,
            operator_random: this.random,
            operator_mod: this.mod,
            operator_min: this.min,
            operator_max: this.max,
            operator_round: this.round,
            operator_mathop: this.mathop,
            operator_add_extends: this.addExtends,
            operator_subtract_extends: this.subtractExtends,
            operator_multiply_extends: this.multiplyExtends,
            operator_divide_extends: this.divideExtends,
            operator_lt_extends: this.ltExtends,
            operator_lt_equals_extends: this.ltEqualsExtends,
            operator_equals_extends: this.equalsExtends,
            operator_gt_extends: this.gtExtends,
            operator_gt_equals_extends: this.gtEqualsExtends,
            operator_and_extends: this.andExtends,
            operator_or_extends: this.orExtends,
            operator_xor_extends: this.xorExtends,
            operator_number_array_extends: this.numberArrayExtends,
            operator_min_extends: this.minExtends,
            operator_max_extends: this.maxExtends,
            math_vector2: this.mathVector2,
            math_position: this.mathPosition,
            array: this.arrayBlock,
            checkbox: this.checkbox
        };
    }

    addExtends (args) {
        const values = getOrderedExtendableValues(args, ['NUM']).map(value => Cast.toNumber(value));
        return values.reduce((sum, value) => sum + value, 0);
    }

    subtractExtends (args) {
        const values = getOrderedExtendableValues(args, ['NUM']).map(value => Cast.toNumber(value));
        if (values.length === 0) return 0;
        return values.slice(1).reduce((result, value) => result - value, values[0]);
    }

    multiplyExtends (args) {
        const values = getOrderedExtendableValues(args, ['NUM']).map(value => Cast.toNumber(value));
        if (values.length === 0) return 1;
        return values.reduce((result, value) => result * value, 1);
    }

    divideExtends (args) {
        const values = getOrderedExtendableValues(args, ['NUM']).map(value => Cast.toNumber(value));
        if (values.length === 0) return 1;
        return values.slice(1).reduce((result, value) => result / value, values[0]);
    }

    ltExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'TEXT', 'INPUT']);
        if (values.length < 2) return false;
        for (let i = 1; i < values.length; i++) {
            if (!(Cast.compare(values[i - 1], values[i]) < 0)) {
                return false;
            }
        }
        return true;
    }

    ltEqualsExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'TEXT', 'INPUT']);
        if (values.length < 2) return false;
        for (let i = 1; i < values.length; i++) {
            if (!(Cast.compare(values[i - 1], values[i]) <= 0)) {
                return false;
            }
        }
        return true;
    }

    equalsExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'TEXT', 'INPUT']);
        if (values.length < 2) return false;
        for (let i = 1; i < values.length; i++) {
            if (Cast.compare(values[i - 1], values[i]) !== 0) {
                return false;
            }
        }
        return true;
    }

    gtExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'TEXT', 'INPUT']);
        if (values.length < 2) return false;
        for (let i = 1; i < values.length; i++) {
            if (!(Cast.compare(values[i - 1], values[i]) > 0)) {
                return false;
            }
        }
        return true;
    }

    gtEqualsExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'TEXT', 'INPUT']);
        if (values.length < 2) return false;
        for (let i = 1; i < values.length; i++) {
            if (!(Cast.compare(values[i - 1], values[i]) >= 0)) {
                return false;
            }
        }
        return true;
    }

    andExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'BOOL', 'INPUT'], false).map(value => Cast.toBoolean(value));
        if (values.length === 0) return false;
        return values.every(Boolean);
    }

    orExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'BOOL', 'INPUT'], false).map(value => Cast.toBoolean(value));
        return values.some(Boolean);
    }

    xorExtends (args) {
        const values = getOrderedExtendableValues(args, ['OPERAND', 'BOOL', 'INPUT'], false).map(value => Cast.toBoolean(value));
        let trueCount = 0;
        for (const value of values) {
            if (value) trueCount++;
        }
        return (trueCount % 2) === 1;
    }

    numberArrayExtends (args) {
        return getOrderedExtendableValues(args, ['NUM']).map(value => Cast.toNumber(value));
    }

    mathVector2 (args) {
        const str = String(args.VEC || '0, 0');
        const match = str.trim().match(/^([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*[, ]\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))$/);
        if (match) return [Number(match[1]), Number(match[2])];
        return [0, 0];
    }

    mathPosition (args) {
        const str = String(args.POS || '0, 0');
        const match = str.trim().match(/^([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*[, ]\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))$/);
        if (match) return [Number(match[1]), Number(match[2])];
        return [0, 0];
    }

    arrayBlock (args) {
        return getOrderedExtendableValues(args, ['TEXT']);
    }

    minExtends (args) {
        const values = Cast.toArray(args.ARRAY).map(value => Cast.toNumber(value));
        if (values.length === 0) return 0;
        return Math.min(...values);
    }

    maxExtends (args) {
        const values = Cast.toArray(args.ARRAY).map(value => Cast.toNumber(value));
        if (values.length === 0) return 0;
        return Math.max(...values);
    }

    checkbox () {
        return true;
    }

    add (args) {
        return Cast.toNumber(args.NUM1) + Cast.toNumber(args.NUM2);
    }

    subtract (args) {
        return Cast.toNumber(args.NUM1) - Cast.toNumber(args.NUM2);
    }

    multiply (args) {
        return Cast.toNumber(args.NUM1) * Cast.toNumber(args.NUM2);
    }

    divide (args) {
        return Cast.toNumber(args.NUM1) / Cast.toNumber(args.NUM2);
    }

    exponent (args) {
        return Cast.toNumber(args.NUM1) ** Cast.toNumber(args.NUM2);
    }

    lt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) < 0;
    }

    ltEquals (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) <= 0;
    }

    equals (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) === 0;
    }

    gt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) > 0;
    }

    gtEquals (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) >= 0;
    }

    and (args) {
        return Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2);
    }

    or (args) {
        return Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2);
    }

    xor (args) {
        return Cast.toBoolean(args.OPERAND1) !== Cast.toBoolean(args.OPERAND2);
    }

    not (args) {
        return !Cast.toBoolean(args.OPERAND);
    }

    min (args) {
        const n1 = Cast.toNumber(args.NUM1);
        const n2 = Cast.toNumber(args.NUM2);
        return Math.min(n1, n2);
    }

    max (args) {
        const n1 = Cast.toNumber(args.NUM1);
        const n2 = Cast.toNumber(args.NUM2);
        return Math.max(n1, n2);
    }

    clamp (args) {
        const n = Cast.toNumber(args.NUM);
        const from = Cast.toNumber(args.FROM);
        const to = Cast.toNumber(args.TO);

        if (from > to) {
            return Math.min(Math.max(n, to), from);
        }
        return Math.min(Math.max(n, from), to);
    }

    random (args) {
        return this._random(args.FROM, args.TO);
    }
    _random (from, to) { // used by compiler
        const nFrom = Cast.toNumber(from);
        const nTo = Cast.toNumber(to);
        const low = nFrom <= nTo ? nFrom : nTo;
        const high = nFrom <= nTo ? nTo : nFrom;
        if (low === high) return low;
        // If both arguments are ints, truncate the result to an int.
        if (Cast.isInt(from) && Cast.isInt(to)) {
            return low + Math.floor(Math.random() * ((high + 1) - low));
        }
        return (Math.random() * (high - low)) + low;
    }

    mod (args) {
        const n = Cast.toNumber(args.NUM1);
        const modulus = Cast.toNumber(args.NUM2);
        let result = n % modulus;
        // Scratch mod uses floored division instead of truncated division.
        if (result / modulus < 0) result += modulus;
        return result;
    }

    round (args) {
        return Math.round(Cast.toNumber(args.NUM));
    }

    mathop (args) {
        const operator = Cast.toString(args.OPERATOR).toLowerCase();
        const n = Cast.toNumber(args.NUM);
        switch (operator) {
        case 'abs': return Math.abs(n);
        case 'floor': return Math.floor(n);
        case 'ceiling': return Math.ceil(n);
        case 'sqrt': return Math.sqrt(n);
        case 'sin': return Math.round(Math.sin((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'cos': return Math.round(Math.cos((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'tan': return MathUtil.tan(n);
        case 'asin': return (Math.asin(n) * 180) / Math.PI;
        case 'acos': return (Math.acos(n) * 180) / Math.PI;
        case 'atan': return (Math.atan(n) * 180) / Math.PI;
        case 'ln': return Math.log(n);
        case 'log': return Math.log(n) / Math.LN10;
        case 'e ^': return Math.exp(n);
        case '10 ^': return Math.pow(10, n);
        }
        return 0;
    }
}

module.exports = Scratch3OperatorsBlocks;
