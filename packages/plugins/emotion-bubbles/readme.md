# Emotion Bubble Plugin

## Installation

`npm install @rpgjs/plugin-emotion-bubbles`

and

```ts
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'

export default [
    emotionBubblesPlugin
]
```

Add in the file `plugins.ts`

## To use the plugin

Use the `showAnimation` command to display the animation

```ts
player.showAnimation('bubble', 'like')
```