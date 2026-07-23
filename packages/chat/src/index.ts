import { createModule, type RpgProvider } from "@rpgjs/common";
import client, {
  createChatClient,
  openChat,
  sendChatMessage,
} from "./client";
import server, {
  createChatHandler,
  createChatServer,
} from "./server";
import type { ChatOptions } from "./types";

export {
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
  normalizeChatClientOptions,
  normalizeChatServerOptions,
} from "./config";
export {
  addChatMessage,
  chatClientOptions,
  chatError,
  chatMessages,
  clearChatMessages,
  configureChatClient,
} from "./client-state";
export {
  createChatClient,
  createChatHandler,
  createChatServer,
  openChat,
  sendChatMessage,
};
export type * from "./types";

export function provideChat(options: ChatOptions = {}): RpgProvider[] {
  return createModule("Chat", [{
    client: createChatClient?.(options.client),
    server: createChatServer?.(options.server),
  }]);
}

export default {
  client,
  server,
};
