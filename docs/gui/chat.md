---
title: "Chat module"
description: "Add authoritative, replaceable map or global chat with @rpgjs/chat."
---

# Chat module

`@rpgjs/chat` provides a removable chat feature for RPGJS v5. The server owns
author identity, timestamps, validation, moderation, rate limits, and broadcast
scope. The client submits text and renders messages.

## Setup

```bash
npm install @rpgjs/chat
```

Register both sides with one provider:

```ts
import { provideChat } from '@rpgjs/chat'

export default {
  providers: [
    provideChat({
      server: {
        channels: ['map'],
        maxLength: 180,
      },
    }),
  ],
}
```

Map chat is enabled by default. Global chat is opt-in and requires a
`broadcastGlobal(message)` adapter so deployment topology remains an
application decision.

## Replace the component

The default GUI is a CanvasEngine `.ce` component registered as `rpg-chat`.
Replace its presentation without changing server behavior:

```ts
import { provideChat } from '@rpgjs/chat'
import CustomChat from './gui/custom-chat.vue'

provideChat({
  client: {
    component: CustomChat,
    renderer: 'vue',
  },
})
```

The replacement receives the same chat data contract. It must submit messages
through the chat client API; author, player ID, timestamp, and map are always
reconstructed by the server.

## Moderation

Use `beforeSend` to reject or rewrite a validated message and `afterSend` for
auditing:

```ts
provideChat({
  server: {
    beforeSend({ text, player, channel }) {
      if (isBlocked(player, channel, text)) return false
      return filterText(text)
    },
    afterSend(message) {
      auditChatMessage(message)
    },
  },
})
```

Private messages, voice chat, and permanent history are intentionally outside
the core module.
