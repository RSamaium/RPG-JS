const { pathsToModuleNameMapper } = require('ts-jest')
const jestConfig = require('./packages/compiler/jest')
const { compilerOptions } = require('./tsconfig.json')

const paths = pathsToModuleNameMapper(compilerOptions.paths)
paths['^@rpgjs/(.*)$'] = '<rootDir>/packages/$1'

module.exports = {
    ...jestConfig,
    transform: {
        "\\.ts$": "ts-jest",
        "\\.js$": "babel-jest",
        "\\.tmx$": "<rootDir>/packages/compiler/tmx-loader/index.js",
        "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg)$": "<rootDir>/packages/compiler/jest/image.js",
        "\\.(mp4|webm|wav|mp3|m4a|aac|oga|ogg)$": "<rootDir>/packages/compiler/jest/file.js",
        "\\.vue$": "@vue/vue3-jest"
    },
    setupFiles: ["<rootDir>/packages/compiler/jest/setup.js"],
    moduleNameMapper: paths,
    moduleDirectories: [
        "packages",
        "node_modules",
        "tests"
    ]
}