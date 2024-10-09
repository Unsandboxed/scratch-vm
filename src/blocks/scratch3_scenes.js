const Cast = require('../util/cast');

class Scratch3ScenesBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    getMonitored () {
        return {
            scenes_scene: {
                getId: () => 'scene'
            }
        };
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            scenes_switch: this.switchScene,
            scenes_scene: this.getScene
        };
    }

    switchScene (args) {
        const scene = Cast.toString(args.SCENES);
        this.runtime.loadScene(scene);
    }

    getScene () {
        return this.runtime.scene;
    }
}

module.exports = Scratch3ScenesBlocks;
