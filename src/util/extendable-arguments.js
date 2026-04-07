/**
 * Collect ordered values for extendable reporter blocks.
 * Uses predictable generated input names (e.g. NUM, NUM2, OPERAND, OPERAND2).
 * @param {object} args Primitive arguments.
 * @param {Array<string>} preferredPrefixes Prefixes to prioritize.
 * @returns {Array<*>} Ordered argument values.
 */
const getOrderedKeys = (args, preferredPrefixes) => {
    const keys = Object.keys(args).filter(key => key !== 'mutation');
    const parsed = keys.map(key => {
        const match = key.match(/^([A-Z_]+?)(\d+)?$/);
        return {
            key,
            prefix: match ? match[1] : '',
            index: match && match[2] ? parseInt(match[2], 10) : 1
        };
    });

    const preferred = [];
    const used = new Set();
    for (const prefix of preferredPrefixes) {
        const picked = parsed
            .filter(entry => entry.prefix === prefix)
            .sort((a, b) => a.index - b.index || a.key.localeCompare(b.key));
        for (const entry of picked) {
            preferred.push(entry.key);
            used.add(entry.key);
        }
    }

    const remainder = parsed
        .filter(entry => !used.has(entry.key))
        .sort((a, b) => {
            const aUnknown = a.prefix === '';
            const bUnknown = b.prefix === '';
            if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
            if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
            if (a.index !== b.index) return a.index - b.index;
            return a.key.localeCompare(b.key);
        })
        .map(entry => entry.key);

    return preferred.concat(remainder);
};

// Prefixes that correspond to non-value inputs (dummy labels, statement slots).
// These are present in argumentids but should not be treated as value arguments.
const NON_VALUE_PREFIXES = new Set(['LABEL', 'SUBSTACK']);

/**
 * Collect ordered values for extendable reporter blocks.
 * When a `defaultValue` is provided, the block's mutation argumentids are used
 * as the authoritative input list so that empty inputs (not present in args
 * because they have no shadow or connected block) are included with that default
 * rather than silently omitted.
 * @param {object} args Primitive arguments.
 * @param {Array<string>=} preferredPrefixes Prefixes to prioritize.
 * @param {*=} defaultValue Value to use for inputs absent from args.
 *   Pass `undefined` (default) to use only keys already present in args.
 * @returns {Array<*>} Ordered argument values.
 */
const getOrderedExtendableValues = (args, preferredPrefixes = [], defaultValue = undefined) => {
    if (!args || typeof args !== 'object') {
        return [];
    }

    // When a defaultValue is requested, use mutation argumentids as the
    // authoritative key list so empty (unconnected) inputs are not silently
    // dropped.  Without this, boolean ops with no shadow blocks would receive
    // an empty array and vacuously evaluate (e.g. and([]) === true).
    if (defaultValue !== undefined && args.mutation && args.mutation.argumentids) {
        let allIds;
        try {
            allIds = JSON.parse(args.mutation.argumentids);
        } catch (e) {
            allIds = null;
        }

        if (Array.isArray(allIds)) {
            // Filter out non-value-input IDs (LABEL*, SUBSTACK*)
            const valueIds = allIds.filter(id => {
                const match = id.match(/^([A-Z_]+?)\d*$/);
                const prefix = match ? match[1] : id;
                return !NON_VALUE_PREFIXES.has(prefix);
            });

            // Re-use the same ordering logic as getOrderedKeys.
            const parsed = valueIds.map(id => {
                const match = id.match(/^([A-Z_]+?)(\d+)?$/);
                return {
                    key: id,
                    prefix: match ? match[1] : '',
                    index: match && match[2] ? parseInt(match[2], 10) : 1
                };
            });

            const preferred = [];
            const used = new Set();
            for (const prefix of preferredPrefixes) {
                const picked = parsed
                    .filter(entry => entry.prefix === prefix)
                    .sort((a, b) => a.index - b.index || a.key.localeCompare(b.key));
                for (const entry of picked) {
                    preferred.push(entry.key);
                    used.add(entry.key);
                }
            }

            const remainder = parsed
                .filter(entry => !used.has(entry.key))
                .sort((a, b) => {
                    if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
                    if (a.index !== b.index) return a.index - b.index;
                    return a.key.localeCompare(b.key);
                })
                .map(entry => entry.key);

            const orderedIds = preferred.concat(remainder);
            return orderedIds.map(id => (id in args ? args[id] : defaultValue));
        }
    }

    const orderedKeys = getOrderedKeys(args, preferredPrefixes);
    return orderedKeys.map(key => args[key]);
};

module.exports = {
    getOrderedExtendableValues
};