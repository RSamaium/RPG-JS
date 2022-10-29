type HitCommon = {
    x: number
    y: number
    properties?: {
        [key: string]: any
    }
    name: string
}

export type HitEllipse = {
    ellipse: boolean
    width: number
    height: number
    type: 'ellipse'
    rotation?: number
} & HitCommon

export type HitPolygon = {
    polygon: { x: number, y: number }[]
    type: 'polygon'
} & HitCommon

export type HitObject = HitEllipse | HitPolygon