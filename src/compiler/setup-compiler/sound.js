// @ts-check
module.exports = function(compilerData, {
    StackOpcode
}) {
    compilerData.registerBlock('sound_sounds_menu', function(stg, block) {
        // This menu is special compared to other menus -- it actually has an opcode function.
        return stg.createConstantInput(block.fields.SOUND_MENU.value);
    }, null, {
        input: true
    });
};