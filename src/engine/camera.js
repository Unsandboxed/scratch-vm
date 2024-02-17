const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');

/**
 * @fileoverview
 * The camera is an arbitrary object used to
 * tell where the renderer projection should go.
 */

/**
 * Camera: instance of a camera object on the stage.
 */
class Camera {
    constructor(runtime) {
        this.runtime = runtime;

        this.renderer = runtime.renderer;

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
         * Determines whether interpolation is enabled for the camera.
         */
        this.interpolation = null; // null = default to project settings

        /**
         * Interpolation data used by tw-interpolate.
         */
        this.interpolationData = null;
    }

    setXY(x, y) {
        this.x = Cast.toNumber(x);
        this.y = Cast.toNumber(y);
    }

    /**
     * Set the zoom of the camera.
     * @param zoom The new zoom  value.
     */
    setZoom(zoom) {
        this.zoom = Cast.toNumber(zoom);
        if (this.runtime.runtimeOptions.miscLimits) {
            this.zoom = MathUtil.clamp(this.zoom, 10, 300);
        }
    }

    /**
     * Point the camera towards a given direction.
     * @param direction Direction to point the camera.
     */
    setDirection(direction) {
        if (!isFinite(direction)) return;

        this.direction = MathUtil.wrapClamp(direction, -179, 180);
    }

    emitCamreaUpdate() {
        if (!this.renderer) return;
    }
}

module.exports = Camera;
