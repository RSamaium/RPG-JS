import choice from './choice'
import text from './text'
import gold from './gold'
import type { Choice } from './choice'
import type { Text } from './text'
import type { ChangeGold } from './gold'

export type Flow = {
    [blockId: string]: Choice | Text | ChangeGold
}

export default [
    choice,
    text,
    gold
]