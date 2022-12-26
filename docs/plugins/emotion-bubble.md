# Emotion Bubble

## Goal

Display a bubble with an emotion 

![emotion](/assets/plugins/emotion.png)

## Installation

1. `npm install @rpgjs/plugin-emotion-bubbles`
2. In <PathTo to="modIndex" /> file, add:

```ts
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'

export default [
   emotionBubblesPlugin
   // more modules here
]
```

## Usage

On the server side, use the new method: `player.showEmotionBubble()`:

Example:

```ts
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

@EventData({
    name: 'EV-1'
})
export class MyEvent extends RpgEvent {
    onAction(player: RpgPlayer) {
        player.showEmotionBubble(EmotionBubble.Like)
    }
} 
```

[the list of predefined emotions](https://github.com/RSamaium/RPG-JS/blob/v3/packages/plugins/emotion-bubbles/src/emotion.ts)

## Personalization

Add the following configuration (in <Path to="configDir" file="client/index.ts" />):

```ts
export default {
    // ... others configs
    emotionBubble: {
        image: require('./assets/my-icons.png'),
        width: 192,
        height: 190,
        framesHeight: 5,
        framesWidth:6,
        anchor: [0.5],
        y: -40,
        x: 10,
        textures: {
            like: [0, 0],
            otherid: [0, 1]
        }
    }
}
```

(The options are the same as spritesheet decorator)[/classes/spritesheet.html#example-spritesheet], but a small difference in the textures: put the name of the emotion and its position in the image `[line, column]`

Usage Example: `player.showEmotionBubble('otherid')`
