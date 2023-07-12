import type { RpgPlayer } from "@rpgjs/server";
import type { Block } from "../types/block";
import { Group } from "../types/group";

export type Choice = {
    id: 'choice'
    text: string,
    choices: string[]
}

export default (formatMessage): Block => ({
    id: 'choice',
    group: Group.UI,
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
    display: ['text', {
        key: 'choices',
        hasHandles: true
    }],
    schema: {
        type: 'object',
        properties: {
            text: {
                type: 'text',
                title: 'Text'
            },
            choices: {
                type: 'array',
                title: formatMessage({
                    defaultMessage: 'Choices',
                    description: 'Choices block choices',
                    id: 'block.choice.choices'
                }),
                items: {
                    title: formatMessage({
                        defaultMessage: 'Choice',
                        description: 'Choices block choice',
                        id: 'block.choice.choice'
                    }),
                    type: 'string'
                },
                defaultAddValue: '',
                minItems: 1,
                maxItems: 5
            }
        },
        required: ['text']
    },
    async execute(player: RpgPlayer, dataBlock: Choice) {
        const { text, choices } = dataBlock
        const value = await player.showChoices(text, choices.map((choice, index) => ({ text: choice, value: index })))
        if (value === null) {
            throw new Error('Choice not selected')
        }
        return 'choices.' + value.value
    }
})