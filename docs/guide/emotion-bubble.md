---
title: "Emotion Bubbles"
description: "Show an emotion icon above a player or an event with player.showEmotionBubble()."
---

# Emotion Bubbles

An emotion bubble is a small icon (heart, exclamation mark, light bulb...) shown
above a player or an event. It pops in with a bounce, follows the character if it
moves, stays visible for a moment, then pops out.

Emotion bubbles are built in. There is nothing to install or register.

## Show a bubble

Call `showEmotionBubble()` on the server, on a player or on an event:

```ts
import { defineModule, RpgPlayer, RpgServer } from "@rpgjs/server";

export default defineModule<RpgServer>({
  player: {
    onJoinMap(player: RpgPlayer) {
      player.showEmotionBubble("happy");
    },
  },
});
```

```ts
const npc = {
  name: "Villager",
  onAction(player: RpgPlayer) {
    this.showEmotionBubble("surprise");
    player.showEmotionBubble("question");
  },
};
```

The bubble is visible to every client on the map.

## Options

The second argument customizes the display:

```ts
event.showEmotionBubble("idea", { size: 3, hold: 2500, offsetY: -20 });
```

| Option | Default | Description |
| --- | --- | --- |
| `hold` | `1700` | Time in ms the icon stays visible once it has popped in |
| `size` | `2` | Scale of the icon |
| `offsetX` | `0` | Horizontal offset from the center of the character |
| `offsetY` | `-8` | Vertical offset from the top of the character |

## Built-in emotions

The emotion names are typed, so your editor suggests them:

`confusion`, `question`, `like-break`, `surprise`, `two-dot`, `dollar`, `stars`,
`music`, `like`, `exclamation`, `one-dot`, `jaded`, `star`, `haha`, `sad`,
`beads`, `cross`, `hungry`, `zz`, `idea`, `happy`, `bead`, `cloud`, `surprise2`,
`z`, `likes`, `empty`, `three-dot`, `circle`, `hungry2`.

The table is exported as `EMOTION_BUBBLES` from `@rpgjs/common`. It maps each name
to its `[column, row]` cell in the icon sheet.

## Use your own icons

The icon sheet is sent with the animation, so you can replace it per call. Pass the
image and its grid, and `frame` to pick the icon:

```ts
player.showEmotionBubble("angry", {
  image: "my-bubbles.png",
  width: 128,
  height: 64,
  framesWidth: 4,
  framesHeight: 2,
  frame: [1, 0], // [column, row]
});
```

| Option | Description |
| --- | --- |
| `image` | URL of your sheet (for example a file in `public/`) |
| `width`, `height` | Size of the sheet image in pixels |
| `framesWidth`, `framesHeight` | Number of columns and rows |
| `frame` | `[column, row]` of the icon to show |

`frame` is required for a name that is not in the built-in table. Without it, the
client logs a warning and shows nothing.

## How it works

`showEmotionBubble()` is a thin wrapper around
[`showComponentAnimation()`](/guide/display-animations) with the `emotion-bubble`
animation id. The client registers the matching component by default, and the
default icon sheet is bundled inside `@rpgjs/client`.
