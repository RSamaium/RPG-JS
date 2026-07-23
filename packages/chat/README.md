# @rpgjs/chat

Official removable chat module for RPGJS v5. The server owns author identity,
timestamps, validation and broadcast scope; the client only renders messages
and submits text.

```ts
import { provideChat } from "@rpgjs/chat"

export default {
  providers: [
    provideChat({
      server: {
        channels: ["map"],
        maxLength: 180,
      },
    }),
  ],
}
```

The default GUI is a CanvasEngine `.ce` component. Replace it without changing
server behavior:

```ts
provideChat({
  client: {
    component: CustomChat,
    renderer: "vue",
  },
})
```

Global chat is opt-in and requires a `broadcastGlobal` adapter. Private
messages, voice chat and permanent history are intentionally outside the v5
core module.
