import { VirtualGrid } from '@rpgjs/common'
import { beforeEach, test, afterEach, expect } from 'vitest'

let grid
const NB_CELLS_WIDTH = 10
const CELL_SIZE = 32
const OBJECT_ID = 'obj_id'
const OBJECT_ID2 = 'obj_id2'

beforeEach(() => {
    grid = new VirtualGrid(NB_CELLS_WIDTH, CELL_SIZE, CELL_SIZE)
})

test('Zoom', () => {
    const zoom = 5
    grid.zoom(zoom)
    expect(grid.nbCellWidth).toBe(NB_CELLS_WIDTH/zoom)
    expect(grid.cellWidth).toBe(CELL_SIZE*zoom)
    expect(grid.cellHeight).toBe(CELL_SIZE*zoom)
})

test('Get Cell Index', () => {
    const index1 = grid.getCellIndex(0, 0)
    expect(index1).toBe(0)

    const index2 = grid.getCellIndex(35, 70)
    expect(index2).toBe(21)
})

test('Insert Object in cell', () => {
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 10
    })
    expect(grid.cells.has(0)).toBeTruthy()
    const objects = grid.cells.get(0)
    expect(objects.size).toBe(1)

    expect(grid.inverseCells.has(OBJECT_ID)).toBeTruthy()
    const index = grid.inverseCells.get(OBJECT_ID)
    expect(index.size).toBe(1)
})

test('Insert Object in multi cells', () => {
    const size = 100
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: size,
        minY: 0,
        maxY: size
    })
    const index = [...grid.cells.keys()]
    expect(index.length).toBe(Math.ceil(size / CELL_SIZE) ** 2)
})

test('Get objects in cell', () => {
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 10
    })
    grid.insertInCells(OBJECT_ID2, {
        minX: 5,
        maxX: 20,
        minY: 5,
        maxY: 20
    })
    const objects = grid.getObjectsByBox( {
        minX: 3,
        maxX: 10,
        minY: 3,
        maxY: 10
    })
    expect(objects.size).toBe(2)
})

test('Get objects by object id', () => {
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100
    })
    grid.insertInCells(OBJECT_ID2, {
        minX: 5,
        maxX: 20,
        minY: 5,
        maxY: 20
    })
    const objects = grid.getObjectsById(OBJECT_ID)
    expect(objects.size).toBe(2)
})

test('Clear for object id', () => {
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100
    })
    grid.clearObjectInCells(OBJECT_ID)
    grid.cells.forEach((set) => {
        expect(set.size).toBeFalsy()
    })
    expect(grid.inverseCells.has(OBJECT_ID)).toBeFalsy()
})

test('Insert Object and change celll', () => {
    grid.insertInCells(OBJECT_ID, {
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 10
    })
    grid.insertInCells(OBJECT_ID, {
        minX: 40,
        maxX: 50,
        minY: 40,
        maxY: 50
    })
    const objectsCell0 = grid.cells.get(0)
    expect(objectsCell0.size).toBe(0)
    const objectsCell11 = grid.cells.get(11)
    expect(objectsCell11.size).toBe(1)
    const index = grid.inverseCells.get(OBJECT_ID)
    expect(index.size).toBe(1)
})