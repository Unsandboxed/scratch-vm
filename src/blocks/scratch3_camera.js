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
            camera_xposition: this.getCameraX,
            camera_yposition: this.getCameraY
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

    getCameraX () {
        return this.runtime.camera.x;
    }

    getCameraY () {
        return this.runtime.camera.y;
    }
}

module.exports = Scratch3CameraBlocks;
