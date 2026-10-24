import { createModule, type RpgProvider } from "@rpgjs/common";
import client, {
  createChatClient,
  openChat,
  sendChatMessage,
} from "./client";
import type { ChatClientOptions } from "./client-types";

export {
  CHAT_DELETE_EVENT,
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
export { normalizeChatClientOptions } from "./client-config";
export {
  addChatMessage,
  chatChannels,
  chatClientOptions,
  chatError,
  chatExpanded,
  chatMessages,
  chatSelectedChannel,
  chatSending,
  chatTall,
  chatUnread,
  clearChatMessages,
  configureChatClient,
  removeChatMessage,
  selectChatChannel,
  setChatExpanded,
  setChatTall,
  showChatError,
  startChatSending,
} from "./client-state";
export {
  createChatClient,
  openChat,
  sendChatMessage,
};
export type {
  ChatClientChannel,
  ChatClientOptions,
  ChatPosition,
  ResolvedChatChannel,
  ResolvedChatClientOptions,
} from "./client-types";
export type {
  ChatAudience,
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
