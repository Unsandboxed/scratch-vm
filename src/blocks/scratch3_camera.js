const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');

class Scratch3CameraBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.camera = runtime.camera;
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

    moveToXY (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        this.camera.setXY(x, y);
    }

    changeByXY (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const newX = x + this.runtime.camera.x;
        const newY = y + this.runtime.camera.y;
        this.camera.setXY(newX, newY);
    }

    setX (args, util) {
        const x = Cast.toNumber(args.X);
        this.camera.setXY(x, this.camera.y);
    }

    changeX (args, util) {
        const x = Cast.toNumber(args.X);
        const newX = x + this.runtime.camera.x;
        this.camera.setXY(newX, this.camera.y);
    }

    setY (args, util) {
        const y = Cast.toNumber(args.Y);
        this.camera.setXY(this.camera.x, y);
    }

    changeY (args, util) {
        const y = Cast.toNumber(args.Y);
        const newY = y + this.runtime.camera.y;
        this.camera.setXY(this.camera.x, newY);
    }

    getCameraX (args, util) {
        return this.camera.x;
    }

    getCameraY (args, util) {
        return this.camera.y;
    }
}

module.exports = Scratch3CameraBlocks;
