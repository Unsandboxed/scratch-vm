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
        this.runtime.setCamera(x, y);
    }

    changeByXY (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const newX = x + this.runtime.camera.x;
        const newY = y + this.runtime.camera.y;
        this.runtime.setCamera(x, y);
    }

    setX (args, util) {
        const x = Cast.toNumber(args.X);
        this.runtime.setCamera(x);
    }

    changeX (args, util) {
        const x = Cast.toNumber(args.X);
        const newX = x + this.runtime.camera.x;
        this.runtime.setCamera(x);
    }

    setY (args, util) {
        const y = Cast.toNumber(args.Y);
        this.runtime.setCamera(null, y);
    }

    changeY (args, util) {
        const y = Cast.toNumber(args.Y);
        const newY = y + this.runtime.camera.y;
        this.runtime.setCamera(null, y);
    }

    getCameraX (args, util) {
        return this.runtime.camera.x;
    }

    getCameraY (args, util) {
        return this.runtime.camera.y;
    }
}

module.exports = Scratch3CameraBlocks;
