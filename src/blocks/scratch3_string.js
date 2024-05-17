const Cast = require('../util/cast.js');
const MathUtil = require('../util/math-util.js');

class Scratch3StringBlocks {
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
            operator_join: this.join,
            operator_letter_of: this.letterOf,
            operator_letters_of: this.lettersOf,
            operator_length: this.length,
            operator_contains: this.contains,
            string_reverse: this.reverse,
            string_repeat: this.repeat,
            string_replace: this.replace,
            string_item_split: this.itemSplit,
            string_ternary: this.ternary,
            string_convert: this.convertTo,
            string_index_of: this.indexOf,
            string_exactly: this.exactly,
            string_is: this.stringIs
        };
    }

    length (args) {
        return Cast.toString(args.STRING).length;
    }

    join (args) {
        return Cast.toString(args.STRING1) + Cast.toString(args.STRING2);
    }

    reverse (args) { // usb
        const str = Cast.toString(args.STRING);

        return str.split('').reverse()
            .join('');
    }

    repeat (args) { // usb
        const str = Cast.toString(args.STRING);
        const times = Cast.toNumber(args.NUMBER);

        return str.repeat(times);
    }

    replace (args) { // usb
        const old = Cast.toString(args.REPLACE);
        const replacer = Cast.toString(args.WITH);
        const str = Cast.toString(args.STRING);

        return str.replace(new RegExp(old, 'gi'), replacer);
    }

    letterOf (args) {
        const str = Cast.toString(args.STRING);
        return this._getLetterOf(str, args.LETTER);
    }

    _getLetterOf (string, index) { // usb // used by compiler
        // usb: we support some weird dropdowns now
        if (index === 'last') {
            index = string.length - 1;
        } else if (index === 'random') {
            index = Math.floor(Math.random() * string.length);
        } else {
            index = Cast.toNumber(index) - 1;
        }

        // Out of bounds?
        if (index < 0 || index >= string.length) {
            return '';
        }

        return string.charAt(index);
    }

    lettersOf (args) { // usb
        const index1 = Cast.toNumber(args.LETTER1);
        const index2 = Cast.toNumber(args.LETTER2);
        const str = Cast.toString(args.STRING);

        return str.slice(Math.max(index1, 1) - 1, Math.min(str.length, index2));
    }

    itemSplit (args) { // usb
        const str = Cast.toString(args.STRING).toLowerCase();
        const split = Cast.toString(args.SPLIT);

        return this._getItemFromSplit(str, split, args.INDEX);
    }

    _getItemFromSplit (string, split, index) { // used by compiler
        const splitString = string.split(split);

        if (index === 'last') {
            index = splitString.length - 1;
        } else if (index === 'random') {
            index = Math.floor(Math.random() * splitString.length);
        } else {
            index = Cast.toNumber(index) - 1;
        }

        return splitString[index] ?? '';
    }

    ternary (args) { // usb
        const condition = Cast.toBoolean(args.CONDITION);
        const str1 = Cast.toString(args.STRING1);
        const str2 = Cast.toString(args.STRING2);

        return condition ? str1 : str2;
    }

    convertTo (args) { // usb
        const str = Cast.toString(args.STRING);
        const convert = Cast.toString(args.CONVERT).toLowerCase();

        return this._convertString(str, convert);
    }

    _convertString (string, textCase) { // used by compiler
        if (textCase === 'lowercase') {
            return string.toLowerCase();
        }
        return string.toUpperCase();
        
    }

    indexOf (args) { // usb
        const find = Cast.toString(args.STRING1).toLowerCase();
        const str = Cast.toString(args.STRING2).toLowerCase();

        return this._getNumberIndex(find, str, args.INDEX);
    }

    _getNumberIndex (find, string, index) { // used by compiler
        const length = find.length;
        if (length > string.length) return 0;

        const occurences = [];
        for (let i = 0; i < string.length; i++) {
            if (string.substring(i, i + length) === find) {
                occurences.push(i);
            }
        }

        if (index === 'last') {
            index = occurences.length - 1;
        } else if (index === 'random') {
            index = Math.floor(Math.random() * occurences.length);
        } else {
            index = Cast.toNumber(index) - 1;
        }

        return occurences[index] ?? 0;
    }

    contains (args) {
        const format = function (string) {
            return Cast.toString(string).toLowerCase();
        };
        return format(args.STRING1).includes(format(args.STRING2));
    }

    exactly (args) { // usb
        const str1 = args.STRING1;
        const str2 = args.STRING2;
        return str1 === str2;
    }

    stringIs (args) { // usb
        const str = Cast.toString(args.STRING);
        const check = Cast.toString(args.CONVERT).toLowerCase();

        if (check === 'lowercase') {
            return str.toLowerCase() === str;
        }
        return str.toUpperCase() === str;
        
    }

}

module.exports = Scratch3StringBlocks;
