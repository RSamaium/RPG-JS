import { TiledProperties } from "./Properties"

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG   = 0x40000000
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000

export class TileGid extends TiledProperties {
    private _gid: number 

    constructor(public obj) {
        super(obj)
        this._gid = obj.gid
        Reflect.deleteProperty(obj, 'gid')
    }

    get horizontalFlip(): boolean {
        return !!(this._gid & FLIPPED_HORIZONTALLY_FLAG)
    }

    get verticalFlip(): boolean {
        return !!(this._gid & FLIPPED_VERTICALLY_FLAG)
    }

    get diagonalFlip(): boolean {
        return !!(this._gid & FLIPPED_DIAGONALLY_FLAG)
    }

    get gid(): number {
        return this._gid & ~(FLIPPED_HORIZONTALLY_FLAG |
            FLIPPED_VERTICALLY_FLAG |
            FLIPPED_DIAGONALLY_FLAG)
    }

    set gid(val: number) {
        this._gid = val
    }
}