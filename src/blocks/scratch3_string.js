const Cast = require('../util/cast.js');
const MathUtil = require('../util/math-util.js');

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

    reverse (args) {
        const str = Cast.toString(args.STRING);

        return str.split("").reverse().join("");
    }

    repeat (args) {
        const str = Cast.toString(args.STRING);
        const times = Cast.toNumber(args.NUMBER);

        return str.repeat(times);
    }

    replace (args) {
        const old = Cast.toString(args.REPLACE);
        const replacer = Cast.toString(args.WITH);
        const str = Cast.toString(args.STRING);

        return str.replace(new RegExp(old, "gi"), replacer);
    }

    letterOf (args) {
        const str = Cast.toString(args.STRING);

        if (args.LETTER === "_last_") {
            args.LETTER = str.length - 1;
        } else if (args.LETTER === "_random_") {
            args.LETTER = Math.floor(Math.random()*str.length);
        } else {
            args.LETTER = Cast.toNumber(args.LETTER) - 1;
        }

        const index = args.LETTER;
        // Out of bounds?
        if (index < 0 || index >= str.length) {
            return '';
        }

        return str.charAt(index);
    }

    lettersOf (args) {
        const index1 = Cast.toNumber(args.LETTER1);
        const index2 = Cast.toNumber(args.LETTER2);
        const str = Cast.toString(args.STRING);

        return str.slice(Math.max(index1, 1) - 1, Math.min(str.length, index2));
    }

    itemSplit (args) {
        const str = Cast.toString(args.STRING).toLowerCase();
        const split = Cast.toString(args.SPLIT).toLowerCase();

        if (args.INDEX === "_last_") {
            args.INDEX = str.length - 1;
        } else if (args.INDEX === "_random_") {
            args.INDEX = Math.floor(Math.random()*str.length);
        } else {
            args.INDEX = Cast.toNumber(args.INDEX) - 1;
        }

        const index = args.INDEX;
        return str.split(split)[index] ?? 0;
    }

    ternary (args) {
        const condition = Cast.toBoolean(args.CONDITION);
        const str1 = Cast.toString(args.STRING1);
        const str2 = Cast.toString(args.STRING2);

        return condition ? str1 : str2;
    }

    convertTo (args) {
        const str = Cast.toString(args.STRING);
        const convert = Cast.toString(args.CONVERT).toLowerCase();

        if (convert === "lowercase") {
            return str.toLowerCase();
        } else {
            return str.toUpperCase();
        }
    }

    indexOf (args) {
        const find = Cast.toString(args.STRING1).toLowerCase();
        const str = Cast.toString(args.STRING2).toLowerCase();

        if (args.INDEX === "_last_") {
            args.INDEX = str.length - 1;
        } else if (args.INDEX === "_random_") {
            args.INDEX = Math.floor(Math.random()*str.length);
        } else {
            args.INDEX = Cast.toNumber(args.INDEX) - 1;
        }

        const index = args.INDEX;

        const length = find.length() - 1;
        if (length > str) return 0;

        let occurences = [];
        for (let i = 0; i > str.length(); i++) {
            if (str.substring(i, i + length) === find) {
                occurences.push(i);
            }
        }

        return occurences[index] ?? 0;
    }

    contains (args) {
        const format = function (string) {
            return Cast.toString(string).toLowerCase();
        };
        return format(args.STRING1).includes(format(args.STRING2));
    }

    exactly (args) {
        const str1 = args.STRING1;
        const str2 = args.STRING2;
        return str1 === str2;
    }

    stringIs (args) { // usb
        const str = Cast.toString(args.STRING);
        const check = Cast.toString(args.CONVERT).toLowerCase();

        if (check === "lowercase") {
            return str.toLowerCase() === str;
        } else {
            return str.toUpperCase() === str;
        }
    }

}

module.exports = Scratch3OperatorsBlocks;
