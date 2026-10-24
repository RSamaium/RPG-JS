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
import type { ChatClientOptions } from "./client-types";
import type { ChatServerOptions } from "./server-types";

export {
  CHAT_DELETE_EVENT,
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
export { normalizeChatClientOptions } from "./client-config";
export { normalizeChatServerOptions } from "./server-config";
export { defineChatChannel, globalChannel, mapChannel } from "./channels";
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
  createChatHandler,
  createChatServer,
  openChat,
  sendChatMessage,
};
export type * from "./client-types";
export type * from "./server-types";
export type * from "./shared-types";

export interface ChatOptions {
  client?: ChatClientOptions;
  server?: ChatServerOptions;
}

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
