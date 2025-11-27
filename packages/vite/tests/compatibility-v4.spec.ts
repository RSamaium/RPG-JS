import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { searchFolderAndTransformToImportString } from '../src/compatibility-v4/utils';
import { loadSpriteSheet, createModuleLoad } from '../src/compatibility-v4/index';

vi.mock('fs');
vi.mock('image-size', () => ({
    default: () => ({ width: 100, height: 100 })
}));

describe('compatibility-v4', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('searchFolderAndTransformToImportString', () => {
        it('should find files and create import string', () => {
            const modulePath = '/root/module';
            const folderPath = 'maps';

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue([
                { name: 'map1.tmx', isDirectory: () => false } as any,
                { name: 'map2.tmx', isDirectory: () => false } as any
            ]);

            const result = searchFolderAndTransformToImportString(folderPath, modulePath, '.tmx');

            expect(result.importString).toContain("import maps_map1_tmx from 'maps/map1.tmx'");
            expect(result.importString).toContain("import maps_map2_tmx from 'maps/map2.tmx'");
            expect(result.variablesString).toContain('maps_map1_tmx');
            expect(result.variablesString).toContain('maps_map2_tmx');
        });

        it('should handle recursive directories', () => {
            const modulePath = '/root/module';
            const folderPath = 'maps';

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
                if (dirPath.endsWith('maps')) {
                    return [{ name: 'sub', isDirectory: () => true } as any];
                }
                if (dirPath.endsWith('sub')) {
                    return [{ name: 'map3.tmx', isDirectory: () => false } as any];
                }
                return [];
            });

            const result = searchFolderAndTransformToImportString(folderPath, modulePath, '.tmx');

            expect(result.importString).toContain("import maps_sub_map3_tmx from 'maps/sub/map3.tmx'");
        });
    });

    describe('loadSpriteSheet', () => {
        it('should load spritesheets and images', () => {
            const modulePath = '/root/module';
            const directoryName = 'spritesheets/chars';

            vi.mocked(fs.existsSync).mockReturnValue(true);
            // Mock for searchFolderAndTransformToImportString internal call
            vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
                if (dirPath.endsWith('chars')) {
                    return [
                        { name: 'hero.ts', isDirectory: () => false } as any,
                        { name: 'hero.png', isDirectory: () => false } as any
                    ];
                }
                return [];
            });

            const options = { serveMode: true, type: 'mmorpg', config: {} };
            const result = loadSpriteSheet(directoryName, modulePath, options);

            expect(result.importString).toContain("import spritesheets_chars_hero_ts from 'spritesheets/chars/hero.ts'");
            expect(result.propImagesString).toContain('"hero": "spritesheets/chars/hero.png"');
            expect(result.propImagesString).toContain('width = 100');
            expect(result.propImagesString).toContain('height = 100');
        });
    });

    describe('createModuleLoad', () => {
        it('should create client module load code', () => {
            const id = 'virtual-my_module-client.ts?client';
            const modulePath = '/root/module';
            const options = { serveMode: true, type: 'mmorpg' };
            const config = { spritesheetDirectories: [] };

            vi.mocked(fs.existsSync).mockReturnValue(false); // No extra files

            const result = createModuleLoad(id, 'my_module', modulePath, options, config);

            expect(result).toContain("import { type RpgClient, RpgModule } from '@rpgjs/client'");
            expect(result).toContain("export default class RpgClientModuleEngine {}");
        });

        it('should create server module load code', () => {
            const id = 'virtual-my_module-server.ts?server';
            const modulePath = '/root/module';
            const options = { serveMode: true, type: 'mmorpg', modulesCreated: [] };
            const config = {};

            vi.mocked(fs.existsSync).mockReturnValue(false); // No extra files

            const result = createModuleLoad(id, 'my_module', modulePath, options, config);

            expect(result).toContain("import { type RpgServer, RpgModule } from '@rpgjs/server'");
            expect(result).toContain("export default class RpgServerModuleEngine {}");
        });
    });
});
