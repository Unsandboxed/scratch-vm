const ContextMenuContext = require('./context-menu-context');
const Util = require('../util/usb-util');
const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
/* eslint-disable no-undefined */
const catchError = (promise, errors) => {
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

module.exports = function () {
    return {
        ContextMenuContext,
        Util,
        hasOwn,
        catchError
    };
};
