import { Observer } from "rxjs"
import { Control } from "./Input"

type Ease = 'easeInSine' | 'easeOutSine' | 'easeInOutSine' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic' | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart' | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint' | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo' | 'easeInCirc' | 'easeOutCirc' | 'easeInOutCirc' | 'easeInBack' | 'easeOutBack' | 'easeInOutBack' | 'easeInElastic' | 'easeOutElastic' | 'easeInOutElastic' | 'easeInBounce' | 'easeOutBounce' | 'easeInOutBounce' | 'linear'

export interface CameraOptions {
    smoothMove?: {
        time?: number,
        // https://easings.net
        ease?: Ease
    } | boolean
}

export enum MoveClientMode {
    Disabled,
    ByDirection,
    Drag
}

export enum Behavior {
    Direction,
    Target
}

export enum Direction { 
    Up = 1,
    Down = 3,
    Left = 4,
    Right = 2,
    UpRight = 1.5,
    DownRight = 2.5,
    DownLeft = 3.5,
    UpLeft =  2.5
}

export type ClientMode =  MoveClientMode | { 
    drag: boolean | { area: number[] }
}

export interface MoveMode {
    checkCollision?: boolean,
    clientMode?: ClientMode,
    behavior?: Behavior
}

export enum PlayerType {
    Player = 'player',
    Event = 'event',
    Shape = 'shape'
}

export type Position = { x: number, y: number, z: number }
export type PositionXY = Pick<Position, 'x' | 'y'>
export type PositionXY_OptionalZ = Pick<Position, 'x' | 'y'> & { z?: Position['z'] }
export type PendingMove = { input: string | Control, frame: number }[]
export type MoveTo = {
    onStuck?: (duration: number) => void
    onComplete?: () => void
    infinite?: boolean
    observer?: Observer<void>
}