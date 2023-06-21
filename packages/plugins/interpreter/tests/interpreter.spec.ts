import { describe, expect, test } from 'vitest'
import choice from '../src/blocks/choice'
import { formatMessage } from '../src/format-message'
import { RpgInterpreter } from '../src/interpreter'

const blocks = {
    block1: {
        id: 'text',
        text: 'Hello World'
    },
    block2: {
        id: 'choice',
        text: 'Please ?',
        choices: ['I want to play', 'I want to quit']
    },
    block3: {
        id: 'text',
        text: 'Thanks'
    },
    block4: {
        id: 'text',
        text: 'Ok...'
    }
}

const edges = {
    'block1': 'block2',
    'block2': ['block4', 'block3']
}

describe('Interpreter', () => {
    test('validateBlock has not error', () => {
        const interpreter = new RpgInterpreter(blocks, edges);
        const val = interpreter.validateBlock('block1')
        expect(val).toBeNull()
    })

    test('validateBlock has error', () => {
        const interpreter = new RpgInterpreter({
            block1: {
                id: 'text',
            }
        } as any, edges);
        const val = interpreter.validateBlock('block1')
        expect(val).not.toBeNull()
        expect(val?.errors[0].path).toEqual(['text'])
        expect(val?.errors[0].message).toEqual('Required')
        expect(val?.errors[0].code).toEqual('invalid_type')
    })

    test('validateFlow has not error', () => {
        const interpreter = new RpgInterpreter(blocks, edges)
        const val = interpreter.validateFlow('block1')
        expect(val).toBeNull()
    })

    test('validateFlow has an error', () => {
        const interpreter = new RpgInterpreter({
            block1: {
                id: 'text',
            }
        } as any, edges)
        const val = interpreter.validateFlow('block1')
        console.log(val)
    })
})