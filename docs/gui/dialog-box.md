---
title: "Dialog Box"
description: "Guide for Dialog Box in RPGJS."
---

# Dialog Box

The dialog box system in RPG.js allows you to display text messages and choices to players. It provides a built-in GUI component that handles text display, typewriter effects, and choice selection.

## Basic Usage

### Show Text

The `showText()` method displays a simple text message to the player:

```typescript
// Basic text display
await player.showText('Hello World!');

// Text with options
await player.showText('Welcome to our village!', {
    position: 'bottom',
    typewriterEffect: true,
    autoClose: false
});
```

### Show Choices

The `showChoices()` method displays a dialog with multiple choices for the player to select from:

```typescript
// Basic choices
const choice = await player.showChoices('What would you like to do?', [
    { text: 'Fight', value: 'fight' },
    { text: 'Run away', value: 'run' },
    { text: 'Talk', value: 'talk' }
]);

if (choice) {
    console.log('Player selected:', choice.value);
}
```

### Show an Input

Pass `input` to display a typed field in the same dialog box. The field is active
immediately, including while the typewriter animation is running. It accepts the
same input, textarea, and validation options as `player.showInput()`.

```typescript
const age = await player.showText('How old are you?', {
  speaker: 'Innkeeper',
  input: {
    type: 'number',
    required: true,
    min: 1,
    max: 120
  }
})
// age is number | null
```

Number inputs resolve to `number | null`; text inputs and textareas resolve to
`string | null`. Input and `choices` are mutually exclusive. Validation runs on
the server, while the dialog remains open to display translated errors.

Button labels are customizable with `confirmText` and `cancelText`. Set
`cancelButton: false` to hide the Cancel button while keeping the dialog's normal
close controls available.

## Dialog Options

`showText()` and `showChoices()` accept the following dialog options:

### Position

Controls where the dialog box appears on screen:

```typescript
await player.showText('Message', {
    position: 'bottom'  // 'top', 'middle', or 'bottom'
});
```

### Full Width

Determines if the dialog box takes the full width of the screen:

```typescript
await player.showText('Message', {
    fullWidth: true  // true by default
});
```

### Auto Close

If enabled, the dialog automatically closes after a delay:

```typescript
await player.showText('Message', {
    autoClose: true  // false by default
});
```

### Typewriter Effect

Controls the typewriter animation effect:

```typescript
await player.showText('Message', {
    typewriterEffect: true  // true by default
});
```

### Talk With

Makes an event or player turn toward the player during the dialog:

```typescript
// In an event
await player.showText('Hello!', {
    talkWith: this  // Makes the event turn toward the player
});
```

### Speaker Name

Overrides the speaker label shown in the dialog:

```typescript
await player.showText('Hello!', {
    talkWith: this,
    speaker: 'Mystery Voice'
});
```

### Face Display

Shows a character face with a specific expression:

```typescript
await player.showText('Hello!', {
    face: {
        id: 'facesetId',
        expression: 'happy'
    }
});
```

## Faceset Configuration

To use faces in dialogs, you need to configure the faceset spritesheet on the client side. The faceset is a single image containing multiple character expressions arranged in a grid.

### Client-side Setup

In your client configuration (`config.client.ts`), add the faceset spritesheet:

```typescript
import { Presets } from "@rpgjs/client";

export default {
  providers: [
    provideClientModules([
      {
        spritesheets: [
          Presets.FacesetPreset({
            id: "facesetId",
            image: "faceset.png",
            width: 1024,
            height: 1024,
          }, 3, 4, {
            happy: [0, 0],
            sad: [1, 0],
            angry: [2, 0],
            surprised: [0, 1],
            neutral: [1, 1],
            worried: [2, 1]
          }),
        ],
      },
    ]),
  ],
};
```

### Faceset Parameters

- `id`: Unique identifier for the faceset
- `image`: Path to the faceset image file
- `width/height`: Dimensions of the faceset image
- `framesWidth/framesHeight`: Number of frames horizontally and vertically in the grid
- `expressions`: Object mapping expression names to their grid positions `[frameX, frameY]`

### Using Faces in Dialogs

Once configured, you can use the faceset in dialogs:

```typescript
// Server-side usage
await player.showText('Hello!', {
    face: {
        id: 'facesetId',      // Must match the spritesheet ID
        expression: 'happy'    // Must match an expression defined in the preset
    }
});
```

### Faceset Image Layout

Your faceset image should be organized in a grid. For example, with `framesWidth: 3` and `framesHeight: 4`:

```
[0,0] [1,0] [2,0]
[0,1] [1,1] [2,1]
[0,2] [1,2] [2,2]
[0,3] [1,3] [2,3]
```

Each position `[frameX, frameY]` corresponds to a specific expression in your faceset.

## Dialog Box Customization

You can customize the appearance and sounds of the dialog box using `provideClientGlobalConfig()` in your client configuration.

### Styling the Dialog Box

```typescript
import { provideClientGlobalConfig } from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig({
      box: {
        styles: {
          backgroundColor: "#1a1a2e",    // Background color
          backgroundOpacity: 0.9,        // Background opacity
        }
      }
    }),
  ],
};
```

### Customizing Sounds

You can customize the sounds used by the dialog box. The sound IDs in `provideClientGlobalConfig()` must correspond to the sound IDs defined in `provideClientModules()`.

> **See also:** [Sounds Guide](/guide/sounds) for comprehensive information about sound configuration, dynamic sound resolution, and playing sounds from the server.

```typescript
import { provideClientGlobalConfig } from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig({
      box: {
        sounds: {
          typewriter: "typewriterId",    // Sound for typewriter effect
          cursorMove: "cursorId",        // Sound when moving cursor in choices
          cursorSelect: "selectId"       // Sound when selecting a choice
        }
      }
    }),
  ],
};
```

**Important**: The sound IDs in the `box.sounds` configuration must match the sound IDs defined in your `provideClientModules()` configuration. The sounds themselves are loaded through the `sounds` array in `provideClientModules()`.

### Complete Configuration Example

```typescript
import { provideClientGlobalConfig, provideClientModules } from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig({
      box: {
        styles: {
          backgroundColor: "#2a2a4e",
          backgroundOpacity: 0.95,
        },
        sounds: {
          typewriter: "typewriterId",
          cursorMove: "cursorId",
          cursorSelect: "selectId"
        }
      }
    }),
    provideClientModules([
      {
        sounds: [
          {
            id: "typewriterId",
            src: "typewriter.wav",
          },
          {
            id: "cursorId",
            src: "cursor.wav",
          },
          {
            id: "selectId",
            src: "select.wav",
          }
        ],
      },
    ]),
  ],
};
```

## See Also

- [Sounds Guide](/guide/sounds) - Comprehensive guide on configuring and using sounds, including dynamic sound resolution
- [Prebuilt GUI Contracts](/gui/prebuilt-contracts) - Data and interaction contract for replacing `rpg-dialog` with your own CanvasEngine or Vue dialog box
