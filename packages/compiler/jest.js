module.exports = {
    transform: {
        "\\.ts$": "ts-jest",
        "\\.tmx$": "<rootDir>/node_modules/@rpgjs/compiler/tmx-loader/index.js"
    },
    transformIgnorePatterns: [
        "/node_modules/(?!(@rpgjs/.+)/)/"
    ],
    moduleFileExtensions: [
        "ts",
        "js"
    ],
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleDirectories: [
        ".",
        "src",
        "node_modules"
    ],
    moduleNameMapper: {
        '^server!(.*)$': '$1',
        '^client!(.*)$': '<rootDir>/node_modules/@rpgjs/compiler/loaders/null.js'
    }
}