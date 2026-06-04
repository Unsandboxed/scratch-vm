const JSZip = require('@turbowarp/jszip');
const log = require('../util/log');

const E = {};

const _normalizeZipPath = path => {
    if (typeof path !== 'string') return '';
    return path
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '');
};

const _escapeRegExp = string => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const _findZipFile = (zip, fileNames) => {
    const seen = new Set();
    const normalizedCandidates = [];

    for (const fileName of fileNames) {
        const normalized = _normalizeZipPath(fileName);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        normalizedCandidates.push(normalized);
    }

    for (const normalized of normalizedCandidates) {
        let matched = zip.file(normalized);
        if (matched) return matched;

        // Match the normalized path case-insensitively in case the archive casing differs.
        matched = zip.file(new RegExp(`^${_escapeRegExp(normalized)}$`, 'i'))[0];
        if (matched) return matched;

        // Last resort: match by basename in any folder.
        const fileBaseName = normalized.split('/').pop();
        if (!fileBaseName) continue;
        matched = zip.file(new RegExp(`(^|.*/)${_escapeRegExp(fileBaseName)}$`, 'i'))[0];
        if (matched) return matched;
    }

    return null;
};

/**
 * Deserializes sound from file into storage cache so that it can
 * be loaded into the runtime.
 * @param {object} sound Descriptor for sound from sb3 file
 * @param {Runtime} runtime The runtime containing the storage to cache the sounds in
 * @param {JSZip} zip The zip containing the sound file being described by `sound`
 * @param {string} assetFileName Optional file name for the given asset
 * (sb2 files have filenames of the form [int].[ext],
 * sb3 files have filenames of the form [md5].[ext])
 * @return {Promise} Promise that resolves after the described sound has been stored
 * into the runtime storage cache, the sound was already stored, or an error has
 * occurred.
 */
E.deserializeSound = function (sound, runtime, zip, assetFileName) {
    const defaultFileName = sound.md5;
    const fileCandidates = [assetFileName, defaultFileName];
    const fileName = _normalizeZipPath(assetFileName) || _normalizeZipPath(defaultFileName);
    const storage = runtime.storage;
    if (!storage) {
        log.warn('No storage module present; cannot load sound asset: ', fileName);
        return Promise.resolve(null);
    }

    if (!zip) { // Zip will not be provided if loading project json from server
        return Promise.resolve(null);
    }

    const soundFile = _findZipFile(zip, fileCandidates);

    if (!soundFile) {
        log.error(`Could not find sound file associated with the ${sound.name} sound.`);
        return Promise.resolve(null);
    }

    if (!JSZip.support.uint8array) {
        log.error('JSZip uint8array is not supported in this browser.');
        return Promise.resolve(null);
    }

    const dataFormat = sound.dataFormat.toLowerCase() === 'mp3' ?
        storage.DataFormat.MP3 : storage.DataFormat.WAV;
    return soundFile.async('uint8array').then(data => storage.createAsset(
        storage.AssetType.Sound,
        dataFormat,
        data,
        null,
        true
    ))
        .then(asset => {
            sound.asset = asset;
            sound.assetId = asset.assetId;
            sound.md5 = `${asset.assetId}.${asset.dataFormat}`;
        });
};

/**
 * Deserializes costume from file into storage cache so that it can
 * be loaded into the runtime.
 * @param {object} costume Descriptor for costume from sb3 file
 * @param {Runtime} runtime The runtime containing the storage to cache the costumes in
 * @param {JSZip} zip The zip containing the costume file being described by `costume`
 * @param {string} assetFileName Optional file name for the given asset
 * (sb2 files have filenames of the form [int].[ext],
 * sb3 files have filenames of the form [md5].[ext])
 * @param {string} textLayerFileName Optional file name for the given asset's text layer
 * (sb2 only; files have filenames of the form [int].png)
 * @return {Promise} Promise that resolves after the described costume has been stored
 * into the runtime storage cache, the costume was already stored, or an error has
 * occurred.
 */
E.deserializeCostume = function (costume, runtime, zip, assetFileName, textLayerFileName) {
    const storage = runtime.storage;
    const assetId = costume.assetId;
    const defaultFileName = `${assetId}.${costume.dataFormat}`;
    const fileCandidates = [assetFileName, defaultFileName];
    const fileName = _normalizeZipPath(assetFileName) || _normalizeZipPath(defaultFileName);

    if (!storage) {
        log.warn('No storage module present; cannot load costume asset: ', fileName);
        return Promise.resolve(null);
    }

    if (costume.asset) {
        // When uploading a sprite from an image file, the asset data will be provided
        // @todo Cache the asset data somewhere and pull it out here
        return Promise.resolve(storage.createAsset(
            costume.asset.assetType,
            costume.asset.dataFormat,
            new Uint8Array(Object.keys(costume.asset.data).map(key => costume.asset.data[key])),
            null,
            true
        )).then(asset => {
            costume.asset = asset;
            costume.assetId = asset.assetId;
            costume.md5 = `${asset.assetId}.${asset.dataFormat}`;
        });
    }

    if (!zip) {
        // Zip will not be provided if loading project json from server
        return Promise.resolve(null);
    }

    const costumeFile = _findZipFile(zip, fileCandidates);

    if (!costumeFile) {
        log.error(`Could not find costume file associated with the ${costume.name} costume.`);
        return Promise.resolve(null);
    }
    let assetType = null;
    const costumeFormat = costume.dataFormat.toLowerCase();
    if (costumeFormat === 'svg') {
        assetType = storage.AssetType.ImageVector;
    } else if (['png', 'bmp', 'jpeg', 'jpg', 'gif'].indexOf(costumeFormat) >= 0) {
        assetType = storage.AssetType.ImageBitmap;
    } else {
        log.error(`Unexpected file format for costume: ${costumeFormat}`);
    }
    if (!JSZip.support.uint8array) {
        log.error('JSZip uint8array is not supported in this browser.');
        return Promise.resolve(null);
    }

    // textLayerMD5 exists if there is a text layer, which is a png of text from Scratch 1.4
    // that was opened in Scratch 2.0. In this case, set costume.textLayerAsset.
    let textLayerFilePromise;
    if (costume.textLayerMD5) {
        const textLayerFile = zip.file(textLayerFileName);
        if (!textLayerFile) {
            log.error(`Could not find text layer file associated with the ${costume.name} costume.`);
            return Promise.resolve(null);
        }
        textLayerFilePromise = textLayerFile.async('uint8array')
            .then(data => storage.createAsset(
                storage.AssetType.ImageBitmap,
                'png',
                data,
                costume.textLayerMD5
            ))
            .then(asset => {
                costume.textLayerAsset = asset;
            });
    } else {
        textLayerFilePromise = Promise.resolve(null);
    }

    return Promise.all([textLayerFilePromise,
        costumeFile.async('uint8array')
            .then(data => storage.createAsset(
                assetType,
                // TODO eventually we want to map non-png's to their actual file types?
                costumeFormat,
                data,
                null,
                true
            ))
            .then(asset => {
                costume.asset = asset;
                costume.assetId = asset.assetId;
                costume.md5 = `${asset.assetId}.${asset.dataFormat}`;
            })
    ]);
};

module.exports = E;
