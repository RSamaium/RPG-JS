import { clientBuildConfig } from '../src/build/client-config';
import { vi, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { error } from '../src/utils/log';
import mockFs from 'mock-fs';
import * as process from 'process';
import { VitePWA } from 'vite-plugin-pwa'

vi.mock('../src/build/vite-plugin-config.toml', () => {
    return {
        default: vi.fn()
    }
})

vi.mock('../src/utils/log', async () => {
    return {
        error: vi.fn(),
        ErrorCodes: {
            IndexNotFound: 'IndexNotFound'
        }
    }
})

vi.mock('module', () => {
    return {
        createRequire: vi.fn().mockReturnValue({
            resolve: vi.fn().mockReturnValue(''),
        })
    }
})

vi.mock('@esbuild-plugins/node-modules-polyfill')
vi.mock('@esbuild-plugins/node-globals-polyfill')
vi.mock('rollup-plugin-node-polyfills')
vi.mock('vite-plugin-pwa')

describe('clientBuildConfig', () => {
    beforeEach(() => {
        mockFs({
            '/path/to/dir/rpg.toml': 'modules=["mod1", "mod2"]',
            '/path/to/other/dir/rpg.json': '{"modules":["mod1", "mod2"]}',
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    test('should throw error for invalid RPG_TYPE', async () => {
        process.env.RPG_TYPE = 'invalid';
        await expect(clientBuildConfig('/path/to/dir')).rejects.toThrow('Invalid type. Choice between rpg or mmorpg');
    });

    test('index.html not found', async () => {
        process.env.RPG_TYPE = 'rpg';
        await clientBuildConfig('/path/to/dir');
        expect(error).toHaveBeenCalledWith(expect.anything(), 'IndexNotFound');
    })

    describe('General Configuration', () => {
        describe('PWA', () => {
            beforeEach(() => {
                process.env.RPG_TYPE = 'rpg';
                mockFs({
                    'rpg.toml': '',
                    'index.html': '',
                    'package.json': '{"name": "test"}'
                });
            })

            test('PWA Enabled (serve by default', async () => {
                await clientBuildConfig('.', {
                    type: 'rpg',
                    serveMode: true,
                });
                expect(VitePWA).not.toHaveBeenCalled();
            })

            test('PWA Enabled (build by default)', async () => {
                await clientBuildConfig('.', {
                    type: 'rpg',
                    serveMode: false,
                });
                expect(VitePWA).toHaveBeenCalled();
            })

            test('PWA Called (config by default)', async () => {
                await clientBuildConfig('.', {
                    type: 'rpg',
                    serveMode: false,
                });
                expect(VitePWA).toHaveBeenCalledWith({
                    manifest: {
                        description: undefined,
                        icons: undefined,
                        name: undefined,
                        short_name: undefined,
                        theme_color: undefined,
                    },
                    registerType: 'autoUpdate',
                })
            })

            test('PWA Called (config changed)', async () => {
                mockFs({
                    'rpg.toml': `
                    name = "My Game"
                    shortName = "Game"
                    description = "Beautiful Game"
                    themeColor = "#ffffff"

                    [[icons]]
                        src = "icon.png"
                        sizes = [96, 128, 192, 256]

                    [pwa]
                        registerType = 'prompt'`,
                    'index.html': '',
                    'package.json': '{"name": "test"}'
                });
                await clientBuildConfig('.', {
                    type: 'rpg',
                    serveMode: false,
                });
                expect(VitePWA).toHaveBeenCalledWith({
                    registerType: 'prompt',
                    manifest: {
                        name: "My Game",
                        short_name: "Game",
                        description: "Beautiful Game",
                        icons: [
                            {
                                src: "icon.png",
                                sizes: [
                                    96,
                                    128,
                                    192,
                                    256
                                ]
                            }
                        ],
                        theme_color: "#ffffff"
                    }
                })
            })

            test('PWA Enabled (build but disabled)', async () => {
                mockFs({
                    'rpg.toml': `[compilerOptions.build]
                        pwaEnabled = false`,
                    'index.html': '',
                    'package.json': '{"name": "test"}'
                });
                await clientBuildConfig('.', {
                    type: 'rpg',
                    serveMode: false,
                });
                expect(VitePWA).not.toHaveBeenCalled();
            })

            afterEach(() => {
                vi.clearAllMocks()
            })
        })
    })

    describe('Test RPG Mode', () => {
        let config
        beforeEach(async () => {
            process.env.RPG_TYPE = 'rpg';
            mockFs({
                'rpg.toml': 'modules=["mod1", "mod2"]',
                'index.html': '',
                'package.json': '{"name": "test"}'
            });
            config = await clientBuildConfig('.', {
                type: 'rpg',
                serveMode: true,
            });
        })

        test('should return the correct properties and values for RPG mode', async () => {
            expect(config).toHaveProperty('root', '.');
        });
    })

    describe('Test MMORPG Mode (server side)', () => {
        let config
        beforeEach(async () => {
            process.env.RPG_TYPE = 'mmorpg';
            mockFs({
                'rpg.toml': 'modules=["mod1", "mod2"]',
                'index.html': '',
                'package.json': '{"name": "test"}'
            });
            config = await clientBuildConfig('.', {
                serveMode: true,
                side: 'server'
            });
        })

        test('Build OutDir', async () => {
            expect(config.build.outDir).toContain('dist/server');
        });
    })
});
