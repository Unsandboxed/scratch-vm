const EventEmitter = require('events');

class RuntimeConstants extends EventEmitter {
    /**
     * Width of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_WIDTH () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 480;
    }

    /**
     * Height of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_HEIGHT () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 360;
    }

    /**
     * Event name for glowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_ON () {
        return 'SCRIPT_GLOW_ON';
    }

    /**
     * Event name for unglowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_OFF () {
        return 'SCRIPT_GLOW_OFF';
    }

    /**
     * Event name for glowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_ON () {
        return 'BLOCK_GLOW_ON';
    }

    /**
     * Event name for unglowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_OFF () {
        return 'BLOCK_GLOW_OFF';
    }

    /**
     * Event name for a cloud data update
     * to this project.
     * @const {string}
     */
    static get HAS_CLOUD_DATA_UPDATE () {
        return 'HAS_CLOUD_DATA_UPDATE';
    }

    /**
     * Event name for turning on turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_ON () {
        return 'TURBO_MODE_ON';
    }

    /**
     * Event name for turning off turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_OFF () {
        return 'TURBO_MODE_OFF';
    }

    /**
     * Event name for runtime options changing.
     * @const {string}
     */
    static get RUNTIME_OPTIONS_CHANGED () {
        return 'RUNTIME_OPTIONS_CHANGED';
    }

    /**
     * Event name for compiler options changing.
     * @const {string}
     */
    static get COMPILER_OPTIONS_CHANGED () {
        return 'COMPILER_OPTIONS_CHANGED';
    }

    /**
     * Event name for framerate changing.
     * @const {string}
     */
    static get FRAMERATE_CHANGED () {
        return 'FRAMERATE_CHANGED';
    }

    /**
     * Event name for interpolation changing.
     * @const {string}
     */
    static get INTERPOLATION_CHANGED () {
        return 'INTERPOLATION_CHANGED';
    }

    /**
     * Event called before interpolation data is set.
     */
    static get BEFORE_INTERPOLATE () {
        return 'BEFORE_INTERPOLATE';
    }

    /**
     * Event called after interpolation data is set.
     */
    static get AFTER_INTERPOLATE () {
        return 'AFTER_INTERPOLATE';
    }

    /**
     * Event name for stage size changing.
     * @const {string}
     */
    static get STAGE_SIZE_CHANGED () {
        return 'STAGE_SIZE_CHANGED';
    }

    /**
     * Event name for stopping sounds.
     * @const {string}
     */
    static get STOP_ALL_SOUNDS () {
        return 'STOP_ALL_SOUNDS';
    }

    /**
     * Event name for compiler errors.
     * @const {string}
     */
    static get COMPILE_ERROR () {
        return 'COMPILE_ERROR';
    }

    /**
     * Event called before any block is executed.
     */
    static get BEFORE_EXECUTE () {
        return 'BEFORE_EXECUTE';
    }

    /**
     * Event called after every block in the project has been executed.
     */
    static get AFTER_EXECUTE () {
        return 'AFTER_EXECUTE';
    }

    /**
     * Event name for reporting asset download progress. Fired with finished, total
     * @const {string}
     */
    static get ASSET_PROGRESS () {
        return 'ASSET_PROGRESS';
    }

    /**
     * Event name when the project is started (threads may not necessarily be
     * running).
     * @const {string}
     */
    static get PROJECT_START () {
        return 'PROJECT_START';
    }

    /**
     * Event name when the project is paused
     * @const {string}
     */
    static get PROJECT_PAUSE () {
        return 'PROJECT_PAUSE';
    }

    /**
     * Event name when the project is paused
     * @const {string}
     * @deprecated
     */
    static get RUNTIME_PAUSED () {
        return 'RUNTIME_PAUSED';
    }

    /**
     * Event name when the project is unpaused
     * @const {string}
     * @deprecated
     */
    static get RUNTIME_UNPAUSED () {
        return 'RUNTIME_UNPAUSED';
    }

    /**
     * Event name when threads start running.
     * Used by the UI to indicate running status.
     * @const {string}
     */
    static get PROJECT_RUN_START () {
        return 'PROJECT_RUN_START';
    }

    /**
     * Event name when threads stop running
     * Used by the UI to indicate not-running status.
     * @const {string}
     */
    static get PROJECT_RUN_STOP () {
        return 'PROJECT_RUN_STOP';
    }

    /**
     * Event name for project being stopped or restarted by the user.
     * Used by blocks that need to reset state.
     * @const {string}
     */
    static get PROJECT_STOP_ALL () {
        return 'PROJECT_STOP_ALL';
    }

    /**
     * Event name for when the volume is changed
     * @const {string}
     */
    static get VOLUME_CHANGE () {
        return 'VOLUME_CHANGE';
    }

    /**
     * Event name for target being stopped by a stop for target call.
     * Used by blocks that need to stop individual targets.
     * @const {string}
     */
    static get STOP_FOR_TARGET () {
        return 'STOP_FOR_TARGET';
    }

    /**
     * Event name for visual value report.
     * @const {string}
     */
    static get VISUAL_REPORT () {
        return 'VISUAL_REPORT';
    }

    /**
     * Event name for project loaded report.
     * @const {string}
     */
    static get PROJECT_LOADED () {
        return 'PROJECT_LOADED';
    }

    /**
     * Event name for report that a change was made that can be saved
     * @const {string}
     */
    static get PROJECT_CHANGED () {
        return 'PROJECT_CHANGED';
    }

    /**
     * Event name for report that a change was made to an extension in the toolbox.
     * @const {string}
     */
    static get TOOLBOX_EXTENSIONS_NEED_UPDATE () {
        return 'TOOLBOX_EXTENSIONS_NEED_UPDATE';
    }

    /**
     * Event name for camera update report.
     * @const {string}
     */
    static get CAMERA_UPDATE () {
        return 'CAMERA_UPDATE';
    }

    /**
     * Event name for targets update report.
     * @const {string}
     */
    static get TARGETS_UPDATE () {
        return 'TARGETS_UPDATE';
    }

    /**
     * Event name for monitors update.
     * @const {string}
     */
    static get MONITORS_UPDATE () {
        return 'MONITORS_UPDATE';
    }

    /**
     * Event name for block drag update.
     * @const {string}
     */
    static get BLOCK_DRAG_UPDATE () {
        return 'BLOCK_DRAG_UPDATE';
    }

    /**
     * Event name for block drag end.
     * @const {string}
     */
    static get BLOCK_DRAG_END () {
        return 'BLOCK_DRAG_END';
    }

    /**
     * Event name for reporting that an extension was added.
     * @const {string}
     */
    static get EXTENSION_ADDED () {
        return 'EXTENSION_ADDED';
    }

    /**
     * Event name for reporting that an extension has asked for a custom field to be added
     * @const {string}
     */
    static get EXTENSION_FIELD_ADDED () {
        return 'EXTENSION_FIELD_ADDED';
    }

    /**
     * Event name for reporting that an extension has asked for a custom shape type to be added
     * @const {string}
     */
    static get EXTENSION_SHAPE_ADDED () {
        return 'EXTENSION_SHAPE_TYPE_ADDED';
    }

    /**
     * Event name for updating the available set of peripheral devices.
     * This causes the peripheral connection modal to update a list of
     * available peripherals.
     * @const {string}
     */
    static get PERIPHERAL_LIST_UPDATE () {
        return 'PERIPHERAL_LIST_UPDATE';
    }

    /**
     * Event name for when the user picks a bluetooth device to connect to
     * via Companion Device Manager (CDM)
     * @const {string}
     */
    static get USER_PICKED_PERIPHERAL () {
        return 'USER_PICKED_PERIPHERAL';
    }

    /**
     * Event name for reporting that a peripheral has connected.
     * This causes the status button in the blocks menu to indicate 'connected'.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTED () {
        return 'PERIPHERAL_CONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has been intentionally disconnected.
     * This causes the status button in the blocks menu to indicate 'disconnected'.
     * @const {string}
     */
    static get PERIPHERAL_DISCONNECTED () {
        return 'PERIPHERAL_DISCONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has encountered a request error.
     * This causes the peripheral connection modal to switch to an error state.
     * @const {string}
     */
    static get PERIPHERAL_REQUEST_ERROR () {
        return 'PERIPHERAL_REQUEST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral connection has been lost.
     * This causes a 'peripheral connection lost' error alert to display.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTION_LOST_ERROR () {
        return 'PERIPHERAL_CONNECTION_LOST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral has not been discovered.
     * This causes the peripheral connection modal to show a timeout state.
     * @const {string}
     */
    static get PERIPHERAL_SCAN_TIMEOUT () {
        return 'PERIPHERAL_SCAN_TIMEOUT';
    }

    /**
     * Event name to indicate that the microphone is being used to stream audio.
     * @const {string}
     */
    static get MIC_LISTENING () {
        return 'MIC_LISTENING';
    }

    /**
     * Event name for reporting that blocksInfo was updated.
     * @const {string}
     */
    static get BLOCKSINFO_UPDATE () {
        return 'BLOCKSINFO_UPDATE';
    }

    static get BLOCK_UPDATE () {
        return 'BLOCK_UPDATE';
    }

    /**
     * Event name when the runtime tick loop has been started.
     * @const {string}
     */
    static get RUNTIME_STARTED () {
        return 'RUNTIME_STARTED';
    }

    /**
     * Event name when the runtime tick loop has been stopped.
     * @const {string}
     */
    static get RUNTIME_STOPPED () {
        return 'RUNTIME_STOPPED';
    }

    /**
     * Event name when the runtime dispose has been called.
     * @const {string}
     */
    static get RUNTIME_DISPOSED () {
        return 'RUNTIME_DISPOSED';
    }

    /**
     * Event name for reporting that a block was updated and needs to be rerendered.
     * @const {string}
     */
    static get BLOCKS_NEED_UPDATE () {
        return 'BLOCKS_NEED_UPDATE';
    }

    /**
     * Event name when platform name inside a project does not match the runtime.
     */
    static get PLATFORM_MISMATCH () {
        return 'PLATFORM_MISMATCH';
    }

    /**
     * How rapidly we try to step threads by default, in ms.
     */
    static get THREAD_STEP_INTERVAL () {
        // tw: not used, only exists for compatibility
        return 1000 / 60;
    }

    /**
     * In compatibility mode, how rapidly we try to step threads, in ms.
     */
    static get THREAD_STEP_INTERVAL_COMPATIBILITY () {
        // tw: not used, only exists for compatibility
        return 1000 / 30;
    }

    /**
     * How many clones can be created at a time.
     * @const {number}
     */
    static get MAX_CLONES () {
        // tw: clone limit is set per-runtime in runtimeOptions, this is only the initial value
        return 300;
    }
}

module.exports = RuntimeConstants;
