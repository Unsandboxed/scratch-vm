/* eslint-disable max-len */
/**
 * @typedef {object} SerDeserFuncs2
 * @property {?}
 */
/**
 * @typedef {[((v:unknown, E:import("../serialization/sb3.js")) => unknown), ((v:unknown, E:import("../serialization/sb3.js")) => unknown), ?SerDeserFuncs2]} SerDeserFuncs
 */
/* eslint-enable max-len */

const EventEmitter = require('events');

class CustomDataTypes extends EventEmitter {
    static EVENT_TYPEADD = 'typeadd';

    constructor () {
        super();

        /**
         * Map of type names to their classes.
         * @type {Record<string, object>}
         */
        this._typesMap = Object.create(null);
        /**
         * Map of classes to their serialization / deserialization functions.
         * @type {Map<object, SerDeserFuncs>}
         */
        this._types = new Map();
    }
    hasType (t) {
        return Object.prototype.hasOwnProperty.call(this._typesMap, t);
    }
    hasTypeConstructor (c) {
        return this._types.has(c);
    }
    setType (t, c, sd) {
        if (Object.prototype.hasOwnProperty.call(this._typesMap, t)) {
            throw new Error(`A type named "${t}" already exists.`);
        }
        this._typesMap[t] = c;
        this._types.set(c, sd);

        this.emit(CustomDataTypes.EVENT_TYPEADD, t);
    }
    serializeType (v, E) {
        for (const c of this._types.keys()) {
            if (!(v instanceof c)) continue;
            return this._types.get(c)[0](v, E);
        }
        console.error('custom type data:', v);
        throw new Error('Could not serialize custom type.');
    }
    deserializeType (t, v, E) {
        if (!Object.prototype.hasOwnProperty.call(this._typesMap, t)) {
            console.error('custom type data:', v);
            throw new Error(`Could not deserialize a type named "${t}".`);
        }
        return this._types.get(this._typesMap[t])[1](v, E);
    }

    hasTCof (v) {
        for (const c of this._types.keys()) {
            if (!(v instanceof c)) continue;
            return true;
        }
        return false;
    }
    getTCof (v) {
        for (const c of this._types.keys()) {
            if (!(v instanceof c)) continue;
            return c;
        }
        return null;
    }
    reverseTypeNameLookup (c) {
        const e = Object.entries(this._typesMap).find(t => t[1] === c);
        if (e) return e[0];
        return null;
    }

    setExtraMode (t, m, f) {
        const type = this._types.get(this._typesMap[t]);
        if (!type[2]) type.push({});
        type[2][m] = f;
    }
    callExtraMode (t, m, ...args) {
        const typeExtras = this._types.get(this._typesMap[t])[2];
        if (!typeExtras || !typeExtras[m]) return null;
        return typeExtras[m](...args);
    }
}

const dataTypes = new CustomDataTypes();
dataTypes._CustomDataTypes = CustomDataTypes;
module.exports = dataTypes;

dataTypes.setType('set', Set, [
    (s, E) => Array.from(s, E.serializePossibleCustomType),
    (s, E) => new Set(s.map(E.deserializePossibleCustomType))
]);

dataTypes.setType('map', Map, [
    (s, E) => Array.from(s.entries(), o => [E.serializePossibleCustomType(o[0]), E.serializePossibleCustomType(o[1])]),
    (s, E) => new Map(s.map(o => [E.deserializePossibleCustomType(o[0]), E.deserializePossibleCustomType(o[1])]))
]);
