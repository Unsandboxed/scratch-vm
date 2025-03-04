// @ts-check
module.exports = function (compilerData, {
    // eslint-disable-next-line no-unused-vars
    StackOpcode
}) {
    /* eslint-disable no-invalid-this,prefer-arrow-callback */
    compilerData.registerBlock('sound_sounds_menu', function (stg, block) {
        // This menu is special compared to other menus -- it actually has an opcode function.
        return stg.createConstantInput(block.fields.SOUND_MENU.value);
    }, null, {
        input: true
    });
};
