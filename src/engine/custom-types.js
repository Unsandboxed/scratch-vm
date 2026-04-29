/* eslint-disable no-use-before-define */

const targetImageData = target => {
    if (!target || typeof target !== 'object') {
        return '';
    }

    let costume = null;
    if (typeof target.getCostumes === 'function') {
        const costumes = target.getCostumes();
        if (Array.isArray(costumes) && costumes.length > 0) {
            const index = Math.max(0, Math.min(costumes.length - 1, Number(target.currentCostume) || 0));
            costume = costumes[index] || costumes[0];
        }
    }

    if (!costume && target.sprite && Array.isArray(target.sprite.costumes) && target.sprite.costumes.length > 0) {
        const index = Math.max(0, Math.min(target.sprite.costumes.length - 1, Number(target.currentCostume) || 0));
        costume = target.sprite.costumes[index] || target.sprite.costumes[0];
    }

    if (!costume) {
        return '';
    }

    if (typeof costume.dataURI === 'string' && /^data:image\//.test(costume.dataURI)) {
        return costume.dataURI;
    }

    const asset = costume.asset;
    if (asset && typeof asset.encodeDataURI === 'function') {
        try {
            const encoded = asset.encodeDataURI();
            if (typeof encoded === 'string') {
                return encoded;
            }
        } catch (e) {
            return '';
        }
    }

    return '';
};

const stringifyValue = value => {
    if (value === null || typeof value === 'undefined') {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(item => stringifyValue(item)).join(', ');
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }

    return String(value);
};

// Used only in the serialize path to extract target properties.
// Detection (deciding *when* to normalize) is handled by the runtime's constructor binding map.
const isTargetLike = value => (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    (typeof value.isStage === 'boolean' || typeof value.isOriginal === 'boolean')
);

const snapshotTarget = target => {
    if (!target || typeof target !== 'object') {
        return Object.create(null);
    }

    const isStage = Boolean(target.isStage);
    return {
        id: typeof target.id === 'string' ? target.id : '',
        name: isStage ? 'Stage' : (
            target.sprite && typeof target.sprite.name === 'string' ? target.sprite.name : ''
        ),
        isStage,
        isClone: typeof target.isOriginal === 'boolean' ? !target.isOriginal : false,
        x: Number(target.x) || 0,
        y: Number(target.y) || 0,
        direction: Number(target.direction) || 90,
        size: Number(target.size) || 100,
        visible: Boolean(target.visible),
        image: targetImageData(target)
    };
};

class CustomType {
    constructor (visualReportType = null, inlineVisualReportMode = 'class') {
        this.visualReportType = visualReportType;
        this.inlineVisualReportMode = inlineVisualReportMode;
    }

    serialize () {
        if (typeof this.toJSON === 'function') {
            return this.toJSON();
        }
        return Object.create(null);
    }

    static deserialize (payload, runtime) {
        return new this(payload, runtime);
    }
}

const attachLiveTarget = (value, target, runtime) => {
    if (!target) {
        return;
    }

    Object.defineProperty(value, '_liveTarget', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: target
    });

    const liveRuntime = runtime || target.runtime || null;
    if (liveRuntime) {
        Object.defineProperty(value, '_liveRuntime', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: liveRuntime
        });
    }
};

const attachRuntime = (value, runtime) => {
    if (!runtime) {
        return;
    }

    Object.defineProperty(value, '_liveRuntime', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: runtime
    });
};

const findVariableById = (runtime, variableId, expectedType = null) => {
    if (!runtime || typeof variableId !== 'string' || !Array.isArray(runtime.targets)) {
        return null;
    }

    for (const target of runtime.targets) {
        if (!target || !target.variables || !Object.prototype.hasOwnProperty.call(target.variables, variableId)) {
            continue;
        }
        const variable = target.variables[variableId];
        if (!expectedType || (variable && variable.type === expectedType)) {
            return variable;
        }
    }

    return null;
};

/**
 * Represents a live or deserialized sprite target as a safe custom type value.
 * Cast.sanitize detects this as non-plain (prototype !== Object.prototype) and calls
 * Symbol.toPrimitive / toString() instead of JSON.stringify.
 * instanceof TargetValue is the canonical check — no duck-typing needed.
 */
class TargetValue extends CustomType {
    constructor (payload, runtime) {
        super('sprite', 'inline');
        // Check if payload is a live RenderedTarget
        const isLiveTarget = payload !== null &&
            typeof payload === 'object' &&
            typeof payload.id === 'string' &&
            typeof payload.toValue === 'function' &&
            (typeof payload.isStage === 'boolean' || typeof payload.isOriginal === 'boolean');

        const spritePayload = toSpritePayload(payload);

        this.spriteId = spritePayload.spriteId;
        this.snapshot = spritePayload.snapshot;
        if (isLiveTarget) {
            attachLiveTarget(this, payload, runtime);
        }
    }

    static deserialize (payload, runtime) {
        const value = new TargetValue(payload, runtime);
        if (!runtime || !value.spriteId || typeof runtime.getTargetById !== 'function') {
            return value;
        }

        const reboundTarget = runtime.getTargetById(value.spriteId);
        if (reboundTarget) {
            attachLiveTarget(value, reboundTarget, runtime);
            value.snapshot = snapshotTarget(reboundTarget);
        }

        return value;
    }

    toJSON () {
        return {
            spriteId: this.spriteId,
            snapshot: this.snapshot
        };
    }

    toString () {
        const name = (this.snapshot && this.snapshot.name) ? String(this.snapshot.name) : 'sprite';
        const indicators = [];

        // Read live target state dynamically so display updates without recreating the value
        let isClone = this.snapshot && this.snapshot.isClone;
        let isDeleted = false;
        if (this._liveTarget) {
            if (typeof this._liveTarget.isOriginal === 'boolean') {
                isClone = !this._liveTarget.isOriginal;
            }
            if (this._liveRuntime) {
                isDeleted = !this._liveRuntime.getTargetById(this._liveTarget.id);
            }
        }

        if (isClone) indicators.push('clone');
        if (isDeleted) indicators.push('deleted');

        if (indicators.length > 0) return `${name} (${indicators.join(', ')})`;
        return name;
    }

    getVisualReportValue () {
        const snapshot = this.snapshot || Object.create(null);
        const liveTarget = this._liveTarget || null;
        const liveRuntime = this._liveRuntime || null;
        const name = liveTarget && liveTarget.sprite && typeof liveTarget.sprite.name === 'string' ?
            liveTarget.sprite.name :
            (typeof snapshot.name === 'string' && snapshot.name ? snapshot.name : 'sprite');
        const isClone = liveTarget && typeof liveTarget.isOriginal === 'boolean' ?
            !liveTarget.isOriginal :
            Boolean(snapshot.isClone);
        const deleted = Boolean(liveTarget && liveRuntime && !liveRuntime.getTargetById(liveTarget.id));

        return {
            spriteId: this.spriteId,
            name,
            isClone,
            deleted,
            image: typeof snapshot.image === 'string' ? snapshot.image : ''
        };
    }

    // eslint-disable-next-line require-jsdoc
    [Symbol.toPrimitive] () {
        return this.toString();
    }

    // visualReport in runtime.js checks for {visualReportType, value} and uses .value as the display payload.
    // Return the semantic sprite payload so Blockly can use the dedicated sprite renderer.
    get value () {
        return this.getVisualReportValue();
    }
}

const toCostumePayload = value => {
    if (value instanceof CostumeValue) {
        return {
            targetId: value.targetId,
            costumeIndex: value.costumeIndex,
            costumeName: value.costumeName,
            assetId: value.assetId,
            image: value.image,
            width: value.width,
            height: value.height
        };
    }

    if (isTargetLike(value)) {
        const costumes = typeof value.getCostumes === 'function' ? value.getCostumes() :
            (value.sprite && Array.isArray(value.sprite.costumes) ? value.sprite.costumes : []);
        const index = Math.max(0, Math.min((costumes.length || 1) - 1, Number(value.currentCostume) || 0));
        const costume = (Array.isArray(costumes) && costumes.length > 0) ? costumes[index] : null;
        return {
            targetId: typeof value.id === 'string' ? value.id : '',
            costumeIndex: index,
            costumeName: costume && typeof costume.name === 'string' ? costume.name : '',
            assetId: costume && typeof costume.assetId === 'string' ? costume.assetId : '',
            image: costume && typeof costume.dataURI === 'string' ? costume.dataURI : targetImageData(value),
            width: costume && Array.isArray(costume.size) ? Number(costume.size[0]) || 0 : 0,
            height: costume && Array.isArray(costume.size) ? Number(costume.size[1]) || 0 : 0
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            targetId: '',
            costumeIndex: 0,
            costumeName: '',
            assetId: '',
            image: '',
            width: 0,
            height: 0
        };
    }

    return {
        targetId: typeof value.targetId === 'string' ? value.targetId : '',
        costumeIndex: Number(value.costumeIndex) || 0,
        costumeName: typeof value.costumeName === 'string' ? value.costumeName : '',
        assetId: typeof value.assetId === 'string' ? value.assetId : '',
        image: typeof value.image === 'string' ? value.image : '',
        width: Number(value.width) || 0,
        height: Number(value.height) || 0
    };
};

class CostumeValue extends CustomType {
    constructor (payload, runtime) {
        super('asset', 'inline');
        const costumePayload = toCostumePayload(payload);
        this.targetId = costumePayload.targetId;
        this.costumeIndex = costumePayload.costumeIndex;
        this.costumeName = costumePayload.costumeName;
        this.assetId = costumePayload.assetId;
        this.image = costumePayload.image;
        this.width = costumePayload.width;
        this.height = costumePayload.height;
        const payloadRuntime = (payload && typeof payload === 'object') ? payload.runtime : null;
        attachRuntime(this, runtime || payloadRuntime || null);
    }

    toJSON () {
        return {
            targetId: this.targetId,
            costumeIndex: this.costumeIndex,
            costumeName: this.costumeName,
            assetId: this.assetId,
            image: this.image,
            width: this.width,
            height: this.height
        };
    }

    toString () {
        return this.costumeName || this.assetId || 'costume';
    }

    get value () {
        return {
            kind: 'costume',
            name: this.costumeName,
            index: this.costumeIndex,
            assetId: this.assetId,
            image: this.image,
            width: this.width,
            height: this.height,
            text: this.toString()
        };
    }
}

const toSoundPayload = value => {
    if (value instanceof SoundValue) {
        return {
            targetId: value.targetId,
            soundIndex: value.soundIndex,
            soundName: value.soundName,
            assetId: value.assetId,
            sampleCount: value.sampleCount,
            rate: value.rate
        };
    }

    if (isTargetLike(value)) {
        const sounds = typeof value.getSounds === 'function' ? value.getSounds() :
            (value.sprite && Array.isArray(value.sprite.sounds) ? value.sprite.sounds : []);
        const index = Math.max(0, Math.min((sounds.length || 1) - 1, 0));
        const sound = (Array.isArray(sounds) && sounds.length > 0) ? sounds[index] : null;
        return {
            targetId: typeof value.id === 'string' ? value.id : '',
            soundIndex: index,
            soundName: sound && typeof sound.name === 'string' ? sound.name : '',
            assetId: sound && typeof sound.assetId === 'string' ? sound.assetId : '',
            sampleCount: sound && Number(sound.sampleCount) ? Number(sound.sampleCount) : 0,
            rate: sound && Number(sound.rate) ? Number(sound.rate) : 0
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            targetId: '',
            soundIndex: 0,
            soundName: '',
            assetId: '',
            sampleCount: 0,
            rate: 0
        };
    }

    return {
        targetId: typeof value.targetId === 'string' ? value.targetId : '',
        soundIndex: Number(value.soundIndex) || 0,
        soundName: typeof value.soundName === 'string' ? value.soundName : '',
        assetId: typeof value.assetId === 'string' ? value.assetId : '',
        sampleCount: Number(value.sampleCount) || 0,
        rate: Number(value.rate) || 0
    };
};

class SoundValue extends CustomType {
    constructor (payload, runtime) {
        super('asset', 'inline');
        const soundPayload = toSoundPayload(payload);
        this.targetId = soundPayload.targetId;
        this.soundIndex = soundPayload.soundIndex;
        this.soundName = soundPayload.soundName;
        this.assetId = soundPayload.assetId;
        this.sampleCount = soundPayload.sampleCount;
        this.rate = soundPayload.rate;
        const payloadRuntime = (payload && typeof payload === 'object') ? payload.runtime : null;
        attachRuntime(this, runtime || payloadRuntime || null);
    }

    toJSON () {
        return {
            targetId: this.targetId,
            soundIndex: this.soundIndex,
            soundName: this.soundName,
            assetId: this.assetId,
            sampleCount: this.sampleCount,
            rate: this.rate
        };
    }

    toString () {
        return this.soundName || this.assetId || 'sound';
    }

    get value () {
        const duration = this.rate > 0 ? this.sampleCount / this.rate : 0;
        return {
            kind: 'sound',
            name: this.soundName,
            index: this.soundIndex,
            assetId: this.assetId,
            rate: this.rate,
            sampleCount: this.sampleCount,
            duration,
            text: this.toString()
        };
    }
}

const toScriptPayload = value => {
    if (value instanceof ScriptValue) {
        return {
            scriptId: value.scriptId,
            source: value.source,
            data: value.data
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            scriptId: '',
            source: typeof value === 'string' ? value : '',
            data: Object.create(null)
        };
    }

    return {
        scriptId: typeof value.scriptId === 'string' ? value.scriptId : '',
        source: typeof value.source === 'string' ? value.source :
            (typeof value.code === 'string' ? value.code : ''),
        data: value.data && typeof value.data === 'object' ? value.data : Object.create(null)
    };
};

class ScriptValue extends CustomType {
    constructor (payload) {
        super('script', 'inline');
        const scriptPayload = toScriptPayload(payload);
        this.scriptId = scriptPayload.scriptId;
        this.source = scriptPayload.source;
        this.data = scriptPayload.data;
    }

    toJSON () {
        return {
            scriptId: this.scriptId,
            source: this.source,
            data: this.data
        };
    }

    toString () {
        return this.source || this.scriptId || 'script';
    }

    get value () {
        return {
            scriptId: this.scriptId,
            source: this.source,
            data: this.data,
            text: this.toString()
        };
    }
}

const toPairPayload = value => {
    if (value instanceof VectorValue || value instanceof PositionValue) {
        return {
            x: Number(value.x) || 0,
            y: Number(value.y) || 0
        };
    }

    if (Array.isArray(value)) {
        return {
            x: Number(value[0]) || 0,
            y: Number(value[1]) || 0
        };
    }

    if (!value || typeof value !== 'object') {
        if (typeof value === 'string') {
            const match = value.trim().match(
                /^\[?\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*[, ]\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*\]?$/
            );
            if (match) {
                return {
                    x: Number(match[1]) || 0,
                    y: Number(match[2]) || 0
                };
            }
        }
        return {
            x: 0,
            y: 0
        };
    }

    return {
        x: Number(value.x) || 0,
        y: Number(value.y) || 0
    };
};

class VectorValue extends CustomType {
    constructor (payload) {
        super('vector', 'value-inline');
        const pairPayload = toPairPayload(payload);
        this.x = pairPayload.x;
        this.y = pairPayload.y;
    }

    toJSON () {
        return {
            x: this.x,
            y: this.y
        };
    }

    toString () {
        return `[${this.x},${this.y}]`;
    }

    get value () {
        return [this.x, this.y];
    }
}

class PositionValue extends CustomType {
    constructor (payload) {
        super('position', 'value-inline');
        const pairPayload = toPairPayload(payload);
        this.x = pairPayload.x;
        this.y = pairPayload.y;
    }

    toJSON () {
        return {
            x: this.x,
            y: this.y
        };
    }

    toString () {
        return `[${this.x},${this.y}]`;
    }

    get value () {
        return [this.x, this.y];
    }
}

const toVariablePayload = value => {
    if (value instanceof VariableValue) {
        return {
            variableId: value.variableId
        };
    }

    if (typeof value === 'string') {
        return {
            variableId: value
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            variableId: ''
        };
    }

    return {
        variableId: typeof value.variableId === 'string' ? value.variableId :
            (typeof value.id === 'string' ? value.id : '')
    };
};

class VariableValue extends CustomType {
    constructor (payload, runtime) {
        super('variable', 'inline');
        const variablePayload = toVariablePayload(payload);
        this.variableId = variablePayload.variableId;
        const payloadRuntime = (payload && typeof payload === 'object') ? payload.runtime : null;
        attachRuntime(this, runtime || payloadRuntime || null);
    }

    toJSON () {
        return {
            variableId: this.variableId
        };
    }

    toString () {
        const variable = findVariableById(this._liveRuntime, this.variableId, '');
        if (!variable) {
            return this.variableId || 'variable';
        }
        return stringifyValue(variable.value);
    }

    get value () {
        const variable = findVariableById(this._liveRuntime, this.variableId, '');
        return {
            id: this.variableId,
            name: variable && typeof variable.name === 'string' ? variable.name : '',
            variableType: 'variable',
            value: variable ? variable.value : null,
            text: this.toString()
        };
    }
}

const toListPayload = value => {
    if (value instanceof ListValue) {
        return {
            listId: value.listId
        };
    }

    if (typeof value === 'string') {
        return {
            listId: value
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            listId: ''
        };
    }

    return {
        listId: typeof value.listId === 'string' ? value.listId :
            (typeof value.id === 'string' ? value.id : '')
    };
};

class ListValue extends CustomType {
    constructor (payload, runtime) {
        super('list', 'inline');
        const listPayload = toListPayload(payload);
        this.listId = listPayload.listId;
        const payloadRuntime = (payload && typeof payload === 'object') ? payload.runtime : null;
        attachRuntime(this, runtime || payloadRuntime || null);
    }

    toJSON () {
        return {
            listId: this.listId
        };
    }

    toString () {
        const listVariable = findVariableById(this._liveRuntime, this.listId, 'list');
        if (!listVariable) {
            return this.listId || 'list';
        }
        return stringifyValue(listVariable.value);
    }

    get value () {
        const listVariable = findVariableById(this._liveRuntime, this.listId, 'list');
        return {
            id: this.listId,
            name: listVariable && typeof listVariable.name === 'string' ? listVariable.name : '',
            variableType: 'list',
            value: listVariable ? listVariable.value : null,
            length: listVariable && Array.isArray(listVariable.value) ? listVariable.value.length : 0,
            text: this.toString()
        };
    }
}

// instanceof is the canonical check — reliable regardless of shape of the serialized payload
const isSpriteValue = value => value instanceof TargetValue;
const isCostumeValue = value => value instanceof CostumeValue;
const isSoundValue = value => value instanceof SoundValue;
const isScriptValue = value => value instanceof ScriptValue;
const isVariableValue = value => value instanceof VariableValue;
const isListValue = value => value instanceof ListValue;
const isVectorValue = value => value instanceof VectorValue;
const isPositionValue = value => value instanceof PositionValue;

// Convenience factory kept for callers that don't import the class directly
const createSpriteValue = (payload, runtime) => TargetValue.deserialize(payload, runtime);
const createCostumeValue = (payload, runtime) => CostumeValue.deserialize(payload, runtime);
const createSoundValue = (payload, runtime) => SoundValue.deserialize(payload, runtime);
const createScriptValue = (payload, runtime) => ScriptValue.deserialize(payload, runtime);
const createVariableValue = (payload, runtime) => VariableValue.deserialize(payload, runtime);
const createListValue = (payload, runtime) => ListValue.deserialize(payload, runtime);
const createVectorValue = (payload, runtime) => VectorValue.deserialize(payload, runtime);
const createPositionValue = (payload, runtime) => PositionValue.deserialize(payload, runtime);

// toSpritePayload must be defined after TargetValue so instanceof check works
const toSpritePayload = value => {
    if (value instanceof TargetValue) {
        return {
            spriteId: value.spriteId,
            snapshot: value.snapshot
        };
    }

    if (isTargetLike(value)) {
        return {
            spriteId: typeof value.id === 'string' ? value.id : '',
            snapshot: snapshotTarget(value)
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            spriteId: '',
            snapshot: Object.create(null)
        };
    }

    if (typeof value.toJSON === 'function') {
        const json = value.toJSON();
        if (json && typeof json === 'object') {
            return {
                spriteId: typeof json.spriteId === 'string' ? json.spriteId : '',
                snapshot: (json.snapshot && typeof json.snapshot === 'object') ? json.snapshot : Object.create(null)
            };
        }
    }

    return {
        spriteId: typeof value.spriteId === 'string' ? value.spriteId : '',
        snapshot: (value.snapshot && typeof value.snapshot === 'object') ? value.snapshot : Object.create(null)
    };
};

const BUILT_IN_CUSTOM_TYPES = Object.freeze({
    sprite: Object.freeze({
        id: 'sprite',
        test: value => isSpriteValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toSpritePayload(value);
        },
        deserialize: (value, runtime) => createSpriteValue(value, runtime)
    }),
    costume: Object.freeze({
        id: 'costume',
        test: value => isCostumeValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toCostumePayload(value);
        },
        deserialize: (value, runtime) => createCostumeValue(value, runtime)
    }),
    sound: Object.freeze({
        id: 'sound',
        test: value => isSoundValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toSoundPayload(value);
        },
        deserialize: (value, runtime) => createSoundValue(value, runtime)
    }),
    script: Object.freeze({
        id: 'script',
        test: value => isScriptValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toScriptPayload(value);
        },
        deserialize: (value, runtime) => createScriptValue(value, runtime)
    }),
    variable: Object.freeze({
        id: 'variable',
        test: value => isVariableValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toVariablePayload(value);
        },
        deserialize: (value, runtime) => createVariableValue(value, runtime)
    }),
    list: Object.freeze({
        id: 'list',
        test: value => isListValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toListPayload(value);
        },
        deserialize: (value, runtime) => createListValue(value, runtime)
    }),
    vector: Object.freeze({
        id: 'vector',
        test: value => isVectorValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toPairPayload(value);
        },
        deserialize: (value, runtime) => createVectorValue(value, runtime)
    }),
    position: Object.freeze({
        id: 'position',
        test: value => isPositionValue(value),
        serialize: value => {
            if (value instanceof CustomType && typeof value.serialize === 'function') {
                return value.serialize();
            }
            return toPairPayload(value);
        },
        deserialize: (value, runtime) => createPositionValue(value, runtime)
    })
});

const BUILT_IN_CUSTOM_TYPE_IDS = Object.freeze(Object.keys(BUILT_IN_CUSTOM_TYPES));

const isBuiltInCustomTypeId = typeId => (
    typeof typeId === 'string' &&
    Object.prototype.hasOwnProperty.call(BUILT_IN_CUSTOM_TYPES, typeId)
);

const getBuiltInCustomType = typeId => {
    if (!isBuiltInCustomTypeId(typeId)) {
        return null;
    }
    return BUILT_IN_CUSTOM_TYPES[typeId];
};

module.exports = {
    BUILT_IN_CUSTOM_TYPES,
    BUILT_IN_CUSTOM_TYPE_IDS,
    isBuiltInCustomTypeId,
    getBuiltInCustomType,
    CustomType,
    TargetValue,
    CostumeValue,
    SoundValue,
    ScriptValue,
    VariableValue,
    ListValue,
    VectorValue,
    PositionValue,
    snapshotTarget,
    toSpritePayload,
    createSpriteValue,
    createCostumeValue,
    createSoundValue,
    createScriptValue,
    createVariableValue,
    createListValue,
    createVectorValue,
    createPositionValue
};
