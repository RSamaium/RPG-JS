export enum HitType {
    Box = 'box',
    Circle = 'circle',
    Polygon = 'polygon'
}

type HitCommon = {
    x: number
    y: number
    properties?: {
        [key: string]: any
    }
    name: string
    type?: string
    visible?: boolean
    gid?: number
}

export type HitEllipse = {
    ellipse: boolean
    width: number
    height: number
    type?: 'ellipse' | HitType.Circle
    rotation?: number
} & HitCommon

export type HitPolygon = {
    polygon: { x: number, y: number }[]
    type?: HitType.Polygon
} & HitCommon

export type HitBox = {
    width: number
    height: number
    type?: HitType.Box
} & HitCommon

export type HitObject = HitBox | HitEllipse | HitPolygon | HitCommon

export type MovingHitbox = {
    speed?: number
}