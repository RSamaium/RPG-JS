import { createModule, type RpgProvider } from "@rpgjs/common";
import client, {
  createChatClient,
  openChat,
  sendChatMessage,
} from "./client";
import type { ChatClientOptions } from "./client-types";

export {
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
export { normalizeChatClientOptions } from "./client-config";
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
  openChat,
  sendChatMessage,
};
export type {
  ChatClientOptions,
  ChatPosition,
  ResolvedChatClientOptions,
} from "./client-types";
export type {
  ChatChannel,
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";

export interface ChatClientModuleOptions {
  client?: ChatClientOptions;
}

export function provideChat(
  options: ChatClientModuleOptions = {},
): RpgProvider[] {
  return createModule("Chat", [{
    client: createChatClient(options.client),
  }]);
}

export default {
  client,
};
