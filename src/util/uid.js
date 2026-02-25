/**
 * @fileoverview UID generator, from Blockly.
 */

/**
 * Generate a unique ID, from Blockly.  This should be globally unique.
 * 87 characters ^ 20 length > 128 bits (better than a UUID).
 * @return {string} A globally unique ID string.
 */
const uid = function () {
    const length = 20;
    const soupLength = uid.soup.length;
    const id = [];
    for (let i = 0; i < length; i++) {
        id[i] = uid.soup.charAt(Math.random() * soupLength);
    }
    return id.join('');
};

/**
 * Legal characters for the unique ID.
 * Should be all on a US keyboard.  No XML special characters or control codes.
 * Removed $ due to issue 251.
 * @private
 */
uid.soup = '!#%()*+,-./:;=?@[]^_`{|}~' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

module.exports = uid;
