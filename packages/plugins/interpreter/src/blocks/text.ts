import type { RpgPlayer } from "@rpgjs/server";
import type { Block } from "../types/block";
import { Group } from "../types/group";

export type Text = {
    id: 'text'
    text: string
}

export default (formatMessage): Block => ({
    id: 'text',
    group: Group.UI,
    title: formatMessage({
        defaultMessage: 'Show Text',
        description: 'Text block',
        id: 'block.text'
    }),
    description: formatMessage({
        defaultMessage: 'Display a text',
        description: 'Text block description',
        id: 'block.text.description'
    }),
    display: ['text'],
    schema: {
        type: 'object',
        properties: {
            text: {
                type: 'text',
                title: 'Text'
            }
        },
        required: ['text']
    },
    execute(player: RpgPlayer, { text }: Text) {
        return player.showText(text)
    }
})