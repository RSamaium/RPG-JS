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

export type TextComponentObject = {
    id: 'text',
    value: {
        text: string,
        margin?: number,
        height?: number,
        style?: {
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
    } | string
}

export type ImageComponentObject = {
    id: 'image',
    value: {
        source: string
    } | string
}

export type ColorComponentObject = {
    id: 'color',
    value: {
        color: string
    } | string
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
        gid: number
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
        style?: BarComponentStyle | {
            perPercent: {
                [percent: string]: {
                    fillColor?: string
                }
            } 
        } & BarComponentStyle
    }
}