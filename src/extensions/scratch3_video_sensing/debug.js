/**
 * A debug "index" module exporting VideoMotion and VideoMotionView to debug
 * VideoMotion directly.
 * @file debug.js
 */

const VideoMotion = require('./library');
const VideoMotionView = require('./view');
const Math = require('./math');

module.exports = {
    VideoMotion,
    VideoMotionView,
    Math
};
