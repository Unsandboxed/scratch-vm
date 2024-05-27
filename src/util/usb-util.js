const Base64Util = require('../util/base64-util');
const Cast = require('../util/cast');
const Clone = require('../util/clone');
const Color = require('../util/color');
const {fetchWithTimeout} = require('../util/fetch-with-timeout');
const getMonitorID = require('../util/get-monitor-id');
const JSONRPC = require('../util/get-monitor-id');
const log = require('../util/log');
const MathUtil = require('../util/math-util');
const maybeFormatMessage = require('../util/maybe-format-message');
const newBlockIDs = require('../util/new-block-ids');
const RateLimiter = require('../util/rateLimiter');
const ScratchLinkWebsocket = require('../util/scratch-link-websocket');
const StringUtil = require('../util/string-util');
const taskQueue = require('../util/task-queue');
const Timer = require('../util/timer');
const AssetUtil = require('../util/tw-asset-util');
const StaticFetch = require('../util/tw-static-fetch');
const uid = require('../util/uid');
const VariableUtil = require('../util/variable-util');
const xmlEscape = require('../util/xml-escape');

const Util = {
    Base64Util,
    Cast,
    Clone,
    Color,
    fetchWithTimeout,
    getMonitorID,
    JSONRPC,
    log,
    MathUtil,
    maybeFormatMessage,
    newBlockIDs,
    RateLimiter,
    ScratchLinkWebsocket,
    StringUtil,
    taskQueue,
    Timer,
    AssetUtil,
    StaticFetch,
    uid,
    VariableUtil,
    xmlEscape
};

module.exports = Util;
