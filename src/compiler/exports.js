module.exports = Object.assign({}, require('./shared-exports'), {
    JSGenerator: require('./jsgen.js'),
    IRGenerator: require('./irgen.js').IRGenerator,
    ScriptTreeGenerator: require('./irgen.js').ScriptTreeGenerator,
    IROptimizer: require('./iroptimizer.js').IROptimizer,
    TypeState: require('./iroptimizer.js').TypeState,
    execute: require('./jsexecute.js'),
    compile: require('./compile.js')
});
