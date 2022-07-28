export interface TiledProperty<T = unknown> {
    /**
     * Name of the property
     */
    name: string;
    /**
     * Type of the property (string (default), int, float, bool, color or file (since 0.16, with color and file added in 0.17))
     */
    type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file';
    /**
     * Value of the property
     */
    value: T;
 }
 
 export type TiledEncoding = 'csv' | 'base64';
 export type TiledCompression = 'zlib' | 'gzip' | 'zstd';
 
 export interface TiledChunk {
    /**
     * Array of unsigned int (GIDs) or base64-encoded data
     */
    data: number[] | string;
    /**
     * Height in tiles
     */
    height: number;
    /**
     * Width in tiles
     */
    width: number;
    /**
     * X coordinate in tiles
     */
    x: number;
    /**
     * Y coordinate in tiles
     */
    y: number;
 }
 
 export interface TiledTileOffset {
    /**
     * Horizontal offset in pixels
     */
    x: number;
    /**
     * Vertical offset in pixels (positive is down)
     */
    y: number;
 }
 
 export interface TiledWangSet {
    /**
     * Array of Wang colors
     */
    cornercolors: TiledWangColor[];
    /**
     * Array of Wang colors
     */
    edgecolors: TiledWangColor[];
    name: string;
    properties: TiledProperty[];
    /**
     * Local ID of tile representing the Wang set
     */
    tile: number;
    wangtiles: TiledWangTile[];
 }
 
 export interface TiledWangTile {
    /**
     * Array of Wang color indexes (uchar[8]
     */
    wangid: number[];
    /**
     * Tile is flipped diagonally (default: false)
     */
    dflip: boolean;
    /**
     * Tile is flipped horizontally (default: false)
     */
    hflip: boolean;
    /**
     * Local ID of tile
     */
    tileid: number;
    /**
     * Tile is flipped vertically (default: false)
     */
    vflip: boolean;
 }
 
 export interface TiledWangColor {
    /**
     * Hex-formatted color (#RRGGBB or #AARRGGBB)
     */
    color: string;
    /**
     * Name of the Wang color
     */
    name: string;
    /**
     * Probability used when randomizing
     */
    probability: number;
    /**
     * Local ID of tile representing the Wang color
     */
    tile: number;
 }
 
 export interface TiledGrid {
    /**
     *	orthogonal (default) or isometric
     */
    orientation: 'orthogonal' | 'isometric';
    /**
     * Cell width of tile grid
     */
    width: number;
    /**
     * Cell height of tile grid
     */
    height: number;
 }
 
 export interface TiledFrame {
    /**
     * Frame duration in milliseconds
     */
    duration: number;
    /**
     * 	Local tile ID representing this frame
     */
    tileid: number;
 }
 export interface TiledMapTerrain {
    name: string;
    /**
     * Local ID of tile representing terrain
     */
    tile: number;
    properties: TiledProperty[];
 }
 
 export interface TiledPoint {
    x: number;
    y: number;
 }

 export interface TiledImage {
   source: string,
   width: number, 
   height: number
   trans?: string
 }