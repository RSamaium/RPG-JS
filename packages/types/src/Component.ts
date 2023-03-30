export type LayoutOptions = {
    width?: number,
    height?: number,
    marginBottom?: number,
    marginTop?: number,
    marginLeft?: number,
    marginRight?: number
}

export type ComponentObject<T> = { id: string, value: T }

type LayoutPosition<T> = {
    lines: { col: ComponentObject<T>[] }[],
} & LayoutOptions

export type LayoutPositionEnum = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type LayoutObject<T> = {
    [position in LayoutPositionEnum]?: LayoutPosition<T>
}

export type TextComponentStyleObject = {
    opacity?: number,
    fill?: string,
    align?: 'left' | 'center' | 'right' | 'justify',
    wordWrap?: boolean,
    fontSize?: number | string,
    fontFamily?: string | string[],
    stroke?: string,
    fontStyle?: 'normal' | 'italic' | 'oblique',
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
}

export type TextComponentObject = {
    id: 'text',
    value: {
        text: string,
        margin?: number,
        height?: number,
        style?: TextComponentStyleObject
    } | string
}

export type ImageComponentObject = {
    id: 'image',
    value: {
        source: string
    } | string
}

type ShapeCircle = {
    type: 'circle',
    radius: number | string
}

type ShapeRect = {
    type: 'rect',
    width?: number | string,
    height?: number | string
}

type ShapeEllipse = {
    type: 'ellipse',
    width?: number | string,
    height?: number | string
}

type ShapeLine = {
    type: 'line',
    x1: number | string,
    y1: number | string,
    x2: number | string,
    y2: number | string
}

type ShapePolygon = {
    type: 'polygon',
    points: number[]
}

type ShapeRoundedRect = {
    type: 'rounded-rect',
    width?: number | string,
    height?: number | string,
    radius: number | string
}

export type ShapeComponentObject = {
    id: 'shape',
    value: {
        opacity?: number | string,
        fill: string,
        line?: {
            color?: string,
            width?: number | string,
            alpha?: number | string
        },
    } & (ShapeCircle | ShapeRect | ShapeEllipse | ShapeLine | ShapePolygon | ShapeRoundedRect)
}

export type DebugComponentObject = {
    id: 'debug',
    value: {
        text: string
    } | string
}

export type TileComponentObject = {
    id: 'tile',
    value: {
        gid: number,
        height?: number
        width?: number
    } | number
}

type BarComponentStyle = {
    bgColor?: string,
    fillColor?: string,
    borderColor?: string,
    borderWidth?: number,
    height?: number,
    width?: number,
    borderRadius?: number,
    opacity?: number
}

export type BarComponentObject = {
    id: 'bar',
    value: {
        current: string,
        max: string,
        text?: string,
        style?: BarComponentStyle | {
            perPercent: {
                [percent: string]: {
                    fillColor?: string
                }
            }
        } & BarComponentStyle
    }
}