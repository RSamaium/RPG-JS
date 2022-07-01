import { TilesetTile } from "./Tile";
import { TiledGrid, TiledMapTerrain, TiledProperty, TiledTileOffset, TiledWangSet } from "./Types";

export interface TiledTileset {
    type: 'tileset';
    /**
     * The JSON format version
     */
    version: number;
 
    /**
     * GID corresponding to the first tile in the set
     */
    firstgid: number;
    /**
     * Image used for tiles in this set
     */
    image: {
        source: string
        height: number
        width: number
    }
    /**
     * Height of source image in pixels
     */
    imageheight: number;
    /**
     * Width of source image in pixels
     */
    imagewidth: number;
    /**
     * (optional)
     */
    grid: TiledGrid;
    /**
     * Buffer between image edge and first tile (pixels)
     */
    margin: number;
    /**
     * Alignment to use for tile objects (unspecified (default), topleft, top, topright, left, center, right, bottomleft, bottom or bottomright) (since 1.4)
     */
    objectalignment: 'unspecified' | 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright';
    /**
     * Refers to external tileset file (should be JSON)
     */
    source: string;
    /**
     * Spacing between adjacent tiles in image (pixels)
     */
    spacing: number;
 
    columns: number;
    rows: number;
    /**
     * Maximum height of tiles in this set
     */
    tileheight: number;
    tilewidth: number;
 
    /**
     * Array of Tiles (optional)
     */
    tiles: TilesetTile[];
 
    name: string;
    properties: {
        [key: string]: any
    }
    /**
     * The number of tiles in this tileset
     */
    tilecount: number;
    /**
     * Optional
     */
    tileoffset: TiledTileOffset;
 
    /**
     * The Tiled version used to save the file
     */
    tiledversion: string;
    /**
     * Hex-formatted color (#RRGGBB or #AARRGGBB) (optional)
     */
    backgroundcolor: string;
    /**
     * Hex-formatted color (#RRGGBB) (optional)
     */
    transparentcolor: string;
    /**
     * Array of Terrains (optional)
     */
    terrains: TiledMapTerrain[];
 
    /**
     * Array of Wang sets (since 1.1.5)
     */
    wangsets: TiledWangSet[];
 }