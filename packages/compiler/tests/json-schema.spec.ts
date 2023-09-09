import { parseJsonSchema } from '../src/utils/json-schema';
import jsonSchema from '../src/jsonSchema';
import { vi, afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('parseJsonSchema', () => {
    test('successfully parses valid data for both server and client schemas', () => {
        const validData = {
            startMap: "exampleMap",
            start: {
                map: "startMap",
                graphic: "startGraphic",
                hitbox: [10, 15]
            },
            spritesheetDirectories: ["dir1", "dir2"],
            api: {
                enabled: true,
                authSecret: "secretKey"
            },
            shortName: "short",
            description: "description here",
            themeColor: "#FFFFFF",
            icons: [{
                src: "icon.png",
                sizes: [48, 72],
                type: "image/png"
            }],
            themeCss: "body { background-color: blue; }",
            matchMakerService: "service1",
            pwa: { prop1: "value1", prop2: "value2" },
            inputs: {
                key1: {
                    repeat: true,
                    bind: "bind1",
                    delay: {
                        duration: 1,
                        otherControls: ["control1"]
                    }
                }
            },
            name: "exampleName"
        };

        const result = parseJsonSchema(jsonSchema as any, validData);

        expect(result.server).toBeDefined();
        expect(result.client).toBeDefined();
        expect(result.server.startMap).toBe(validData.startMap);
        expect(result.client.shortName).toBe(validData.shortName);
        expect(result.server.name).toBe(validData.name); // As it's in * schema
        expect(result.client.name).toBe(validData.name); // As it's in * schema
    });

    test('throws error for invalid data', () => {
        const invalidData = {
            start: {
                invalidProperty: "invalid"
            }
        };
        expect(() => parseJsonSchema(jsonSchema as any, invalidData)).toThrow();
    });

    test('addAdditionalProperties', () => {
        const data = {
            pwa: { includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], },
        };
        const result = parseJsonSchema(jsonSchema as any, data) as any
        expect(result.client.pwa.includeAssets).toBe(data.pwa.includeAssets);
    });

    test('Schema with namespace', () => {
        const jsonSchema = {
            "namespace": "titleScreen",
            "server": {
                "type": "object",
                "properties": {
                    "mongodb": {
                        "type": "string"
                    }
                },
                "required": [
                    "mongodb"
                ]
            },
            "client": {
                "type": "object",
                "properties": {
                    "apiUrl": {
                        "type": "string"
                    }
                }
            },
            "*": {}
        }
        const validData = {
            titleScreen: {
                mongodb: "mongodb://localhost:27017",
                apiUrl: "http://localhost:3000"
            }
        }
        const result = parseJsonSchema(jsonSchema as any, validData) as any
        expect(result.server.titleScreen.mongodb).toBe(validData.titleScreen.mongodb);
        expect(result.client.titleScreen.apiUrl).toBe(validData.titleScreen.apiUrl);
    });
});
