import type { RpgPlayer } from "@rpgjs/server";
import type { Block } from "../types/block";
import { Group } from "../types/group";

export type ChangeGold = {
    id: 'gold'
    value: number
}

export default (formatMessage): Block => ({
    id: 'gold',
    group: Group.Param,
    title: formatMessage({
        defaultMessage: 'Show Choices',
        description: 'Choices block',
        id: 'block.choice'
    }),
    description: formatMessage({
        defaultMessage: 'Display a choice',
        description: 'Choices block description',
        id: 'block.choice.description'
    }),
    display: ['gold'],
    schema: {
        type: 'object',
        properties: {
            value: {
                type: 'number',
                title: formatMessage({
                    defaultMessage: 'Value',
                    description: 'Set Value',
                }),
            }
        },
        required: ['value']
    },
    async execute(player: RpgPlayer, dataBlock: ChangeGold) {
        player.gold += dataBlock.value
        return undefined
    }
})