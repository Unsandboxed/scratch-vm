/**
 * @fileoverview File for alllllllllllllllll the exports :3
 */
// "typo" intended.

module.exports = {
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

    ExtensionManager: () => require('./extension-support/extension-manager')
};
