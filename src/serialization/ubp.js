/**
 * @fileoverview
 * A UBP compatibility resolver and version parser. Parses provided
 * JSON and then applies UBP migrations needed by scratch-vm runtime structures.
 */

/**
 * Latest UBP project format version supported by this VM.
 * @type {number}
 */
const UBP_CURRENT_VERSION = 1;

/**
 * Test whether an object has an own integer property.
 * @param {object} obj object to inspect
 * @param {string} key property name
 * @returns {boolean} True if obj[key] exists and is an integer.
 */
const hasNumericProperty = (obj, key) => Boolean(
    obj &&
    Object.prototype.hasOwnProperty.call(obj, key) &&
    Number.isInteger(obj[key])
);

/**
 * Read the serialized UBP version marker from project JSON.
 * @param {object} json Project JSON parsed from project.json.
 * @returns {?number} UBP version if this is UBP, otherwise null.
 */
const getUBPVersion = json => {
    if (!json || !json.meta) {
        return null;
    }
    if (hasNumericProperty(json.meta, 'ubpVersion')) {
        return json.meta.ubpVersion;
    }
    if (json.meta.ubp === 1) {
        // Legacy pre-version UBP marker.
        return 0;
    }
    return null;
};

/**
 * Compatibility migrations by source version. Each key migrates from
 * that version to the next version.
 * @type {Record<number, (json: object) => object>}
 */
const ubpCompatibilityResolvers = {
    0: json => {
        if (!json.meta || typeof json.meta !== 'object') {
            json.meta = Object.create(null);
        }
        json.meta.ubpVersion = 1;
        if (Object.prototype.hasOwnProperty.call(json.meta, 'ubp')) {
            delete json.meta.ubp;
        }
        return json;
    }
};

/**
 * Resolve UBP projects into the current VM-expected JSON shape.
 * @param {object} json Project JSON parsed from project.json.
 * @returns {{json: object, customTypesEnabled: boolean}} Resolved project JSON and feature flag.
 * @throws {Error} Throws when project version is unsupported or a migration step is missing.
 */
const resolveUBPProject = json => {
    const startVersion = getUBPVersion(json);
    if (startVersion === null) {
        return {
            json,
            customTypesEnabled: false
        };
    }
    if (startVersion > UBP_CURRENT_VERSION) {
        throw new Error(`Unsupported UBP version ${startVersion}. This VM supports up to ${UBP_CURRENT_VERSION}.`);
    }

    let resolved = json;
    for (let version = startVersion; version < UBP_CURRENT_VERSION; version++) {
        const resolver = ubpCompatibilityResolvers[version];
        if (typeof resolver !== 'function') {
            throw new Error(`Missing UBP compatibility resolver for version ${version}.`);
        }
        resolved = resolver(resolved) || resolved;
    }

    return {
        json: resolved,
        customTypesEnabled: true
    };
};

/**
 * Test whether parsed project JSON is a UBP project.
 * @param {object} json Project JSON parsed from project.json.
 * @returns {boolean} True if the JSON uses a recognized UBP marker.
 */
const isUBPProject = json => getUBPVersion(json) !== null;

module.exports = {
    getUBPVersion,
    isUBPProject,
    UBP_CURRENT_VERSION,
    resolveUBPProject
};
