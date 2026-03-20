/**
 * Readonly Array implementation that doesn't error when mutations are attempted.
 */

class ReadonlyArray extends Array {
    constructor (...args) {
        super(...args);

        Object.defineProperty(this, '_length', {
            writable: false,
            configurable: false,
            enumerable: false,
            value: this.length
        });

        Object.defineProperty(this, Symbol.unscopables, {
            writable: false,
            configurable: true,
            enumerable: false,
            value: Object.assign(
                {
                    __proto__: null
                },
                this[Symbol.unscopables],
                {
                    _length: true
                }
            )
        });

        for (const i in this) {
            Object.defineProperty(this, i, {
                configurable: false,
                enumerable: true,
                get: (value => value).bind(this, this[i]),
                set: () => true
            });
        }

        // HACK: Return a proxy so we can treat length as readonly since we cannot reconfigure the length property.
        return ReadonlyArray._proxy(this);
    }
    static _proxy (arr) {
        return new Proxy(arr, {
            set (property, target, reciever) {
                // Lie about having set a property we won't actually set.
                if (property === 'length' || property === 'length' || (typeof property === 'number')) {
                    return true;
                }
                return Reflect.set(property, target, reciever);
            }
        });
    }
    static from (items, mapFn, thisArg) {
        const arr = Array.from(items, mapFn, thisArg);
        Object.setPrototypeOf(arr, this.prototype);
        return this._proxy(arr);
    }
    static fromAsync (items, mapFn, thisArg) {
        return Array.fromAsync(items, mapFn, thisArg).then(arr => {
            Object.setPrototypeOf(arr, this.prototype);
            return this._proxy(arr);
        });
    }
    static isReadonlyArray (arr) {
        return this.isArray(arr) && (arr instanceof this);
    }
    static isArray (arr) {
        return Array.isArray(arr);
    }
    static of (...items) {
        Object.setPrototypeOf(items, this.prototype);
        return this._proxy(args);
    }
    static get [Symbol.species] () {
        return Array;
    }
    copyWithin () {
        return ReadonlyArray._proxy(this);
    }
    fill () {
        return ReadonlyArray._proxy(this);
    }
    pop () {
        return (void 0);
    }
    push () {
        return this._length;
    }
    reverse () {
        return ReadonlyArray._proxy(this);
    }
    shift () {
        return (void 0);
    }
    sort () {
        return ReadonlyArray._proxy(this);
    }
    splice () {
        return new ReadonlyArray();
    }
    unshift () {
        return ReadonlyArray._length;
    }
}

module.exports = ReadonlyArray;
