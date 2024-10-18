const EventEmitter = require('events');

const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Runtime = require('./runtime');

/**
 * @fileoverview
 * The camera is an arbitrary object used to
 * describe properties of the renderer projection.
 */

/**
 * Camera: instance of a camera object on the stage.
 */
class Camera extends EventEmitter {
    constructor (runtime) {
        super();

        this.runtime = runtime;

        /**
         * Scratch X coordinate. Currently should range from -240 to 240.
         * @type {Number}
         */
        this.x = 0;

        /**
         * Scratch Y coordinate. Currently should range from -180 to 180.
         * @type {number}
         */
        this.y = 0;

        /**
         * Scratch direction. Currently should range from -179 to 180.
         * @type {number}
         */
        this.direction = 90;

        /**
         * Zoom of camera as a percentage. Similar to size.
         * @type {number}
         */
        this.zoom = 100;

        /**
         * Determines whether the camera values will affect the projection.
         * @type {boolean}
         */
        this.enabled = true;

        /**
         * Interpolation data used by tw-interpolate.
         */
        this.interpolationData = null;
    }

    /**
     * Event name for the camera updating.
     * @const {string}
     */
    static get CAMERA_UPDATE () {
        return 'CAMERA_UPDATE';
    }

    /**
     * Set the X and Y values of the camera.
     * @param x The x coordinate.
     * @param y The y coordinate.
     */
    setXY (x, y) {
        this.x = Cast.toNumber(x);
        this.y = Cast.toNumber(y);

        this.emitCameraUpdate();
    }

    /**
     * Set the zoom of the camera.
     * @param zoom The new zoom value.
     */
    setZoom (zoom) {
        this.zoom = Cast.toNumber(zoom);
        if (this.runtime.runtimeOptions.miscLimits) {
            this.zoom = MathUtil.clamp(this.zoom, 10, 300);
        }

        this.emitCameraUpdate();
    }

    /**
     * Point the camera towards a given direction.
     * @param direction Direction to point the camera.
     */
    setDirection (direction) {
        if (!isFinite(direction)) return;

        this.direction = MathUtil.wrapClamp(direction, -179, 180);

        this.emitCameraUpdate();
    }

    /**
     * Set whether the camera will affect the projection.
     * @param enabled The new enabled state.
     */
    setEnabled (enabled) {
        this.enabled = enabled;
    }

    /**
     * Tell the renderer to update the rendered camera state.
     */
    emitCameraUpdate () {
        if (!this.runtime.renderer) return;

        this.runtime.renderer._updateCamera(
            this.x,
            this.y,
            this.direction,
            this.zoom
        );

        this.runtime.emit("CAMERA_UPDATE", this);

        this.runtime.requestRedraw();
    }

    /**
     * Reset all camera properties.
     */
    reset () {
        this.x = 0;
        this.y = 0;
        this.direction = 90;
        this.zoom = 100;
        this.enabled = true;
    }
}

module.exports = Camera;
