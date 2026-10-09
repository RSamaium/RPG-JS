import type {
  ChatClientOptions,
  ChatMessage,
} from "@rpgjs/chat/client";
import type {
  ChatServerOptions,
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

void message;
void clientOptions;
void serverOptions;

// @ts-expect-error Server-only options must not leak from the client entry.
type ClientServerOptions = import("@rpgjs/chat/client").ChatServerOptions;

// @ts-expect-error Client-only options must not leak from the server entry.
type ServerClientOptions = import("@rpgjs/chat/server").ChatClientOptions;
