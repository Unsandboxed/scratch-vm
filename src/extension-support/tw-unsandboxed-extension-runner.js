const ScratchCommon = require('./tw-extension-api-common');
const createUnsandboxed = require('./usb-unsandboxed-object');
const createScratchX = require('./tw-scratchx-compatibility-layer');
const AsyncLimiter = require('../util/async-limiter');
const createTranslate = require('./tw-l10n');
const staticFetch = require('../util/tw-static-fetch');

/* eslint-disable require-await */

const E = {};

/**
 * Parse a URL object or return null.
 * @param {string} url
 * @returns {URL|null}
 */
E.parseURL = url => {
    try {
        return new URL(url, location.href);
    } catch (e) {
        return null;
    }
};

/**
 * Sets up the global.Scratch API for an unsandboxed extension.
 * @param {VirtualMachine} vm
 * @param {boolean} pre Whether or not this is a "pre-mature" load
 * @returns {Promise<object[]>} Resolves with a list of extension objects when Scratch.extensions.register is called.
 */
E.setupUnsandboxedExtensionAPI = (vm, pre) => new Promise(resolve => {
    pre = pre || false;
    const extensionObjects = [];
    const register = pre ? (() => {
        throw new Error('Unable to register extension as this is a pre-mature instance.');
    }) : (extensionObject => {
        extensionObjects.push(extensionObject);
        resolve(extensionObjects);
    });

    // Create a new copy of global.Scratch and global.Unsandboxed for each extension
    const Scratch = Object.assign({}, global.Scratch || {}, ScratchCommon);
    Scratch.UnsandboxedMod = createUnsandboxed(vm, pre);
    Scratch.extensions = {
        unsandboxed: true,
        register,
        registerCustomType: (typeId, registration) => vm.runtime.registerCustomType(typeId, registration),
        registerCustomTypeFromClass: (typeId, classConstructor, options) =>
            vm.runtime.registerCustomTypeFromClass(typeId, classConstructor, options),
        unregisterCustomType: typeId => vm.runtime.unregisterCustomType(typeId),
        getCustomTypeIds: () => vm.runtime.getCustomTypeIds()
    };
    Scratch.registerCustomType = Scratch.extensions.registerCustomType;
    Scratch.registerCustomTypeFromClass = Scratch.extensions.registerCustomTypeFromClass;
    Scratch.unregisterCustomType = Scratch.extensions.unregisterCustomType;
    Scratch.getCustomTypeIds = Scratch.extensions.getCustomTypeIds;
    Scratch.vm = vm;
    Scratch.renderer = vm.runtime.renderer;

    Scratch.canFetch = async url => {
        const parsed = E.parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always allow protocols that don't involve a remote request.
        if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
            return true;
        }
        return vm.securityManager.canFetch(parsed.href);
    };

    Scratch.canOpenWindow = async url => {
        const parsed = E.parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canOpenWindow(parsed.href);
    };

    Scratch.canRedirect = async url => {
        const parsed = E.parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canRedirect(parsed.href);
    };

    Scratch.canRecordAudio = async () => vm.securityManager.canRecordAudio();

    Scratch.canRecordVideo = async () => vm.securityManager.canRecordVideo();

    Scratch.canReadClipboard = async () => vm.securityManager.canReadClipboard();

    Scratch.canNotify = async () => vm.securityManager.canNotify();

    Scratch.canGeolocate = async () => vm.securityManager.canGeolocate();

    Scratch.canEmbed = async url => {
        const parsed = E.parseURL(url);
        if (!parsed) {
            return false;
        }
        return vm.securityManager.canEmbed(parsed.href);
    };

    Scratch.canDownload = async (url, name) => {
        const parsed = E.parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canDownload(url, name);
    };

    Scratch.fetch = async (url, options) => {
        const actualURL = url instanceof Request ? url.url : url;

        const staticFetchResult = staticFetch(url);
        if (staticFetchResult) {
            return staticFetchResult;
        }

        if (!await Scratch.canFetch(actualURL)) {
            throw new Error(`Permission to fetch ${actualURL} rejected.`);
        }
        return fetch(url, options);
    };

    Scratch.openWindow = async (url, features) => {
        if (!await Scratch.canOpenWindow(url)) {
            throw new Error(`Permission to open tab ${url} rejected.`);
        }
        // Use noreferrer to prevent new tab from accessing `window.opener`
        const baseFeatures = 'noreferrer';
        features = features ? `${baseFeatures},${features}` : baseFeatures;
        return window.open(url, '_blank', features);
    };

    Scratch.redirect = async url => {
        if (!await Scratch.canRedirect(url)) {
            throw new Error(`Permission to redirect to ${url} rejected.`);
        }
        location.href = url;
    };

    Scratch.download = async (url, name) => {
        if (!await Scratch.canDownload(url, name)) {
            throw new Error(`Permission to download ${name} rejected.`);
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    Scratch.translate = createTranslate(vm);

    const ScratchExtensions = createScratchX(Scratch);

    // We want Scratch.gui even when it is loaded prematurly as it gives access to some fancy API's in the GUI
    vm.emit('CREATE_UNSANDBOXED_EXTENSION_API', Scratch, pre);
    vm.emit('CREATE_USB_API', Scratch.UnsandboxedMod, pre);

    // Polyfill some basic "global" APIs that might be used.
    global.global = global;
    global.globalThis = global;

    if (pre) {
        resolve({Scratch, ScratchExtensions, Unsandboxed: Scratch.UnsandboxedMod});
    } else {
        global.Scratch = Scratch;
        global.ScratchExtensions = ScratchExtensions;
    }
});

/**
 * Disable the existing global.Scratch unsandboxed extension APIs.
 * This helps debug poorly designed extensions.
 */
E.teardownUnsandboxedExtensionAPI = () => {
    // We can assume global.Scratch already exists.
    global.Scratch.extensions.register = () => {
        throw new Error('Too late to register new extensions.');
    };
};

/**
 * Load an unsandboxed extension from an arbitrary URL. This is dangerous.
 * @param {string} extensionURL
 * @param {Virtualmachine} vm
 * @returns {Promise<object[]>} Resolves with a list of extension objects if the extension was loaded successfully.
 */
E.loadUnsandboxedExtension = (extensionURL, vm) => new Promise((resolve, reject) => {
    E.setupUnsandboxedExtensionAPI(vm).then(resolve);

    const script = document.createElement('script');
    script.onerror = () => {
        reject(new Error(`Error in unsandboxed script ${extensionURL}. Check the console for more information.`));
    };
    script.src = extensionURL;
    document.body.appendChild(script);
}).then(objects => {
    E.teardownUnsandboxedExtensionAPI();
    return objects;
});

// Because loading unsandboxed extensions requires messing with global state (global.Scratch),
// only let one extension load at a time.
E.limiter = new AsyncLimiter(E.loadUnsandboxedExtension, 1);
E.load = (extensionURL, vm) => E.limiter.do(extensionURL, vm);

module.exports = E;
