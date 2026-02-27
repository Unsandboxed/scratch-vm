/**
 * @fileoverview File for alllllllllllllllll the exports :3
 */
// "typo" intended.

const _cache = {};

module.exports = {
    _cache,

    // eslint-disable-next-line arrow-body-style
    superSecret: () => {
        console.trace('meow meow im a cow');

        // eslint-disable-next-line no-eval
        return eval('__webpack_require__');
    },

    platform: require('./engine/tw-platform'),

    VirtualMachine: () => require('./index'),
    compiler: () => require('./compiler/exports'),

    Dispatch: {
        central: () => require('./dispatch/central-dispatch'),
        worker: () => require('./dispatch/worker-dispatch'),
        shared: () => require('./dispatch/shared-dispatch')
    },
    engine: {
        adapter: () => require('./engine/adapter'),
        Blocks: () => require('./engine/blocks'),
        Camera: () => require('./engine/camera'),
        Profiler: () => require('./engine/profiler'),
        Runtime: () => require('./engine/runtime'),
        Sequencer: () => require('./engine/sequencer'),
        StageLayering: () => require('./engine/stage-layering'),
        Target: () => require('./engine/target'),
        Thread: () => require('./engine/thread'),
        FontManager: () => require('./engine/tw-font-manager'),
        FrameLoop: () => require('./engine/tw-frame-loop'),
        interpolate: () => require('./engine/tw-interpolate'),

        Compiler: () => require('./engine/usb-compiler'),

        Sprite: () => require('./sprites/sprite'),
        RenderedTarget: () => require('./sprites/rendered-target')
    },

    load: {
        costume: () => require('./import/load-costume'),
        sound: () => require('./import/load-sound')
    },

    io: {
        JSONRPC: () => require('./util/jsonrpc'),
        ScratchLinkWebsocket: () => require('./util/scratch-link-websocket'),
        BLE: () => require('./io/ble'),
        BT: () => require('./io/bt'),
        Clock: () => require('./io/clock'),
        Cloud: () => require('./io/cloud'),
        Keyboard: () => require('./io/keyboard'),
        Mouse: () => require('./io/mouse'),
        MouseWheel: () => require('./io/mouseWheel'),
        UserData: () => require('./io/userData'),
        Video: () => require('./io/video')
    },

    limiter: {
        async: () => require('./util/async-limiter'),
        rate: () => require('./util/rateLimiter')
    },

    util: {
        Base64: () => require('./util/base64-util'),
        Math: () => require('./util/math-util'),
        String: () => require('./util/string-util'),
        Asset: () => require('./util/tw-asset-util'),

        Cast: () => require('./util/cast'),
        Timer: () => require('./util/timer'),
        TaskQueue: () => require('./util/task-queue'),

        fetch: {
            withTimeout: () => require('./util/fetch-with-timeout'),
            staticly: () => require('./util/tw-static-fetch')
        }
    },

    help: {
        log: () => require('./util/log'),
        uid: () => require('./util/uid'),
        xmlEscape: () => require('./util/xml-escape'),
        maybeFormatMessage: () => require('./util/maybe-format-message')
    },

    serialization: {
        deserializeAssets: () => require('./serialization/deserialize-assets'),
        sb2: () => () => require('./serialization/sb2'),
        sb3: () => () => require('./serialization/sb3'),
        assets: () => require('./serialization/serialize-assets'),
        compress: () => require('./serialization/tw-compress-sb3'),
        costumeImportExport: () => require('./serialization/tw-costume-import-export')
    },

    playground: () => {
        throw new Error('nuh uh');
    },
    cli: () => {
        throw new Error('nuh uh');
    },

    ExtensionManager: () => require('./extension-support/extension-manager'),

    modules: {
        immutable: () => require('immutable'),
        tw_json: () => require('@turbowarp/json'),
        tw_jszip: () => require('@turbowarp/jszip'),
        tw_nanolog: () => require('@turbowarp/nanolog'),
        tw_scratchsvgrenderer: () => require('@turbowarp/scratch-svg-renderer'),
        buffer: () => require('buffer'),
        minimatch: () => require('minimatch'),
        json5: () => require('json5'),
        punycode: () => require('punycode'),
        zlib: () => require('zlib'),
        decodeHTML: () => require('decode-html'),
        vernier_godirect: () => require('@vernier/godirect'),
        htmlparser2: () => require('htmlparser2'),
        format_message: () => require('format-message'),
        uuid: () => require('uuid'),
        diff_match_patch: () => require('diff-match-patch'),
        scratch_parser: () => require('scratch-parser'),
        scratch_sb1_converter: () => require('scratch-sb1-converter'),
        scratch_translate_extension_languages: () => require('scratch-translate-extension-languages'),
        base64_js: () => require('base64-js')
    },

    flow: () => {
        if (_cache.flow) return _cache.flow;

        const lodash = require('lodash').noConflict();
        const lodashFp = require('lodash/fp').noConflict();
        const fpts = require('fp-ts');
        const futil = require('futil');
        const ramda = require('ramda');

        if (global._ && global._.noConflict) {
            global._.noConflict();
        }

        _cache.flow = {
            lodash,
            lodashFp,
            fpts,
            futil,
            ramda
        };
        return _cache.flow;
    }
};
