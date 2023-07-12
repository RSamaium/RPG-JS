import choice from './choice'
import text from './text'
import type { Choice } from './choice'
import type { Text } from './text'

export type Flow = {
    [blockId: string]: Choice | Text
}

export default [
    choice,
    text
]