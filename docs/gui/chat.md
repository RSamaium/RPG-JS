---
title: "Chat"
description: "Install the optional RPGJS MMORPG chat module."
---

# Chat

`@rpgjs/chat` is an optional MMORPG module that adds a map-local chat GUI.
The client renders a CanvasEngine GUI and sends chat intents to the server.
The server remains authoritative: it validates each message and broadcasts it
only to players on the sender's current map.

## Installation

Install the package in your game and import the shared UI CSS once in your
client entry or client config.

```ts
import "@rpgjs/ui-css/index.css";
import "@rpgjs/ui-css/theme-default.css";
```

Register the client module:

```ts
import { provideChat } from "@rpgjs/chat/client";

export default {
  providers: [
    provideChat()
  ]
};
```

Register the server module:

```ts
import { provideChat } from "@rpgjs/chat/server";

provideServerModules([
  provideChat()
]);
```

With the default options, the chat opens automatically when the current player
is available. Messages are sent on `chat:send` and received on `chat:message`.

## Options

Client options:

```ts
provideChat({
  autoOpen: true,
  position: "bottom-left",
  maxMessages: 100,
  placeholder: "Message..."
});
```

Server options:

```ts
provideChat({
  maxLength: 180,
  formatAuthor(player) {
    return player.name || `Player ${player.id}`;
  },
  sanitize(text, player) {
    if (text.startsWith("/")) return false;
    return text;
  }
});
```

`sanitize()` can return a modified string or `false` to reject the message.
After sanitization, empty messages are rejected and long messages are clipped to
`maxLength`.

## Message Shape

```ts
type ChatMessage = {
  id: string;
  text: string;
  author: string;
  playerId: string;
  mapId: string;
  createdAt: number;
  scope: "map";
};
```

## Scope

The first version is deliberately small: it supports map-local MMORPG chat.
Global chat, private messages, party/guild channels, persisted history, slash
commands, and speech bubbles can be added by extending the same transport and
GUI patterns later.
