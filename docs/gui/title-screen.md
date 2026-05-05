---
title: "Title Screen"
description: "Guide for Title Screen in RPGJS."
---

# Title Screen

The "title screen" GUI provides a start screen with an action list (for example: Start, Load, etc.).
The list is defined on the client by default and can be overridden by the server.

## Client-side usage (autoDisplay)

Load the GUI on the client to display it without the server. Add it in the client config under `gui` with `autoDisplay: true`.

```ts
import { TitleScreenComponent } from '@rpgjs/client'

export default {
  providers: [
    provideClientModules([
      {
        gui: [
          {
            id: 'rpg-title-screen',
            component: TitleScreenComponent,
            autoDisplay: true,
            data: {
              title: 'Chronicles',
              subtitle: 'of the Ancients',
              version: 'v1.0.0',
              localActions: true,
              saveLoad: {
                mode: 'load',
                slots: [null, null, null]
              },
              entries: [
                { id: 'start', label: 'Start' },
                { id: 'load', label: 'Load' },
                { id: 'credits', label: 'Credits', disabled: true }
              ]
            }
          }
        ]
      }
    ])
  ]
}
```

The component emits a `select` interaction with `{ id, index, entry }`.

When `localActions: true`:
- selecting `start` hides the title screen
- selecting `load` hides the title screen and displays the save/load GUI with `saveLoad`

## Client-side default list

Si le serveur ne fournit pas `entries`, la liste par defaut du client est:

```ts
[
  { id: 'start', label: 'Start' },
  { id: 'load', label: 'Load' }
]
```

To replace the title screen completely, register your own GUI with the `rpg-title-screen` ID. The data and interaction contract is documented in [Prebuilt GUI Contracts](/gui/prebuilt-contracts).

For example, a custom component should emit a `select` interaction with:

```ts
onInteraction('select', { id: entry.id, index, entry })
```

## Style

Les classes CSS sont dans:

- `packages/ui-css/src/primitives/title-screen.css`

Pour personnaliser l'apparence, importez `@rpgjs/ui-css/index.css` puis surchargez les tokens localement ou globalement. Evitez de modifier directement le fichier CSS du package.

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";

.my-title-screen {
  --rpg-ui-accent: #ffd166;
  --rpg-ui-body-background:
    radial-gradient(circle at top, rgba(255, 209, 102, 0.24), transparent 40%),
    linear-gradient(180deg, #17111f 0%, #07050a 100%);
}
```

Les etats publics utilisent `data-selected="true"` et `data-disabled="true"` sur les entrees du menu.
