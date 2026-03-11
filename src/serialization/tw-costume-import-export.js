// We want to preserve the rotation center of exported SVGs when they are later imported.
// Unfortunately, the SVG itself does not have sufficient information to accomplish this.
// Instead we must add a small amount of extra information to the end of exported SVGs
// that can be read on import.

const E = {};

// Adding this comment in scratch-paint is not a viable approach because the user can
// open projects not made with TurboWarp and we want costumes exported from there to
// have their center saved even if they haven't been edited.

if (typeof TextEncoder === 'undefined') {
    E._TextEncoder = require('text-encoding').TextEncoder;
    E._TextDecoder = require('text-encoding').TextDecoder;
} else {
    E._TextEncoder = TextEncoder;
    E._TextDecoder = TextDecoder;
}

// Using literal HTML comments tokens will cause this script to be very hard to inline in
// a <script> element, so we'll instead do this terrible hack which the minifier probably
// won't be able to optimize away.
E.HTML_COMMENT_START = `<!${'-'.repeat(2)}`;
E.HTML_COMMENT_END = `${'-'.repeat(2)}>`;

E.regex = new RegExp(
    `${E.HTML_COMMENT_START}rotationCenter:(-?[\\d\\.]+):(-?[\\d\\.]+)${E.HTML_COMMENT_END}$`
);

/**
 * @param {string} svgString SVG source
 * @returns {[number, number]|null} The detected rotation center of the SVG, if any.
 */
E.parseVectorMetadata = svgString => {
    // TODO: see if this is slow on large strings
    const match = svgString.match(E.regex);
    if (!match) {
        return null;
    }

    const detectedX = +match[1];
    const detectedY = +match[2];
    if (Number.isNaN(detectedX) || Number.isNaN(detectedY)) {
        return null;
    }

    return [detectedX, detectedY];
};

/**
 * @param {Costume} costume scratch-vm costume object
 * @returns {Uint8Array} Binary data to export
 */
E.exportCostume = costume => {
    /** @type {Uint8Array} */
    const originalData = costume.asset.data;

    if (costume.dataFormat !== 'svg') {
        return originalData;
    }

    let decodedData = new (E._TextDecoder)().decode(originalData);

    // It's okay that the regex isn't global because it can only match one item anyways.
    decodedData = decodedData.replace(E.regex, '');

    const centerX = costume.rotationCenterX;
    const centerY = costume.rotationCenterY;
    const extraData = `${E.HTML_COMMENT_START}rotationCenter:${centerX}:${centerY}${E.HTML_COMMENT_END}`;
    decodedData += extraData;

    return new (E._TextEncoder)().encode(decodedData);
};

module.exports = E;
