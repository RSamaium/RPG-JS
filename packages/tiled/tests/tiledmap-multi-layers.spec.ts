import { TiledParser } from "../src/parser/parser"
import { tileset } from "./data"
import { MapClass } from '../src'
import { test, expect, describe, beforeEach } from 'vitest'

const getXmlMap = (properties = '') => `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.8" tiledversion="1.8.2" orientation="orthogonal" renderorder="right-down" width="10" height="10" tilewidth="32" tileheight="32" infinite="0" nextlayerid="5" nextobjectid="5">
 ${properties}
 <tileset firstgid="1" source="[Base]BaseChip_pipo.tsx"/>
 <layer id="1" name="Tile Layer 1" width="10" height="10">
  <data encoding="base64">
   AQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAA==
  </data>
 </layer>
 <layer id="2" name="Tile Layer 2" width="10" height="10">
  <data encoding="base64">
   AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
  </data>
 </layer>
 <layer id="3" name="Tile Layer 3" width="10" height="10">
  <data encoding="base64">
   AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
  </data>
 </layer>
</map>
`

const xml = getXmlMap()
const xmlLowMemory = getXmlMap(`
    <properties>
        <property name="low-memory" value="true" type="bool"  />
    </properties>
`)

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

test('Has 3 Layers', () => {
    const map = getMap(xml)
    expect(map.layers).toHaveLength(3)
})

test('Test Allocate memory Size', () => {
    const map = getMap(xml)
    expect(map['allocateMemory']).toBe(3)
})

describe('Get Tile In Memory', () => {
    test('3 tiles found', () => {
        const map = getMap(xml)
        const { tiles } = map.getTileByIndex(44)
        expect(tiles).toHaveLength(3)
    })

    test('3 tiles found', () => {
        const map = getMap(xml)
        const { tiles } = map.getTileByIndex(44)
        expect(tiles[0].id).toBe(41)
        expect(tiles[0].layerIndex).toBe(2)
        expect(tiles[1].id).toBe(41)
        expect(tiles[1].layerIndex).toBe(1)
        expect(tiles[2].id).toBe(0)
        expect(tiles[2].layerIndex).toBe(0)
    })
})

describe('Memory Optimization', () => {
    let map: MapClass

    beforeEach(() => {
        map = getMap(xmlLowMemory)
    })

    test('Test Allocate memory Size', () => {
        expect(map['allocateMemory']).toBe(1)
    })

    test('1 tile only found', () => {
        const { tiles } = map.getTileByIndex(44)
        expect(tiles).toHaveLength(1)
    })

    test('1 tile only found', () => {
        const { tiles } = map.getTileByIndex(44)
        expect(tiles[0].id).toBe(41)
        expect(tiles[0].layerIndex).toBe(2)
    })
})