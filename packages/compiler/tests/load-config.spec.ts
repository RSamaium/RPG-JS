import { loadGlobalConfig } from '../src/build/load-global-config'
import { vi, beforeEach, describe, expect, test } from 'vitest';
import mockFs from 'mock-fs';
import { replaceEnvVars } from '../src/build/utils';

/*vi.mock('vite', async () => {
    const actual = await vi.importActual<typeof import('vite')>('vite');
    return {
        ...actual,
        loadEnv: vi.fn().mockImplementation(() => {
            return {
                MY_ENV_VARIABLE: 'envValue',
                VITE_SERVER_URL: 'http://localhost:3000'
            }
        })
    }
});*/

describe('loadGlobalConfig', () => {

    beforeEach(() => {
        mockFs.restore();
    });

    test('should parse default configuration correctly', () => {
        const result: any = loadGlobalConfig([], {}, {});
        expect(result.configClient).toBeDefined();
        expect(result.configServer).toBeDefined();
    });

    test('should load configuration for provided modules', () => {
        mockFs({
            './test-module/config.json': JSON.stringify({
                namespace: 'testModule',
                client: {
                    "type": "object",
                    "properties": {
                        "prop1": {
                            "type": "string"
                        },
                    }
                },
                server: {
                    "type": "object",
                    "properties": {
                        "prop2": {
                            "type": "string"
                        },
                    }
                }
            })
        });

        const result: any = loadGlobalConfig(['./test-module'], {}, {});
        expect(result.configClient.testModule).toHaveProperty('prop1');
        expect(result.configServer.testModule).toHaveProperty('prop2');
    });

    test('should replace environment variables correctly', () => {
        mockFs({
            './env-module/config.json': JSON.stringify({
                client: {
                    "type": "object",
                    "properties": {
                        "envProp": {
                            "type": "string"
                        }
                    }
                }
            })
        });

        const result: any = loadGlobalConfig(['./env-module'], {
            envProp: 'aa'
        } as any, { side: 'client' });

        expect(result.configClient.envProp).toBe('aa');
    });

    test('should correctly extract server-side configurations', () => {
        mockFs({
            './server-module/config.json': JSON.stringify({
                server: {
                    "type": "object",
                    "properties": {
                        "serverProp": {
                            "type": "string"
                        }
                    }
                }
            })
        });

        const result: any = loadGlobalConfig(['./server-module'], {
            serverProp: 'serverValue'
        } as any, { side: 'server' });

        expect(result.configServer).toHaveProperty('serverProp', 'serverValue');
    });

    describe('replaceEnvVars()', () => {
        test('should correctly replace environment variable placeholders', () => {
            process.env.MY_ENV_VARIABLE = 'envValue';
            const envs = replaceEnvVars({
                envParsedProp: "$ENV:MY_ENV_VARIABLE"
            }, process.env);

            expect(envs.envParsedProp).toBe('envValue');
        });

        test('should correctly replace environment variable deep placeholders', () => {
            process.env.VITE_SERVER_URL = 'http://localhost:3000';
            const envs = replaceEnvVars({
                compilerOption: {
                    build: {
                        serverUrl: "$ENV:VITE_SERVER_URL"
                    }
                }
            }, process.env);

            expect(envs.compilerOption.build.serverUrl).toBe('http://localhost:3000');
        });

        test('should correctly replace environment variable array placeholders', () => {
            process.env.VITE_SERVER_URL = 'http://localhost:3000';
            const envs = replaceEnvVars({
                compilerOption: {
                    build: {
                        serverUrl: ['foo', "$ENV:VITE_SERVER_URL"],
                        other: true,
                        notDefined: undefined
                    }
                }
            }, process.env);

            expect(envs.compilerOption.build.serverUrl[1]).toBe('http://localhost:3000');
        });
    })

});
