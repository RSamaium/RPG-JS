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
| `channels` | `['map']` | The channels of the selector: ids, or the definitions of the server (`defineChatChannel()`), so both sides can share one list. No selector is drawn while there is a single channel. |

### What the built-in GUI does

- **Channel selector.** With several `channels`, tabs above the messages choose where the next message goes. Each
  channel has a color (`slate`, `amber`, `violet`, `emerald`, `rose`, `sky`) shared by its tab and the left border of
  its messages. The placeholder names the selected channel.
- **Sending state.** After a message is sent, the button shows a loading and the player cannot send another until the
  server delivers it or refuses it (an error shows for a few seconds). The wait ends by itself after 8 seconds.
- **Size and collapse.** A button makes the box taller (`--rpg-ui-chat-tall-height`) with a short animation, which
  `prefers-reduced-motion` removes. Another one reduces the chat to a pill that counts the unread messages of the
  others.
- **Moderation tools.** A message removed by a moderation tool disappears from every screen (`chat:delete`, below).

Everything is authoritative on the server: the GUI only reads what the server sends. In standalone mode the same
code runs in the browser; in MMORPG mode the messages cross the connection as before.

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
the sender's current map. An omitted channel defaults to `map` (or to the first
channel when the game has no map chat); any value that is not one of the
declared channels is rejected. See [Channels](#channels) to add more.

### Server options and hooks

| Option | Default | Description |
| --- | --- | --- |
| `channels` | `['map']` | The channels of the game: the built-in `'map'` and `'global'`, or definitions made with `defineChatChannel()`. |
| `maxLength` | `180` | Maximum normalized message length. |
| `rateLimit` | 5 messages / 10 seconds | Per-player rate limit; use `false` to disable it. |
| `formatAuthor(player)` | Player name or `Player {id}` | Builds the trusted display name on the server. |
| `beforeSend(context)` | — | Rejects with `false`, or returns the text that should be broadcast. May be async. |
| `middleware` | `[]` | Moderation steps that can rewrite or refuse a message with their own error key. See [Middleware](#middleware). |
| `deliver(audience, message, player)` | — | Carries a message to an audience that is not the sender's map: everybody, or a group. Required for `global` and custom channels. |
| `afterSend(message, player)` | — | Runs after a successful delivery. Useful for audit, metrics, or automated replies. May be async. |
| `onRejected(info)` | — | Runs when a message was refused, by the module or by a middleware. A failure of the hook is ignored. |
| `broadcastGlobal(message, player)` | — | Legacy adapter of the `global` channel. `deliver` is the canonical option and wins when both are given. |

The hook order is:

```text
normalize → length → channel and canSend → rate limit → beforeSend → middleware
→ construct ChatMessage → deliver (or the map broadcast) → afterSend
```

A message refused at any step sends the player the error `chat:error` and calls
`onRejected`.

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

## Channels

A channel is a place where players talk. The server owns who may write on it
and who receives what is written: the client only asks for a channel id.
`map` and `global` are built in. Declare any other channel with
`defineChatChannel()`:

```ts
import { defineChatChannel, provideChat } from '@rpgjs/chat/server'

const guild = defineChatChannel({
  id: 'guild',
  label: 'game.chat.guild', // a translation key or plain text
  color: 'violet',
  canSend: (player) => guildOf(player) !== undefined,
  audience: (message, player) => ({ type: 'group', id: guildOf(player)! }),
})

provideChat({
  server: {
    channels: ['map', 'global', guild],
    async deliver(audience, message, player) {
      if (audience.type === 'group') await guildBus.publish(audience.id, message)
      else await applicationChatBus.publish(message, { senderId: player.id })
    },
  },
})
```

| Field | Description |
| --- | --- |
| `id` | Letters, digits and dashes. It travels in the messages. |
| `label` | Translation key or plain text shown by the channel selector. |
| `color` | `slate` (default), `amber`, `violet`, `emerald`, `rose` or `sky`. |
| `canSend(player)` | Who may write. Everybody when missing. |
| `audience(message, player)` | `{ type: 'map' }`, `{ type: 'global' }` or `{ type: 'group', id }`. Default: the map for `map`, everybody for `global`. A channel with another id must give it. |

The audience `map` is broadcast by the module. Any other audience is carried by
`deliver`, which is responsible for reaching all intended clients, including
clients hosted by another room, process, or edge location. A channel whose
audience cannot be delivered (no `deliver`) refuses the message. Giving the same
`channels` to the client shows the selector (see [Client options](#client-options)).

### Global chat

Global chat is opt-in because the correct delivery mechanism depends on the
deployment topology. Enable the channel and provide `deliver`:

```ts
provideChat({
  server: {
    channels: ['map', 'global'],

    async deliver(audience, message, player) {
      await applicationChatBus.publish(message, {
        senderId: player.id,
      })
    },
  },
})
```

The legacy `broadcastGlobal(message, player)` option still works for the
`global` channel; use `deliver` in new code.

## Middleware

`middleware` is the place for moderation: mutes, filters, anti-spam, or an
external classifier. Each step receives the message and `next()`:

```ts
provideChat({
  server: {
    middleware: [
      async (context, next) => {
        if (isMuted(context.player)) context.reject('game.chat.error.muted', { minutes: 10 })
        context.text = filterBlockedWords(context.text)
        await next()
      },
    ],
    onRejected({ player, key }) {
      audit('chat refused', player.id, key)
    },
  },
})
```

| Member of the context | Description |
| --- | --- |
| `player` | The sender. |
| `channel` | The `ChatChannelDefinition` of the message. |
| `text` | The normalized text. Rewriting it changes what the players read. |
| `meta` | Data shared by the steps of this message. |
| `reject(key, params?)` | Refuses the message: the player gets this error key (translate it in the game) and nothing is shown. |

The steps run in order, around the delivery. A step that neither calls `next()`
nor refuses refuses the message. `beforeSend` keeps working and runs first.

## Client API

Replacement components and client modules can import:

| Export | Purpose |
| --- | --- |
| `chatMessages` | Reactive `ChatMessage[]` signal. |
| `chatError` | Reactive signal containing the last server validation error. |
| `chatClientOptions` | Resolved client configuration signal. |
| `chatChannels` | Reactive list of the channels of the selector. |
| `chatSelectedChannel` | Reactive id of the channel the next message goes to. |
| `chatSending` | `true` from the moment a message is sent until the server answers. |
| `chatExpanded`, `chatUnread`, `chatTall` | Open or reduced, unread messages while reduced, taller box. |
| `sendChatMessage(text, channel?)` | Submits text to the authoritative server, on the selected channel by default. |
| `selectChatChannel(id)`, `setChatExpanded(open)`, `setChatTall(tall)` | Drive the built-in GUI from your own controls. |
| `startChatSending()`, `showChatError(error)` | Keep the sending state and the temporary error in sync when a replacement component sends itself. |
| `removeChatMessage(id)` | Removes a message from the local list. |
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
  channel: string // 'map', 'global' or a channel id of the game
  mapId?: string
  createdAt: number
}
```

### Removing a message

A moderation tool removes a message by sending the event `chat:delete` (`CHAT_DELETE_EVENT`) with `{ id }` to the
clients that received it, for example `map.broadcast(CHAT_DELETE_EVENT, { id })`. Every client drops the message
from its list. The module does not decide who may delete: that is the moderation of your game.

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

The bar of the default component adds `rpg-ui-chat-bar`, `rpg-ui-chat-tabs`, `rpg-ui-chat-tab`
(with `data-color` and `aria-pressed`), `rpg-ui-chat-icon-button`, `rpg-ui-chat-pill` and
`rpg-ui-chat-unread`. The panel has `data-size="default" | "tall"`; set the tall height with
`--rpg-ui-chat-tall-height` (`34rem`). Messages carry `data-channel`, `data-color` and
`data-self="true"` for the player's own messages. The channel hue comes from `--rpg-ui-chat-channel-color`.

## Errors and translations

The default client module provides English and French texts for these keys:

| Key | Used for |
| --- | --- |
| `rpg.chat.title`, `rpg.chat.open`, `rpg.chat.collapse` | The title, the pill and the button that reduces the chat. |
| `rpg.chat.placeholder`, `rpg.chat.placeholder.channel` | The input, with `{channel}` when there are several channels. |
| `rpg.chat.send`, `rpg.chat.sending` | The send button and its loading. |
| `rpg.chat.channel.label`, `rpg.chat.channel.map`, `rpg.chat.channel.global` | The channel tabs. |
| `rpg.chat.grow`, `rpg.chat.shrink` | The button that changes the height. |
| `rpg.chat.error.empty`, `.too-long`, `.rate-limit`, `.channel`, `.rejected` | The errors of the module. |

Override them through the regular RPGJS i18n configuration. A channel `label`
is a key (or plain text), and so is the key a middleware gives to
`context.reject()`: declare the texts of your game in the same way. Custom
components should display `chatError` through `engine.i18n().t()` instead of
exposing raw translation keys.

## Run the pixel chat playground

The repository includes a complete standalone and MMORPG-compatible example:

```bash
pnpm --dir playground dev:chat
```

Open `http://localhost:5189`. The example demonstrates a map and an `Everyone`
channel with the selector, `deliver`, rate limiting, an `afterSend` automated
reply, a CanvasEngine GUI, and the shared pixel theme.

Private messages, voice chat, and permanent history are intentionally outside
the core module.
