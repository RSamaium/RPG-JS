export class TextComponent extends PIXI.Text {
    static readonly id: string = 'text'

    constructor(private data, _text: string) {
        super(_text)
    }
}