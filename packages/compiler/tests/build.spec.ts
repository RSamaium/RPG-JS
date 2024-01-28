import { loadGlobalConfig } from '../src/build/load-global-config'
import { vi, beforeEach, describe, expect, test, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { buildMode } from '../src/build';
import path from 'path';
import fs from 'fs';

const toml = `
    [vite]
        logLevel = 'silent'

    [vite.build]
        external = ['@rpgjs/server/express', '@rpgjs/server', '@rpgjs/client', '@rpgjs/standalone', 'socket.io-client']
`

const map = `
<?xml version="1.0" encoding="UTF-8"?>
<map version="1.9" tiledversion="1.9.2" orientation="orthogonal" renderorder="right-down" width="20" height="20" tilewidth="32" tileheight="32" infinite="0" nextlayerid="11" nextobjectid="33">
 <tileset firstgid="1" source="tileset.tsx"/>
 <layer id="8" name="Tile Layer 1" width="20" height="20">
  <data encoding="base64">
   AQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAA==
  </data>
 </layer>
 <layer id="10" name="Tile Layer 2" width="20" height="20">
  <data encoding="base64">
   AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
  </data>
 </layer>
 <objectgroup id="9" name="Object Layer 1">
  <object id="30" name="start" x="156" y="220">
   <point/>
  </object>
 </objectgroup>
</map>
`

const mapStructure = {
    'tileset.tsx': `
        <?xml version="1.0" encoding="UTF-8"?>
        <tileset version="1.9" tiledversion="1.9.2" name="[Base]BaseChip_pipo" tilewidth="32" tileheight="32" tilecount="1000" columns="8">
        <image source="base.png" width="256" height="4000"/>
        </tileset>
    `,
    'map.tmx': map,
    'base.png': ''
}

vi.mock('image-size')

describe('Test Structure files After Build', () => {
    const defaultFiles = {
        'package.json': JSON.stringify({
            name: 'test',
            version: '1.0.0',
            "dependencies": {
                "@rpgjs/client": "^4.0.0-rc.11",
                "@rpgjs/common": "^4.0.0-rc.11",
                "@rpgjs/compiler": "^4.0.0-rc.11",
                "@rpgjs/database": "^4.0.0-rc.11",
                "@rpgjs/server": "^4.0.0-rc.11",
                "@rpgjs/standalone": "^4.0.0-rc.11"
            },
        }),
        'rpg.toml': toml,
        'index.html': '<html><head></head></html>',
        'node_modules': mockFs.load(path.resolve(__dirname, '../node_modules')),
    }

    describe('Test MMORPG', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production'
        })

        test('MMORPG Structure', async () => {
            mockFs(defaultFiles)

            await buildMode({})
            const bool = fs.existsSync('dist')
            expect(bool).toBe(true)

            const directories = fs.readdirSync('dist')
            expect(directories).toEqual(['client', 'server'])

            const clientFiles = fs.readdirSync('dist/client')
            expect(clientFiles).toEqual(['assets', 'index.html', 'manifest.json', 'manifest.webmanifest', 'registerSW.js', 'sw.js', 'workbox-fa446783.js'])

            const serverFiles = fs.readdirSync('dist/server')
            expect(serverFiles).toEqual(['assets', 'main.mjs', 'manifest.json'])
        })

        test('Move TMX files', async () => {
            mockFs({
                ...defaultFiles,
                'main/maps': mapStructure,
                'rpg.toml': `
                    modules = [
                        './main'
                    ]

                    ${toml}
                `
            })

            await buildMode({})

            const serverFiles = fs.readdirSync('dist/server/assets')
            expect(serverFiles).toEqual(['map.tmx', 'tileset.tsx'])

            const clientFiles = fs.readdirSync('dist/client/assets')
            expect(clientFiles).toEqual(['base.png', expect.stringContaining('main')])
        })
    })

    describe('Test RPG', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production'
            process.env.RPG_TYPE = 'rpg'
        })

        test('RPG Structure', async () => {
            mockFs(defaultFiles)

            await buildMode({})

            const files = fs.readdirSync('dist')
            expect(files).toEqual(['assets', 'index.html', 'manifest.json', 'manifest.webmanifest', 'registerSW.js', 'sw.js', 'workbox-fa446783.js'])
        })

        test('Move TMX files', async () => {

            mockFs({
                ...defaultFiles,
                'main/maps': mapStructure,
                'rpg.toml': `
                    modules = [
                        './main'
                    ]

                    ${toml}
                `
            })

            await buildMode({})

            const files = fs.readdirSync('dist/assets')
            expect(files).toEqual(['base.png', expect.stringContaining('main'), 'map.tmx', 'tileset.tsx',])
        })

        test('Copy Spritesheet', async () => {
            mockFs({
                ...defaultFiles,
                'main/spritesheets/characters/female.png': '',
                'main/spritesheets/characters/female.ts': `
                    export default {}
                `,
                'rpg.toml': `
                    modules = [
                        './main'
                    ]
                    ${toml}
                `
            })

            await buildMode({})

            const files = fs.readdirSync('dist/assets')
            expect(files).toEqual(['female.png', expect.stringContaining('main')])
        })

    })

    afterEach(() => {
        mockFs.restore();
    })
})
