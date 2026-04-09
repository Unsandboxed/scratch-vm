const Cast = require('../util/cast');

class Scratch3CameraBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    getMonitored () {
        return {
            camera_xposition: {
                getId: () => 'xposition'
            },
            camera_yposition: {
                getId: () => 'yposition'
            },
            camera_zoom: {
                getId: () => 'zoom'
            },
            camera_rotation: {
                getId: () => 'rotation'
            }
        };
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            camera_movetoxy: this.moveToXY,
            camera_changebyxy: this.changeByXY,
            camera_setx: this.setX,
            camera_changex: this.changeX,
            camera_sety: this.setY,
            camera_changey: this.changeY,
            camera_setzoom: this.setZoom,
            camera_changezoom: this.changeZoom,
            camera_turnright: this.turnRight,
            camera_turnleft: this.turnLeft,
            camera_pointindirection: this.pointInDirection,
            camera_xposition: this.getCameraX,
            camera_yposition: this.getCameraY,
            camera_zoom: this.getCameraZoom,
            camera_rotation: this.getCameraRotation
        };
    }

    moveToXY (args) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        this.runtime.camera.setXY(x, y);
    }

    changeByXY (args) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const newX = x + this.runtime.camera.x;
        const newY = y + this.runtime.camera.y;
        this.runtime.camera.setXY(newX, newY);
    }

    setX (args) {
        const x = Cast.toNumber(args.X);
        this.runtime.camera.setXY(x, this.runtime.camera.y);
    }

    changeX (args) {
        const x = Cast.toNumber(args.X);
        const newX = x + this.runtime.camera.x;
        this.runtime.camera.setXY(newX, this.runtime.camera.y);
    }

    setY (args) {
        const y = Cast.toNumber(args.Y);
        this.runtime.camera.setXY(this.runtime.camera.x, y);
    }

    changeY (args) {
        const y = Cast.toNumber(args.Y);
        const newY = y + this.runtime.camera.y;
        this.runtime.camera.setXY(this.runtime.camera.x, newY);
    }

    setZoom (args) {
        const zoom = Cast.toNumber(args.ZOOM);
        this.runtime.camera.setZoom(zoom);
    }

    changeZoom (args) {
        const zoom = Cast.toNumber(args.ZOOM);
        const newZoom = zoom + this.runtime.camera.zoom;
        this.runtime.camera.setZoom(newZoom);
    }

    turnRight (args) {
        const degrees = Cast.toNumber(args.DEGREES);
        const newRotation = this.runtime.camera.direction + degrees;
        this.runtime.camera.setDirection(newRotation);
    }

    turnLeft (args) {
        const degrees = Cast.toNumber(args.DEGREES);
        const newRotation = this.runtime.camera.direction - degrees;
        this.runtime.camera.setDirection(newRotation);
    }

    pointInDirection (args) {
        const direction = Cast.toNumber(args.DIRECTION);
        this.runtime.camera.setDirection(direction);
    }

    getCameraX () {
        return this.runtime.camera.x;
    }

    getCameraY () {
        return this.runtime.camera.y;
    }

    getCameraZoom () {
        return this.runtime.camera.zoom;
    }

    getCameraRotation () {
        return this.runtime.camera.direction;
    }
}

module.exports = Scratch3CameraBlocks;
