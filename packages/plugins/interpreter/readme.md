# RPGJS Interpreter

## Goal

The aim is to interpret JSON to trigger server-side commands.
What's the point? This allows you to launch commands on the fly, via an HTTP request for example, without having to write them in hard code.
It gives you greater flexibility. What's more, we can imagine a graphical game editor mode that constructs the events

## Installation

`npm install @rpgjs/interpreter`

## Usage

Example:

```ts
// in player.ts
import { RpgInterpreter} from '@rpgjs/interpreter'
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'


const blocks = {
    block1: {
        id: 'text',
        text: 'Hello World'
    },
    block2: {
        id: 'change_gold',
        value: 10
    },
    block3: {
        id: 'choice',
        text: 'Please ?',
        choices: 1
    },
    block4: {
        id: 'text',
        text: 'Thanks'
    },
    block5: {
        id: 'text',
        text: 'Ok...'
    }
}

const edges = {
    'block1': 'block2',
    'block2': 'block3',
    'block3': {
        blocks: [{
            blockId: 'block5',
            handle: 'choices.0'
        }]
    }
}

const interpreter = new Interpreter(blocks, edges)

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        interpreter
            .start({
                block: 'block1',
                player
            })
            .subscribe()
    }
}

export default player
```