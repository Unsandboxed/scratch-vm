// @ts-check
module.exports = function(compilerData, {
    IntermediateStackBlock,
    InputType
}) {
    // Stack
    compilerData.registerBlock('event_broadcast', function(stg, block) {
      return new IntermediateStackBlock(this.ir_opcode, {
           broadcast: stg.descendInputOfBlock(block, 'BROADCAST_INPUT').toType(InputType.STRING)
      });
    }, function(jsg, block) {
        jsg.source += `startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${this.descendInput(block.inputs.broadcast)} });\n`;
    }, {
        input: false
    });
    compilerData.registerBlock('event_broadcastandwait', function(stg, block) {
      return new IntermediateStackBlock(this.ir_opcode, {
           broadcast: stg.descendInputOfBlock(block, 'BROADCAST_INPUT').toType(InputType.STRING)
      });
    }, function(jsg, block) {
        jsg.source += `yield* waitThreads(startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${this.descendInput(block.inputs.broadcast)} }));\n`;
        jsg.yielded();
    }, {
        input: false,
        yields: true
    });
    // Inputs
    compilerData.registerBlock('event_broadcast_menu', function(stg, block) {
        const broadcastOption = block.fields.BROADCAST_OPTION;
        const broadcastVariable = stg.target.lookupBroadcastMsg(broadcastOption.id, broadcastOption.value);
        // TODO: empty string probably isn't the correct fallback
        const broadcastName = broadcastVariable ? broadcastVariable.name : '';
        return stg.createConstantInput(broadcastName);
    }, null, {
        input: true
    });
};