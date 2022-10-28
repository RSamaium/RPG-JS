export type Box = { minX: number, minY: number, maxX: number, maxY: number }

export class VirtualGrid {
    private cells: Map<number, Set<string>> = new Map()
    private inverseCells: Map<string, Set<number>> = new Map()

    constructor(private nbCellWidth: number, private cellWidth: number, private cellHeight: number) {}

    zoom(nbCell: number): VirtualGrid {
        this.nbCellWidth = Math.ceil(this.nbCellWidth / nbCell)
        this.cellWidth *= nbCell
        this.cellHeight *= nbCell
        return this
    }

    getCellIndex(x: number, y: number) {
        return this.nbCellWidth * Math.floor(y / this.cellHeight) + Math.floor(x / this.cellWidth) 
    }

    getCells(box: Box, cb: (index: number) => void) {
        const {
            minX,
            minY,
            maxX,
            maxY
        } = box
        const topLeft = this.getCellIndex(minX, minY)
        const topRight = this.getCellIndex(maxX, minY)
        const bottomLeft = this.getCellIndex(minX, maxY)
        const nbLines = (bottomLeft - topLeft) / this.nbCellWidth + 1
        for (let j=0 ; j < nbLines ; j++) {
            for (let i = topLeft ; i <= topRight ; i++) {
                const index = i + (j * this.nbCellWidth)
                cb(index)
            }
        }
    }

    getObjectsByBox(box: Box): Set<string> {
        let objects: string[] = []
        this.getCells(box, (index) => {
            objects = [...objects, ...this.cells.get(index) || []]
        })
        return new Set(objects)
    }

    getObjectsById(id: string): Set<string> {
        let objects: string[] = []
        const cells = this.inverseCells.get(id)
        cells?.forEach((index) => {
            objects = [...objects, ...this.cells.get(index) || []]
        })
        return new Set(objects)
    }

    clearObjectInCells(id: string) {
        if (this.inverseCells.has(id)) {
            this.inverseCells.get(id)?.forEach((cellIndex: number) => {
                this.cells.get(cellIndex)?.delete(id)
            })
            this.inverseCells.delete(id)
        }
    }

    insertInCells(id: string, box: { minX: number, minY: number, maxX: number, maxY: number }) {
        this.clearObjectInCells(id)
        const cells: Set<number> = new Set()
        this.getCells(box, (index) => {
            cells.add(index)
            const memoryCells = this.cells.get(index)
            if (!memoryCells) {
                this.cells.set(index, new Set())
            }
            this.cells.get(index)?.add(id)
        })
        this.inverseCells.set(id, cells)
    }
}