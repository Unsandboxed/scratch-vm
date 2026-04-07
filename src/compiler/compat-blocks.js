/**
 * @fileoverview List of blocks to be supported in the compiler compatibility layer.
 * This is only for native blocks. Extensions should not be listed here.
 */

// Please keep these lists alphabetical.

const stacked = [
    'control_if_else_extends',
    'looks_changestretchby',
    'looks_hideallsprites',
    'looks_sayforsecs',
    'looks_setstretchto',
    'looks_switchbackdroptoandwait',
    'looks_thinkforsecs',
    'motion_align_scene',
    'motion_glidesecstoxy',
    'motion_glideto',
    'motion_goto',
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
    'sound_stopallsounds'
];

const inputs = [
    'operator_add_extends',
    'operator_and_extends',
    'operator_divide_extends',
    'operator_equals_extends',
    'operator_gt_equals_extends',
    'operator_gt_extends',
    'operator_lt_equals_extends',
    'operator_lt_extends',
    'operator_max_extends',
    'operator_min_extends',
    'operator_multiply_extends',
    'operator_number_array_extends',
    'operator_or_extends',
    'operator_subtract_extends',
    'operator_xor_extends',
    'motion_xscroll',
    'motion_yscroll',
    'sensing_loud',
    'sensing_loudness',
    'sensing_online',
    'sensing_userid',
    'string_join_extends',
    'sound_volume'
];

module.exports = {
    stacked,
    inputs
};
