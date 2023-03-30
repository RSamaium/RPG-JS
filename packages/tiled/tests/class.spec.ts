import { TiledParser } from "../src/parser/parser"
import { tileset, xmlObjectImage, xmlTile } from "./data"
import { Tileset } from '../src/classes/Tileset'
import { Layer, Tile, TiledLayerType, TiledObjectClass } from '../src'
import { test, expect, describe, beforeEach } from 'vitest'

let layer: Layer

function setLayer(xml) {
    const parser = new TiledParser(xml)
    const map = parser.parseMap()
    const parserTileset = new TiledParser(tileset)
    const tilesetData = parserTileset.parseTileset()
    const tilesetInstance = new Tileset(tilesetData)
    map.layers[0].properties = {}
    map.layers[0].properties['cache-tiles'] = true
    layer = new Layer(map.layers[0], [tilesetInstance])
}

describe('Tests classes', () => {

    beforeEach(() => {
        setLayer(xmlTile)
    })

    test('Verify tiles array', () => {
        expect(layer.tiles).toBeDefined()
    })

    test('tiles is not empty', () => {
        expect(layer.tiles).toHaveLength(layer.width * layer.height)
    })

    test('tile is Tile instance', () => {
        expect(layer.tiles[0]).toBeInstanceOf(Tile)
    })

    test('Get Gid', () => {
        const tile = layer.tiles[0]
        expect(tile?.gid).toBe(9)
    })

    test('Get Gid Flip', () => {
        const tile = layer.tiles[1]
        expect(tile?.horizontalFlip).toBe(true)
        expect(tile?.verticalFlip).toBe(false)
        expect(tile?.diagonalFlip).toBe(true)
    })

})


describe('Tests classes for objectgroup', () => {

    beforeEach(() => {
        setLayer(xmlObjectImage)
    })

    test('Verify Type', () => {
       expect(layer.type).toBe(TiledLayerType.ObjectGroup)
    })

    test('has objects property', () => {
        expect(layer).toHaveProperty('objects')
        expect(layer.objects).toHaveLength(1)
    })

    test('TiledObjectClass instance', () => {
        const object = layer.objects[0]
        expect(object).toBeInstanceOf(TiledObjectClass)
        expect(object).toHaveProperty('x')
        expect(object).toHaveProperty('y')
        expect(object).toHaveProperty('width')
        expect(object).toHaveProperty('height')
    })

    test('get gid', () => {
        const object = layer.objects[0]
        expect(object.gid).toBe(1)
    })

    test('test flip', () => {
        const object = layer.objects[0]
        expect(object?.horizontalFlip).toBe(true)
        expect(object?.verticalFlip).toBe(false)
        expect(object?.diagonalFlip).toBe(false)
    })
})