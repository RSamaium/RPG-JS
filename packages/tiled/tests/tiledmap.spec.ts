import { TiledParser } from "../src/parser/parser"
import { tileset, xml, xmlGroup, xmlObjectImage, xmlTile } from "./data"
import { Tileset } from '../src/classes/Tileset'
import { Layer, MapClass, Tile, TiledLayerType, TiledObjectClass } from '../src'
import { test, expect, describe } from 'vitest'

function getMap(xml) {
    const parser = new TiledParser(xml)
    const mapData = parser.parseMap()
    mapData.tilesets = mapData.tilesets.map(source => {
        const parserTileset = new TiledParser(tileset)
        const tilesetData = parserTileset.parseTileset()
        return {
            ...source,
            ...tilesetData
        }
    })
    return new MapClass(mapData)
}


test('Map is loaded', () => {
    const map = getMap(xml)
    expect(map).toBeDefined()
    expect(map.tilesets[0]).toBeInstanceOf(Tileset)
    expect(map.layers[0]).toBeInstanceOf(Layer)
})

test('Map Tile Size', () => {
    const map = getMap(xml)
    expect(map.tileheight).toBe(32)
    expect(map.tilewidth).toBe(32)
})

test('Layers', () => {
    const map = getMap(xmlGroup)
    expect(map.layers).toHaveLength(4)
    expect(map.layers[2].type).toBe(TiledLayerType.Group)
})

test('Group Properties', () => {
    const map = getMap(xmlGroup)
    const layerGroup = map.layers[2]
    const prop = layerGroup.getProperty<number>('grouptest')
    expect(prop).toBe(0)
})

test('Layers Properties has parent', () => {
    const map = getMap(xmlGroup)
    const layer = map.layers[3]
    const parent = layer.getLayerParent()
    expect(parent).toBeInstanceOf(Layer)
    expect(parent?.name).toBe('Group 1')
})

test('Layers Properties same properties of group parent', () => {
    const map = getMap(xmlGroup)
    const layerGroup = map.layers[3]
    const prop = layerGroup.getProperty<number>('grouptest')
    expect(prop).toBe(0)
})

test('Layers Properties same properties of group parent (incrementation z value)', () => {
    const map = getMap(`<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.8" tiledversion="1.8.2" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="5" nextobjectid="2">
     <group id="3" name="Group 1">
      <properties>
       <property name="z" type="int" value="2"/>
      </properties>
      <layer id="4" name="Tile Layer 2" width="10" height="10">
       <data encoding="base64">
       AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
      </data>
      <properties>
       <property name="z" type="int" value="3"/>
      </properties>
      </layer>
     </group>
    </map>
    `)
    const layerGroup = map.layers[1]
    const prop = layerGroup.getProperty<number>('z')
    expect(prop).toBe(5)
})

test('Layers Properties same properties of group parent (erase parent value)', () => {
    const map = getMap(`<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.8" tiledversion="1.8.2" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="5" nextobjectid="2">
     <group id="3" name="Group 1">
      <properties>
       <property name="test" type="int" value="2"/>
      </properties>
      <layer id="4" name="Tile Layer 2" width="10" height="10">
       <data encoding="base64">
       AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
      </data>
      <properties>
       <property name="test" type="int" value="3"/>
      </properties>
      </layer>
     </group>
    </map>
    `)
    const layerGroup = map.layers[1]
    const prop = layerGroup.getProperty<number>('test')
    expect(prop).toBe(3)
})

test('Opacity', () => {
    const map = getMap(`<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.8" tiledversion="1.8.6" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="14" nextobjectid="8">
     <group id="13" name="Group 1" opacity="0.9">
      <layer id="12" name="Tile Layer 1" width="10" height="10" opacity="0.56">
       <data encoding="base64">
       AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
      </data>
      </layer>
     </group>
    </map>
    
    `)
    const layer1 = map.layers[0]
    const layer2 = map.layers[1]
    expect(layer1.opacity).toBe(0.9)
    expect(layer2.opacity).toBe(0.5)
})

describe('Test Tiles Index', () => {
    const xmlZ = `<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.8" tiledversion="1.8.2" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="5" nextobjectid="5">
     <tileset firstgid="1" source="[Base]BaseChip_pipo.tsx"/>
     <layer id="1" name="Tile Layer 1" width="10" height="10">
      <data encoding="base64">
       AQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAA==
      </data>
      <properties>
            <property name="z" type="int" value="1"/>
        </properties>
     </layer>
     <layer id="2" name="Tile Layer 2" width="10" height="10">
      <data encoding="base64">
       AQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAA==
      </data>
        <properties>
            <property name="z" type="int" value="2"/>
        </properties>
     </layer>
    </map>
    `

    test('getTileIndex()', () => {
        const map = getMap(xml)
        const { width } = map
        expect(map.getTileIndex(32, 32)).toEqual(width + 1)
    })

    test('getTilePosition() #1', () => {
        const map = getMap(xml)
        expect(map.getTilePosition(85)).toMatchObject({
            x: 5 * 32,
            y: 8 * 32
        })
        expect(map.getTilePosition(11)).toMatchObject({
            x: 1 * 32,
            y: 1 * 32
        })
        expect(map.getTilePosition(9)).toMatchObject({
            x: 9 * 32,
            y: 0 * 32
        })
        expect(map.getTilePosition(99)).toMatchObject({
            x: 9 * 32,
            y: 9 * 32
        })
    })

    test('Tiles Index', () => {
        const map = getMap(xml)
        const tileInfo = map.getTileByIndex(0)
        expect(tileInfo.tiles).toHaveLength(2)
        expect(tileInfo.hasCollision).toBe(false)
    })

    test('Tiles Index, Not found layer', () => {
        const map = getMap(xmlZ)
        const tileInfo = map.getTileByIndex(0)
        expect(tileInfo.tiles).toHaveLength(0)
        expect(tileInfo.hasCollision).toBe(true)
    })

    test('Tiles Index, Z=1', () => {
        const map = getMap(xmlZ)
        const tileInfo = map.getTileByIndex(0, [32, 64])
        expect(tileInfo.tiles).toHaveLength(2)
        expect(tileInfo.hasCollision).toBe(false)
    })

    test('Tiles Index, Z=2', () => {
        const map = getMap(xmlZ)
        const tileInfo = map.getTileByIndex(0, [64, 64+32])
        expect(tileInfo.tiles).toHaveLength(2)
        expect(tileInfo.hasCollision).toBe(false)
    })

    const xmlFlipTiled = `<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.8" tiledversion="1.8.6" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="14" nextobjectid="8">
     <tileset firstgid="1" source="[Base]BaseChip_pipo.tsx"/>
     <layer id="12" name="Tile Layer 1" width="10" height="10">
     <data encoding="base64">
     KQAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
    </data>
    </layer>
    </map>
    `

    test('Get Flip Tile', () => {
        const map = getMap(xmlFlipTiled)
        const tileInfo = map.getTileByIndex(0)
        const tile = tileInfo.tiles[0]
        expect(tile.gid).toBe(41)
        expect(tileInfo.hasCollision).toBe(true)
    })
})
