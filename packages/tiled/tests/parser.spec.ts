import { TiledParser } from '../src/parser/parser'
import { TiledLayerType } from '../src/types/Layer'
import { xml, xmlDeepProperties, xmlGroup, xmlImage, xmlObject, xmlProperties, xmlText, xmlTile } from './data'
import { test, expect } from 'vitest'

test('propToNumber() method', () => {
    const ret = TiledParser.propToNumber({
        test: '1',
        other: '2'
    }, ['test'])
    expect(ret.test).toBe(1)
    expect(ret.other).toBe('2')
})

test('propToBool() method', () => {
    const ret = TiledParser.propToBool({
        test: 'true',
        other: 'false',
        foo: 'false'
    }, ['test', 'other'])
    expect(ret.test).toBe(true)
    expect(ret.other).toBe(false)
    expect(ret.foo).toBe('false')
})

test('toArray() method', () => {
    const ret = TiledParser.toArray({ test: 1 })
    expect(ret).toMatchObject([ { test: 1 }])
})

test('parseMap() method', () => {
   const parser = new TiledParser(xml)
   const map = parser.parseMap()
   expect(map.version).toBe(1.8)
   expect(map.width).toBe(10)
   expect(map.layers).toHaveLength(2)
   const layer = map.layers[0]
   expect(layer).toHaveProperty('name', 'Tile Layer 1')
   expect(layer).toHaveProperty('encoding', 'base64')
   expect(layer).toHaveProperty('data')
})

test('parseMap() method - test data', () => {
    const parser = new TiledParser(xml)
    const map = parser.parseMap()
    const data = map.layers[0].data
    expect(data).toHaveLength(map.width * map.height)
    expect(data[0]).toBe(1)
})

test('parseMap() method - test objectgroup', () => {
    const parser = new TiledParser(xmlObject)
    const map = parser.parseMap()
    const layer = map.layers[1]
    expect(layer.type).toBe(TiledLayerType.ObjectGroup)
    expect(layer.objects).toHaveLength(1)
    expect(layer.objects[0]).toMatchObject({ id: 1, x: 62.0593, y: 24.752, width: 19.0124, height: 20.0886 })
})

test('parseMap() method - test properties', () => {
    const parser = new TiledParser(xmlProperties)
    const map = parser.parseMap()
    const layer = map.layers[1]
    expect(layer.properties).toMatchObject({ test: 0 })
    expect(layer.objects[0].properties).toMatchObject({ objectprop: 0 })
})

test('parseMap() method - test properties', () => {
    const parser = new TiledParser(xmlDeepProperties)
    const map = parser.parseMap()
    const properties: any = map.properties
    expect(properties.test).toHaveProperty('hp', 5)
    expect(properties.test).toHaveProperty('mode', 'scenario')
    expect(properties.test).toHaveProperty('_classname', 'Event')
})

test('parseMap() method - test group', () => {
    const parser = new TiledParser(xmlGroup)
    const map = parser.parseMap()
    const layer = map.layers[2]
    expect(layer.type).toBe(TiledLayerType.Group)
    expect(layer.layers).toHaveLength(1)
    expect(layer.properties).toMatchObject({ grouptest: 0 })
})

test('parseMap() method - test image', () => {
    const parser = new TiledParser(xmlImage)
    const map = parser.parseMap()
    const layer = map.layers[1]
    expect(layer.type).toBe(TiledLayerType.Image)
    expect(layer).toHaveProperty('image')
    expect(layer.image).toMatchObject({ source: 'assets/test.png', width: 1536, height: 2112 })
})

test('parseMap() method - test tileset', () => {
    const parser = new TiledParser(xmlTile)
    const map = parser.parseMap()
    expect(map).toHaveProperty('tilesets')
    expect(map.tilesets).toHaveLength(1)
    const tileset = map.tilesets[0]
    expect(tileset).toHaveProperty('firstgid', 1)
    expect(tileset).toHaveProperty('source', '[Base]BaseChip_pipo.tsx')
})

test('parseMap() method - test text object', () => {
    const parser = new TiledParser(xmlText)
    const map = parser.parseMap()
    const layer = map.layers[0].objects[0]
    expect(layer).toHaveProperty('text')
    expect(layer.text).toHaveProperty('text', 'Hello World')
    expect(layer.text).toHaveProperty('wrap', true)
})