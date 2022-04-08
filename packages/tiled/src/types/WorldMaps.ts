export interface TiledWorldMap {
    fileName: string
    height: number
    width: number
    x: number
    y: number
}

export interface TiledWorld {
    maps: TiledWorldMap[]
    onlyShowAdjacentMaps: boolean,
    type: 'world'
}