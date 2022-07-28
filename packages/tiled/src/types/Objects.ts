import { TiledText } from "./Text";
import { TiledPoint, TiledProperty } from "./Types";

export interface TiledObject {
    id: number;
 
    /**
     * Tile object id
     */
    gid: number;
    /**
     * Used to mark an object as a point
     */
    point: boolean;
    height: number;
    name: string;
    properties: {
        [key: string]: any
    }
    /**
     * Angle in degrees clockwise
     */
    rotation: number;
    type: string;
    /**
     * @since 1.9
     */
    class: string 
    visible: boolean;
    width: number;
    /**
     * X coordinate in pixels
     */
    x: number;
    /**
     * Y coordinate in pixels
     */
    y: number;
 
    /**
     * Reference to a template file, in case object is a template instance
     */
    template: string;
 
    /**
     *	Only used for text objects
     */
    text: TiledText;
 
    /**
     * Whether or not object is an ellipse
     */
    ellipse: boolean;
 
    /**
     * Polygon points
     */
    polygon: TiledPoint[];
 
    /**
     * Polyline points
     */
    polyline: TiledPoint[];
 }