class Resolvers {
    /**
     * @param {VirtualMachine} vm VM instance.
     */
    constructor (vm) {
        this.vm = vm;
        /**
         * @type {Runtime}
         */
        this.runtime = vm.runtime;

        // simple alias for ease of use.
        this.cfg = Resolvers.CONFIGS;
    }

    static CONFIGS = {
        selfAndStage: {
            myself: true,
            stage: true
        },
        stageAndClones: {
            stage: true,
            clones: true
        },
        selfAndClones: {
            myself: true,
            clones: true
        },
        selfAndStageAndClones: {
            myself: true,
            stage: true,
            clones: true
        },
        self: {
            myself: true
        },
        stage: {
            stage: true
        },
        allClones: {
            clones: true
        },
        allButClones: {
            clones: false
        },
        allButStage: {
            stage: false
        },
        allButSelf: {
            myself: false
        },

        selfAndMouse: {
            myself: true,
            mouse: true
        },
        selfAndCamera: {
            myself: true,
            camera: true
        },
        selfAndMouseAndCamera: {
            myself: true,
            mouse: true,
            camera: true
        },
        cameraAndMouse: {
            camera: true,
            mouse: true
        },

        mouse: {
            mouse: true
        },
        camera: {
            camera: true
        }
    };

    xyd (config, target) {
        if (config.mouse && target === '_mouse_') {
            return {
                IS_MOUSE: true,

                x: this.runtime.ioDevices.mouse.getScratchX(),
                y: this.runtime.ioDevices.mouse.getScratchX(),
                dir: 90,
                czoom: this.runtime.camera.zoom
            };
        } else if (config.camera && target === '_camera_') {
            return {
                IS_CAMERA: true,

                x: this.runtime.camera.x,
                y: this.runtime.camera.y,
                dir: this.runtime.camera.direction,
                czoom: this.runtime.camera.zoom
            };
        }

        if (config.stage && target === '_stage_') {
            return {
                IS_STAGE: true,

                x: 0,
                y: 0,
                dir: 90,
                czoom: this.runtime.camera.zoom
            };
        }

        let t;
        if (config.myself && target === '_myself_') {
            t = this.vm.editingTarget;
        } else if (config.byId) {
            t = this.runtime.getTargetById(target);
        } else {
            t = this.runtime.getSpriteTargetByName(target);
        }

        if (!t) return {FAILED: true};

        return {
            x: t.getX(),
            y: t.getY(),
            dir: t.getDirection(),
            czoom: this.runtime.camera.zoom
        };
    }

    target (config, target) {
        if (config.myself && target === '_myself_') {
            return this.vm.editingTarget || {FAILED: true};
        } else if (config.stage && target === '_stage_') {
            return this.runtime.getTargetForStage() || {FAILED: true};
        }

        if (config.byId) {
            return this.runtime.getTargetById(target) || {FAILED: true};
        }
        return this.runtime.getSpriteTargetByName(target) || {FAILED: true};
    }
    clonesOf (config, target) {
        const t = this.target(config, target);

        if (t.FAILED || !t.sprite || !t.sprite.clones) return [];

        // The first target is always empty.
        return t.sprite.clones.slice(1, Infinity);
    }
    targets (config) {
        if (!config) {
            return this.runtime.targets.slice(0, Infinity);
        }
        return this.runtime.targets.filter(target => {
            if (config.clones === false && !target.isOriginal) {
                return false;
            }
            if (config.clones === true && target.isOriginal) {
                return false;
            }
            if (config.stage === false && target.isStage) {
                return false;
            }
            if (config.myself === false && target.id === this.vm.editingTarget.id) {
                return false;
            }
            return true;
        });
    }
}

module.exports = Resolvers;
