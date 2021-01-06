import { RpgSprite } from '../Sprite/Player'

export interface ISpriteCharacter {
    onCharacterWalk(sprite: RpgSprite): void
    onCharacterStand(sprite: RpgSprite): void
    onCharacterAction(sprite: RpgSprite): void
}