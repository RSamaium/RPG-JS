import client, {
  createChatClient,
  openChat,
  sendChatMessage,
} from "./client";
import server, {
  createChatServer,
  createMapChatMessage,
  handleChatSend,
} from "./server";
import { createModule } from "@rpgjs/common";
import type { ChatOptions } from "./types";

export {
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
  DEFAULT_CHAT_OPTIONS,
  getChatOptions,
  normalizeChatOptions,
} from "./config";
export {
  createChatClient,
  openChat,
  sendChatMessage,
  createChatServer,
  createMapChatMessage,
  handleChatSend,
};
export type {
  ChatClientOptions,
  ChatMessage,
  ChatMessagePayload,
  ChatPlayerLike,
  ChatOptions,
  ChatPosition,
  ChatServerOptions,
  ResolvedChatOptions,
} from "./types";

export function provideChat(options: ChatOptions = {}) {
  return createModule("Chat", [
    {
      server: createChatServer?.(options),
      client: createChatClient?.(options),
    },
  ]);
}

export default {
  server,
  client,
};
