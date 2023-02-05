import { Text } from 'pixi.js'

export class TextComponent extends Text {
    static readonly id: string = 'text'

    constructor(private data, _text: string) {
        super(_text)
    }
}