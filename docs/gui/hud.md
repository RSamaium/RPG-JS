---
title: "HUD"
description: "Guide for HUD in RPGJS."
---

# HUD

The HUD (heads-up display) is a built-in GUI component that shows the player's
level, HP, and SP. It can optionally display a faceset portrait using
`DOMSprite`.

## Basic Usage

Register the HUD in your client module and auto-display it when the current
player is ready:

```typescript
import { defineModule, RpgClient, RpgClientEngine } from '@rpgjs/client';
import { inject } from '@rpgjs/common';
import { HudComponent } from '@rpgjs/client';

export default defineModule<RpgClient>({
    gui: [
        {
            id: 'hud',
            component: HudComponent,
            autoDisplay: true,
            data: {
                faceset: {
                    id: 'facesetId',
                    expression: 'happy'
                }
            },
            dependencies: () => {
                const engine = inject(RpgClientEngine);
                return [engine.scene.currentPlayer];
            }
        }
    ]
});
```

You can also use this exact auto-display config in your client module:

```typescript
{
    id: "hud",
    component: HudComponent,
    autoDisplay: true,
    dependencies: () => {
        const engine = inject(RpgClientEngine)
        return [engine.scene.currentPlayer]
    }
}
```

The HUD stays hidden until the player has entered a map, and while the title
screen (`PrebuiltGui.TitleScreen`) is displayed. It remains visible during map
transfers.

## Faceset (Optional)

The HUD can render a face portrait from a faceset spritesheet. The faceset data
is provided in the GUI data, and the portrait is only displayed when `faceset`
is defined.

### 1) Provide a faceset spritesheet

```typescript
import { Presets } from '@rpgjs/client';

spritesheetResolver: async (id: string) => {
    if (id === 'facesetId') {
        return Presets.FacesetPreset({
            id: 'facesetId',
            image: 'faceset.png',
            width: 1024,
            height: 1024,
        }, 3, 4, {
            happy: [0, 0],
            sad: [1, 0],
        });
    }
    return undefined;
}
```

### 2) Pass faceset data to the HUD

```typescript
import { inject } from '@rpgjs/common';
import { RpgGui } from '@rpgjs/client';

const gui = inject(RpgGui);
gui.display('hud', {
    faceset: {
        id: 'facesetId',
        expression: 'happy'
    }
});
```

If you already auto-display the HUD, you can update the faceset later:

```typescript
gui.display('hud', {
    faceset: {
        id: 'facesetId',
        expression: 'happy'
    }
});
```

Notes:

- If `faceset.expression` is missing, the HUD uses `"default"`.
- If `faceset` is not provided, no portrait area is rendered.
