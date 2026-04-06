/**
 * @fileoverview
 * An SB3 serializer and deserializer. Parses provided
 * JSON and then generates all needed scratch-vm runtime structures.
 */

const Cast = require('../util/cast');
const RuntimeConstants = require('../../src/engine/runtime-constants');
const Blocks = require('../engine/blocks');
const Sprite = require('../sprites/sprite');
const Variable = require('../engine/variable');
const Comment = require('../engine/comment');
const MonitorRecord = require('../engine/monitor-record');
const StageLayering = require('../engine/stage-layering');
const log = require('../util/log');
const uid = require('../util/uid');
const MathUtil = require('../util/math-util');
const StringUtil = require('../util/string-util');
const VariableUtil = require('../util/variable-util');
const ReadonlyArray = require('../util/ReadonlyArray');
const compress = require('./tw-compress-sb3');

const {loadCostume} = require('../import/load-costume.js');
const {loadSound} = require('../import/load-sound.js');
const {deserializeCostume, deserializeSound} = require('./deserialize-assets.js');

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @typedef {object} ImportedProject
 * @property {Array.<Target>} targets - the imported Scratch 3.0 target objects.
 * @property {ImportedExtensionsInfo} extensions - the ID of each extension actually used by this project.
 */

/**
 * @typedef {object} ImportedExtensionsInfo
 * @property {Set.<string>} extensionIDs - the ID of each extension actually in use by blocks in this project.
 * @property {Map.<string, string>} extensionURLs - map of ID => URL from project metadata. May not match extensionIDs.
 */

const E = {};

// Constants used during serialization and deserialization
E.INPUT_SAME_BLOCK_SHADOW = 1; // unobscured shadow
E.INPUT_BLOCK_NO_SHADOW = 2; // no shadow
E.INPUT_DIFF_BLOCK_SHADOW = 3; // obscured shadow
// There shouldn't be a case where block is null, but shadow is present...

// Constants used during deserialization of an SB3 file
E.CORE_EXTENSIONS = [
    'argument',
    'camera',
    'colour',
    'control',
    'data',
    'event',
    'looks',
    'math',
    'motion',
    'operator',
    'procedures',
    'sensing',
    'sound',
    'string'
];

// Constants referring to 'primitive' blocks that are usually shadows,
// or in the case of variables and lists, appear quite often in projects
// math_number
E.MATH_NUM_PRIMITIVE = 4; // there's no reason these constants can't collide
// math_positive_number
E.POSITIVE_NUM_PRIMITIVE = 5; // with the above, but removing duplication for clarity
// math_whole_number
E.WHOLE_NUM_PRIMITIVE = 6;
// math_integer
E.INTEGER_NUM_PRIMITIVE = 7;
// math_angle
E.ANGLE_NUM_PRIMITIVE = 8;
// colour_picker
E.COLOR_PICKER_PRIMITIVE = 9;
// text
E.TEXT_PRIMITIVE = 10;
// event_broadcast_menu
E.BROADCAST_PRIMITIVE = 11;
// data_variable
E.VAR_PRIMITIVE = 12;
// data_listcontents
E.LIST_PRIMITIVE = 13;

// Map block opcodes to the above primitives and the name of the field we can use
// to find the value of the field
E.primitiveOpcodeInfoMap = {
    math_number: [E.MATH_NUM_PRIMITIVE, 'NUM'],
    math_positive_number: [E.POSITIVE_NUM_PRIMITIVE, 'NUM'],
    math_whole_number: [E.WHOLE_NUM_PRIMITIVE, 'NUM'],
    math_integer: [E.INTEGER_NUM_PRIMITIVE, 'NUM'],
    math_angle: [E.ANGLE_NUM_PRIMITIVE, 'NUM'],
    colour_picker: [E.COLOR_PICKER_PRIMITIVE, 'COLOUR'],
    text: [E.TEXT_PRIMITIVE, 'TEXT'],
    event_broadcast_menu: [E.BROADCAST_PRIMITIVE, 'BROADCAST_OPTION']
    /**
     * USB: Serializing non-shadow blocks as primitives has grave consequences,
     * such as removing comments and possibly more data we don't know about yet.
     */
    // data_variable: [E.VAR_PRIMITIVE, 'VARIABLE'],
    // data_listcontents: [E.LIST_PRIMITIVE, 'LIST']
};

// We don't enforce this limit, but Scratch does, so we need to handle it for compatibility.
E.UPSTREAM_MAX_COMMENT_LENGTH = 8000;

/**
 * Serializes primitives described above into a more compact format
 * @param {object} block the block to serialize
 * @return {array} An array representing the information in the block,
 * or null if the given block is not one of the primitives described above.
 */
E.serializePrimitiveBlock = function (block) {
    // Returns an array represeting a primitive block or null if not one of
    // the primitive types above
    if (hasOwnProperty.call(E.primitiveOpcodeInfoMap, block.opcode)) {
        const primitiveInfo = E.primitiveOpcodeInfoMap[block.opcode];
        const primitiveConstant = primitiveInfo[0];
        const fieldName = primitiveInfo[1];
        const field = block.fields[fieldName];
        const primitiveDesc = [primitiveConstant, field.value];
        if (block.opcode === 'event_broadcast_menu') {
            primitiveDesc.push(field.id);
        } else if (
            block.opcode === 'data_variable' ||
            block.opcode === 'data_listcontents' ||
            block.opcode === 'data_listarraycontents'
        ) {
            primitiveDesc.push(field.id);
            if (block.topLevel) {
                primitiveDesc.push(block.x ? Math.round(block.x) : 0);
                primitiveDesc.push(block.y ? Math.round(block.y) : 0);
            }
        }
        return primitiveDesc;
    }
    return null;
};

/**
 * Serializes the inputs field of a block in a compact form using
 * constants described above to represent the relationship between the
 * inputs of this block (e.g. if there is an unobscured shadow, an obscured shadow
 * -- a block plugged into a droppable input -- or, if there is just a block).
 * Based on this relationship, serializes the ids of the block and shadow (if present)
 *
 * @param {object} inputs The inputs to serialize
 * @return {object} An object representing the serialized inputs
 */
E.serializeInputs = function (inputs) {
    const obj = Object.create(null);
    for (const inputName in inputs) {
        if (!hasOwnProperty.call(inputs, inputName)) continue;
        // if block and shadow refer to the same block, only serialize one
        if (inputs[inputName].block === inputs[inputName].shadow) {
            // has block and shadow, and they are the same
            obj[inputName] = [
                E.INPUT_SAME_BLOCK_SHADOW,
                inputs[inputName].block
            ];
        } else if (inputs[inputName].shadow === null) {
            // does not have shadow
            obj[inputName] = [
                E.INPUT_BLOCK_NO_SHADOW,
                inputs[inputName].block
            ];
        } else {
            // block and shadow are both present and are different
            obj[inputName] = [
                E.INPUT_DIFF_BLOCK_SHADOW,
                inputs[inputName].block,
                inputs[inputName].shadow
            ];
        }
    }
    return obj;
};

/**
 * Serialize the fields of a block in a more compact form.
 * @param {object} fields The fields object to serialize
 * @return {object} An object representing the serialized fields
 */
E.serializeFields = function (fields) {
    const obj = Object.create(null);
    for (const fieldName in fields) {
        if (!hasOwnProperty.call(fields, fieldName)) continue;
        obj[fieldName] = [fields[fieldName].value];
        if (Object.prototype.hasOwnProperty.call(fields[fieldName], 'id')) {
            obj[fieldName].push(fields[fieldName].id);
        }
    }
    return obj;
};

/**
 * Serialize the given block in the SB3 format with some compression of inputs,
 * fields, and primitives.
 * @param {object} block The block to serialize
 * @return {object | array} A serialized representation of the block. This is an
 * array if the block is one of the primitive types described above or an object,
 * if not.
 */
E.serializeBlock = function (block) {
    const serializedPrimitive = E.serializePrimitiveBlock(block);
    if (serializedPrimitive) return serializedPrimitive;
    // If serializedPrimitive is null, proceed with serializing a non-primitive block
    const obj = Object.create(null);
    obj.opcode = block.opcode;
    // NOTE: this is extremely important to serialize even if null;
    // not serializing `next: null` results in strange behavior with block
    // execution
    obj.next = block.next;
    obj.parent = block.parent;
    obj.inputs = E.serializeInputs(block.inputs);
    obj.fields = E.serializeFields(block.fields);
    obj.shadow = block.shadow;
    if (block.topLevel) {
        obj.topLevel = true;
        obj.x = block.x ? Math.round(block.x) : 0;
        obj.y = block.y ? Math.round(block.y) : 0;
    } else {
        obj.topLevel = false;
    }
    if (block.mutation) {
        obj.mutation = block.mutation;
    }
    if (block.comment) {
        obj.comment = block.comment;
    }
    return obj;
};

/**
 * Compresses the serialized inputs replacing block/shadow ids that refer to
 * one of the primitives with the primitive itself. E.g.
 *
 * blocks: {
 *      aUidForMyBlock: {
 *          inputs: {
 *               MYINPUT: [1, 'aUidForAnUnobscuredShadowPrimitive']
 *          }
 *      },
 *      aUidForAnUnobscuredShadowPrimitive: [4, 10]
 *      // the above is a primitive representing a 'math_number' with value 10
 * }
 *
 * becomes:
 *
 * blocks: {
 *      aUidForMyBlock: {
 *          inputs: {
 *               MYINPUT: [1, [4, 10]]
 *          }
 *      }
 * }
 * Note: this function modifies the given blocks object in place
 * @param {object} block The block with inputs to compress
 * @param {objec} blocks The object containing all the blocks currently getting serialized
 * @return {object} The serialized block with compressed inputs
 */
E.compressInputTree = function (block, blocks) {
    // This is the second pass on the block
    // so the inputs field should be an object of key - array pairs
    const serializedInputs = block.inputs;
    for (const inputName in serializedInputs) {
        // don't need to check for hasOwnProperty because of how we constructed
        // inputs
        const currInput = serializedInputs[inputName];
        // traverse currInput skipping the first element, which describes whether the block
        // and shadow are the same
        for (let i = 1; i < currInput.length; i++) {
            if (!currInput[i]) continue; // need this check b/c block/shadow can be null
            const blockOrShadowID = currInput[i];
            // replace element of currInput directly
            // (modifying input block directly)
            const blockOrShadow = blocks[blockOrShadowID];
            if (Array.isArray(blockOrShadow)) {
                currInput[i] = blockOrShadow;
                // Modifying blocks in place!
                delete blocks[blockOrShadowID];
            }
        }
    }
    return block;
};

/**
 * Get sanitized non-core extension ID for a given sb3 opcode.
 * Note that this should never return a URL. If in the future the SB3 loader supports loading extensions by URL, this
 * ID should be used to (for example) look up the extension's full URL from a table in the SB3's JSON.
 * @param {!string} opcode The opcode to examine for extension.
 * @return {?string} The extension ID, if it exists and is not a core extension.
 */
E.getExtensionIdForOpcode = function (opcode) {
    // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
    const index = opcode.indexOf('_');
    const forbiddenSymbols = /[^\w-]/g;
    const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
    if (E.CORE_EXTENSIONS.indexOf(prefix) === -1) {
        if (prefix !== '') return prefix;
    }
};

/**
 * @param {Set<string>|string[]} extensionIDs Project extension IDs
 * @param {Runtime} runtime
 * @returns {Record<string, string>|null} extension ID -> URL map, or null if no custom extensions.
 */
E.getExtensionURLsToSave = (extensionIDs, runtime) => {
    // Extension manager only exists when runtime is wrapped by VirtualMachine
    if (!runtime.extensionManager) {
        return null;
    }

    // We'll save the extensions in the format:
    // {
    //   "extensionid": "https://...",
    //   "otherid": "https://..."
    // }
    // Which lets the VM know which URLs correspond to which IDs, which is useful when the project
    // is being loaded. For example, if the extension is eventually converted to a builtin extension
    // or if it is already loaded, then it doesn't need to fetch the script again.
    const extensionURLs = runtime.extensionManager.getExtensionURLs();
    const toSave = {};
    for (const extension of extensionIDs) {
        const url = extensionURLs[extension];
        if (typeof url === 'string') {
            toSave[extension] = url;
        }
    }
    if (Object.keys(toSave).length === 0) {
        return null;
    }
    return toSave;
};

/**
 * Serialize the given blocks object (representing all the blocks for the target
 * currently being serialized.)
 * @param {object} blocks The blocks to be serialized
 * @return {Array} An array of the serialized blocks with compressed inputs and
 * compressed primitives and the list of all extension IDs present
 * in the serialized blocks.
 */
E.serializeBlocks = function (blocks) {
    const obj = Object.create(null);
    const extensionIDs = new Set();
    for (const blockID in blocks) {
        if (!Object.prototype.hasOwnProperty.call(blocks, blockID)) continue;
        obj[blockID] = E.serializeBlock(blocks[blockID], blocks);
        const extensionID = E.getExtensionIdForOpcode(blocks[blockID].opcode);
        if (extensionID) {
            extensionIDs.add(extensionID);
        }
    }
    // once we have completed a first pass, do a second pass on block inputs
    for (const blockID in obj) {
        // don't need to do the hasOwnProperty check here since we
        // created an object that doesn't get extra properties/functions
        const serializedBlock = obj[blockID];
        // caution, this function deletes parts of this object in place as
        // it's traversing it
        obj[blockID] = E.compressInputTree(serializedBlock, obj);
        // second pass on connecting primitives to serialized inputs directly
    }
    // Do one last pass and remove any top level shadows (these are caused by
    // a bug: LLK/scratch-vm#1011, and this pass should be removed once that is
    // completely fixed)
    for (const blockID in obj) {
        const serializedBlock = obj[blockID];
        // If the current block is serialized as a primitive (e.g. it's an array
        // instead of an object), AND it is not one of the top level primitives
        // e.g. variable getter or list getter, then it should be deleted as it's
        // a shadow block, and there are no blocks that reference it, otherwise
        // they would have been compressed in the last pass)
        if (Array.isArray(serializedBlock) &&
            [E.VAR_PRIMITIVE, E.LIST_PRIMITIVE].indexOf(serializedBlock[0]) < 0) {
            log.warn(`Found an unexpected top level primitive with block ID: ${
                blockID}; deleting it from serialized blocks.`);
            delete obj[blockID];
        }
    }
    return [obj, Array.from(extensionIDs)];
};

/**
 * @param {unknown} blocks Output of serializeStandaloneBlocks
 * @returns {{blocks: Block[], extensionURLs: Map<string, string>}}
 */
E.deserializeStandaloneBlocks = blocks => {
    // deep clone to ensure it's safe to modify later
    blocks = JSON.parse(JSON.stringify(blocks));

    if (blocks.extensionURLs) {
        const extensionURLs = new Map();
        for (const [id, url] of Object.entries(blocks.extensionURLs)) {
            extensionURLs.set(id, url);
        }
        return {
            blocks: blocks.blocks,
            extensionURLs
        };
    }

    // Vanilla Scratch format is just a list of block objects
    return {
        blocks,
        extensionURLs: new Map()
    };
};

/**
 * @param {Block[]} blocks List of block objects.
 * @param {Runtime} runtime Runtime
 * @returns {object} Something that can be understood by deserializeStandaloneBlocks
 */
E.serializeStandaloneBlocks = (blocks, runtime) => {
    const extensionIDs = new Set();
    for (const block of blocks) {
        const extensionID = E.getExtensionIdForOpcode(block.opcode);
        if (extensionID) {
            extensionIDs.add(extensionID);
        }
    }
    const extensionURLs = E.getExtensionURLsToSave(extensionIDs, runtime);
    if (extensionURLs) {
        return {
            blocks,
            // same format as project.json
            extensionURLs: extensionURLs
        };
    }
    // Vanilla Scratch always just uses the block array as-is. To reduce compatibility concerns
    // we too will use that when possible.
    return blocks;
};

/**
 * Serialize the given costume.
 * @param {object} costume The costume to be serialized.
 * @return {object} A serialized representation of the costume.
 */
E.serializeCostume = function (costume) {
    const obj = Object.create(null);
    obj.name = costume.name;

    const costumeToSerialize = costume.broken || costume;

    obj.bitmapResolution = costumeToSerialize.bitmapResolution;
    obj.dataFormat = costumeToSerialize.dataFormat.toLowerCase();

    obj.assetId = costumeToSerialize.assetId;

    // serialize this property with the name 'md5ext' because that's
    // what it's actually referring to. TODO runtime objects need to be
    // updated to actually refer to this as 'md5ext' instead of 'md5'
    // but that change should be made carefully since it is very
    // pervasive
    obj.md5ext = costumeToSerialize.md5;

    obj.rotationCenterX = costumeToSerialize.rotationCenterX;
    obj.rotationCenterY = costumeToSerialize.rotationCenterY;

    return obj;
};

/**
 * Serialize the given sound.
 * @param {object} sound The sound to be serialized.
 * @return {object} A serialized representation of the sound.
 */
E.serializeSound = function (sound) {
    const obj = Object.create(null);
    obj.name = sound.name;

    const soundToSerialize = sound.broken || sound;

    obj.assetId = soundToSerialize.assetId;
    obj.dataFormat = soundToSerialize.dataFormat.toLowerCase();
    obj.format = soundToSerialize.format;
    obj.rate = soundToSerialize.rate;
    obj.sampleCount = soundToSerialize.sampleCount;
    // serialize this property with the name 'md5ext' because that's
    // what it's actually referring to. TODO runtime objects need to be
    // updated to actually refer to this as 'md5ext' instead of 'md5'
    // but that change should be made carefully since it is very
    // pervasive
    obj.md5ext = soundToSerialize.md5;
    return obj;
};

/**
 * Serialize the given variables object.
 * @param {object} variables The variables to be serialized.
 * @return {object} A serialized representation of the variables. They get
 * separated by type to compress the representation of each given variable and
 * reduce duplicate information.
 */
E.serializeVariables = function (variables) {
    const obj = Object.create(null);
    // separate out variables into types at the top level so we don't have
    // keep track of a type for each
    obj.variables = Object.create(null);
    obj.lists = Object.create(null);
    obj.broadcasts = Object.create(null);
    for (const varId in variables) {
        const v = variables[varId];
        if (v.type === Variable.BROADCAST_MESSAGE_TYPE) {
            obj.broadcasts[varId] = v.value; // name and value is the same for broadcast msgs
            continue;
        }
        if (v.type === Variable.LIST_TYPE) {
            obj.lists[varId] = [v.name, v.value, v.locked];
            continue;
        }

        // otherwise should be a scalar type
        obj.variables[varId] = [v.name, v.value];
        // only scalar vars have the potential to be cloud vars
        if (v.isCloud) obj.variables[varId].push(true);
    }
    return obj;
};

E.serializeComments = function (comments) {
    const obj = Object.create(null);
    for (const commentId in comments) {
        if (!Object.prototype.hasOwnProperty.call(comments, commentId)) continue;
        const comment = comments[commentId];

        const serializedComment = Object.create(null);
        serializedComment.blockId = comment.blockId;
        serializedComment.x = comment.x;
        serializedComment.y = comment.y;
        serializedComment.width = comment.width;
        serializedComment.height = comment.height;
        serializedComment.minimized = comment.minimized;

        if (comment.text.length > E.UPSTREAM_MAX_COMMENT_LENGTH) {
            // Upstream's scratch-parser will refuse to load projects if the text is too long, so to maximize
            // compatibility and minimize redundancy we'll store a truncated version in .text and the rest in
            // another field
            serializedComment.text = comment.text.substring(0, E.UPSTREAM_MAX_COMMENT_LENGTH);
            serializedComment.extraText = comment.text.substring(E.UPSTREAM_MAX_COMMENT_LENGTH);
        } else {
            serializedComment.text = comment.text;
        }

        obj[commentId] = serializedComment;
    }
    return obj;
};

E.serializeFrames = function (frames) {
    const obj = Object.create(null);
    for (const frameId in frames) {
        if (!Object.prototype.hasOwnProperty.call(frames, frameId)) continue;
        const frame = frames[frameId];
        if (!frame) continue;

        const serializedFrame = Object.create(null);
        serializedFrame.x = frame.x;
        serializedFrame.y = frame.y;
        serializedFrame.width = frame.width;
        serializedFrame.height = frame.height;
        serializedFrame.title = frame.title;
        serializedFrame.color = frame.color;
        serializedFrame.minimized = Boolean(frame.minimized);
        serializedFrame.locked = Boolean(frame.locked);

        obj[frameId] = serializedFrame;
    }
    return obj;
};

/**
 * Serialize the given target. Only serialize properties that are necessary
 * for saving and loading this target.
 * @param {object} target The target to be serialized.
 * @param {Set} extensions A set of extensions to add extension IDs to
 * @return {object} A serialized representation of the given target.
 */
E.serializeTarget = function (target, extensions) {
    const obj = Object.create(null);
    let targetExtensions = [];
    obj.isStage = target.isStage;
    obj.name = obj.isStage ? 'Stage' : target.name;
    const vars = E.serializeVariables(target.variables);
    obj.variables = vars.variables;
    obj.lists = vars.lists;
    obj.broadcasts = vars.broadcasts;
    [obj.blocks, targetExtensions] = E.serializeBlocks(target.blocks);
    obj.comments = E.serializeComments(target.comments);
    obj.frames = E.serializeFrames(target.frames || {});

    // TODO remove this check/patch when (#1901) is fixed
    if (target.currentCostume < 0 || target.currentCostume >= target.costumes.length) {
        log.warn(`currentCostume property for target ${target.name} is out of range`);
        target.currentCostume = MathUtil.clamp(target.currentCostume, 0, target.costumes.length - 1);
    }

    obj.currentCostume = target.currentCostume;
    obj.costumes = target.costumes.map(E.serializeCostume);
    obj.sounds = target.sounds.map(E.serializeSound);
    if (Object.prototype.hasOwnProperty.call(target, 'volume')) obj.volume = target.volume;
    if (Object.prototype.hasOwnProperty.call(target, 'layerOrder')) obj.layerOrder = target.layerOrder;
    if (obj.isStage) { // Only the stage should have these properties
        if (Object.prototype.hasOwnProperty.call(target, 'tempo')) {
            obj.tempo = target.tempo;
        }
        if (Object.prototype.hasOwnProperty.call(target, 'videoTransparency')) {
            obj.videoTransparency = target.videoTransparency;
        }
        if (Object.prototype.hasOwnProperty.call(target, 'videoState')) {
            obj.videoState = target.videoState;
        }
        if (Object.prototype.hasOwnProperty.call(target, 'textToSpeechLanguage')) {
            obj.textToSpeechLanguage = target.textToSpeechLanguage;
        }
    } else { // The stage does not need the following properties, but sprites should
        obj.visible = target.visible;
        obj.x = target.x;
        obj.y = target.y;
        obj.size = target.size;
        obj.direction = target.direction;
        obj.draggable = target.draggable;
        obj.rotationStyle = target.rotationStyle;
    }

    // Add found extensions to the extensions object
    targetExtensions.forEach(extensionId => {
        extensions.add(extensionId);
    });
    return obj;
};

/**
 * @param {Record<string, unknown>} extensionStorage extensionStorage object
 * @param {Set<string>} extensions extension IDs
 * @returns {Record<string, unknown>|null}
 */
E.serializeExtensionStorage = (extensionStorage, extensions) => {
    const result = {};
    let isEmpty = true;
    for (const [key, value] of Object.entries(extensionStorage)) {
        if (extensions.has(key) && value !== null && typeof value !== 'undefined') {
            isEmpty = false;
            result[key] = extensionStorage[key];
        }
    }
    if (isEmpty) {
        return null;
    }
    return result;
};

E.getSimplifiedLayerOrdering = function (targets) {
    const layerOrders = targets.map(t => t.getLayerOrder());
    return MathUtil.reducedSortOrdering(layerOrders);
};

E.serializeMonitors = function (monitors, runtime, extensions) {
    // Monitors position is always stored as position from top-left corner in 480x360 stage.
    const xOffset = (runtime.stageWidth - 480) / 2;
    const yOffset = (runtime.stageHeight - 360) / 2;
    return monitors.valueSeq()
        // Don't include hidden monitors from extensions
        // https://github.com/LLK/scratch-vm/issues/2331
        .filter(monitorData => {
            const extensionID = E.getExtensionIdForOpcode(monitorData.opcode);
            if (!extensionID) {
                // Native block, always safe
                return true;
            }
            if (monitorData.visible) {
                extensions.add(extensionID);
                return true;
            }
            return false;
        })
        .map(monitorData => {
            const serializedMonitor = {
                id: monitorData.id,
                mode: monitorData.mode,
                opcode: monitorData.opcode,
                params: monitorData.params,
                spriteName: monitorData.spriteName,
                value: Array.isArray(monitorData.value) ? [] : 0,
                // value: monitorData.value,
                width: monitorData.width,
                height: monitorData.height,
                x: monitorData.x - xOffset,
                y: monitorData.y - yOffset,
                visible: monitorData.visible
            };
            if (monitorData.mode === 'list') {
                serializedMonitor.locked = monitorData.locked;
            } else {
                serializedMonitor.sliderMin = monitorData.sliderMin;
                serializedMonitor.sliderMax = monitorData.sliderMax;
                serializedMonitor.isDiscrete = monitorData.isDiscrete;
            }
            return serializedMonitor;
        });
};

/**
 * Serializes the specified VM runtime.
 * @param {!Runtime} runtime VM runtime instance to be serialized.
 * @param {string=} targetId Optional target id if serializing only a single target
 * @return {object} Serialized runtime instance.
 */
E.serialize = function (runtime, targetId, {allowOptimization = true} = {}) {
    // Fetch targets
    const obj = Object.create(null);
    // Create extension set to hold extension ids found while serializing targets
    const extensions = new Set();

    const originalTargetsToSerialize = targetId ?
        [runtime.getTargetById(targetId)] :
        runtime.targets.filter(target => target.isOriginal);

    const layerOrdering = E.getSimplifiedLayerOrdering(originalTargetsToSerialize);

    const flattenedOriginalTargets = originalTargetsToSerialize.map(t => t.toJSON());

    // If the renderer is attached, and we're serializing a whole project (not a sprite)
    // add a temporary layerOrder property to each target.
    if (runtime.renderer && !targetId) {
        flattenedOriginalTargets.forEach((t, index) => {
            t.layerOrder = layerOrdering[index];
        });
    }

    const serializedTargets = flattenedOriginalTargets.map(t => E.serializeTarget(t, extensions))
        .map((serialized, index) => {
            // can't serialize extensionStorage until the list of used extensions is fully known
            const target = originalTargetsToSerialize[index];
            const targetExtensionStorage = E.serializeExtensionStorage(
                target.store.unsafe$getExtensionStorage(),
                extensions
            );
            if (targetExtensionStorage) {
                serialized.extensionStorage = targetExtensionStorage;
            }
            serialized.projectStorage = target.store.unsafe$getProjectStorage();
            return serialized;
        });

    const fonts = runtime.fontManager.serializeJSON();

    if (targetId) {
        const target = serializedTargets[0];
        if (extensions.size) {
            // Vanilla Scratch doesn't include extensions in sprites, so don't add this if it's not needed
            target.extensions = Array.from(extensions);
        }
        const extensionURLs = E.getExtensionURLsToSave(extensions, runtime);
        if (extensionURLs) {
            target.extensionURLs = extensionURLs;
        }
        if (fonts) {
            target.customFonts = fonts;
        }
        return serializedTargets[0];
    }

    const globalExtensionStorage = E.serializeExtensionStorage(runtime.store.unsafe$getExtensionStorage(), extensions);
    if (globalExtensionStorage) {
        obj.extensionStorage = globalExtensionStorage;
    }
    obj.projectStorage = runtime.store.unsafe$getProjectStorage();

    obj.targets = serializedTargets;

    obj.monitors = E.serializeMonitors(runtime.getMonitorState(), runtime, extensions);

    obj.extensions = Array.from(extensions);
    const extensionURLs = E.getExtensionURLsToSave(extensions, runtime);
    if (extensionURLs) {
        obj.extensionURLs = extensionURLs;
    }

    if (fonts) {
        obj.customFonts = fonts;
    }

    // Assemble metadata
    const meta = Object.create(null);
    meta.semver = '3.0.0';
    // TW: There isn't a good reason to put the full version number in the json, so we don't.
    meta.vm = '0.2.0';
    if (runtime.origin) {
        meta.origin = runtime.origin;
    }

    // Attach full user agent string to metadata if available
    meta.agent = '';
    // TW: Never include full user agent to slightly improve user privacy
    // if (typeof navigator !== 'undefined') meta.agent = navigator.userAgent;

    // TW: Attach copy of platform information
    meta.platform = Object.assign({}, runtime.platform);

    // Assemble payload and return
    obj.meta = meta;

    if (allowOptimization) {
        compress(obj);
    }

    return obj;
};

/**
 * Deserialize a block input descriptors. This is either a
 * block id or a serialized primitive, e.g. an array
 * (see serializePrimitiveBlock function).
 * @param {string | array} inputDescOrId The block input descriptor to be serialized.
 * @param {string} parentId The id of the parent block for this input block.
 * @param {boolean} isShadow Whether or not this input block is a shadow.
 * @param {object} blocks The entire blocks object currently in the process of getting serialized.
 * @return {object} The deserialized input descriptor.
 */
E.deserializeInputDesc = function (inputDescOrId, parentId, isShadow, blocks) {
    if (!Array.isArray(inputDescOrId)) return inputDescOrId;
    const primitiveObj = Object.create(null);
    const newId = uid();
    primitiveObj.id = newId;
    primitiveObj.next = null;
    primitiveObj.parent = parentId;
    primitiveObj.shadow = isShadow;
    primitiveObj.inputs = Object.create(null);
    // need a reference to parent id
    switch (inputDescOrId[0]) {
    case E.MATH_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.POSITIVE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_positive_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.WHOLE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_whole_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.INTEGER_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_integer';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.ANGLE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_angle';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.COLOR_PICKER_PRIMITIVE: {
        primitiveObj.opcode = 'colour_picker';
        primitiveObj.fields = {
            COLOUR: {
                name: 'COLOUR',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.TEXT_PRIMITIVE: {
        primitiveObj.opcode = 'text';
        primitiveObj.fields = {
            TEXT: {
                name: 'TEXT',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.BROADCAST_PRIMITIVE: {
        primitiveObj.opcode = 'event_broadcast_menu';
        primitiveObj.fields = {
            BROADCAST_OPTION: {
                name: 'BROADCAST_OPTION',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.BROADCAST_MESSAGE_TYPE
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case E.VAR_PRIMITIVE: {
        primitiveObj.opcode = 'data_variable';
        primitiveObj.fields = {
            VARIABLE: {
                name: 'VARIABLE',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.SCALAR_TYPE
            }
        };
        if (inputDescOrId.length > 3) {
            primitiveObj.topLevel = true;
            primitiveObj.x = inputDescOrId[3];
            primitiveObj.y = inputDescOrId[4];
        }
        break;
    }
    case E.LIST_PRIMITIVE: {
        primitiveObj.opcode = 'data_listcontents';
        primitiveObj.fields = {
            LIST: {
                name: 'LIST',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.LIST_TYPE
            }
        };
        if (inputDescOrId.length > 3) {
            primitiveObj.topLevel = true;
            primitiveObj.x = inputDescOrId[3];
            primitiveObj.y = inputDescOrId[4];
        }
        break;
    }
    default: {
        log.error(`Found unknown primitive type during deserialization: ${JSON.stringify(inputDescOrId)}`);
        return null;
    }
    }
    blocks[newId] = primitiveObj;
    return newId;
};

/**
 * Deserialize the given block inputs.
 * @param {object} inputs The inputs to deserialize.
 * @param {string} parentId The block id of the parent block
 * @param {object} blocks The object representing the entire set of blocks currently
 * in the process of getting deserialized.
 * @return {object} The deserialized and uncompressed inputs.
 */
E.deserializeInputs = function (inputs, parentId, blocks) {
    // Explicitly not using Object.create(null) here
    // because we call prototype functions later in the vm
    const obj = {};
    for (const inputName in inputs) {
        if (!hasOwnProperty.call(inputs, inputName)) continue;
        const inputDescArr = inputs[inputName];
        // If this block has already been deserialized (it's not an array) skip it
        if (!Array.isArray(inputDescArr)) continue;
        let block = null;
        let shadow = null;
        const blockShadowInfo = inputDescArr[0];
        if (blockShadowInfo === E.INPUT_SAME_BLOCK_SHADOW) {
            // block and shadow are the same id, and only one is provided
            block = shadow = E.deserializeInputDesc(inputDescArr[1], parentId, true, blocks);
        } else if (blockShadowInfo === E.INPUT_BLOCK_NO_SHADOW) {
            block = E.deserializeInputDesc(inputDescArr[1], parentId, false, blocks);
        } else { // assume INPUT_DIFF_BLOCK_SHADOW
            block = E.deserializeInputDesc(inputDescArr[1], parentId, false, blocks);
            shadow = E.deserializeInputDesc(inputDescArr[2], parentId, true, blocks);
        }
        obj[inputName] = {
            name: inputName,
            block: block,
            shadow: shadow
        };
    }
    return obj;
};

/**
 * Deserialize the given block fields.
 * @param {object} fields The fields to be deserialized
 * @return {object} The deserialized and uncompressed block fields.
 */
E.deserializeFields = function (fields) {
    // Explicitly not using Object.create(null) here
    // because we call prototype functions later in the vm
    const obj = {};
    for (const fieldName in fields) {
        if (!hasOwnProperty.call(fields, fieldName)) continue;
        const fieldDescArr = fields[fieldName];
        // If this block has already been deserialized (it's not an array) skip it
        if (!Array.isArray(fieldDescArr)) continue;
        obj[fieldName] = {
            name: fieldName,
            value: fieldDescArr[0]
        };
        if (fieldDescArr.length > 1) {
            obj[fieldName].id = fieldDescArr[1];
        }
        if (fieldName === 'BROADCAST_OPTION') {
            obj[fieldName].variableType = Variable.BROADCAST_MESSAGE_TYPE;
        } else if (fieldName === 'VARIABLE') {
            obj[fieldName].variableType = Variable.SCALAR_TYPE;
        } else if (fieldName === 'LIST') {
            obj[fieldName].variableType = Variable.LIST_TYPE;
        }
    }
    return obj;
};

/**
 * Covnert serialized INPUT and FIELD primitives back to hydrated block templates.
 * Should be able to deserialize a format that has already been deserialized.  The only
 * "east" path to adding new targets/code requires going through deserialize, so it should
 * work with pre-parsed deserialized blocks.
 *
 * @param {object} blocks Serialized SB3 "blocks" property of a target. Will be mutated.
 * @return {object} input is modified and returned
 */
E.deserializeBlocks = function (blocks) {
    for (const blockId in blocks) {
        if (!Object.prototype.hasOwnProperty.call(blocks, blockId)) {
            continue;
        }
        const block = blocks[blockId];
        if (Array.isArray(block)) {
            // this is one of the primitives
            // delete the old entry in object.blocks and replace it w/the
            // deserialized object
            delete blocks[blockId];
            E.deserializeInputDesc(block, null, false, blocks);
            continue;
        }
        block.id = blockId; // add id back to block since it wasn't serialized
        block.inputs = E.deserializeInputs(block.inputs, blockId, blocks);
        block.fields = E.deserializeFields(block.fields);
    }
    return blocks;
};


/**
 * Parse the assets of a single "Scratch object" and load them. This
 * preprocesses objects to support loading the data for those assets over a
 * network while the objects are further processed into Blocks, Sprites, and a
 * list of needed Extensions.
 * @param {!object} object From-JSON "Scratch object:" sprite, stage, watcher.
 * @param {!Runtime} runtime Runtime object to load all structures into.
 * @param {JSZip} zip Sb3 file describing this project (to load assets from)
 * @return {?{costumePromises:Array.<Promise>,soundPromises:Array.<Promise>,soundBank:SoundBank}}
 * Object of arrays of promises for asset objects used in Sprites. As well as a
 * SoundBank for the sound assets. null for unsupported objects.
 */
E.parseScratchAssets = function (object, runtime, zip) {
    if (!Object.prototype.hasOwnProperty.call(object, 'name')) {
        // Watcher/monitor - skip this object until those are implemented in VM.
        // @todo
        return Promise.resolve(null);
    }

    const assets = {
        costumePromises: null,
        soundPromises: null,
        soundBank: runtime.audioEngine && runtime.audioEngine.createBank()
    };

    // Costumes from JSON.
    assets.costumePromises = (object.costumes || []).map(costumeSource => {
        // @todo: Make sure all the relevant metadata is being pulled out.
        const costume = {
            // costumeSource only has an asset if an image is being uploaded as
            // a sprite
            asset: costumeSource.asset,
            assetId: costumeSource.assetId,
            skinId: null,
            name: costumeSource.name,
            bitmapResolution: costumeSource.bitmapResolution,
            rotationCenterX: costumeSource.rotationCenterX,
            rotationCenterY: costumeSource.rotationCenterY
        };
        const dataFormat =
            costumeSource.dataFormat ||
            (costumeSource.assetType && costumeSource.assetType.runtimeFormat) || // older format
            'png'; // if all else fails, guess that it might be a PNG
        const costumeMd5Ext = Object.prototype.hasOwnProperty.call(costumeSource, 'md5ext') ?
            costumeSource.md5ext : `${costumeSource.assetId}.${dataFormat}`;
        costume.md5 = costumeMd5Ext;
        costume.dataFormat = dataFormat;
        // deserializeCostume should be called on the costume object we're
        // creating above instead of the source costume object, because this way
        // we're always loading the 'sb3' representation of the costume
        // any translation that needs to happen will happen in the process
        // of building up the costume object into an sb3 format
        return runtime.wrapAssetRequest(() => deserializeCostume(costume, runtime, zip)
            .then(() => loadCostume(costumeMd5Ext, costume, runtime)));
        // Only attempt to load the costume after the deserialization
        // process has been completed
    });
    // Sounds from JSON
    assets.soundPromises = (object.sounds || []).map(soundSource => {
        const sound = {
            assetId: soundSource.assetId,
            format: soundSource.format,
            rate: soundSource.rate,
            sampleCount: soundSource.sampleCount,
            name: soundSource.name,
            // TODO we eventually want this property to be called md5ext,
            // but there are many things relying on this particular name at the
            // moment, so this translation is very important
            md5: soundSource.md5ext,
            dataFormat: soundSource.dataFormat,
            data: null
        };
        // deserializeSound should be called on the sound object we're
        // creating above instead of the source sound object, because this way
        // we're always loading the 'sb3' representation of the costume
        // any translation that needs to happen will happen in the process
        // of building up the costume object into an sb3 format
        return runtime.wrapAssetRequest(() => deserializeSound(sound, runtime, zip)
            .then(() => loadSound(sound, runtime, assets.soundBank)));
        // Only attempt to load the sound after the deserialization
        // process has been completed.
    });

    return assets;
};

/**
 * Parse a single "Scratch object" and create all its in-memory VM objects.
 * @param {!object} object From-JSON "Scratch object:" sprite, stage, watcher.
 * @param {!Runtime} runtime Runtime object to load all structures into.
 * @param {ImportedExtensionsInfo} extensions - (in/out) parsed extension information will be stored here.
 * @param {JSZip} zip Sb3 file describing this project (to load assets from)
 * @param {object} assets - Promises for assets of this scratch object grouped
 *   into costumes and sounds
 * @return {!Promise.<Target>} Promise for the target created (stage or sprite), or null for unsupported objects.
 */
E.parseScratchObject = function (object, runtime, extensions, zip, assets) {
    if (!Object.prototype.hasOwnProperty.call(object, 'name')) {
        // Watcher/monitor - skip this object until those are implemented in VM.
        // @todo
        return Promise.resolve(null);
    }

    // Global proccodes found in the second pass that need to be added
    const globalProccodes = [];

    // Blocks container for this object.
    const blocks = new Blocks(runtime);

    // @todo: For now, load all Scratch objects (stage/sprites) as a Sprite.
    const sprite = new Sprite(blocks, runtime);

    // Sprite/stage name from JSON.
    if (Object.prototype.hasOwnProperty.call(object, 'name')) {
        sprite.name = object.name;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'blocks')) {
        E.deserializeBlocks(object.blocks);
        // Take a second pass to create objects and add extensions
        for (const blockId in object.blocks) {
            if (!Object.prototype.hasOwnProperty.call(object.blocks, blockId)) continue;
            const blockJSON = object.blocks[blockId];
            if (
                blockJSON.opcode === 'procedures_prototype' &&
                (blockJSON.mutation && Cast.toBooleanSimple(blockJSON.mutation.global))
            ) {
                globalProccodes.push(blockJSON.mutation.proccode);
            }
            blocks.createBlock(blockJSON);

            // If the block is from an extension, record it.
            const extensionID = E.getExtensionIdForOpcode(blockJSON.opcode);
            if (extensionID) {
                extensions.extensionIDs.add(extensionID);
            }
        }
    }
    // Costumes from JSON.
    const {costumePromises} = assets;
    // Sounds from JSON
    const {soundBank, soundPromises} = assets;
    // Create the first clone, and load its run-state from JSON.
    const target = sprite.createClone(object.isStage ? StageLayering.BACKGROUND_LAYER : StageLayering.SPRITE_LAYER);
    // Load target properties from JSON.
    if (Object.prototype.hasOwnProperty.call(object, 'tempo')) {
        target.tempo = object.tempo;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'volume')) {
        target.volume = object.volume;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'videoTransparency')) {
        target.videoTransparency = object.videoTransparency;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'videoState')) {
        target.videoState = object.videoState;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'textToSpeechLanguage')) {
        target.textToSpeechLanguage = object.textToSpeechLanguage;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'variables')) {
        for (const varId in object.variables) {
            const variable = object.variables[varId];
            // A variable is a cloud variable if:
            // - the project says it's a cloud variable, and
            // - it's a stage variable, and
            // - the runtime can support another cloud variable
            const isCloud = (variable.length === 3) && variable[2] &&
                object.isStage && runtime.canAddCloudVariable();
            const newVariable = new Variable(
                varId, // var id is the index of the variable desc array in the variables obj
                variable[0], // name of the variable
                Variable.SCALAR_TYPE, // type of the variable
                isCloud
            );
            if (isCloud) runtime.addCloudVariable();
            newVariable.value = variable[1];
            target.variables[newVariable.id] = newVariable;
        }
    }
    if (Object.prototype.hasOwnProperty.call(object, 'lists')) {
        for (const listId in object.lists) {
            const list = object.lists[listId];
            const newList = new Variable(
                listId,
                list[0],
                Variable.LIST_TYPE,
                false
            );
            newList.value = list[1];
            newList.locked = list[2] || false;
            target.variables[newList.id] = newList;

            if (newList.locked) {
                newList.value = ReadonlyArray.from(newList.value);
            }
        }
    }
    if (Object.prototype.hasOwnProperty.call(object, 'broadcasts')) {
        for (const broadcastId in object.broadcasts) {
            const broadcast = object.broadcasts[broadcastId];
            const newBroadcast = new Variable(
                broadcastId,
                broadcast,
                Variable.BROADCAST_MESSAGE_TYPE,
                false
            );
            // no need to explicitly set the value, variable constructor
            // sets the value to the same as the name for broadcast msgs
            target.variables[newBroadcast.id] = newBroadcast;
        }
    }
    if (Object.prototype.hasOwnProperty.call(object, 'comments')) {
        for (const commentId in object.comments) {
            const comment = object.comments[commentId];
            const newComment = new Comment(
                commentId,
                // text has a length limit, so anything extra got saved in extraText
                comment.text + (typeof comment.extraText === 'string' ? comment.extraText : ''),
                comment.x,
                comment.y,
                comment.width,
                comment.height,
                comment.minimized
            );
            if (comment.blockId) {
                newComment.blockId = comment.blockId;
            }
            target.comments[newComment.id] = newComment;
        }
    }
    if (Object.prototype.hasOwnProperty.call(object, 'frames')) {
        for (const frameId in object.frames) {
            const frame = object.frames[frameId];
            if (!frame) continue;
            target.frames[frameId] = {
                id: frameId,
                x: typeof frame.x === 'number' ? frame.x : 0,
                y: typeof frame.y === 'number' ? frame.y : 0,
                width: typeof frame.width === 'number' ? frame.width : 200,
                height: typeof frame.height === 'number' ? frame.height : 150,
                title: typeof frame.title === 'string' ? frame.title : 'New Group',
                color: typeof frame.color === 'string' ? frame.color : '#4C97FF',
                minimized: Boolean(frame.minimized),
                locked: Boolean(frame.locked)
            };
        }
    }
    if (Object.prototype.hasOwnProperty.call(object, 'x')) {
        target.x = object.x;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'y')) {
        target.y = object.y;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'direction')) {
        // Sometimes the direction can be outside of the range: LLK/scratch-gui#5806
        // wrapClamp it (like we do on RenderedTarget.setDirection)
        target.direction = MathUtil.wrapClamp(object.direction, -179, 180);
    }
    if (Object.prototype.hasOwnProperty.call(object, 'size')) {
        target.size = object.size;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'visible')) {
        target.visible = object.visible;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'currentCostume')) {
        target.currentCostume = MathUtil.clamp(object.currentCostume, 0, object.costumes.length - 1);
    }
    if (Object.prototype.hasOwnProperty.call(object, 'rotationStyle')) {
        target.rotationStyle = object.rotationStyle;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'isStage')) {
        target.isStage = object.isStage;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'targetPaneOrder')) {
        // Temporarily store the 'targetPaneOrder' property
        // so that we can correctly order sprites in the target pane.
        // This will be deleted after we are done parsing and ordering the targets list.
        target.targetPaneOrder = object.targetPaneOrder;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'draggable')) {
        target.draggable = object.draggable;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'extensionStorage')) {
        target.store.unsafe$setProjectStorage(Object.assign(Object.create(null), object));
    }
    Promise.all(costumePromises).then(costumes => {
        sprite.costumes = costumes;
    });
    Promise.all(soundPromises).then(sounds => {
        sprite.sounds = sounds;
        // Make sure if soundBank is undefined, sprite.soundBank is then null.
        sprite.soundBank = soundBank || null;
    });
    for (const procCode of globalProccodes) {
        if (runtime._globalProcedures[procCode]) {
            console.warn('global procedure with proccode', procCode, 'already exists, skipping it.');
            continue;
        }
        runtime._globalProcedures[procCode] = target.id;
    }
    return Promise.all(costumePromises.concat(soundPromises)).then(() => target);
};

E.deserializeMonitor = function (monitorData, runtime, targets, extensions) {
    // Monitors position is always stored as position from top-left corner in 480x360 stage.
    const xOffset = (runtime.stageWidth - 480) / 2;
    const yOffset = (runtime.stageHeight - 360) / 2;
    monitorData.x += xOffset;
    monitorData.y += yOffset;
    monitorData.x = MathUtil.clamp(monitorData.x, 0, runtime.stageWidth);
    monitorData.y = MathUtil.clamp(monitorData.y, 0, runtime.stageHeight);

    // If the serialized monitor has spriteName defined, look up the sprite
    // by name in the given list of targets and update the monitor's targetId
    // to match the sprite's id.
    if (monitorData.spriteName) {
        const filteredTargets = targets.filter(t => t.sprite.name === monitorData.spriteName);
        if (filteredTargets && filteredTargets.length > 0) {
            monitorData.targetId = filteredTargets[0].id;
        } else {
            log.warn(`Tried to deserialize sprite specific monitor ${
                monitorData.opcode} but could not find sprite ${monitorData.spriteName}.`);
        }
    }

    // Get information about this monitor, if it exists, given the monitor's opcode.
    // This will be undefined for extension blocks
    const monitorBlockInfo = runtime.monitorBlockInfo[monitorData.opcode];

    // Due to a bug (see https://github.com/scratchfoundation/scratch-vm/pull/2322), renamed list monitors may have been serialized
    // with an outdated/incorrect LIST parameter. Fix it up to use the current name of the actual corresponding list.
    if (monitorData.opcode === 'data_listcontents') {
        const listTarget = monitorData.targetId ?
            targets.find(t => t.id === monitorData.targetId) :
            targets.find(t => t.isStage);
        if (
            listTarget &&
            Object.prototype.hasOwnProperty.call(listTarget.variables, monitorData.id)
        ) {
            monitorData.params.LIST = listTarget.variables[monitorData.id].name;
        }
    }

    // Convert the serialized monitorData params into the block fields structure
    const fields = {};
    for (const paramKey in monitorData.params) {
        const field = {
            name: paramKey,
            value: monitorData.params[paramKey]
        };
        fields[paramKey] = field;
    }

    // Variables, lists, and non-sprite-specific monitors, including any extension
    // monitors should already have the correct monitor ID serialized in the monitorData,
    // find the correct id for all other monitors.
    if (monitorData.opcode !== 'data_variable' && monitorData.opcode !== 'data_listcontents' &&
        monitorData.opcode !== 'data_listarraycontents' && monitorBlockInfo &&
        monitorBlockInfo.isSpriteSpecific) {
        monitorData.id = monitorBlockInfo.getId(
            monitorData.targetId, fields);
    } else {
        // Replace unsafe characters in monitor ID, if there are any.
        // These would have come from projects that were originally 2.0 projects
        // that had unsafe characters in the variable name (and then the name was
        // used as part of the variable ID when importing the project).
        monitorData.id = StringUtil.replaceUnsafeChars(monitorData.id);
    }

    // If the runtime already has a monitor block for this monitor's id,
    // update the existing block with the relevant monitor information.
    const existingMonitorBlock = runtime.monitorBlocks._blocks[monitorData.id];
    if (existingMonitorBlock) {
        // A monitor block already exists if the toolbox has been loaded and
        // the monitor block is not target specific (because the block gets recycled).
        existingMonitorBlock.isMonitored = monitorData.visible;
        existingMonitorBlock.targetId = monitorData.targetId;
    } else {
        // If a monitor block doesn't already exist for this monitor,
        // construct a monitor block to add to the monitor blocks container
        const monitorBlock = {
            id: monitorData.id,
            opcode: monitorData.opcode,
            inputs: {}, // Assuming that monitor blocks don't have droppable fields
            fields: fields,
            topLevel: true,
            next: null,
            parent: null,
            shadow: false,
            x: 0,
            y: 0,
            isMonitored: monitorData.visible,
            targetId: monitorData.targetId
        };

        // Variables and lists have additional properties
        // stored in their fields, update this info in the
        // monitor block fields
        if (monitorData.opcode === 'data_variable') {
            const field = monitorBlock.fields.VARIABLE;
            field.id = monitorData.id;
            field.variableType = Variable.SCALAR_TYPE;
        } else if (monitorData.opcode === 'data_listcontents' || monitorData.opcode === 'data_listarraycontents') {
            const field = monitorBlock.fields.LIST;
            field.id = monitorData.id;
            field.variableType = Variable.LIST_TYPE;
        }

        runtime.monitorBlocks.createBlock(monitorBlock);

        // If the block is from an extension, record it.
        const extensionID = E.getExtensionIdForOpcode(monitorBlock.opcode);
        if (extensionID) {
            extensions.extensionIDs.add(extensionID);
        }
    }

    runtime.requestAddMonitor(new MonitorRecord(monitorData));
};

// Replace variable IDs throughout the project with
// xml-safe versions.
// This is to fix up projects imported from 2.0 where xml-unsafe names
// were getting added to the variable ids.
E.replaceUnsafeCharsInVariableIds = function (targets) {
    const allVarRefs = VariableUtil.getAllVarRefsForTargets(targets, true);
    // Re-id the variables in the actual targets
    targets.forEach(t => {
        Object.keys(t.variables).forEach(id => {
            const newId = StringUtil.replaceUnsafeChars(id);
            if (newId === id) return;
            t.variables[id].id = newId;
            t.variables[newId] = t.variables[id];
            delete t.variables[id];
        });
    });

    // Replace the IDs in the blocks refrencing variables or lists
    for (const id in allVarRefs) {
        const newId = StringUtil.replaceUnsafeChars(id);
        if (id === newId) continue; // ID was already safe, skip
        // We're calling this on the stage target because we need a
        // target to call on but this shouldn't matter because we're passing
        // in all the varRefs we want to operate on
        VariableUtil.updateVariableIdentifiers(allVarRefs[id], newId);
    }
    return targets;
};

/**
 * @param {object} json
 * @param {Runtime} runtime
 * @returns {void|Promise<void>} Resolves when the user has acknowledged any compatibilities, if any exist.
 */
E.checkPlatformCompatibility = (json, runtime) => {
    if (!json.meta || !json.meta.platform) {
        return;
    }

    const projectPlatform = json.meta.platform.name;
    const isNativePlatform = projectPlatform === runtime.platform.name;
    if (isNativePlatform) {
        return;
    }

    let pending = runtime.listenerCount(RuntimeConstants.PLATFORM_MISMATCH);
    if (pending === 0) {
        return;
    }

    return new Promise(resolve => {
        runtime.emit(RuntimeConstants.PLATFORM_MISMATCH, json.meta.platform, () => {
            pending--;
            if (pending === 0) {
                if (!isNativePlatform) {
                    // JS hoisting fix
                    // eslint-disable-next-line
                    E.applyCompatibilityOptions(runtime);
                }
                resolve();
            }
        });
    });
};

/**
 * Attempts to apply legacy runtime settings that are used by
 * the majority of TurboWarp and Scratch projects.
 * These will be overwritten if a magic comment is found.
 * @param {Runtime} runtime
 */
E.applyCompatibilityOptions = runtime => {
    runtime.setCompatibilityMode(true);
    runtime.setStageSize(480, 360);
    runtime.setRuntimeOptions({fencing: true});
};

/**
 * Deserialize the specified representation of a VM runtime and loads it into the provided runtime instance.
 * @param  {object} json - JSON representation of a VM runtime.
 * @param  {Runtime} runtime - Runtime instance
 * @param {JSZip} zip - Sb3 file describing this project (to load assets from)
 * @param {boolean} isSingleSprite - If true treat as single sprite, else treat as whole project
 * @returns {Promise.<ImportedProject>} Promise that resolves to the list of targets after the project is deserialized
 */
E.deserialize = async function (json, runtime, zip, isSingleSprite) {
    await E.checkPlatformCompatibility(json, runtime);

    const extensions = {
        extensionIDs: new Set(),
        extensionURLs: new Map()
    };

    // Store the origin field (e.g. project originated at CSFirst) so that we can save it again.
    if (json.meta && json.meta.origin) {
        // eslint-disable-next-line require-atomic-updates
        runtime.origin = json.meta.origin;
    } else {
        // eslint-disable-next-line require-atomic-updates
        runtime.origin = null;
    }

    // Extract custom extension IDs, if they exist.
    if (json.extensionURLs) {
        for (const [id, url] of Object.entries(json.extensionURLs)) {
            extensions.extensionURLs.set(id, url);
        }
    }

    // Extract any custom fonts before loading costumes.
    let fontPromise;
    if (json.customFonts) {
        fontPromise = runtime.fontManager.deserialize(json.customFonts, zip, isSingleSprite);
    } else {
        fontPromise = Promise.resolve();
    }

    // First keep track of the current target order in the json,
    // then sort by the layer order property before parsing the targets
    // so that their corresponding render drawables can be created in
    // their layer order (e.g. back to front)
    const targetObjects = ((isSingleSprite ? [json] : json.targets) || [])
        .map((t, i) => Object.assign(t, {targetPaneOrder: i}))
        .sort((a, b) => a.layerOrder - b.layerOrder);

    const monitorObjects = json.monitors || [];

    return fontPromise.then(() => targetObjects.map(target => E.parseScratchAssets(target, runtime, zip)))
        // Force this promise to wait for the next loop in the js tick. Let
        // storage have some time to send off asset requests.
        .then(assets => Promise.resolve(assets))
        .then(assets => Promise.all(targetObjects
            .map((target, index) =>
                E.parseScratchObject(target, runtime, extensions, zip, assets[index]))))
        .then(targets => targets // Re-sort targets back into original sprite-pane ordering
            .map((t, i) => {
                // Add layer order property to deserialized targets.
                // This property is used to initialize executable targets in
                // the correct order and is deleted in VM's installTargets function
                t.layerOrder = i;
                return t;
            })
            .sort((a, b) => a.targetPaneOrder - b.targetPaneOrder)
            .map(t => {
                // Delete the temporary properties used for
                // sprite pane ordering and stage layer ordering
                delete t.targetPaneOrder;
                return t;
            }))
        .then(targets => E.replaceUnsafeCharsInVariableIds(targets))
        .then(targets => {
            monitorObjects.map(monitorDesc => E.deserializeMonitor(monitorDesc, runtime, targets, extensions));
            if (Object.prototype.hasOwnProperty.call(json, 'extensionStorage')) {
                runtime.store.unsafe$setProjectStorage(Object.assign(Object.create(null), json.extensionStorage));
            }
            return targets;
        })
        .then(targets => ({
            targets,
            extensions
        }));
};

module.exports = E;
