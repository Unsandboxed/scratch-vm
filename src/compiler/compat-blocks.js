/**
 * @fileoverview List of blocks to be supported in the compiler compatibility layer.
 * This is only for native blocks. Extensions should not be listed here.
 */

// Please keep these lists alphabetical.

const stacked = [
    // usb to do: compile these when working
    'camera_movetoxy',
    'camera_changebyxy',
    'camera_setx',
    'camera_changex',
    'camera_sety',
    'camera_changey',

    'looks_changestretchby',
    'looks_hideallsprites',
    'looks_say',
    'looks_sayforsecs',
    'looks_setstretchto',
    'looks_switchbackdroptoandwait',
    'looks_think',
    'looks_thinkforsecs',
    'motion_align_scene',
    'motion_glidesecstoxy',
    'motion_glideto',
    'motion_goto',
    'motion_changebyxy',
    'motion_pointtowards',
    'motion_pointtowardsxy',
    'motion_scroll_right',
    'motion_scroll_up',
    'sensing_askandwait',
    'sensing_setdragmode',
    'sound_changeeffectby',
    'sound_changevolumeby',
    'sound_cleareffects',
    'sound_play',
    'sound_playuntildone',
    'sound_seteffectto',
    'sound_setvolumeto',
    'sound_stopallsounds',
];

const inputs = [
    'looks_effect',
    'motion_xscroll',
    'motion_yscroll',
    'sensing_loud',
    'sensing_loudness',
    'sensing_userid',
    'sound_volume'
    
    // USB TO DO: MUST SUPPORT COMPILER
    'operator_letter_of',
    'operator_clamp',
    'operator_exponent',
    'operator_gt_equals',
    'operator_lt_equals',
    'operator_min',
    'operator_max',
    'string_convert',
    'string_exactly',
    'string_index_of',
    'string_is',
    'string_item_split',
    'string_repeat',
    'string_replace',
    'string_reverse',
    'string_ternary',
];

module.exports = {
    stacked,
    inputs
};
