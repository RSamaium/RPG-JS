import { TiledObject } from "./Objects";
import { TiledChunk, TiledCompression, TiledEncoding, TiledImage, TiledProperty } from "./Types";

export enum TiledLayerType {
    Tile = 'tilelayer',
    ObjectGroup = 'objectgroup',
    Image = 'imagelayer',
    Group = 'group'
}

export interface TiledLayer {
    /**
     * Incremental ID - unique across all layers
     */
    id: number;
    /**
     * Image used by this layer. imagelayer only.
     */
    image: TiledImage;
    /**
     * Array of unsigned int (GIDs) or base64-encoded data. tilelayer only.
     */
    data: number[] | string;
    /**
     * 	Array of chunks (optional). tilelayer only.
     */
    chunks: TiledChunk[];
    /**
     * Column count. Same as map width for fixed-size maps.
     */
    width: number;
    /**
     * Row count. Same as map height for fixed-size maps.
     */
    height: number;
    /**
     * Name assigned to this layer
     */
    name: string;
    /**
     * From [0, 1]
     */
    opacity: number;
    properties: {
        [key: string]: any
    }
    /**
     * csv (default) or base64. tilelayer only.
     */
    encoding: TiledEncoding;
    /**
     * zlib, gzip, zstd (since Tiled 1.3) or empty (default). tilelayer only.
     */
    compression?: TiledCompression;
 
    /**
     * Type of layer (tilelayer, objectgroup)
     */
    type: TiledLayerType;

    /**
     * @since 1.9
     */
    class: string

    /**
     * Whether layer is shown or hidden in editor
     */
    visible: boolean;
 
    /**
     * Horizontal layer offset in tiles. Always 0.
     */
    x: number;
    /**
     * Vertical layer offset in tiles. Always 0.
     */
    y: number;
 
    /**
     * Layer order in the original Tiled source
     */
    order: number;
    /**
     * Horizontal layer offset in pixels (default: 0)
     */
    offsetx: number;
    /**
     * Vertical layer offset in pixels (default: 0)
     */
    offsety: number;
    /**
     * X coordinate where layer content starts (for infinite maps)
     */
    startx: number;
    /**
     * Y coordinate where layer content starts (for infinite maps)
     */
    starty: number;
 
    /**
     * Hex-formatted color (#RRGGBB or #AARRGGBB) that is multiplied with any graphics drawn by this layer or any child layers (optional).
     */
    tintcolor: string;
    /**
     * Hex-formatted color (#RRGGBB) (optional). imagelayer only.
     */
    transparentcolor: string;
 
    /**
     * topdown (default) or index. objectgroup only.
     */
    draworder: 'topdown' | 'index' | 'objectgroup';
    /**
     * Array of objects. objectgroup only.
     */
    objects: TiledObject[];

    layers: TiledLayer[]

    parallaxx: number
    parallaxy: number
    repeatx: number
    repeaty: number
    locked: boolean
    color: string
 }