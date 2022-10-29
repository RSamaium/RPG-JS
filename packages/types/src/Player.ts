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