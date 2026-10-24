import type {
  ChatClientOptions,
  ChatMessage,
} from "@rpgjs/chat/client";
import {
  defineChatChannel,
  type ChatMiddleware,
  type ChatServerOptions,
} from "@rpgjs/chat/server";

const message: ChatMessage = {
  id: "message-1",
  text: "Hello",
  author: "Ayla",
  playerId: "player-1",
  channel: "map",
  createdAt: 1,
};

const clientOptions: ChatClientOptions = {
  maxLength: 320,
};

const serverOptions: ChatServerOptions = {
  maxLength: 320,
};

const guild = defineChatChannel({
  id: "guild",
  label: "game.chat.guild",
  audience: () => ({ type: "group", id: "guild-1" }),
});

const muted: ChatMiddleware = (context, next) => {
  const text: string = context.text;
  if (text.length === 0) context.reject("game.chat.error.empty", { minutes: 1 });
  return next();
};

const channelOptions: ChatServerOptions = {
  channels: ["map", "global", guild],
  middleware: [muted],
  deliver(audience, chatMessage) {
    const type: "map" | "global" | "group" = audience.type;
    void type;
    void chatMessage;
  },
  onRejected({ key }) {
    const refused: string = key;
    void refused;
  },
};

void message;
void channelOptions;
void clientOptions;
void serverOptions;

// @ts-expect-error A middleware must say what the channel of a message is made of.
const invalidChannel: ChatServerOptions = { channels: [{ label: "No id" }] };
void invalidChannel;

// @ts-expect-error Server-only options must not leak from the client entry.
type ClientServerOptions = import("@rpgjs/chat/client").ChatServerOptions;

// @ts-expect-error Client-only options must not leak from the server entry.
type ServerClientOptions = import("@rpgjs/chat/server").ChatClientOptions;
