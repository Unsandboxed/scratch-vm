const ContextMenuContext = require('./context-menu-context');
const Util_ = require('../util/usb-util');
const hasOwn_ = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
/* eslint-disable no-undefined */
const catchError_ = (promise, errors) => {
    if (!(promise instanceof Promise)) {
        throw new TypeError('Expected "promise" to be PromiseLike.');
    }
    if (errors !== undefined) {
        if (!Array.isArray(errors)) {
            throw new TypeError('Expected "errors" to be undefined or an array.');
        }
        if (!errors[0]) {
            throw new RangeError('Expected "errors" array to be bigger than 0.');
        }
    }
    return promise.then(v => [undefined, v]).catch(e => {
        if (
            errors !== undefined ||
            !errors.some(p => (e instanceof p))
        ) return;
        return [e, undefined];
    });
};
/* eslint-enable no-undefined */

module.exports = function (isAprematureLoad) {
    return {
        get Util () {
            // eslint-disable-next-line max-len
            console.warn('Depricated "Unsandboxed.Util" API was used, please switch :<');
            return Util_;
        },
        get hasOwn () {
            // eslint-disable-next-line max-len
            console.warn('Depricated "Unsandboxed.hasOwn" API was used, please switch to "Unsandboxed.helpers.hasOwn".');
            return hasOwn_;
        },
        get catchError () {
            // eslint-disable-next-line max-len
            console.warn('Depricated "Unsandboxed.catchError" API was used, please switch to "Unsandboxed.helpers.catchError".');
            return catchError_;
        },

        isAprematureLoad,
        ContextMenuContext
    };
};
