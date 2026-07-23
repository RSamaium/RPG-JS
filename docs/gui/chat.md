---
title: "Chat module"
description: "Configure authoritative map or global chat, moderation hooks, themes, and replacement components with @rpgjs/chat."
---

# Chat module

`@rpgjs/chat` is an optional RPGJS v5 module with a server-authoritative
message flow:

1. The client submits text and a requested channel.
2. The server normalizes and validates the text, applies rate limits and
   moderation, and reconstructs the author and timestamp.
3. The server broadcasts the accepted `ChatMessage`.
4. Each client stores the message in a reactive signal and renders it.

The default GUI is a CanvasEngine component, but presentation is replaceable
without changing the server behavior.

## Install

```bash
npm install @rpgjs/chat @rpgjs/ui-css
```

The default component also uses the semantic styles from `@rpgjs/ui-css`.

```ts
// src/client.ts or src/standalone.ts
import '@rpgjs/ui-css/index.css'
```

## Configure the client

Use the explicit client entry point. This prevents server code from entering a
browser bundle when standalone mode loads both runtime entry graphs.

```ts
// config/config.client.ts
import { provideChat } from '@rpgjs/chat/client'
import { provideClientModules } from '@rpgjs/client'

export default {
  providers: [
    provideChat({
      client: {
        position: 'bottom-left',
        maxMessages: 100,
        maxLength: 180,
        autoOpen: true,
      },
    }),

    // Module providers must be registered before this aggregator.
    provideClientModules([]),
  ],
}
```

### Client options

| Option | Default | Description |
| --- | --- | --- |
| `guiId` | `'rpg-chat'` | GUI identifier used by `RpgGui`. |
| `component` | Built-in `chat.ce` | CanvasEngine or Vue replacement component. |
| `renderer` | `'canvas'` | Use `'canvas'` for `.ce` and `'vue'` for Vue. |
| `autoOpen` | `true` | Display the chat when the current player is ready. |
| `position` | `'bottom-left'` | `top-left`, `top-right`, `bottom-left`, or `bottom-right`. |
| `maxMessages` | `100` | Maximum messages retained by the local client signal. |
| `maxLength` | `180` | Maximum length accepted by the built-in input. Keep it aligned with the server option. |

`maxMessages` limits client memory only. It does not create permanent history.
The server remains authoritative for `maxLength`; configure the same value on
both sides so the built-in input rejects exactly the same message lengths.

## Configure the server

Use the explicit server entry point and register it before
`provideServerModules()`:

```ts
// server.ts
import { provideChat } from '@rpgjs/chat/server'
import { createServer, provideServerModules } from '@rpgjs/server'

export default createServer({
  providers: [
    provideChat({
      server: {
        channels: ['map'],
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

Map chat is enabled by default. A map message is broadcast only to players in
the sender's current map. An omitted channel defaults to `map`; any explicitly
supplied value other than `map` or `global` is rejected.

### Server options and hooks

| Option | Default | Description |
| --- | --- | --- |
| `channels` | `['map']` | Accepted channels: `map`, `global`, or both. |
| `maxLength` | `180` | Maximum normalized message length. |
| `rateLimit` | 5 messages / 10 seconds | Per-player rate limit; use `false` to disable it. |
| `formatAuthor(player)` | Player name or `Player {id}` | Builds the trusted display name on the server. |
| `beforeSend(context)` | — | Rejects with `false`, or returns the text that should be broadcast. May be async. |
| `afterSend(message, player)` | — | Runs after a successful broadcast. Useful for audit, metrics, or automated replies. May be async. |
| `broadcastGlobal(message, player)` | — | Required adapter when `global` is enabled. |

The hook order is:

```text
normalize → length/rate validation → beforeSend → construct ChatMessage
→ broadcast → afterSend
```

### Moderation example

```ts
import { provideChat } from '@rpgjs/chat/server'

provideChat({
  server: {
    channels: ['map'],

    formatAuthor(player) {
      return `[Guild] ${player.name || player.id}`
    },

    beforeSend({ text, player, channel }) {
      if (isMuted(player, channel)) return false
      return filterBlockedWords(text)
    },

    async afterSend(message, player) {
      await auditChatMessage({
        message,
        accountId: player.id,
      })
    },
  },
})
```

Clients never choose the accepted author, player ID, map ID, or timestamp.

## Global chat

Global chat is opt-in because the correct broadcast mechanism depends on the
deployment topology. Enable the channel and provide an adapter:

```ts
provideChat({
  server: {
    channels: ['map', 'global'],

    async broadcastGlobal(message, player) {
      await applicationChatBus.publish(message, {
        senderId: player.id,
      })
    },
  },
})
```

The adapter is responsible for delivering the message to all intended clients,
including clients hosted by another room, process, or edge location.

## Client API

Replacement components and client modules can import:

| Export | Purpose |
| --- | --- |
| `chatMessages` | Reactive `ChatMessage[]` signal. |
| `chatError` | Reactive signal containing the last server validation error. |
| `chatClientOptions` | Resolved client configuration signal. |
| `sendChatMessage(text, channel?)` | Submits text to the authoritative server. |
| `clearChatMessages()` | Clears local retained messages. |
| `openChat()` | Opens the configured chat GUI manually. |

`sendChatMessage()` does not add an optimistic message. The UI changes only
after the server broadcasts the accepted `ChatMessage`.

### Message contract

```ts
interface ChatMessage {
  id: string
  text: string
  author: string
  playerId: string
  channel: 'map' | 'global'
  mapId?: string
  createdAt: number
}
```

## Replace the CanvasEngine component

A replacement component does not receive the message history as props.
Instead, it consumes the public chat signals. GUI data contains the configured
`position` and `maxLength`.

Create `gui/custom-chat.ce`:

```html
<DOMContainer width="100%" height="100%">
  <section class="custom-chat" data-position={position()}>
    <div class="custom-chat__log" role="log" aria-live="polite">
      @for (message of messages) {
        <p class="custom-chat__message">
          <strong>{message.author}</strong>
          <span>{message.text}</span>
        </p>
      }
    </div>

    @if (errorText()) {
      <p class="custom-chat__error" role="alert">{errorText()}</p>
    }

    <form submit={submitMessage}>
      <input
        name="message"
        type="text"
        maxlength={maxLength}
        value={draft}
        placeholder={t("rpg.chat.placeholder")}
      />
      <button type="submit">{t("rpg.chat.send")}</button>
    </form>
  </section>
</DOMContainer>

<script>
  import { computed, signal } from "canvasengine";
  import { inject, RpgClientEngine } from "@rpgjs/client";
  import {
    chatClientOptions,
    chatError,
    chatMessages,
    sendChatMessage
  } from "@rpgjs/chat/client";

  const { data } = defineProps();
  const engine = inject(RpgClientEngine);
  const { t } = engine.i18n();
  const draft = signal("");

  const messages = computed(() => chatMessages());
  const position = computed(() => {
    return data()?.position || chatClientOptions().position;
  });
  const maxLength = computed(() => {
    return data()?.maxLength ?? chatClientOptions().maxLength;
  });
  const errorText = computed(() => {
    const error = chatError();
    return error ? t(error.key, error.params || {}) : "";
  });

  function submitMessage(event, formData) {
    const text = String(formData.message || "").trim();
    if (!text) return;

    sendChatMessage(text, "map");
    draft.set("");
  }
</script>
```

CanvasEngine's `DOMContainer` binds `value={draft}` in both directions.
`submit={submitMessage}` prevents the browser's default form navigation and
passes `(event, formData)` to the handler.

Register the replacement:

```ts
import { provideChat } from '@rpgjs/chat/client'
import CustomChat from './gui/custom-chat.ce'

provideChat({
  client: {
    component: CustomChat,
    renderer: 'canvas',
  },
})
```

See the CanvasEngine documentation for
[DOMContainer](https://canvasengine.net/components/dom-container.md),
[template syntax](https://canvasengine.net/concepts/template-syntax.md), and
[reactive signals](https://canvasengine.net/concepts/reactive.md).

## Use a Vue component

Install and configure the RPGJS Vue overlay as described in
[Vue.js integration](/gui/vue-integration), then use a Vue component as the
replacement:

```ts
import { provideChat } from '@rpgjs/chat/client'
import { provideClientModules } from '@rpgjs/client'
import { provideVueGui } from '@rpgjs/vue'
import CustomChat from './gui/custom-chat.vue'

export default {
  providers: [
    provideVueGui({
      selector: '#vue-gui-overlay',
      createIfNotFound: true,
    }),
    provideChat({
      client: {
        component: CustomChat,
        renderer: 'vue',
      },
    }),
    provideClientModules([]),
  ],
}
```

The Vue component can subscribe to `chatMessages.observable` and
`chatError.observable`, and submit with `sendChatMessage()`. Remember to
unsubscribe when the component unmounts.

```vue
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import type { RpgClientEngine } from '@rpgjs/client'
import {
  chatError,
  chatMessages,
  sendChatMessage,
  type ChatErrorPayload,
  type ChatMessage,
} from '@rpgjs/chat/client'

const engine = inject<RpgClientEngine>('engine')!
const draft = ref('')
const messages = ref<ChatMessage[]>(chatMessages())
const error = ref<ChatErrorPayload | null>(chatError())

let messageSubscription: { unsubscribe(): void } | undefined
let errorSubscription: { unsubscribe(): void } | undefined

onMounted(() => {
  messageSubscription = chatMessages.observable.subscribe((value) => {
    messages.value = value
  })
  errorSubscription = chatError.observable.subscribe((value) => {
    error.value = value
  })
})

onUnmounted(() => {
  messageSubscription?.unsubscribe()
  errorSubscription?.unsubscribe()
})

const errorText = computed(() => {
  const value = error.value
  return value
    ? engine.i18n().t(value.key, value.params || {})
    : ''
})

function submit() {
  const text = draft.value.trim()
  if (!text) return
  sendChatMessage(text, 'map')
  draft.value = ''
}
</script>

<template>
  <section class="custom-chat">
    <div role="log" aria-live="polite">
      <p v-for="message in messages" :key="message.id">
        <strong>{{ message.author }}</strong>
        {{ message.text }}
      </p>
    </div>
    <p v-if="errorText" role="alert">{{ errorText }}</p>
    <form @submit.prevent="submit">
      <input v-model="draft" placeholder="Message…" />
      <button type="submit">Send</button>
    </form>
  </section>
</template>
```

## Themes and CSS

The default component uses semantic `rpg-ui-*` classes. Import the base theme:

```ts
import '@rpgjs/ui-css/index.css'
```

Add the pixel theme after it:

```ts
import '@rpgjs/ui-css/index.css'
import '@rpgjs/ui-css/theme-pixel.css'
```

Then apply the theme class to an ancestor, usually `<body>`:

```html
<body class="rpg-ui-theme-pixel">
  <div id="rpg"></div>
</body>
```

You can also override individual semantic classes:

```css
.rpg-ui-chat {
  width: 36rem;
  background: rgba(15, 12, 28, 0.96);
}

.rpg-ui-chat-author {
  color: #f6c177;
}

.rpg-ui-chat-message[data-player-id="pixel-guide"] {
  color: #7ecf6b;
}
```

## Errors and translations

The default client module provides these English translation keys:

```text
rpg.chat.placeholder
rpg.chat.send
rpg.chat.error.empty
rpg.chat.error.too-long
rpg.chat.error.rate-limit
rpg.chat.error.channel
rpg.chat.error.rejected
```

Override them through the regular RPGJS i18n configuration. Custom components
should display `chatError` through `engine.i18n().t()` instead of exposing raw
translation keys.

## Run the pixel chat playground

The repository includes a complete standalone and MMORPG-compatible example:

```bash
pnpm --dir playground dev:chat
```

Open `http://localhost:5189`. The example demonstrates map broadcast, rate
limiting, an `afterSend` automated reply, a CanvasEngine GUI, and the shared
pixel theme.

Private messages, voice chat, and permanent history are intentionally outside
the core module.
