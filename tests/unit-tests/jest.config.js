const jestConfig = require('@rpgjs/compiler/jest')

jestConfig.transformIgnorePatterns = [
    ...jestConfig.transformIgnorePatterns,
    ...['[/\]core-js', '@babel[/\]runtime']
]

module.exports = jestConfig