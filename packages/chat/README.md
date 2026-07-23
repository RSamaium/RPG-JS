# @rpgjs/chat

Official removable chat module for RPGJS v5. The server owns author identity,
timestamps, validation, moderation, rate limits, and broadcast scope. The
client submits text and renders messages confirmed by the server.

## Setup

```bash
npm install @rpgjs/chat @rpgjs/ui-css
```

Register the client side before `provideClientModules()`:

```ts
import { provideChat } from "@rpgjs/chat/client"
import { provideClientModules } from "@rpgjs/client"

export default {
  providers: [
    provideChat({
      client: {
        position: "bottom-left",
        maxMessages: 100,
      },
    }),
    provideClientModules([]),
  ],
}
```

Register the server side before `provideServerModules()`:

```ts
import { provideChat } from "@rpgjs/chat/server"
import { createServer, provideServerModules } from "@rpgjs/server"

export default createServer({
  providers: [
    provideChat({
      server: {
        channels: ["map"],
        maxLength: 180,
        rateLimit: {
          maxMessages: 5,
          windowMs: 10_000,
        },
      },
    }),
    provideServerModules([]),
  ],
})
```

Import the default semantic styles in the client entry:

```ts
import "@rpgjs/ui-css/index.css"
```

For the pixel theme:

```ts
import "@rpgjs/ui-css/theme-pixel.css"
```

and add `rpg-ui-theme-pixel` to an ancestor of the game.

## Customize

Server hooks:

- `formatAuthor(player)` controls the trusted display name.
- `beforeSend(context)` rejects with `false` or returns moderated text.
- `afterSend(message, player)` runs after a successful broadcast.
- `broadcastGlobal(message, player)` provides application-wide delivery.

Replacement components can use the public client API:

```ts
import {
  chatMessages,
  chatError,
  chatClientOptions,
  sendChatMessage,
  clearChatMessages,
  openChat,
} from "@rpgjs/chat/client"
```

Provide a CanvasEngine or Vue replacement without changing server behavior:

```ts
provideChat({
  client: {
    component: CustomChat,
    renderer: "canvas", // or "vue"
  },
})
```

See the full [Chat module guide](../../docs/gui/chat.md) for all options, a
complete custom `.ce` component, Vue integration, themes, translations, global
chat, and the runnable pixel playground.

Private messages, voice chat, and permanent history are intentionally outside
the core module.
