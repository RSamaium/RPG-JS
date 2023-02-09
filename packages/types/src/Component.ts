export type ComponentObject<T> = { id: string, value: T }
type LayoutPosition<T> = { col: ComponentObject<T>[] }[]

export type LayoutObject<T> = {
    top: LayoutPosition<T>,
    bottom: LayoutPosition<T>,
    left: LayoutPosition<T>,
    right: LayoutPosition<T>
    center: LayoutPosition<T>
}

export type TextComponentObject = {
    id: 'text',
    value: {
        text: string,
        margin?: number,
        height?: number,
        style?: {
            fill?: string,
            align?: 'left' | 'center' | 'right' | 'justify',
            wordWrap?: boolean,
            wordWrapWidth?: number,
            fontSize?: number | string,
            fontFamily?: string | string[],
            stroke?: string,
            fontStyle?: 'normal' | 'italic' | 'oblique',
            fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
        }
    } | string
}

type BarComponentStyle = {
    bgColor?: string,
    fillColor?: string,
    borderColor?: string,
    borderWidth?: number,
    height?: number,
}

export type BarComponentObject = {
    id: 'bar',
    value: {
        current: string,
        max: string,
        style?: BarComponentStyle | {
            perPercent: {
                [percent: string]: BarComponentStyle
            },
            height?: number
        }
    }
}